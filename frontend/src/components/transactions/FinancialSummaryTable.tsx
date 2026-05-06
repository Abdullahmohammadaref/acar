import { cn } from "@/lib/utils"
import type { TransactionFinancialSummary } from "@/types/transaction"

interface FinancialSummaryTableProps {
    summary?: TransactionFinancialSummary
    isLoading?: boolean
}

/**
 * Financial summary table showing Net, Tax, and Gross breakdown
 * Matches the legacy transactions.html layout
 */
export function FinancialSummaryTable({
    summary,
    isLoading,
}: FinancialSummaryTableProps) {
    if (isLoading) {
        return (
            <div className="rounded-lg border border-border bg-card p-4">
                <div className="h-32 animate-pulse bg-muted rounded" />
            </div>
        )
    }

    // Parse numeric value from string or number
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
        }).format(numValue)
    }

    const rows = [
        {
            label: "Net",
            revenue: parseValue(summary?.net_total_revenue),
            expenses: parseValue(summary?.net_total_expenses),
            difference: parseValue(summary?.net_difference),
        },
        {
            label: "Tax",
            revenue: parseValue(summary?.tax_total_revenue),
            expenses: parseValue(summary?.tax_total_expenses),
            difference: parseValue(summary?.tax_difference),
            hasDivider: true,
        },
        {
            label: "Gross",
            revenue: parseValue(summary?.gross_total_revenue),
            expenses: parseValue(summary?.gross_total_expenses),
            difference: parseValue(summary?.gross_difference),
        },
    ]

    return (
        <div className="rounded-xl border border-border bg-card overflow-hidden">
            <div className="overflow-x-auto">
                <table className="w-full text-sm">
                    <thead>
                        <tr className="border-b border-border bg-muted/50">
                            <th className="px-4 py-3 text-left font-medium text-muted-foreground w-24">
                                Type
                            </th>
                            <th className="px-4 py-3 text-right font-medium text-success-600 dark:text-success-400">
                                Revenue
                            </th>
                            <th className="px-4 py-3 text-center font-medium text-muted-foreground w-8">
                                -
                            </th>
                            <th className="px-4 py-3 text-right font-medium text-red-500">
                                Expenses
                            </th>
                            <th className="px-4 py-3 text-center font-medium text-muted-foreground w-8">
                                =
                            </th>
                            <th className="px-4 py-3 text-right font-medium text-foreground">
                                Difference
                            </th>
                        </tr>
                    </thead>
                    <tbody>
                        {rows.map((row) => (
                            <tr
                                key={row.label}
                                className={cn(
                                    "transition-colors hover:bg-muted/30",
                                    row.hasDivider && "border-b-2 border-border"
                                )}
                            >
                                <td className="px-4 py-3 font-medium text-foreground">
                                    {row.label}
                                </td>
                                <td className="px-4 py-3 text-right text-success-600 dark:text-success-400 font-mono">
                                    {formatCurrency(row.revenue)}
                                </td>
                                <td className="px-4 py-3 text-center text-muted-foreground">
                                    -
                                </td>
                                <td className="px-4 py-3 text-right text-red-500 font-mono">
                                    {formatCurrency(row.expenses)}
                                </td>
                                <td className="px-4 py-3 text-center text-muted-foreground">
                                    =
                                </td>
                                <td
                                    className={cn(
                                        "px-4 py-3 text-right font-mono font-semibold",
                                        row.difference >= 0
                                            ? "text-success-600 dark:text-success-400"
                                            : "text-red-500"
                                    )}
                                >
                                    {formatCurrency(row.difference)}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    )
}
