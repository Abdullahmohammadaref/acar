import { Loader2, Check, AlertCircle, Cloud } from "lucide-react"
import { cn } from "@/lib/utils"
import type { AutoSaveStatus } from "@/hooks/useAutoSave"

interface AutoSaveIndicatorProps {
    status: AutoSaveStatus
    errorMessage?: string | null
    className?: string
}

/**
 * Visual indicator for auto-save status.
 * Shows "Saving...", "Saved", or error message based on current status.
 */
export function AutoSaveIndicator({ status, errorMessage, className }: AutoSaveIndicatorProps) {
    if (status === "idle") {
        return null // No indicator when idle
    }

    return (
        <div
            className={cn(
                "flex items-center gap-1.5 text-sm transition-opacity duration-300",
                status === "saving" && "text-muted-foreground",
                status === "saved" && "text-green-600 dark:text-green-400",
                status === "error" && "text-red-600 dark:text-red-400",
                className
            )}
        >
            {status === "saving" && (
                <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    <span>Saving...</span>
                </>
            )}
            {status === "saved" && (
                <>
                    <Check className="h-3.5 w-3.5" />
                    <span>Saved</span>
                </>
            )}
            {status === "error" && (
                <>
                    <AlertCircle className="h-3.5 w-3.5" />
                    <span>{errorMessage || "Error saving"}</span>
                </>
            )}
        </div>
    )
}

/**
 * Compact version of the indicator - shows only an icon.
 * Good for tight spaces like headers.
 */
export function AutoSaveIndicatorCompact({ status, className }: Omit<AutoSaveIndicatorProps, 'errorMessage'>) {
    return (
        <div
            className={cn(
                "flex items-center transition-opacity duration-300",
                status === "idle" && "opacity-30",
                status === "saving" && "text-muted-foreground",
                status === "saved" && "text-green-600 dark:text-green-400",
                status === "error" && "text-red-600 dark:text-red-400",
                className
            )}
            title={
                status === "idle" ? "Auto-save enabled" :
                    status === "saving" ? "Saving..." :
                        status === "saved" ? "All changes saved" :
                            "Error saving"
            }
        >
            {status === "idle" && <Cloud className="h-4 w-4" />}
            {status === "saving" && <Loader2 className="h-4 w-4 animate-spin" />}
            {status === "saved" && <Check className="h-4 w-4" />}
            {status === "error" && <AlertCircle className="h-4 w-4" />}
        </div>
    )
}
