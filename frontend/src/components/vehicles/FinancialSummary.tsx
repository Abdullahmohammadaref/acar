import { TrendingUp, TrendingDown, DollarSign, BarChart3, Target, Clock } from "lucide-react"
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
            <div className="grid gap-4 md:grid-cols-3">
                {[1, 2, 3].map((i) => (
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

    const cards = [
        {
            label: "Total Revenue",
            value: summary.gross_total_revenue,
            subLabel: "Net",
            subValue: summary.net_total_revenue,
            icon: TrendingUp,
            color: "text-green-500",
            bgColor: "bg-green-500/10",
        },
        {
            label: "Total Expenses",
            value: summary.gross_total_expenses,
            subLabel: "Net",
            subValue: summary.net_total_expenses,
            icon: TrendingDown,
            color: "text-red-500",
            bgColor: "bg-red-500/10",
        },
        {
            label: "Total Profit",
            value: summary.gross_difference,
            subLabel: "Net",
            subValue: summary.net_difference,
            icon: DollarSign,
            color: summary.gross_difference >= 0 ? "text-green-500" : "text-red-500",
            bgColor: summary.gross_difference >= 0 ? "bg-green-500/10" : "bg-red-500/10",
        },
    ]

    return (
        <div className="space-y-3">
            {/* Primary financial cards — existing layout */}
            <div className="grid gap-4 md:grid-cols-3">
                {cards.map((card) => {
                    const Icon = card.icon
                    return (
                        <div
                            key={card.label}
                            className="rounded-xl border border-border bg-card p-4"
                        >
                            <div className="flex items-center gap-3">
                                <div
                                    className={`flex h-10 w-10 items-center justify-center rounded-lg ${card.bgColor}`}
                                >
                                    <Icon className={`h-5 w-5 ${card.color}`} />
                                </div>
                                <div>
                                    <p className="text-sm text-muted-foreground">{card.label}</p>
                                    <p className={`text-xl font-bold ${card.color}`}>
                                        {formatCurrency(card.value)}
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                        {card.subLabel}: {formatCurrency(card.subValue)}
                                    </p>
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
                                (Total Profit ÷ Total Revenue)
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
                                (Total Profit ÷ Total Expenses)
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
