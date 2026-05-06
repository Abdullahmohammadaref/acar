import { useState } from "react"
import { FileText, Globe, ArrowLeft, Receipt, ClipboardList, FileSignature } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import type { VehicleListItem } from "@/types/vehicle"

interface ContractModalProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    vehicle: VehicleListItem | null
}

type ModalStep = "choose-type" | "sale-region" | "sale-documents"
type SaleRegion = "eu" | "non-eu"

/**
 * Contract generation modal with:
 * - Buy: Immediate PDF generation
 * - Sale: EU/Non-EU wizard with 3 document options
 *
 * PDFs are generated via backend API endpoints at /api/vehicles/{id}/pdf/{type}
 * and opened directly in a new browser tab.
 *
 * NOTE: Multi-document options open two separate tabs. The user may need to
 * "Allow popups from this site" in their browser on first use.
 */
export function ContractModal({
    open,
    onOpenChange,
    vehicle,
}: ContractModalProps) {
    const [step, setStep] = useState<ModalStep>("choose-type")
    const [saleRegion, setSaleRegion] = useState<SaleRegion | null>(null)

    // Reset state when modal closes
    const handleOpenChange = (isOpen: boolean) => {
        if (!isOpen) {
            setStep("choose-type")
            setSaleRegion(null)
        }
        onOpenChange(isOpen)
    }

    // Helper: build API PDF URL
    const pdfUrl = (type: string, params?: Record<string, string>) => {
        let url = `/api/vehicles/${vehicle?.internal_id}/pdf/${type}`
        if (params) {
            const query = new URLSearchParams(params).toString()
            if (query) url += `?${query}`
        }
        return url
    }

    const openPdfTabs = (urls: string[]) => {
        const timestamp = Date.now()

        urls.forEach((url, index) => {
            const link = document.createElement("a")
            link.href = url
            link.target = `pdf-tab-${timestamp}-${index}`
            link.rel = "noopener noreferrer"
            link.style.display = "none"

            document.body.appendChild(link)
            link.click()
            document.body.removeChild(link)
        })

        setTimeout(() => handleOpenChange(false), 50)
    }

    // Generate buy contract PDF (single tab)
    const handleBuyContract = (e: React.MouseEvent) => {
        e.preventDefault()
        e.stopPropagation()
        if (!vehicle?.internal_id) return
        window.open(pdfUrl("buy-contract"), "_blank")
        // Defer modal close so it doesn't interfere with the navigation
        setTimeout(() => handleOpenChange(false), 50)
    }

    // Start sale contract wizard
    const handleSaleContract = () => {
        setStep("sale-region")
    }

    // Select EU/Non-EU region
    const handleSelectRegion = (region: SaleRegion) => {
        setSaleRegion(region)
        setStep("sale-documents")
    }

    // Generate Sales Agreement + Identity Check (two separate tabs)
    const handleSalesAgreement = (e: React.MouseEvent) => {
        e.preventDefault()
        e.stopPropagation()
        if (!vehicle?.internal_id) return
        openPdfTabs([
            pdfUrl("sale-agreement"),
            pdfUrl("identity-check"),
        ])
    }

    // Generate Receipt + Identity Check (two separate tabs)
    const handleReceipt = (e: React.MouseEvent) => {
        e.preventDefault()
        e.stopPropagation()
        if (!vehicle?.internal_id) return

        // Map frontend "non-eu" to backend expected "outside_eu"
        const backendRegion = saleRegion === "non-eu" ? "outside_eu" : "eu"
        openPdfTabs([
            pdfUrl("receipt", { region: backendRegion }),
            pdfUrl("identity-check"),
        ])
    }

    // Generate Binding Order (single tab)
    const handleBindingOrder = (e: React.MouseEvent) => {
        e.preventDefault()
        e.stopPropagation()
        if (!vehicle?.internal_id) return
        window.open(pdfUrl("binding-order"), "_blank")
        setTimeout(() => handleOpenChange(false), 50)
    }

    // Go back one step
    const handleBack = () => {
        if (step === "sale-documents") {
            setStep("sale-region")
            setSaleRegion(null)
        } else if (step === "sale-region") {
            setStep("choose-type")
        }
    }

    if (!vehicle) return null

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogContent className="sm:max-w-[450px]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        {step !== "choose-type" && (
                            <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6 mr-1"
                                onClick={handleBack}
                            >
                                <ArrowLeft className="h-4 w-4" />
                            </Button>
                        )}
                        <FileText className="h-5 w-5" />
                        Generate Documents
                    </DialogTitle>
                </DialogHeader>

                <div className="mt-2">
                    {/* Vehicle Info */}
                    <p className="text-sm text-muted-foreground mb-4">
                        Vehicle: <strong>{vehicle.make_name} {vehicle.model_name}</strong> (ID: {vehicle.internal_id})
                    </p>

                    {/* Step 1: Choose Type (Buy vs Sale) */}
                    {step === "choose-type" && (
                        <div className="space-y-4">
                            <p className="text-sm text-muted-foreground">Select document type:</p>
                            <div className="grid grid-cols-2 gap-4">
                                <Button
                                    type="button"
                                    variant="outline"
                                    className="h-auto flex-col gap-2 p-4 hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-950"
                                    onClick={handleBuyContract}
                                    disabled={!vehicle.can_generate_buy_contract}
                                >
                                    <FileText className="h-8 w-8 text-blue-500" />
                                    <span className="font-medium">Purchase Contract</span>
                                    <span className="text-xs text-muted-foreground">
                                        {vehicle.can_generate_buy_contract ? "Opens PDF" : "Not available"}
                                    </span>
                                </Button>
                                <Button
                                    type="button"
                                    variant="outline"
                                    className="h-auto flex-col gap-2 p-4 hover:border-green-500 hover:bg-green-50 dark:hover:bg-green-950"
                                    onClick={handleSaleContract}
                                    disabled={!vehicle.can_generate_sale_contract}
                                >
                                    <FileText className="h-8 w-8 text-green-500" />
                                    <span className="font-medium">Sale Documents</span>
                                    <span className="text-xs text-muted-foreground">
                                        {vehicle.can_generate_sale_contract ? "Choose options" : "Not available"}
                                    </span>
                                </Button>
                            </div>
                        </div>
                    )}

                    {/* Step 2: Sale Region (EU vs Non-EU) */}
                    {step === "sale-region" && (
                        <div className="space-y-4">
                            <p className="text-sm text-muted-foreground">Select the sale destination:</p>
                            <div className="grid grid-cols-2 gap-4">
                                <Button
                                    type="button"
                                    variant="outline"
                                    className="h-auto flex-col gap-2 p-4 hover:border-primary hover:bg-primary/5"
                                    onClick={() => handleSelectRegion("eu")}
                                >
                                    <Globe className="h-8 w-8 text-primary" />
                                    <span className="font-medium">Sale to EU Country</span>
                                </Button>
                                <Button
                                    type="button"
                                    variant="outline"
                                    className="h-auto flex-col gap-2 p-4 hover:border-orange-500 hover:bg-orange-50 dark:hover:bg-orange-950"
                                    onClick={() => handleSelectRegion("non-eu")}
                                >
                                    <Globe className="h-8 w-8 text-orange-500" />
                                    <span className="font-medium">Sale Outside EU</span>
                                </Button>
                            </div>
                        </div>
                    )}

                    {/* Step 3: Document Selection */}
                    {step === "sale-documents" && (
                        <div className="space-y-4">
                            <p className="text-sm text-muted-foreground">
                                {saleRegion === "eu" ? "Sale to EU Country" : "Sale Outside EU"} - Select document:
                            </p>
                            <div className="space-y-3">
                                <Button
                                    type="button"
                                    variant="outline"
                                    className="w-full justify-start gap-3 h-auto p-3 hover:border-green-500 hover:bg-green-50 dark:hover:bg-green-950"
                                    onClick={handleSalesAgreement}
                                >
                                    <FileSignature className="h-6 w-6 text-green-500 flex-shrink-0" />
                                    <div className="text-left">
                                        <span className="font-medium">Sales Agreement</span>
                                        <p className="text-xs text-muted-foreground">Generates 2 PDFs</p>
                                    </div>
                                </Button>
                                <Button
                                    type="button"
                                    variant="outline"
                                    className="w-full justify-start gap-3 h-auto p-3 hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-950"
                                    onClick={handleReceipt}
                                >
                                    <Receipt className="h-6 w-6 text-blue-500 flex-shrink-0" />
                                    <div className="text-left">
                                        <span className="font-medium">Receipt</span>
                                        <p className="text-xs text-muted-foreground">Generates 2 PDFs</p>
                                    </div>
                                </Button>
                                <Button
                                    type="button"
                                    variant="outline"
                                    className="w-full justify-start gap-3 h-auto p-3 hover:border-purple-500 hover:bg-purple-50 dark:hover:bg-purple-950"
                                    onClick={handleBindingOrder}
                                >
                                    <ClipboardList className="h-6 w-6 text-purple-500 flex-shrink-0" />
                                    <div className="text-left">
                                        <span className="font-medium">Binding Order</span>
                                        <p className="text-xs text-muted-foreground">Generates 1 PDF</p>
                                    </div>
                                </Button>
                            </div>
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    )
}
