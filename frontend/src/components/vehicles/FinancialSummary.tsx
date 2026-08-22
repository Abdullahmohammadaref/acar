import { TrendingUp, TrendingDown, DollarSign, BarChart3, Target, Clock, Scale } from "lucide-react"
import { formatCurrency } from "@/lib/utils"
import {
    getProfitColor,
    formatPercent,
} from "@/lib/vehicleFinancials"
import type { FinancialSummary } from "@/types/vehicle"

interface FinancialSummaryCardProps {
    summary: FinancialSummary | undefined
    isLoading: boolean
}

export function FinancialSummaryCard({
    summary,
    isLoading,
}: FinancialSummaryCardProps) {
    if (isLoading || !summary) {
        return (
            <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
                {[1, 2, 3, 4, 5].map((i) => (
                    <div
                        key={i}
                        className="animate-pulse rounded-xl border border-border bg-card p-4"
                    >
                        <div className="h-4 w-20 rounded bg-muted" />
                        <div className="mt-2 h-6 w-24 rounded bg-muted" />
                    </div>
                ))}
            </div>
        )
    }

    // Calculate derived aggregate metrics
    const profitMargin = summary.net_total_revenue !== 0
        ? Math.round((summary.net_difference / summary.net_total_revenue) * 100 * 10) / 10
        : null

    const roi = summary.net_total_expenses !== 0
        ? Math.round((summary.net_difference / summary.net_total_expenses) * 100 * 10) / 10
        : null

    const vatLiability = Math.abs(summary.tax_total_revenue - summary.tax_total_expenses)
    const totalProfit = summary.net_difference - vatLiability

    const cards = [
        {
            label: "Gross Revenue",
            value: summary.gross_total_revenue,
            subLabel: "Net",
            subValue: summary.net_total_revenue,
            icon: TrendingUp,
            color: "text-green-500",
            bgColor: "bg-green-500/10",
        },
        {
            label: "Gross Expenses",
            value: summary.gross_total_expenses,
            subLabel: "Net",
            subValue: summary.net_total_expenses,
            icon: TrendingDown,
            color: "text-red-500",
            bgColor: "bg-red-500/10",
        },
        {
            label: "Gross Profit",
            value: summary.gross_difference,
            subLabel: "Net",
            subValue: summary.net_difference,
            icon: DollarSign,
            color: summary.gross_difference >= 0 ? "text-green-500" : "text-red-500",
            bgColor: summary.gross_difference >= 0 ? "bg-green-500/10" : "bg-red-500/10",
        },
        {
            label: "Total Profit",
            value: totalProfit,
            subText: "Net Profit − VAT Liability",
            icon: DollarSign,
            color: totalProfit >= 0 ? "text-green-500" : "text-red-500",
            bgColor: totalProfit >= 0 ? "bg-green-500/10" : "bg-red-500/10",
        },
        {
            label: "VAT Liability",
            value: vatLiability,
            subText: "|Sale VAT − Buy VAT|",
            icon: Scale,
            color: "text-orange-500",
            bgColor: "bg-orange-500/10",
        },
    ]

    return (
        <div className="space-y-3">
            {/* Primary financial cards — 5 card grid */}
            <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
                {cards.map((card) => {
                    const Icon = card.icon
                    return (
                        <div
                            key={card.label}
                            className="rounded-xl border border-border bg-card p-4"
                        >
                            <div className="flex items-center gap-3">
                                <div
                                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${card.bgColor}`}
                                >
                                    <Icon className={`h-5 w-5 ${card.color}`} />
                                </div>
                                <div className="min-w-0">
                                    <p className="text-sm text-muted-foreground truncate">{card.label}</p>
                                    <p className={`text-xl font-bold ${card.color} truncate`}>
                                        {formatCurrency(card.value)}
                                    </p>
                                    {card.subLabel !== undefined ? (
                                        <p className="text-xs text-muted-foreground truncate">
                                            {card.subLabel}: {formatCurrency(card.subValue ?? 0)}
                                        </p>
                                    ) : (
                                        <p className="text-xs text-muted-foreground truncate font-mono">
                                            {card.subText}
                                        </p>
                                    )}
                                </div>
                            </div>
                        </div>
                    )
                })}
            </div>

            {/* Secondary metrics strip — margin, ROI */}
            {(profitMargin !== null || roi !== null) && (
                <div className="flex flex-wrap items-center gap-4 px-1">
                    {profitMargin !== null && (
                        <div className="flex items-center gap-2 text-sm">
                            <BarChart3 className="h-3.5 w-3.5 text-muted-foreground" />
                            <span className="text-muted-foreground">Avg Profit Margin:</span>
                            <span className={`font-semibold ${getProfitColor(profitMargin)}`}>
                                {formatPercent(profitMargin)}
                            </span>
                            <span className="text-[10px] text-muted-foreground/60">
                                (Gross Profit ÷ Gross Revenue)
                            </span>
                        </div>
                    )}
                    {roi !== null && (
                        <div className="flex items-center gap-2 text-sm">
                            <Target className="h-3.5 w-3.5 text-muted-foreground" />
                            <span className="text-muted-foreground">ROI (Return on Investment):</span>
                            <span className={`font-semibold ${getProfitColor(roi)}`}>
                                {formatPercent(roi)}
                            </span>
                            <span className="text-[10px] text-muted-foreground/60">
                                (Gross Profit ÷ Gross Expenses)
                            </span>
                        </div>
                    )}
                    {summary.avg_days_on_stock !== undefined && (
                        <div className="flex items-center gap-2 text-sm">
                            <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                            <span className="text-muted-foreground">Avg Days on Stock:</span>
                            <span className="font-semibold text-slate-600 dark:text-slate-400">
                                {summary.avg_days_on_stock}d
                            </span>
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}
