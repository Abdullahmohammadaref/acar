import { useState } from "react"
import {
    CheckCircle,
    XCircle,
    Clock,
    Tag,
    ShoppingCart,
    AlertTriangle,
    Power,
    Loader2,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog"

export type VehicleStatus = "purchased" | "ready_for_sale" | "reserved" | "sold" | "inactive"

interface StatusBannerProps {
    status: VehicleStatus
    onStatusChange: (newStatus: VehicleStatus) => void
    isLoading?: boolean
    vehicleTitle?: string
    variant?: "banner" | "footer"
    className?: string
}

/**
 * Status configuration for visual styling and actions.
 */
const STATUS_CONFIG: Record<VehicleStatus, {
    label: string
    color: string
    bgColor: string
    borderColor: string
    icon: typeof CheckCircle
    description: string
}> = {
    purchased: {
        label: "Purchased",
        color: "text-green-700 dark:text-green-400",
        bgColor: "bg-green-50 dark:bg-green-950/50",
        borderColor: "border-green-200 dark:border-green-800",
        icon: ShoppingCart,
        description: "Vehicle has been purchased and is in inventory",
    },
    ready_for_sale: {
        label: "Ready for Sale",
        color: "text-orange-700 dark:text-orange-400",
        bgColor: "bg-orange-50 dark:bg-orange-950/50",
        borderColor: "border-orange-200 dark:border-orange-800",
        icon: Tag,
        description: "Vehicle is ready and available for sale",
    },
    reserved: {
        label: "Reserved",
        color: "text-blue-700 dark:text-blue-400",
        bgColor: "bg-blue-50 dark:bg-blue-950/50",
        borderColor: "border-blue-200 dark:border-blue-800",
        icon: Clock,
        description: "Vehicle is reserved for a customer",
    },
    sold: {
        label: "Sold",
        color: "text-red-700 dark:text-red-400",
        bgColor: "bg-red-50 dark:bg-red-950/50",
        borderColor: "border-red-200 dark:border-red-800",
        icon: CheckCircle,
        description: "Vehicle has been sold",
    },
    inactive: {
        label: "Inactive",
        color: "text-gray-700 dark:text-gray-400",
        bgColor: "bg-gray-50 dark:bg-gray-900/50",
        borderColor: "border-gray-200 dark:border-gray-700",
        icon: XCircle,
        description: "Vehicle is deactivated",
    },
}

/**
 * State machine: defines available transitions for each status.
 */
const STATUS_TRANSITIONS: Record<VehicleStatus, Array<{
    to: VehicleStatus
    label: string
    variant: "default" | "outline" | "destructive" | "secondary"
    requiresConfirmation?: boolean
    confirmTitle?: string
    confirmDescription?: string
}>> = {
    purchased: [
        { to: "ready_for_sale", label: "Ready for Sale", variant: "default" },
        { to: "reserved", label: "Reserve", variant: "secondary" },
        {
            to: "inactive",
            label: "Deactivate",
            variant: "outline",
            requiresConfirmation: true,
            confirmTitle: "Deactivate Vehicle?",
            confirmDescription: "This will mark the vehicle as inactive. You can reactivate it later.",
        },
    ],
    inactive: [
        { to: "purchased", label: "Activate", variant: "default" },
    ],
    ready_for_sale: [
        { to: "sold", label: "Mark as Sold", variant: "default" },
        {
            to: "inactive",
            label: "Deactivate",
            variant: "outline",
            requiresConfirmation: true,
            confirmTitle: "Deactivate Vehicle?",
            confirmDescription: "This will mark the vehicle as inactive. You can reactivate it later.",
        },
    ],
    reserved: [
        { to: "sold", label: "Mark as Sold", variant: "default" },
        {
            to: "inactive",
            label: "Deactivate",
            variant: "outline",
            requiresConfirmation: true,
            confirmTitle: "Deactivate Vehicle?",
            confirmDescription: "This will mark the vehicle as inactive. You can reactivate it later.",
        },
    ],
    sold: [
        {
            to: "inactive",
            label: "Cancel Sale",
            variant: "destructive",
            requiresConfirmation: true,
            confirmTitle: "Cancel Sale?",
            confirmDescription: "This will mark the vehicle as inactive and reverse the sale status. This action cannot be undone.",
        },
    ],
}

const ACTION_BUTTON_CLASSES: Partial<Record<VehicleStatus, string>> = {
    purchased: "border-green-200 bg-green-600 text-white hover:bg-green-700 dark:border-green-800 dark:bg-green-600 dark:hover:bg-green-500",
    ready_for_sale: "border-orange-200 bg-orange-500 text-white hover:bg-orange-600 dark:border-orange-800 dark:bg-orange-500 dark:hover:bg-orange-400",
    reserved: "border-blue-200 bg-blue-600 text-white hover:bg-blue-700 dark:border-blue-800 dark:bg-blue-600 dark:hover:bg-blue-500",
    sold: "border-red-200 bg-red-600 text-white hover:bg-red-700 dark:border-red-800 dark:bg-red-600 dark:hover:bg-red-500",
}

function getActionButtonClass(
    transition: (typeof STATUS_TRANSITIONS)[VehicleStatus][number]
) {
    if (transition.variant === "destructive" || transition.variant === "outline") {
        return undefined
    }

    return ACTION_BUTTON_CLASSES[transition.to]
}

/**
 * Displays the current vehicle status and the valid status actions.
 */
export function StatusBanner({
    status,
    onStatusChange,
    isLoading = false,
    vehicleTitle: _vehicleTitle,
    variant = "banner",
    className,
}: StatusBannerProps) {
    const [confirmDialog, setConfirmDialog] = useState<{
        open: boolean
        targetStatus: VehicleStatus | null
        title: string
        description: string
    }>({
        open: false,
        targetStatus: null,
        title: "",
        description: "",
    })

    const config = STATUS_CONFIG[status]
    const transitions = STATUS_TRANSITIONS[status]
    const StatusIcon = config.icon

    const handleAction = (transition: typeof transitions[0]) => {
        if (transition.requiresConfirmation) {
            setConfirmDialog({
                open: true,
                targetStatus: transition.to,
                title: transition.confirmTitle || "Confirm Action",
                description: transition.confirmDescription || "Are you sure you want to proceed?",
            })
            return
        }

        onStatusChange(transition.to)
    }

    const handleConfirm = () => {
        if (confirmDialog.targetStatus) {
            onStatusChange(confirmDialog.targetStatus)
        }

        setConfirmDialog({ open: false, targetStatus: null, title: "", description: "" })
    }

    const handleCancel = () => {
        setConfirmDialog({ open: false, targetStatus: null, title: "", description: "" })
    }

    const renderActions = () => {
        if (isLoading) {
            return (
                <div className="flex items-center gap-2 text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span className="text-sm">Updating...</span>
                </div>
            )
        }

        return transitions.map((transition) => (
            <Button
                key={transition.to}
                variant={transition.variant}
                size="sm"
                onClick={() => handleAction(transition)}
                disabled={isLoading}
                className={getActionButtonClass(transition)}
            >
                {transition.to === "inactive" && <Power className="mr-1 h-4 w-4" />}
                {transition.label}
            </Button>
        ))
    }

    const statusInfo = (
        <div className="flex items-center gap-3">
            <div className={cn("rounded-lg border p-2", config.bgColor, config.borderColor)}>
                <StatusIcon className={cn("h-5 w-5", config.color)} />
            </div>
            <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                    <Badge className={cn("border", config.bgColor, config.color, config.borderColor)}>
                        {config.label}
                    </Badge>

                </div>
                {variant === "banner" && (
                    <p className="mt-1 text-sm text-muted-foreground">
                        {config.description}
                    </p>
                )}
            </div>
        </div>
    )

    return (
        <>
            {variant === "footer" ? (
                <div className={cn("flex flex-col gap-3 xl:flex-row xl:items-center xl:gap-4", className)}>
                    {statusInfo}
                    <div className="flex flex-wrap items-center gap-2">
                        {renderActions()}
                    </div>
                </div>
            ) : (
                <div className={cn("rounded-xl border-2 p-4", config.bgColor, config.borderColor, className)}>
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                        {statusInfo}
                        <div className="flex flex-wrap items-center gap-2">
                            {renderActions()}
                        </div>
                    </div>
                </div>
            )}

            <AlertDialog open={confirmDialog.open} onOpenChange={(open) => !open && handleCancel()}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle className="flex items-center gap-2">
                            <AlertTriangle className="h-5 w-5 text-amber-500" />
                            {confirmDialog.title}
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                            {confirmDialog.description}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel onClick={handleCancel}>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleConfirm}>Confirm</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    )
}

export function VehicleStatusFooterActions(props: Omit<StatusBannerProps, "variant">) {
    return <StatusBanner {...props} variant="footer" />
}
