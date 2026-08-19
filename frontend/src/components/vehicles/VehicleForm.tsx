import { useEffect, useRef, useState, useCallback } from "react"
import { useNavigate, useParams } from "react-router-dom"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query"
import { Loader2, Save, ArrowLeft, AlertTriangle, X, FileText } from "lucide-react"
import { ContractModal } from "./ContractModal"
import { VehicleImageUpload } from "./VehicleImageUpload"
import { FinancialMetricsStrip } from "./FinancialMetricsStrip"
import { VehiclePipeline } from "./VehiclePipeline"
import { VehicleExpensesEarningsCard } from "./VehicleExpensesEarningsCard"
import { AutoSaveIndicator } from "@/components/AutoSaveIndicator"
import { StickyFooter } from "@/components/StickyFooter"
import { RecordNavigation } from "@/components/RecordNavigation"
import { useTransactions } from "@/hooks/useTransactions"
import { getDaysOnStockBgColor, getDaysOnStockColor } from "@/lib/vehicleFinancials"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { DynamicSelect } from "@/components/ui/dynamic-select"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { EntityForm } from "@/components/legal-entities/EntityForm"
import type { AutoSaveStatus } from "@/hooks/useAutoSave"
import { useCreateLegalEntity, type LegalEntityCreatePayload } from "@/hooks/useLegalEntities"
import { useChoices, useModels, useNextVehicleId, useNextAvailableKey, vehicleKeys } from "@/hooks/useVehicles"
import { vehicleCreateSchema, vehicleUpdateSchema, type VehicleCreateInput, type VehicleUpdateInput } from "@/lib/validations"
import api, { ensureCsrfToken } from "@/lib/api"
import { formatCurrency } from "@/lib/utils"
import { calcVehicleFinancials } from "@/lib/vehicleFinancials"
import type { VehicleDetail } from "@/types/vehicle"

interface VehicleFormProps {
    vehicle?: VehicleDetail
    isEditing?: boolean
    /** Callback for immediate auto-save (dropdowns, checkboxes) */
    onAutoSave?: (data: Partial<VehicleUpdateInput>) => void
    /** Callback for debounced auto-save (text inputs) */
    onAutoSaveDebounced?: (data: Partial<VehicleUpdateInput>) => void
    /** Previous vehicle ID for navigation (passed from parent) */
    prevVehicleId?: number | null
    /** Next vehicle ID for navigation (passed from parent) */
    nextVehicleId?: number | null
    autoSaveStatus?: AutoSaveStatus
    autoSaveErrorMessage?: string | null
    /** Optional split-view toggle button rendered in footer */
    splitViewToggle?: React.ReactNode
    /** Compact transactions table rendered inline in the edit-mode grid (normal/stacked view only) */
    inlineTransactions?: React.ReactNode
}

// Status values that unlock the Sale tab
const SALE_ENABLED_STATUSES = ["ready_for_sale", "reserved", "sold"]

// Valid status values type
type VehicleStatus = "purchased" | "ready_for_sale" | "reserved" | "sold" | "inactive"



/**
 * ModelSelect - Dependent dropdown for selecting vehicle models based on Make
 * Uses DynamicSelect for consistency with other dropdowns and "Add New" functionality
 */
interface ModelSelectProps {
    makeId: number | undefined
    value: number | null
    onChange: (value: number | null) => void
    error?: string
}

interface TaxCalculationBreakdown {
    gross: number | null
    taxAmount: number | null
    net: number | null
    taxRate: number
    hasValue: boolean
}



function roundMoney(value: number) {
    return Math.round((value + Number.EPSILON) * 100) / 100
}

function calculateTaxBreakdown(price: number | undefined, taxRate: number | string | undefined): TaxCalculationBreakdown {
    const parsedTaxRate = typeof taxRate === 'string' ? parseFloat(taxRate) : taxRate
    const safeTaxRate = parsedTaxRate ?? 0

    if (price === undefined || Number.isNaN(price)) {
        return {
            gross: null,
            taxAmount: null,
            net: null,
            taxRate: safeTaxRate,
            hasValue: false,
        }
    }

    const divisor = 1 + safeTaxRate / 100
    const net = divisor > 0 ? price / divisor : price
    const taxAmount = price - net

    return {
        gross: roundMoney(price),
        taxAmount: roundMoney(taxAmount),
        net: roundMoney(net),
        taxRate: safeTaxRate,
        hasValue: true,
    }
}

function formatMoneyOrDash(value: number | null) {
    return value === null ? "-" : formatCurrency(value)
}

function getNumberColor(value: number | null) {
    if (value === null || value === 0) return "text-muted-foreground"
    return value > 0 ? "text-green-600 dark:text-green-400" : "text-red-500 dark:text-red-400"
}


function ModelSelect({ makeId, value, onChange, error }: ModelSelectProps) {
    const { data: models, isLoading } = useModels(makeId)

    // Convert models to the options format expected by DynamicSelect
    const options = models?.map((model) => ({
        id: model.id,
        name: model.name,
    })) ?? []

    return (
        <div className="space-y-2">
            <Label className="text-foreground">Model</Label>
            <DynamicSelect
                choiceType="vehicle_model"
                options={options}
                value={value}
                onChange={onChange}
                placeholder={
                    !makeId
                        ? "Select a make first"
                        : isLoading
                            ? "Loading models..."
                            : "Select model"
                }
                disabled={!makeId || isLoading}
                allowCreate={!!makeId}
                createLabel="Model"
                parentId={makeId}
            />
            {error && (
                <p className="text-sm text-red-500">{error}</p>
            )}
        </div>
    )
}

