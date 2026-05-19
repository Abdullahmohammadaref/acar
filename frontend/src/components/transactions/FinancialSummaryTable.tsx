import { cn } from "@/lib/utils"
import type { TransactionFinancialSummary } from "@/types/transaction"

interface FinancialSummaryTableProps {
    summary?: TransactionFinancialSummary
    isLoading?: boolean
}

/**
 * Financial summary showing 9 cards in a single line:
 * Net Revenue, Net Expenses, Net Profit,
 * Tax Revenue, Tax Expenses, Total Tax,
 * Gross Revenue, Gross Expenses, Gross Difference.
 */
export function FinancialSummaryTable({
    summary,
    isLoading,
}: FinancialSummaryTableProps) {
    if (isLoading) {
        return (
            <div className="flex gap-2 overflow-x-auto pb-2">
                {[...Array(9)].map((_, i) => (
                    <div key={i} className="h-20 w-32 animate-pulse bg-muted rounded-lg flex-shrink-0" />
                ))}
            </div>
        )
    }

    const parseValue = (value: string | number | undefined): number => {
        if (value === undefined) return 0
        if (typeof value === 'string') return parseFloat(value) || 0
        return value
    }

    const formatCurrency = (value: string | number | undefined) => {
        const numValue = parseValue(value)
        return new Intl.NumberFormat("de-DE", {
            style: "currency",
            currency: "EUR",
            maximumFractionDigits: 0,
        }).format(numValue)
    }

    const MiniCard = ({ label, value, colorClass }: { label: string, value: string, colorClass: string }) => (
        <div className="flex-1 min-w-[120px] p-3 rounded-xl border border-border bg-card shadow-sm transition-all hover:shadow-md">
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1 whitespace-nowrap">
                {label}
            </p>
            <p className={cn("text-sm font-mono font-bold truncate", colorClass)}>
                {value}
            </p>
        </div>
    )

    const cards = [
        { label: "Net Revenue", value: summary?.net_total_revenue, color: "text-emerald-600 dark:text-emerald-400" },
        { label: "Net Expenses", value: summary?.net_total_expenses, color: "text-red-500" },
        { label: "Net Profit", value: summary?.net_difference, color: parseValue(summary?.net_difference) >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-500" },
        
        { label: "Tax Revenue", value: summary?.tax_total_revenue, color: "text-emerald-600 dark:text-emerald-400" },
        { label: "Tax Expenses", value: summary?.tax_total_expenses, color: "text-red-500" },
        { label: "Total Tax", value: summary?.tax_difference, color: parseValue(summary?.tax_difference) >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-500" },
        
        { label: "Gross Revenue", value: summary?.gross_total_revenue, color: "text-emerald-600 dark:text-emerald-400" },
        { label: "Gross Expenses", value: summary?.gross_total_expenses, color: "text-red-500" },
        { label: "Gross Difference", value: summary?.gross_difference, color: parseValue(summary?.gross_difference) >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-500" },
    ]

    return (
        <div className="w-full overflow-x-auto pb-2 scrollbar-hide">
            <div className="flex flex-row gap-2 w-full">
                {cards.map((card, i) => (
                    <MiniCard 
                        key={i}
                        label={card.label}
                        value={formatCurrency(card.value)}
                        colorClass={card.color}
                    />
                ))}
            </div>
        </div>
    )
}
