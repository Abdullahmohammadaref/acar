import { cn } from "@/lib/utils"

interface StickyFooterProps {
    children: React.ReactNode
    className?: string
}

export function StickyFooter({ children, className }: StickyFooterProps) {
    return (
        <div
            className={cn(
                "fixed bottom-0 right-0 z-40 flex items-center justify-between border-t border-gray-200 bg-white p-4 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)] dark:border-gray-700 dark:bg-gray-900",
                "left-0 md:left-64", // Respect sidebar width
                className
            )}
        >
            {children}
        </div>
    )
}
