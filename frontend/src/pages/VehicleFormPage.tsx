import { useParams, useNavigate } from "react-router-dom"
import { useQuery } from "@tanstack/react-query"
import { useState } from "react"
import { Loader2, ArrowLeft, PanelRightOpen, PanelRightClose } from "lucide-react"
import { VehicleForm } from "@/components/vehicles/VehicleForm"
import { RelatedTransactionsTable } from "@/components/transactions/RelatedTransactionsTable"
import { useAutoSave } from "@/hooks/useAutoSave"
import { vehicleKeys } from "@/hooks/useVehicles"
import { Button } from "@/components/ui/button"
import api from "@/lib/api"
import { useAuth } from "@/lib/auth"
import type { VehicleDetail } from "@/types/vehicle"
import type { VehicleUpdateInput } from "@/lib/validations"
import { useTranslation } from "react-i18next"
import { SplitViewDivider } from "@/components/SplitViewDivider"
import { getSplitWidth, saveSplitWidth, SPLIT_MIN, SPLIT_MAX } from "@/lib/paginationPrefs"
import { RecordNavigation } from "@/components/RecordNavigation"

const SPLIT_VIEW_KEY = "acar_vehicle_split_view"

/**
 * Vehicle form page for creating and editing vehicles
 *
 * In edit mode:
 * - Auto-saves on field changes (debounced for text, immediate for dropdowns)
 * - Shows navigation arrows instead of Save button
 * - Split view toggle moves transactions table beside the form
 */