export function VehicleForm({
    vehicle,
    isEditing = false,
    onAutoSave,
    onAutoSaveDebounced,
    prevVehicleId,
    nextVehicleId,
    autoSaveStatus = "idle",
    autoSaveErrorMessage = null,
    splitViewToggle,
    inlineTransactions,
}: VehicleFormProps) {
    const navigate = useNavigate()
    const { business_slug } = useParams<{ business_slug: string }>()
    const queryClient = useQueryClient()

    // --- Core Helpers (No hook dependencies) ---

    /** Parse backend Decimal strings to JS numbers */
    const toNum = (val: unknown): number | undefined => {
        if (val === null || val === undefined) return undefined
        const n = typeof val === "string" ? parseFloat(val) : Number(val)
        return Number.isNaN(n) ? undefined : n
    }

    /** Extract error messages from API responses */
    const getApiErrorMessage = (error: unknown, fallback: string) => {
        const axiosError = error as {
            response?: { data?: { detail?: string; message?: string } | string }
            message?: string
        }
        if (typeof axiosError.response?.data === "string") return axiosError.response.data
        if (axiosError.response?.data && typeof axiosError.response.data === "object") {
            return axiosError.response.data.detail || axiosError.response.data.message || fallback
        }
        return axiosError.message || fallback
    }

    // --- Form Foundation ---
    const schema = isEditing ? vehicleUpdateSchema : vehicleCreateSchema
    const {
        handleSubmit,
        setValue,
        watch,
        reset,
        formState: { errors },
    } = useForm<VehicleCreateInput | VehicleUpdateInput>({
        resolver: zodResolver(schema) as any,
        defaultValues: isEditing ? {
            status: (vehicle?.status ?? "purchased") as VehicleStatus,
            branch_id: vehicle?.branch_id ?? undefined,
            vehicle_type_id: vehicle?.vehicle_type_id ?? undefined,
            body_type_id: vehicle?.body_type_id ?? undefined,
            make_id: vehicle?.make_id ?? undefined,
            model_id: vehicle?.model_id ?? undefined,
            color_id: vehicle?.color_id ?? undefined,
            doors_id: vehicle?.doors_id ?? undefined,
            fuel_type_id: vehicle?.fuel_type_id ?? undefined,
            damage_type_id: vehicle?.damage_type_id ?? undefined,
            power_kw: toNum(vehicle?.power_kw),
            first_registration_date: vehicle?.first_registration_date ?? "",
            year_of_construction: toNum(vehicle?.year_of_construction),
            kilometer: toNum(vehicle?.kilometer),
            chassis_number: vehicle?.chassis_number ?? "",
            motor_vehicle_registration_number: vehicle?.motor_vehicle_registration_number ?? "",
            official_license_plate: vehicle?.official_license_plate ?? "",
            buy_price: toNum(vehicle?.buy_price),
            buy_tax_id: vehicle?.buy_tax_id ?? undefined,
            buy_date: vehicle?.buy_date ?? "",
            buy_delivery_collection_date: vehicle?.buy_delivery_collection_date ?? "",
            buy_payment_method_id: vehicle?.buy_payment_method_id ?? undefined,
            seller_id: vehicle?.seller_id ?? undefined,
            sale_price: toNum(vehicle?.sale_price),
            sale_tax_id: vehicle?.sale_tax_id ?? undefined,
            sale_date: vehicle?.sale_date ?? "",
            sale_delivery_collection_date: vehicle?.sale_delivery_collection_date ?? "",
            sale_payment_method_id: vehicle?.sale_payment_method_id ?? undefined,
            buyer_id: vehicle?.buyer_id ?? undefined,
            sale_invoice_number: vehicle?.sale_invoice_number ?? "",
            description: vehicle?.description ?? "",
            internal_comments: vehicle?.internal_comments ?? "",
            key_number_id: vehicle?.key_number_id ?? undefined,
        } : {
            branch_id: undefined,
            vehicle_type_id: undefined,
            body_type_id: undefined,
            make_id: undefined,
            model_id: undefined,
            color_id: undefined,
            doors_id: undefined,
            fuel_type_id: undefined,
            damage_type_id: undefined,
            power_kw: undefined,
            first_registration_date: "",
            year_of_construction: undefined,
            kilometer: undefined,
            chassis_number: "",
            motor_vehicle_registration_number: "",
            official_license_plate: "",
            buy_price: undefined,
            buy_tax_id: undefined,
            buy_date: "",
            buy_delivery_collection_date: "",
            buy_payment_method_id: undefined,
            seller_id: undefined,
            description: "",
            internal_comments: "",
            key_number_id: undefined,
        },
    })

    // --- State and Refs ---
    const isInitializingRef = useRef(isEditing)
    const [mutationError, setMutationError] = useState<string | null>(null)
    const [entityModalOpen, setEntityModalOpen] = useState(false)
    const [createEntityTarget, setCreateEntityTarget] = useState<"seller_id" | "buyer_id">("seller_id")
    const [entityFormData, setEntityFormData] = useState<Partial<LegalEntityCreatePayload>>({ type: "individual" })
    const [entityFormError, setEntityFormError] = useState<string | null>(null)
    const [entityValidationErrors, setEntityValidationErrors] = useState<Record<string, string>>({})
    const [contractModalOpen, setContractModalOpen] = useState(false)
    const [selectedImageFile, setSelectedImageFile] = useState<File | null>(null)
    const [imageUploadError, setImageUploadError] = useState<string | null>(null)
    const [isUploadingImage, setIsUploadingImage] = useState(false)
    const createEntityMutation = useCreateLegalEntity()

    // --- Basic Handlers & Helpers ---
    const handleBack = useCallback(() => {
        if (window.history.state && window.history.state.idx > 0) navigate(-1)
        else navigate("/vehicles")
    }, [navigate])

    const toOptions = useCallback((items: Array<{ id: number; name: string }> | undefined) =>
        items?.map((item) => ({ id: item.id, name: item.name })) ?? [], [])

    const taxToOptions = useCallback((items: Array<{ id: number; name: string; percentage: number }> | undefined) =>
        items?.map((item) => ({ id: item.id, name: `${item.name} (${item.percentage}%)` })) ?? [], [])

    const invalidateKeyChoiceCaches = useCallback(() => {
        queryClient.invalidateQueries({ queryKey: ["choices"] })
        queryClient.invalidateQueries({ queryKey: ["choices-management"] })
    }, [queryClient])

    const handleDropdownChange = useCallback((field: string, value: number | string | null | undefined) => {
        setValue(field as any, value as any)
        if (isEditing && onAutoSave && !isInitializingRef.current) {
            onAutoSave({ [field]: value } as Partial<VehicleUpdateInput>)
        }
        if (field === "key_number_id") {
            invalidateKeyChoiceCaches()
        }
    }, [setValue, isEditing, onAutoSave, invalidateKeyChoiceCaches])

    const handleTextChange = useCallback((field: string, value: string) => {
        setValue(field as any, value as any)
        if (isEditing && onAutoSaveDebounced && !isInitializingRef.current) {
            onAutoSaveDebounced({ [field]: value } as Partial<VehicleUpdateInput>)
        }
    }, [setValue, isEditing, onAutoSaveDebounced])

    const handleNumberChange = useCallback((field: string, value: string, parseFunc: (v: string) => number | undefined = (v) => v ? parseInt(v) : undefined) => {
        const numVal = parseFunc(value)
        setValue(field as any, numVal as any)
        if (isEditing && onAutoSaveDebounced && !isInitializingRef.current) {
            onAutoSaveDebounced({ [field]: numVal } as Partial<VehicleUpdateInput>)
        }
    }, [setValue, isEditing, onAutoSaveDebounced])

    const handleDateChange = useCallback((field: string, value: string) => {
        setValue(field as any, value as any)
        if (isEditing && onAutoSave && !isInitializingRef.current) {
            onAutoSave({ [field]: value || null } as Partial<VehicleUpdateInput>)
        }
    }, [setValue, isEditing, onAutoSave])

    // --- Higher-level Callbacks ---
    const handleOpenEntityModal = useCallback((target: "seller_id" | "buyer_id") => {
        setCreateEntityTarget(target)
        setEntityFormData({ type: "individual" })
        setEntityFormError(null)
        setEntityValidationErrors({})
        setEntityModalOpen(true)
    }, [])

    const validateEntityForm = useCallback((data: Partial<LegalEntityCreatePayload>) => {
        const errors: Record<string, string> = {}
        if (!data.name?.trim()) {
            errors.name = "This field is required"
        }
        if (!data.type) {
            errors.type = "This field is required"
        }
        if (data.type === "company" && !data.tax_identification_number?.trim()) {
            errors.tax_identification_number = "This field is required"
        }
        if (!data.address_street?.trim()) {
            errors.address_street = "This field is required"
        }
        if (!data.address_street_number?.trim()) {
            errors.address_street_number = "This field is required"
        }
        if (!data.address_postal_code?.trim()) {
            errors.address_postal_code = "This field is required"
        }
        if (!data.address_country_id) {
            errors.address_country_id = "This field is required"
        }
        if (!data.address_city_id) {
            errors.address_city_id = "This field is required"
        }
        return errors
    }, [])

    const handleCreateEntity = useCallback(async () => {
        setEntityFormError(null)
        const errors = validateEntityForm(entityFormData)
        if (Object.keys(errors).length > 0) {
            setEntityValidationErrors(errors)
            return
        }
        setEntityValidationErrors({})
        try {
            const newEntity = await createEntityMutation.mutateAsync(entityFormData as LegalEntityCreatePayload)
            handleDropdownChange(createEntityTarget, newEntity.id)
            queryClient.invalidateQueries({ queryKey: vehicleKeys.choices() })
            setEntityModalOpen(false)
            setEntityFormData({ type: "individual" })
        } catch (error: unknown) {
            const err = error as Error
            setEntityFormError(err.message || "Failed to create legal entity")
        }
    }, [entityFormData, createEntityMutation, createEntityTarget, queryClient, handleDropdownChange, validateEntityForm])

    // --- Data Fetching ---
    const { data: choices, isLoading: choicesLoading } = useChoices(vehicle?.id)
    const { data: txData } = useTransactions(
        { vehicle: vehicle?.internal_id ?? undefined, per_page: 500 },
        isEditing && !!vehicle?.internal_id
    )
    const { data: nextId, isLoading: nextIdLoading } = useNextVehicleId(!isEditing)
    const watchedKeyNumberId = watch("key_number_id")
    const { data: nextKey } = useNextAvailableKey(!isEditing && !watchedKeyNumberId)
    const { data: businessSettings } = useQuery({
        queryKey: ["business-settings"],
        queryFn: async () => {
            const response = await api.get("/settings/business")
            return response.data
        },
        staleTime: 5 * 60 * 1000,
    })

    // --- Side Effects ---
    useEffect(() => { ensureCsrfToken() }, [])

    useEffect(() => {
        if (!isEditing && nextKey && !watchedKeyNumberId) {
            handleDropdownChange("key_number_id", nextKey.id)
        }
    }, [nextKey, isEditing, watchedKeyNumberId, handleDropdownChange])

    useEffect(() => {
        if (isEditing && vehicle) {
            isInitializingRef.current = true
            const noTaxId = choices?.tax_percentages?.find((tax) => tax.is_no_tax)?.id
            reset({
                status: (vehicle.status ?? "purchased") as VehicleStatus,
                branch_id: vehicle.branch_id ?? undefined,
                vehicle_type_id: vehicle.vehicle_type_id ?? undefined,
                body_type_id: vehicle.body_type_id ?? undefined,
                make_id: vehicle.make_id ?? undefined,
                model_id: vehicle.model_id ?? undefined,
                color_id: vehicle.color_id ?? undefined,
                doors_id: vehicle.doors_id ?? undefined,
                fuel_type_id: vehicle.fuel_type_id ?? undefined,
                damage_type_id: vehicle.damage_type_id ?? undefined,
                power_kw: toNum(vehicle.power_kw),
                first_registration_date: vehicle.first_registration_date ?? "",
                year_of_construction: toNum(vehicle.year_of_construction),
                kilometer: toNum(vehicle.kilometer),
                chassis_number: vehicle.chassis_number ?? "",
                motor_vehicle_registration_number: vehicle.motor_vehicle_registration_number ?? "",
                official_license_plate: vehicle.official_license_plate ?? "",
                buy_price: toNum(vehicle.buy_price),
                buy_tax_id: vehicle.buy_tax_id ?? noTaxId ?? undefined,
                buy_date: vehicle.buy_date ?? "",
                buy_delivery_collection_date: vehicle.buy_delivery_collection_date ?? "",
                buy_payment_method_id: vehicle.buy_payment_method_id ?? undefined,
                seller_id: vehicle.seller_id ?? undefined,
                sale_price: toNum(vehicle.sale_price),
                sale_tax_id: vehicle.sale_tax_id ?? noTaxId ?? undefined,
                sale_date: vehicle.sale_date ?? "",
                sale_delivery_collection_date: vehicle.sale_delivery_collection_date ?? "",
                sale_payment_method_id: vehicle.sale_payment_method_id ?? undefined,
                buyer_id: vehicle.buyer_id ?? undefined,
                sale_invoice_number: vehicle.sale_invoice_number ?? "",
                description: vehicle.description ?? "",
                internal_comments: vehicle.internal_comments ?? "",
                key_number_id: vehicle.key_number_id ?? undefined,
            })
            setTimeout(() => { isInitializingRef.current = false }, 500)
        }
    }, [vehicle?.internal_id, isEditing, reset, choices?.tax_percentages])

    // Automatically default buy_tax_id and sale_tax_id to the "No Tax" option when choices load
    useEffect(() => {
        if (choices?.tax_percentages && choices.tax_percentages.length > 0) {
            const noTaxOption = choices.tax_percentages.find((tax) => tax.is_no_tax)
            if (noTaxOption) {
                const currentBuyTax = watch("buy_tax_id")
                const currentSaleTax = watch("sale_tax_id")
                if (currentBuyTax === undefined || currentBuyTax === null) {
                    setValue("buy_tax_id", noTaxOption.id)
                }
                if (currentSaleTax === undefined || currentSaleTax === null) {
                    setValue("sale_tax_id", noTaxOption.id)
                }
            }
        }
    }, [choices?.tax_percentages, setValue, watch])

    useEffect(() => {
        setSelectedImageFile(null)
        setImageUploadError(null)
        setIsUploadingImage(false)
    }, [vehicle?.internal_id, isEditing])

    // --- Derived Values ---
    const currentStatus = isEditing ? (vehicle?.status ?? "purchased") : "purchased"
    const vehicleTitle = `${vehicle?.make_name ?? ""} ${vehicle?.model_name ?? ""}`.trim() || "Vehicle"
    const canGenerateAnyContract = Boolean(
        vehicle?.can_generate_buy_contract || vehicle?.can_generate_sale_contract
    )
    const watchedStatus = watch("status") ?? currentStatus
    const isSaleTabVisible = isEditing && SALE_ENABLED_STATUSES.includes(watchedStatus as string)
    const isKeyFieldVisible = watchedStatus !== "sold" && watchedStatus !== "inactive"
    const watchedBuyPrice = toNum(watch("buy_price"))
    const watchedBuyTaxId = watch("buy_tax_id")
    const watchedSalePrice = toNum(watch("sale_price"))
    const watchedSaleTaxId = watch("sale_tax_id")
    const watchedBuyDate = watch("buy_date") as string | undefined
    const watchedSaleDate = watch("sale_date") as string | undefined

    const buyTaxRate = choices?.tax_percentages?.find((tax) => tax.id === watchedBuyTaxId)?.percentage ?? 0
    const saleTaxRate = choices?.tax_percentages?.find((tax) => tax.id === watchedSaleTaxId)?.percentage ?? 0
    const buyBreakdown = calculateTaxBreakdown(watchedBuyPrice, buyTaxRate)
    const saleBreakdown = calculateTaxBreakdown(watchedSalePrice, saleTaxRate)
    const keyNumberOptions = [
        ...toOptions(choices?.key_numbers),
        ...(nextKey && !choices?.key_numbers?.some((key) => key.id === nextKey.id)
            ? [{ id: nextKey.id, name: nextKey.name }]
            : []),
    ]

    const txnsForCalc = txData?.transactions?.items?.map(t => ({
        amount: typeof t.amount === 'string' ? parseFloat(t.amount) : t.amount,
        tax: typeof t.tax === 'string' ? parseFloat(t.tax) : t.tax
    })) ?? null

    const vehicleFinancials = calcVehicleFinancials({
        buyGross: watchedBuyPrice ?? null,
        buyTaxPercentage: buyTaxRate,
        saleGross: isSaleTabVisible ? (watchedSalePrice ?? null) : null,
        saleTaxPercentage: isSaleTabVisible ? saleTaxRate : null,
        buyDate: watchedBuyDate || null,
        saleDate: isSaleTabVisible ? (watchedSaleDate || null) : null,
        transactions: txnsForCalc,
        entries: vehicle?.expenses_earnings?.map((e) => ({ type: e.type, amount: e.amount })) ?? null,
        annualTargetRate: businessSettings?.target_annual_return,
        targetDaysOnStock: businessSettings?.target_days_on_stock,
        status: vehicle?.status ?? null,
    })

    // --- Validation & Mutation ---
    const validateSaleFields = (): boolean => {
        const errorsList: string[] = []
        if (!watch("sale_price") || Number(watch("sale_price")) <= 0) errorsList.push("Sale price")
        if (!watch("sale_date")) errorsList.push("Sale date")
        if (!watch("buyer_id")) errorsList.push("Buyer")
        if (!watch("sale_payment_method_id")) errorsList.push("Payment method")

        if (errorsList.length > 0) {
            alert(`Please fill in required fields for Sold status:\n• ${errorsList.join("\n• ")}`)
            return false
        }
        return true
    }

    const handleStatusChange = (newStatus: VehicleStatus | string) => {
        if (newStatus === "sold" && !validateSaleFields()) return
        setValue("status", newStatus as VehicleStatus, { shouldDirty: true })

        // Clear key number if sold or inactive
        if (newStatus === "sold" || newStatus === "inactive") {
            setValue("key_number_id", null as any, { shouldDirty: true })
        }

        if (isEditing && onAutoSave && !isInitializingRef.current) {
            const updateData: any = { status: newStatus }
            if (newStatus === "sold" || newStatus === "inactive") {
                updateData.key_number_id = null
            }
            onAutoSave(updateData as Partial<VehicleUpdateInput>)
        }
        if (newStatus === "sold" || newStatus === "inactive") {
            invalidateKeyChoiceCaches()
        }
    }

    const mutation = useMutation({
        mutationFn: async (data: VehicleCreateInput | VehicleUpdateInput) => {
            if (isEditing && vehicle?.internal_id) {
                const response = await api.patch(`/vehicles/${vehicle.internal_id}`, data)
                return response.data
            }
            const response = await api.post("/vehicles", data)
            return response.data
        },
        onSuccess: () => {
            setMutationError(null)
            queryClient.invalidateQueries({ queryKey: vehicleKeys.lists() })
            invalidateKeyChoiceCaches()
        },
        onError: (error: unknown) => {
            const message = getApiErrorMessage(error, "Failed to save vehicle.")
            setMutationError(message)
            window.scrollTo({ top: 0, behavior: "smooth" })
        },
    })

    const uploadVehicleImage = useCallback(async (targetId: number, file: File) => {
        setImageUploadError(null)
        setIsUploadingImage(true)
        try {
            const formData = new FormData()
            formData.append("image", file)
            const response = await api.post(`/vehicles/${targetId}/image`, formData, {
                headers: { "Content-Type": "multipart/form-data" }
            })
            // Update local query data to show the new image immediately
            queryClient.setQueryData(vehicleKeys.detail(targetId), response.data)
            queryClient.invalidateQueries({ queryKey: vehicleKeys.lists() })
            setSelectedImageFile(null)
        } catch (error) {
            setImageUploadError(getApiErrorMessage(error, "Failed to upload vehicle image."))
            throw error
        } finally {
            setIsUploadingImage(false)
        }
    }, [queryClient])

    const handleVehicleImageChange = useCallback(async (file: File | null) => {
        setSelectedImageFile(file)
        setImageUploadError(null)

        if (!file || !isEditing || !vehicle?.internal_id) return

        try {
            await uploadVehicleImage(vehicle.internal_id, file)
        } catch { }
    }, [isEditing, uploadVehicleImage, vehicle?.internal_id])

    const onSubmit = async (data: VehicleCreateInput | VehicleUpdateInput) => {
        setMutationError(null)
        if ((data as VehicleUpdateInput).status === "sold" && !validateSaleFields()) return

        // Deep copy and sanitize
        const cleanedData = JSON.parse(JSON.stringify(data))

        // Convert empty strings to null for all fields (Pydantic requirement)
        Object.keys(cleanedData).forEach(key => {
            if (cleanedData[key] === "" || cleanedData[key] === undefined) {
                cleanedData[key] = null
            }
        })

        try {
            const saved = await mutation.mutateAsync(cleanedData)
            if (selectedImageFile && saved?.internal_id) {
                await uploadVehicleImage(saved.internal_id, selectedImageFile)
            }
            if (!isEditing) handleBack()
        } catch {
            // Error handled by mutation.onError
        }
    }

    const onError = () => { window.scrollTo({ top: 0, behavior: "smooth" }) }

    if (choicesLoading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        )
    }

    return (
        <>
            <form onSubmit={handleSubmit(onSubmit, onError)} className="space-y-6">
                {/* Header - Only show in Add mode (Edit mode header is in VehicleFormPage) */}
                {!isEditing && (
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                onClick={handleBack}
                            >
                                <ArrowLeft className="h-5 w-5" />
                            </Button>
                            <div>
                                <div className="flex items-center gap-3">
                                    <h1 className="text-2xl font-bold text-foreground">
                                        Add New Vehicle
                                    </h1>
                                    <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                                        {nextIdLoading ? (
                                            <Loader2 className="h-3 w-3 animate-spin mr-1" />
                                        ) : null}
                                        Next ID: #{nextId ?? '...'}
                                    </span>
                                </div>
                                <p className="text-muted-foreground mt-1">
                                    Fill in the details to add a vehicle
                                </p>
                            </div>
                        </div>
                    </div>
                )}



                {/* Error Banner - API / Mutation Errors */}
                {mutationError && (
                    <div className="flex items-start gap-3 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3" role="alert">
                        <AlertTriangle className="h-5 w-5 text-red-500 mt-0.5 flex-shrink-0" />
                        <div className="flex-1">
                            <p className="text-sm font-medium text-red-500">Failed to save vehicle</p>
                            <p className="mt-1 text-sm text-red-400">{mutationError}</p>
                        </div>
                        <button
                            type="button"
                            onClick={() => setMutationError(null)}
                            className="text-red-400 hover:text-red-300 flex-shrink-0"
                        >
                            <X className="h-4 w-4" />
                        </button>
                    </div>
                )}

                {/* All Fields Content */}
                <div className="space-y-5">
                    {/* Basic Info Section */}
                    <div className="space-y-3">

                        <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-6">
                            {/* Branch */}
                            <div className="space-y-2">
                                <Label className="text-foreground">Branch <span className="text-red-500">*</span></Label>
                                <DynamicSelect
                                    choiceType="branch"
                                    options={toOptions(choices?.branches)}
                                    value={watch("branch_id") ?? null}
                                    onChange={(val) => handleDropdownChange("branch_id", val ?? 0)}
                                    placeholder="Select branch"
                                    createLabel="Branch"
                                    allowCreate={false}
                                />
                                {errors.branch_id && (
                                    <p className="text-sm text-red-500">{errors.branch_id.message}</p>
                                )}
                            </div>

                            {/* Make */}
                            <div className="space-y-2">
                                <Label className="text-foreground">Make <span className="text-red-500">*</span></Label>
                                <DynamicSelect
                                    choiceType="make"
                                    options={toOptions(choices?.makes)}
                                    value={watch("make_id") ?? null}
                                    onChange={(val) => {
                                        setValue("make_id", val ?? 0)
                                        // Reset model when make changes
                                        setValue("model_id", undefined as any)
                                        // Trigger immediate auto-save for dropdown
                                        if (isEditing && onAutoSave) {
                                            onAutoSave({ make_id: val ?? 0, model_id: undefined })
                                        }
                                    }}
                                    placeholder="Select make"
                                    createLabel="Make"
                                />
                                {errors.make_id && (
                                    <p className="text-sm text-red-500">{errors.make_id.message}</p>
                                )}
                            </div>

                            {/* Model (dependent on Make) */}
                            <ModelSelect
                                makeId={watch("make_id")}
                                value={watch("model_id") ?? null}
                                onChange={(val) => {
                                    handleDropdownChange("model_id", val ?? undefined)
                                }}
                                error={errors.model_id?.message}
                            />

                            {/* Vehicle Type */}
                            <div className="space-y-2">
                                <Label className="text-foreground">Vehicle Type <span className="text-red-500">*</span></Label>
                                <DynamicSelect
                                    choiceType="vehicle_type"
                                    options={toOptions(choices?.vehicle_types)}
                                    value={watch("vehicle_type_id") ?? null}
                                    onChange={(val) => handleDropdownChange("vehicle_type_id", val ?? 0)}
                                    placeholder="Select type"
                                    createLabel="Vehicle Type"
                                />
                                {errors.vehicle_type_id && (
                                    <p className="text-sm text-red-500">{errors.vehicle_type_id.message}</p>
                                )}
                            </div>

                            {/* Body Type */}
                            <div className="space-y-2">
                                <Label className="text-foreground">Body Type <span className="text-red-500">*</span></Label>
                                <DynamicSelect
                                    choiceType="body_type"
                                    options={toOptions(choices?.body_types)}
                                    value={watch("body_type_id") ?? null}
                                    onChange={(val) => handleDropdownChange("body_type_id", val ?? 0)}
                                    placeholder="Select body type"
                                    createLabel="Body Type"
                                />
                                {errors.body_type_id && (
                                    <p className="text-sm text-red-500">{errors.body_type_id.message}</p>
                                )}
                            </div>

                            {/* Color */}
                            <div className="space-y-2">
                                <Label className="text-foreground">Color <span className="text-red-500">*</span></Label>
                                <DynamicSelect
                                    choiceType="color"
                                    options={toOptions(choices?.colors)}
                                    value={watch("color_id") ?? null}
                                    onChange={(val) => handleDropdownChange("color_id", val ?? 0)}
                                    placeholder="Select color"
                                    createLabel="Color"
                                />
                                {errors.color_id && (
                                    <p className="text-sm text-red-500">{errors.color_id.message}</p>
                                )}
                            </div>

                            {/* Doors */}
                            <div className="space-y-2">
                                <Label className="text-foreground">Doors <span className="text-red-500">*</span></Label>
                                <DynamicSelect
                                    choiceType="doors"
                                    options={toOptions(choices?.doors)}
                                    value={watch("doors_id") ?? null}
                                    onChange={(val) => handleDropdownChange("doors_id", val ?? 0)}
                                    placeholder="Select doors"
                                    createLabel="Doors"
                                />
                                {errors.doors_id && (
                                    <p className="text-sm text-red-500">{errors.doors_id.message}</p>
                                )}
                            </div>

                            {/* Fuel Type */}
                            <div className="space-y-2">
                                <Label className="text-foreground">Fuel Type <span className="text-red-500">*</span></Label>
                                <DynamicSelect
                                    choiceType="fuel_type"
                                    options={toOptions(choices?.fuel_types)}
                                    value={watch("fuel_type_id") ?? null}
                                    onChange={(val) => handleDropdownChange("fuel_type_id", val ?? 0)}
                                    placeholder="Select fuel type"
                                    createLabel="Fuel Type"
                                />
                                {errors.fuel_type_id && (
                                    <p className="text-sm text-red-500">{errors.fuel_type_id.message}</p>
                                )}
                            </div>

                            {/* Damage Type */}
                            <div className="space-y-2">
                                <Label className="text-foreground">Damage Type <span className="text-red-500">*</span></Label>
                                <DynamicSelect
                                    choiceType="damage_type"
                                    options={toOptions(choices?.damage_types)}
                                    value={watch("damage_type_id") ?? null}
                                    onChange={(val) => handleDropdownChange("damage_type_id", val ?? 0)}
                                    placeholder="Select damage type"
                                    createLabel="Damage Type"
                                />
                                {errors.damage_type_id && (
                                    <p className="text-sm text-red-500">{errors.damage_type_id.message}</p>
                                )}
                            </div>

                            {/* Chassis Number */}
                            <div className="space-y-2">
                                <Label className="text-foreground">Chassis Number (VIN) <span className="text-red-500">*</span></Label>
                                <Input
                                    value={watch("chassis_number") ?? ""}
                                    onChange={(e) => handleTextChange("chassis_number", e.target.value)}
                                    placeholder="e.g., WVWZZZ3CZWE123456"
                                    className="text-foreground uppercase"
                                    maxLength={17}
                                />
                                {errors.chassis_number && (
                                    <p className="text-sm text-red-500">{errors.chassis_number.message}</p>
                                )}
                            </div>

                            {/* License Plate */}
                            <div className="space-y-2">
                                <Label className="text-foreground">License Plate</Label>
                                <Input
                                    value={watch("official_license_plate") ?? ""}
                                    onChange={(e) => handleTextChange("official_license_plate", e.target.value)}
                                    placeholder="e.g., B-AB 1234"
                                    className="text-foreground"
                                />
                            </div>

                            {/* Registration Number */}
                            <div className="space-y-2">
                                <Label className="text-foreground">Registration Number</Label>
                                <Input
                                    value={watch("motor_vehicle_registration_number") ?? ""}
                                    onChange={(e) => handleTextChange("motor_vehicle_registration_number", e.target.value)}
                                    placeholder="Motor vehicle registration"
                                    className="text-foreground"
                                />
                            </div>

                            {/* Key Number */}
                            {isKeyFieldVisible && (
                                <div className="space-y-2">
                                    <Label className="text-foreground">
                                        Key Number <span className="text-destructive">*</span>
                                    </Label>
                                    <DynamicSelect
                                        choiceType="key_number"
                                        options={keyNumberOptions}
                                        value={watchedKeyNumberId ?? null}
                                        onChange={(val) => handleDropdownChange("key_number_id", val ?? null)}
                                        placeholder="Select key number"
                                        createLabel="Key Number"
                                    />
                                    {errors.key_number_id && (
                                        <p className="text-sm text-red-500">{errors.key_number_id.message}</p>
                                    )}
                                </div>
                            )}

                            {/* Year */}
                            <div className="space-y-2">
                                <Label className="text-foreground">Year of Construction <span className="text-red-500">*</span></Label>
                                <Input
                                    type="number"
                                    value={watch("year_of_construction") ?? ""}
                                    onChange={(e) => handleNumberChange("year_of_construction", e.target.value)}
                                    placeholder="e.g., 2020"
                                    className="text-foreground"
                                />
                                {errors.year_of_construction && (
                                    <p className="text-sm text-red-500">{errors.year_of_construction.message}</p>
                                )}
                            </div>

                            {/* First Registration */}
                            <div className="space-y-2">
                                <Label className="text-foreground">First Registration Date</Label>
                                <Input
                                    type="date"
                                    value={watch("first_registration_date") ?? ""}
                                    onChange={(e) => handleDateChange("first_registration_date", e.target.value)}
                                    onClick={(e) => { try { e.currentTarget.showPicker(); } catch (err) { } }}
                                    className="text-foreground"
                                />
                            </div>

                            {/* Kilometer */}
                            <div className="space-y-2">
                                <Label className="text-foreground">Kilometer <span className="text-red-500">*</span></Label>
                                <Input
                                    type="number"
                                    value={watch("kilometer") ?? ""}
                                    onChange={(e) => handleNumberChange("kilometer", e.target.value)}
                                    placeholder="e.g., 50000"
                                    className="text-foreground"
                                />
                                {errors.kilometer && (
                                    <p className="text-sm text-red-500">{errors.kilometer.message}</p>
                                )}
                            </div>

                            {/* Power KW */}
                            <div className="space-y-2">
                                <Label className="text-foreground">Power (KW) <span className="text-red-500">*</span></Label>
                                <Input
                                    type="number"
                                    value={watch("power_kw") ?? ""}
                                    onChange={(e) => handleNumberChange("power_kw", e.target.value)}
                                    placeholder="e.g., 150"
                                    className="text-foreground"
                                />
                                {errors.power_kw && (
                                    <p className="text-sm text-red-500">{errors.power_kw.message}</p>
                                )}
                            </div>

                            {/* Rest of the layout handled by IIFE */}
                        </div>
                    </div>

                    {(() => {
                        const vehiclePhotoField = (
                            <div className={isEditing ? "flex flex-col h-full rounded-xl border border-border bg-card shadow-sm p-3" : "max-w-md md:col-span-2 lg:col-span-2 lg:row-span-2"}>
                                <VehicleImageUpload
                                    imageUrl={vehicle?.image_url}
                                    selectedFile={selectedImageFile}
                                    onFileChange={handleVehicleImageChange}
                                    isUploading={isUploadingImage}
                                    errorMessage={imageUploadError}
                                    disabled={mutation.isPending || isUploadingImage}
                                />
                            </div>
                        )

                        const descriptionField = (
                            <div className={isEditing ? "flex flex-col h-full space-y-2 rounded-xl border border-border bg-card shadow-sm p-3" : "space-y-2 md:col-span-2 lg:col-span-2"}>
                                <Label className="text-foreground">Description</Label>
                                <textarea
                                    value={watch("description") ?? ""}
                                    onChange={(e) => handleTextChange("description", e.target.value)}
                                    placeholder="Public description of the vehicle"
                                    className="flex-1 min-h-[4rem] w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                />
                            </div>
                        )

                        const internalCommentsField = (
                            <div className={isEditing ? "flex flex-col h-full space-y-2 rounded-xl border border-border bg-card shadow-sm p-3" : "space-y-2 md:col-span-2 lg:col-span-2"}>
                                <Label className="text-foreground">Internal Comments</Label>
                                <textarea
                                    value={watch("internal_comments") ?? ""}
                                    onChange={(e) => handleTextChange("internal_comments", e.target.value)}
                                    placeholder="Private notes (not visible to customers)"
                                    className="flex-1 min-h-[4rem] w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                />
                            </div>
                        )

                        const expensesEarningsBlock = isEditing && vehicle ? (
                            <div className="h-full">
                                <VehicleExpensesEarningsCard
                                    vehicleInternalId={vehicle.internal_id!}
                                    entries={vehicle.expenses_earnings ?? []}
                                    choices={choices}
                                />
                            </div>
                        ) : null

                        const buyDetailsCard = (
                            <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden h-full flex flex-col">
                                <div className="bg-muted/50 px-6 py-4 border-b border-border">
                                    <h2 className="text-lg font-semibold text-foreground">Buy Details</h2>
                                </div>
                                <div className="p-2 grid gap-2 sm:grid-cols-3 flex-1">
                                    <div className="col-span-1 sm:col-span-3 px-3 pt-3 pb-3 mb-2 border-b border-border/30">
                                        <div className="flex flex-row flex-wrap items-center gap-x-4 gap-y-1 min-w-0 rounded-md border p-2 shadow-sm transition-colors bg-background border-border/40 hover:border-border/80 w-full">
                                            <div className="flex items-center gap-1.5">
                                                <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold whitespace-nowrap">Net:</span>
                                                <span className={`text-sm font-bold ${getNumberColor(buyBreakdown.net)} whitespace-nowrap`}>
                                                    {formatMoneyOrDash(buyBreakdown.net)}
                                                </span>
                                            </div>
                                            <div className="text-[10px] text-muted-foreground/50 font-medium whitespace-nowrap">
                                                Gross ({formatMoneyOrDash(buyBreakdown.gross)}) − Tax {buyBreakdown.taxRate}% ({formatMoneyOrDash(buyBreakdown.taxAmount)})
                                            </div>
                                        </div>
                                    </div>

                                    {/* Buy Price */}
                                    <div className="space-y-2">
                                        <Label className="text-foreground">Buy Price (Gross) <span className="text-red-500">*</span></Label>
                                        <Input
                                            type="number"
                                            step="0.01"
                                            value={watch("buy_price") ?? ""}
                                            onChange={(e) => handleNumberChange("buy_price", e.target.value, (v) => v ? parseFloat(v) : undefined)}
                                            placeholder="0.00"
                                            className="text-foreground"
                                        />
                                        {errors.buy_price && (
                                            <p className="text-sm text-red-500">{errors.buy_price.message}</p>
                                        )}
                                    </div>

                                    {/* Buy Tax */}
                                    <div className="space-y-2">
                                        <Label className="text-foreground">Tax</Label>
                                        <DynamicSelect
                                            choiceType="tax_percentage"
                                            options={taxToOptions(choices?.tax_percentages)}
                                            value={watch("buy_tax_id") ?? null}
                                            onChange={(val) => handleDropdownChange("buy_tax_id", val)}
                                            placeholder="Select tax"
                                            createLabel="Tax Rate"
                                            showPercentage
                                        />
                                    </div>

                                    {/* Buy Date */}
                                    <div className="space-y-2">
                                        <Label className="text-foreground">Buy Date <span className="text-red-500">*</span></Label>
                                        <Input
                                            type="date"
                                            value={watch("buy_date") ?? ""}
                                            onChange={(e) => handleDateChange("buy_date", e.target.value)}
                                            onClick={(e) => { try { e.currentTarget.showPicker(); } catch (err) { } }}
                                            className="text-foreground"
                                        />
                                        {errors.buy_date && (
                                            <p className="text-sm text-red-500">{errors.buy_date.message}</p>
                                        )}
                                    </div>

                                    {/* Delivery Date */}
                                    <div className="space-y-2">
                                        <Label className="text-foreground">Delivery/Collection Date</Label>
                                        <Input
                                            type="date"
                                            value={watch("buy_delivery_collection_date") ?? ""}
                                            onChange={(e) => handleDateChange("buy_delivery_collection_date", e.target.value)}
                                            onClick={(e) => { try { e.currentTarget.showPicker(); } catch (err) { } }}
                                            className="text-foreground"
                                        />
                                    </div>

                                    {/* Payment Method */}
                                    <div className="space-y-2">
                                        <Label className="text-foreground">Payment Method <span className="text-red-500">*</span></Label>
                                        <DynamicSelect
                                            choiceType="payment_method"
                                            options={toOptions(choices?.payment_methods)}
                                            value={watch("buy_payment_method_id") ?? null}
                                            onChange={(val) => handleDropdownChange("buy_payment_method_id", val ?? 0)}
                                            placeholder="Select payment method"
                                            createLabel="Payment Method"
                                        />
                                        {errors.buy_payment_method_id && (
                                            <p className="text-sm text-red-500">{errors.buy_payment_method_id.message}</p>
                                        )}
                                    </div>

                                    {/* Seller */}
                                    <div className="space-y-2">
                                        <Label className="text-foreground">Seller <span className="text-red-500">*</span></Label>
                                        <DynamicSelect
                                            choiceType="legal_entity"
                                            options={choices?.legal_entities?.map((e) => ({ id: e.id, name: `#${e.internal_id} - ${e.name}` })) ?? []}
                                            value={watch("seller_id") ?? null}
                                            onChange={(val) => handleDropdownChange("seller_id", val ?? 0)}
                                            placeholder="Select seller"
                                            allowCreate={true}
                                            createLabel="Seller / Legal Entity"
                                            onAddClick={() => handleOpenEntityModal("seller_id")}
                                        />
                                        {errors.seller_id && (
                                            <p className="text-sm text-red-500">{errors.seller_id.message}</p>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )

                        const saleDetailsCard = isSaleTabVisible ? (
                            <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden h-full flex flex-col">
                                <div className="bg-muted/50 px-6 py-4 border-b border-border">
                                    <h2 className="text-lg font-semibold text-foreground">Sale Details</h2>
                                </div>
                                <div className="p-2 grid gap-2 sm:grid-cols-3 flex-1">
                                    <div className="col-span-1 sm:col-span-3 px-3 pt-3 pb-3 mb-2 border-b border-border/30">
                                        <div className="flex flex-row flex-wrap items-center gap-x-4 gap-y-1 min-w-0 rounded-md border p-2 shadow-sm transition-colors bg-background border-border/40 hover:border-border/80 w-full">
                                            <div className="flex items-center gap-1.5">
                                                <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold whitespace-nowrap">Net (Revenue):</span>
                                                <span className={`text-sm font-bold ${getNumberColor(saleBreakdown.net)} whitespace-nowrap`}>
                                                    {formatMoneyOrDash(saleBreakdown.net)}
                                                </span>
                                            </div>
                                            <div className="text-[10px] text-muted-foreground/50 font-medium whitespace-nowrap">
                                                Gross ({formatMoneyOrDash(saleBreakdown.gross)}) − Tax {saleBreakdown.taxRate}% ({formatMoneyOrDash(saleBreakdown.taxAmount)})
                                            </div>
                                        </div>
                                    </div>

                                    {/* Sale Price */}
                                    <div className="space-y-2">
                                        <Label className="text-foreground">Sale Price (Gross) <span className="text-red-500">*</span></Label>
                                        <Input
                                            type="number"
                                            step="0.01"
                                            value={watch("sale_price") ?? ""}
                                            onChange={(e) => handleNumberChange("sale_price", e.target.value, (v) => v ? parseFloat(v) : undefined)}
                                            placeholder="0.00"
                                            className="text-foreground"
                                        />
                                    </div>

                                    {/* Sale Tax */}
                                    <div className="space-y-2">
                                        <Label className="text-foreground">Tax</Label>
                                        <DynamicSelect
                                            choiceType="tax_percentage"
                                            options={taxToOptions(choices?.tax_percentages)}
                                            value={watch("sale_tax_id") ?? null}
                                            onChange={(val) => handleDropdownChange("sale_tax_id", val)}
                                            placeholder="Select tax"
                                            createLabel="Tax Rate"
                                            showPercentage
                                        />
                                    </div>

                                    {/* Sale Date */}
                                    <div className="space-y-2">
                                        <Label className="text-foreground">Sale Date <span className="text-red-500">*</span></Label>
                                        <Input
                                            type="date"
                                            value={watch("sale_date") ?? ""}
                                            onChange={(e) => handleDateChange("sale_date", e.target.value)}
                                            onMouseDown={(e) => {
                                                if (document.activeElement !== e.currentTarget) {
                                                    try { e.currentTarget.showPicker(); } catch (err) {}
                                                }
                                            }}
                                            className="text-foreground"
                                        />
                                    </div>

                                    {/* Delivery Date */}
                                    <div className="space-y-2">
                                        <Label className="text-foreground">Delivery Date</Label>
                                        <Input
                                            type="date"
                                            value={watch("sale_delivery_collection_date") ?? ""}
                                            onChange={(e) => handleDateChange("sale_delivery_collection_date", e.target.value)}
                                            onMouseDown={(e) => {
                                                if (document.activeElement !== e.currentTarget) {
                                                    try { e.currentTarget.showPicker(); } catch (err) {}
                                                }
                                            }}
                                            className="text-foreground"
                                        />
                                    </div>

                                    {/* Payment Method */}
                                    <div className="space-y-2">
                                        <Label className="text-foreground">Payment Method <span className="text-red-500">*</span></Label>
                                        <DynamicSelect
                                            choiceType="payment_method"
                                            options={toOptions(choices?.payment_methods)}
                                            value={watch("sale_payment_method_id") ?? null}
                                            onChange={(val) => handleDropdownChange("sale_payment_method_id", val)}
                                            placeholder="Select payment method"
                                            createLabel="Payment Method"
                                        />
                                    </div>

                                    {/* Buyer */}
                                    <div className="space-y-2">
                                        <Label className="text-foreground">Buyer <span className="text-red-500">*</span></Label>
                                        <DynamicSelect
                                            choiceType="legal_entity"
                                            options={choices?.legal_entities?.map((e) => ({ id: e.id, name: `#${e.internal_id} - ${e.name}` })) ?? []}
                                            value={watch("buyer_id") ?? null}
                                            onChange={(val) => handleDropdownChange("buyer_id", val)}
                                            placeholder="Select buyer"
                                            allowCreate={true}
                                            createLabel="Buyer / Legal Entity"
                                            onAddClick={() => handleOpenEntityModal("buyer_id")}
                                        />
                                        {((errors as any).buyer_id) && (
                                            <p className="text-sm text-red-500">{((errors as any).buyer_id).message}</p>
                                        )}
                                    </div>

                                    {/* Invoice Number */}
                                    <div className="space-y-2">
                                        <Label className="text-foreground">Invoice Number</Label>
                                        <Input
                                            value={watch("sale_invoice_number") ?? ""}
                                            onChange={(e) => handleTextChange("sale_invoice_number", e.target.value)}
                                            placeholder="Invoice #"
                                            className="text-foreground"
                                        />
                                    </div>
                                </div>
                            </div>
                        ) : null

                        const financialMetricsBlock = buyBreakdown.hasValue ? (
                            <FinancialMetricsStrip
                                financials={vehicleFinancials}
                                hideTransactions={!isEditing}
                                annualTargetRate={businessSettings?.target_annual_return}
                            />
                        ) : null

                        const transactionsBlock = inlineTransactions ?? null

                        if (isEditing) {
                            return (
                                <div className="grid grid-cols-6 gap-4">
                                    {/* Row 1: Photo, Desc, Internal Comments, Expenses */}
                                    <div className="col-span-6 lg:col-span-1">{vehiclePhotoField}</div>
                                    <div className="col-span-6 lg:col-span-1">{descriptionField}</div>
                                    <div className="col-span-6 lg:col-span-1">{internalCommentsField}</div>
                                    <div className="col-span-6 lg:col-span-3">{expensesEarningsBlock}</div>

                                    {/* Row 2: Buy & Sale */}
                                    <div className="col-span-6 lg:col-span-3">{buyDetailsCard}</div>
                                    <div className="col-span-6 lg:col-span-3">{saleDetailsCard}</div>

                                    {/* Row 3: Financials & Transactions */}
                                    <div className="col-span-6 lg:col-span-3">{financialMetricsBlock}</div>
                                    <div className="col-span-6 lg:col-span-3">{transactionsBlock}</div>
                                </div>
                            )
                        }

                        return (
                            <div className="space-y-5 mt-4">
                                <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-6">
                                    {vehiclePhotoField}
                                    {descriptionField}
                                    {internalCommentsField}
                                </div>
                                <div className="grid grid-cols-1 xl:grid-cols-2 gap-2 items-start">
                                    {buyDetailsCard}
                                    {saleDetailsCard}
                                </div>
                                {financialMetricsBlock}
                            </div>
                        )
                    })()}
                </div>



                {/* Form Actions - Sticky Footer */}
                <StickyFooter>
                    <div className="flex w-full flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
                        <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:gap-4">
                            <Button type="button" variant="outline" onClick={handleBack}>
                                {isEditing ? "Back" : "Cancel"}
                            </Button>

                            {isEditing && (
                                <>
                                    <span className="hidden sm:inline text-sm font-medium text-foreground mr-2">
                                        {vehicleTitle} <span className="text-muted-foreground">#{vehicle?.internal_id}</span>
                                    </span>
                                    <VehiclePipeline
                                        currentStatus={watchedStatus as VehicleStatus}
                                        canMoveTo={vehicle?.can_move_to || []}
                                        onStatusChange={handleStatusChange}
                                        orientation="horizontal"
                                    />
                                    {vehicleFinancials.daysOnStock !== null && (
                                        <div className={`hidden sm:flex items-center gap-2 rounded-lg border px-3 py-1.5 text-sm font-medium ${getDaysOnStockColor(vehicleFinancials.daysOnStock, businessSettings?.target_days_on_stock)} bg-card shadow-sm`}>
                                            <div className={`h-2 w-2 rounded-full ${getDaysOnStockBgColor(vehicleFinancials.daysOnStock, businessSettings?.target_days_on_stock)}`} />
                                            {vehicleFinancials.daysOnStock} Days on Stock
                                        </div>
                                    )}
                                </>
                            )}
                        </div>

                        {isEditing ? (
                            <div className="flex flex-wrap items-center gap-2 xl:justify-end">
                                <AutoSaveIndicator
                                    status={autoSaveStatus}
                                    errorMessage={autoSaveErrorMessage}
                                />

                                {splitViewToggle}

                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    className={canGenerateAnyContract ? "gap-2" : "gap-2 opacity-75"}
                                    onClick={() => setContractModalOpen(true)}
                                    title="Generate documents"
                                >
                                    <FileText className="h-4 w-4" />
                                    Documents
                                </Button>

                                <RecordNavigation
                                    basePath={`/${business_slug}/vehicles`}
                                    prevId={prevVehicleId}
                                    nextId={nextVehicleId}
                                    pathSuffix="/edit"
                                    label="Vehicle"
                                />
                            </div>
                        ) : (
                            <Button type="submit" disabled={mutation.isPending}>
                                {mutation.isPending ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Creating...
                                    </>
                                ) : (
                                    <>
                                        <Save className="mr-2 h-4 w-4" />
                                        Create Vehicle
                                    </>
                                )}
                            </Button>
                        )}
                    </div>
                </StickyFooter>
            </form>

            {/* ============================================================= */}
            {/* Full Legal Entity Creation Modal                              */}
            {/* Same form as the Legal Entities page — no shortcuts, no hacks */}
            {/* ============================================================= */}
            <Dialog open={entityModalOpen} onOpenChange={setEntityModalOpen}>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Add New Person / Entity</DialogTitle>
                        <DialogDescription>
                            Fill in all required details. This person will be immediately available as a {createEntityTarget === "seller_id" ? "Seller" : "Buyer"}.
                        </DialogDescription>
                    </DialogHeader>

                    <EntityForm
                        data={entityFormData}
                        onChange={setEntityFormData}
                        isNew
                        errors={entityValidationErrors}
                    />

                    {entityFormError && (
                        <p className="text-sm text-red-500 mt-2">{entityFormError}</p>
                    )}

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setEntityModalOpen(false)}>
                            Cancel
                        </Button>
                        <Button
                            onClick={handleCreateEntity}
                            disabled={createEntityMutation.isPending}
                        >
                            {createEntityMutation.isPending ? "Creating..." : "Create Legal Entity"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <ContractModal
                open={contractModalOpen}
                onOpenChange={setContractModalOpen}
                vehicle={vehicle ?? null}
            />
        </>
    )
}
