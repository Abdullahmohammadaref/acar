import { CheckCircle, Clock, CheckSquare, HelpCircle, ChevronRight, ArrowDown } from "lucide-react"
import { useTranslation } from "react-i18next"
import { cn } from "@/lib/utils"

export type VehicleStatus = "purchased" | "ready_for_sale" | "reserved" | "sold" | "inactive"

interface VehiclePipelineProps {
    currentStatus: VehicleStatus
    canMoveTo: string[]
    onStatusChange?: (newStatus: VehicleStatus) => void
    orientation?: "horizontal" | "vertical"
    disabled?: boolean
    className?: string
}

const PIPELINE_ORDER: VehicleStatus[] = ["purchased", "ready_for_sale", "reserved", "sold"]

export function VehiclePipeline({
    currentStatus,
    canMoveTo,
    onStatusChange,
    orientation = "horizontal",
    disabled = false,
    className,
}: VehiclePipelineProps) {
    const { t } = useTranslation()

    // Base colors based on colors.md
    const statusConfig: Record<VehicleStatus, { icon: any, baseColor: string, bgColor: string, textColor: string }> = {
        purchased: {
            icon: CheckSquare,
            baseColor: "bg-amber-500",
            bgColor: "bg-amber-500/15",
            textColor: "text-amber-600 dark:text-amber-500",
        },
        ready_for_sale: {
            icon: Clock,
            baseColor: "bg-blue-600",
            bgColor: "bg-blue-600/15",
            textColor: "text-blue-600 dark:text-blue-500",
        },
        reserved: {
            icon: Clock,
            baseColor: "bg-purple-600",
            bgColor: "bg-purple-600/15",
            textColor: "text-purple-600 dark:text-purple-500",
        },
        sold: {
            icon: CheckCircle,
            baseColor: "bg-green-600",
            bgColor: "bg-green-600/15",
            textColor: "text-green-600 dark:text-green-500",
        },
        inactive: {
            icon: HelpCircle,
            baseColor: "bg-gray-500",
            bgColor: "bg-gray-500/15",
            textColor: "text-gray-600 dark:text-gray-400",
        },
    }

    const currentIndex = PIPELINE_ORDER.indexOf(currentStatus as any)

    return (
        <div className={cn(
            "flex",
            orientation === "horizontal" ? "flex-row items-center space-x-2" : "flex-col items-center space-y-2 w-full",
            className
        )}>
            {PIPELINE_ORDER.map((status, index) => {
                const isCurrent = currentStatus === status
                const isClickable = !disabled && canMoveTo.includes(status) && onStatusChange
                const isPast = currentIndex > -1 && index < currentIndex && !isCurrent
                const config = statusConfig[status]
                const Icon = config.icon

                // Base style: default or grayed out if neither current nor reachable
                let buttonStyle = "bg-muted text-muted-foreground ring-1 ring-inset ring-border opacity-60"
                if (isCurrent) {
                    buttonStyle = `${config.bgColor} ${config.textColor} ring-2 ring-inset ring-${config.baseColor.replace('bg-', '')}/30 opacity-100 shadow-sm font-semibold`
                } else if (isClickable) {
                    buttonStyle = `bg-background text-foreground ring-1 ring-inset ring-border hover:ring-${config.baseColor.replace('bg-', '')}/50 hover:bg-muted/50 cursor-pointer opacity-100`
                } else if (isPast) {
                    buttonStyle = `bg-background text-muted-foreground ring-1 ring-inset ring-border opacity-70`
                }

                return (
                    <div key={status} className={cn("flex", orientation === "horizontal" ? "items-center flex-row" : "flex-col items-center w-full")}>
                        <button
                            type="button"
                            disabled={!isClickable || disabled}
                            onClick={() => {
                                if (isClickable && onStatusChange) {
                                    onStatusChange(status)
                                }
                            }}
                            className={cn(
                                "flex items-center justify-center gap-1.5 rounded-full px-3 py-1.5 text-xs transition-all",
                                orientation === "vertical" && "w-full justify-start",
                                buttonStyle,
                                (!isClickable && !isCurrent) && "cursor-not-allowed"
                            )}
                            title={!isClickable && !isCurrent ? "Not allowed from current status" : undefined}
                        >
                            <Icon className="h-3.5 w-3.5" />
                            <span>{t(`status.${status}`) || status.replace(/_/g, ' ')}</span>
                        </button>
                        
                        {/* Connector arrow */}
                        {index < PIPELINE_ORDER.length - 1 && (
                            orientation === "horizontal" ? (
                                <ChevronRight className="h-4 w-4 text-muted-foreground/40 mx-1 flex-shrink-0" />
                            ) : (
                                <ArrowDown className="h-4 w-4 text-muted-foreground/40 my-1 flex-shrink-0" />
                            )
                        )}
                    </div>
                )
            })}
        </div>
    )
}