export function VehicleFormPage() {
    const { t } = useTranslation()
    const navigate = useNavigate()
    const { user } = useAuth()
    const { business_slug, id } = useParams<{ business_slug: string; id: string }>()
    const isEditing = Boolean(id)
    const vehicleId = id ? Number(id) : 0

    // Split view preference persisted in localStorage
    const [splitView, setSplitView] = useState(() => {
        try {
            const saved = localStorage.getItem(SPLIT_VIEW_KEY)
            return saved !== null ? saved === "true" : true
        } catch {
            return true
        }
    })

    const [panelWidth, setPanelWidth] = useState(() => 
        getSplitWidth("acar_vehicle_split_width", 450)
    )
    const [isDragging, setIsDragging] = useState(false)

    const handleDrag = (deltaX: number) => {
        setPanelWidth(prev => {
            const next = prev - deltaX // Negative because dragging left should increase right panel
            const clamped = Math.min(SPLIT_MAX, Math.max(SPLIT_MIN, next))
            return clamped
        })
    }

    const handleDragEnd = () => {
        setIsDragging(false)
        saveSplitWidth("acar_vehicle_split_width", panelWidth)
    }

    const toggleSplitView = () => {
        const next = !splitView
        setSplitView(next)
        try {
            localStorage.setItem(SPLIT_VIEW_KEY, String(next))
        } catch { /* noop */ }
    }

    // Fetch vehicle data if editing
    const { data: vehicle, isLoading, isFetching, isError } = useQuery({
        queryKey: vehicleKeys.detail(vehicleId),
        queryFn: async (): Promise<VehicleDetail> => {
            const response = await api.get(`/vehicles/${id}`)
            return response.data
        },
        enabled: isEditing && Boolean(id),
    })

    // Auto-save hook
    const { status: autoSaveStatus, errorMessage, saveNow, saveDebounced } = useAutoSave<VehicleUpdateInput>({
        endpoint: `/vehicles/${vehicleId}`,
        method: 'PATCH',
        updateQueryKey: vehicleKeys.detail(vehicleId),
        invalidateQueryKeys: [vehicleKeys.lists()],
    })

    const handleBack = () => {
        if (window.history.state && window.history.state.idx > 0) {
            navigate(-1)
        } else {
            navigate(`/${business_slug}/vehicles`)
        }
    }

    const showTransactions = isEditing && vehicle && vehicle.internal_id && (user?.is_manager || user?.transactions_access)

    // Loading state
    if (isEditing && (isLoading || isFetching)) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        )
    }

    // Error state
    if (isEditing && (isError || !vehicle)) {
        return (
            <div className="space-y-6">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" onClick={handleBack}>
                        <ArrowLeft className="h-5 w-5" />
                    </Button>
                    <h1 className="text-2xl font-bold text-foreground">Vehicle Not Found</h1>
                </div>
                <p className="text-muted-foreground">
                    The vehicle with ID {id} could not be found.
                </p>
            </div>
        )
    }

    const prevVehicleId = vehicle?.prev_vehicle_internal_id ?? null
    const nextVehicleId = vehicle?.next_vehicle_internal_id ?? null

    const formContent = (
        <div className={splitView && showTransactions ? "min-w-0 flex-1" : "w-full"}>
            {isEditing && vehicle && (
                <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
                    <div className="flex items-center gap-4">
                        <Button variant="ghost" size="icon" onClick={handleBack}>
                            <ArrowLeft className="h-5 w-5" />
                        </Button>
                        <div>
                            <h1 className="text-2xl font-bold text-foreground">
                                {t("vehicles.editTitle") || "Edit"} — {vehicle.make_name} {vehicle.model_name}{" "}
                                <span className="text-muted-foreground">#{vehicle.internal_id}</span>
                            </h1>
                        </div>
                    </div>
                    
                    <RecordNavigation
                        basePath={`/${business_slug}/vehicles`}
                        prevId={prevVehicleId}
                        nextId={nextVehicleId}
                        pathSuffix="/edit"
                        label="Vehicle"
                    />
                </div>
            )}

            <VehicleForm
                vehicle={isEditing ? vehicle : undefined}
                isEditing={isEditing}
                onAutoSave={isEditing ? saveNow : undefined}
                onAutoSaveDebounced={isEditing ? saveDebounced : undefined}
                prevVehicleId={prevVehicleId}
                nextVehicleId={nextVehicleId}
                autoSaveStatus={autoSaveStatus}
                autoSaveErrorMessage={errorMessage}
                splitViewToggle={showTransactions ? (
                    <div className="flex items-center gap-2">
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="gap-1.5 text-xs"
                            onClick={toggleSplitView}
                            title={splitView ? "Show transactions below" : "Show transactions side-by-side"}
                        >
                        {splitView ? (
                            <>
                                <PanelRightClose className="h-3.5 w-3.5" />
                                <span className="hidden sm:inline">Stack View</span>
                            </>
                        ) : (
                            <>
                                <PanelRightOpen className="h-3.5 w-3.5" />
                                <span className="hidden sm:inline">Split View</span>
                            </>
                        )}
                    </Button>
                    </div>
                ) : undefined}
                inlineTransactions={
                    showTransactions && !splitView ? (
                        <div className="mt-8">
                            <RelatedTransactionsTable
                                vehicleId={vehicle!.internal_id!}
                                vehicleName={`${vehicle!.make_name || ''} ${vehicle!.model_name || ''}`}
                                hideNavigationLink={true}
                            />
                        </div>
                    ) : undefined
                }
            />

            {/* Spacer for Sticky Footer */}
            <div className={isEditing ? "pb-32 md:pb-24" : "pb-24"} />
        </div>
    )

    const transactionsPanel = showTransactions && splitView ? (
        <div 
            style={{ width: `${panelWidth}px` }}
            className={`hidden 2xl:block 2xl:flex-shrink-0 2xl:sticky 2xl:top-4 2xl:max-h-[calc(100vh-6rem)] 2xl:overflow-y-auto ${isDragging ? 'pointer-events-none' : ''}`}
        >
            <RelatedTransactionsTable
                vehicleId={vehicle!.internal_id!}
                vehicleName={`${vehicle!.make_name || ''} ${vehicle!.model_name || ''}`}
                hideNavigationLink={true}
            />
        </div>
    ) : null

    const transactionsPanelMobile = showTransactions && splitView ? (
        <div className="2xl:hidden w-full">
            <RelatedTransactionsTable
                vehicleId={vehicle!.internal_id!}
                vehicleName={`${vehicle!.make_name || ''} ${vehicle!.model_name || ''}`}
                hideNavigationLink={true}
            />
        </div>
    ) : null

    // Split view layout
    if (splitView && showTransactions) {
        return (
            <div className="flex flex-col 2xl:flex-row gap-4 2xl:gap-0 2xl:items-start relative">
                <div className={`flex-1 min-w-0 ${isDragging ? 'pointer-events-none' : ''}`}>
                    {formContent}
                    {transactionsPanelMobile}
                </div>
                
                {/* Draggable Divider */}
                <SplitViewDivider 
                    onDrag={handleDrag}
                    onDragStart={() => setIsDragging(true)}
                    onDragEnd={handleDragEnd}
                />

                {transactionsPanel}
            </div>
        )
    }

    // Standard stacked layout
    return (
        <div className="space-y-8">
            {isEditing && vehicle && (
                <div className="flex flex-wrap items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <Button variant="ghost" size="icon" onClick={handleBack}>
                            <ArrowLeft className="h-5 w-5" />
                        </Button>
                        <div>
                            <h1 className="text-2xl font-bold text-foreground">
                                {t("vehicles.editTitle") || "Edit"} — {vehicle.make_name} {vehicle.model_name}{" "}
                                <span className="text-muted-foreground">#{vehicle.internal_id}</span>
                            </h1>
                        </div>
                    </div>
                    
                    <RecordNavigation
                        basePath={`/${business_slug}/vehicles`}
                        prevId={prevVehicleId}
                        nextId={nextVehicleId}
                        pathSuffix="/edit"
                        label="Vehicle"
                    />
                </div>
            )}

            <VehicleForm
                vehicle={isEditing ? vehicle : undefined}
                isEditing={isEditing}
                onAutoSave={isEditing ? saveNow : undefined}
                onAutoSaveDebounced={isEditing ? saveDebounced : undefined}
                prevVehicleId={prevVehicleId}
                nextVehicleId={nextVehicleId}
                autoSaveStatus={autoSaveStatus}
                autoSaveErrorMessage={errorMessage}
                splitViewToggle={showTransactions ? (
                    <div className="flex items-center gap-2">
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="gap-1.5 text-xs"
                            onClick={toggleSplitView}
                            title={splitView ? "Show transactions below" : "Show transactions side-by-side"}
                        >
                        {splitView ? (
                            <>
                                <PanelRightClose className="h-3.5 w-3.5" />
                                <span className="hidden sm:inline">Stack View</span>
                            </>
                        ) : (
                            <>
                                <PanelRightOpen className="h-3.5 w-3.5" />
                                <span className="hidden sm:inline">Split View</span>
                            </>
                        )}
                    </Button>
                    </div>
                ) : undefined}
                inlineTransactions={
                    showTransactions && !splitView ? (
                        <RelatedTransactionsTable
                            vehicleId={vehicle!.internal_id!}
                            vehicleName={`${vehicle!.make_name || ''} ${vehicle!.model_name || ''}`}
                            hideNavigationLink={true}
                        />
                    ) : undefined
                }
            />

            {/* Spacer for Sticky Footer */}
            <div className={isEditing ? "pb-32 md:pb-24" : "pb-24"} />
        </div>
    )
}
