/**
 * FinancialMetricsStrip — Compact inline financial summary
 *
 * Used on the Vehicle Form (add/edit) to show live-calculated
 * financial metrics in a tight horizontal layout.
 *
 * Design goals:
 * - Minimal vertical space (Rule 1)
 * - Show equations with real numbers (Rule 2)
 * - Clean, organized layout — grouped by category
 * - Each metric: colored value + muted equation below
 */
import {
    Banknote,
    LineChart,
    PackageSearch,
    Percent,
    PieChart,
    Receipt,
    Target,
    Timer,
    TrendingUp,
    TrendingDown,
} from "lucide-react"
import { formatCurrency } from "@/lib/utils"
import {
    type VehicleFinancials,
    getFinancialColor,
    getProfitColor,
    getTotalProfitColor,
    getDaysOnStockColor,
    getDaysOnStockBgColor,
    formatPercent,
    formatDays,
} from "@/lib/vehicleFinancials"

interface FinancialMetricsStripProps {
    financials: VehicleFinancials
    /** Hide transaction-related fields (for add mode where no txns exist yet) */
    hideTransactions?: boolean
    /** Compact mode = fewer metrics, used in VehicleCard */
    compact?: boolean
    annualTargetRate?: number
}

/** Single metric cell — value + equation in a bordered pill */
function MetricCell({
    label,
    value,
    equation,
    colorClass,
    highlight,
    icon,
}: {
    label: string
    value: string
    equation?: string
    colorClass: string
    highlight?: boolean
    icon?: React.ReactNode
}) {
    return (
        <div
            className={`flex flex-col min-w-0 rounded-lg border px-3 py-2 transition-colors ${highlight
                    ? "bg-primary/5 border-primary/20 ring-1 ring-primary/10"
                    : "bg-background border-border/40 hover:border-border/70"
                }`}
        >
            <div className="flex items-center justify-between gap-1 mb-1">
                <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold truncate">
                    {label}
                </span>
                {icon && <span className="flex-shrink-0 text-muted-foreground/30">{icon}</span>}
            </div>
            <div className={`text-sm font-bold ${colorClass} ${highlight ? "text-base" : ""} leading-none truncate`}>
                {value}
            </div>
            {equation && (
                <div className="text-[9px] text-muted-foreground/40 leading-tight mt-1 truncate font-mono">
                    {equation}
                </div>
            )}
        </div>
    )
}

export function FinancialMetricsStrip({
    financials: f,
    hideTransactions = false,
    compact = false,
    annualTargetRate,
}: FinancialMetricsStripProps) {
    const hasSale = f.saleGross !== null
    const hasBuy = f.buyGross !== null

    if (!hasBuy && !hasSale) return null

    // Compact mode: inline profit/margin/days
    if (compact) {
        return (
            <div className="flex items-center gap-3 text-xs">
                {f.totalProfit !== null && (
                    <span className={`font-semibold ${getTotalProfitColor(f.totalProfit)}`}>
                        {formatCurrency(f.totalProfit)}
                    </span>
                )}
                {f.profitMargin !== null && (
                    <span className={`${getProfitColor(f.profitMargin)}`}>
                        {formatPercent(f.profitMargin)}
                    </span>
                )}
                {f.daysOnStock !== null && (
                    <span className="inline-flex items-center gap-1">
                        <span className={`inline-block w-1.5 h-1.5 rounded-full ${getDaysOnStockBgColor(f.daysOnStock)}`} />
                        <span className={getDaysOnStockColor(f.daysOnStock)}>
                            {formatDays(f.daysOnStock)}
                        </span>
                    </span>
                )}
            </div>
        )
    }

    // Helper: format value or dash
    const fc = (v: number | null) => (v !== null ? formatCurrency(v) : "—")

    return (
        <div className="rounded-xl border border-border/30 bg-muted/10 p-3 space-y-2">
            {/* Row 1: Cost basis metrics */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
                {/* COGS */}
                <MetricCell
                    label="COGS"
                    value={fc(f.cogs)}
                    equation={!hideTransactions
                        ? `${fc(f.buyNet)} + ${fc(f.totalTxnCost || 0)}`
                        : `buyNet ${fc(f.buyNet)}`}
                    colorClass={getFinancialColor("cogs")}
                    icon={<PackageSearch className="h-3 w-3" />}
                />

                {/* Txn Expenses */}
                {!hideTransactions && (
                    <MetricCell
                        label="Txn Expenses"
                        value={f.txnCount > 0 ? formatCurrency(f.totalTxnCost) : "€0.00"}
                        equation={f.txnCount > 0 ? `${f.txnCount} transactions` : "none"}
                        colorClass={getFinancialColor("totalTxnCost")}
                        icon={<Receipt className="h-3 w-3" />}
                    />
                )}

                {/* Break-Even */}
                {f.breakEvenPrice !== null && (
                    <MetricCell
                        label="Break-Even"
                        value={formatCurrency(f.breakEvenPrice)}
                        equation={`${fc(f.cogs)} × 1.10`}
                        colorClass={getFinancialColor("breakEvenPrice")}
                        icon={<Target className="h-3 w-3" />}
                    />
                )}

                {/* Holding Cost */}
                {f.holdingCost !== null && (
                    <MetricCell
                        label="Holding Cost"
                        value={formatCurrency(f.holdingCost)}
                        equation={`${fc(f.cogs)} × ${annualTargetRate ?? 10}% ÷ 365 × ${f.daysOnStock || 0}d`}
                        colorClass={getFinancialColor("holdingCost")}
                        icon={<Timer className="h-3 w-3" />}
                    />
                )}

                {/* Adjusted Profit */}
                {f.adjustedProfit !== null && (
                    <MetricCell
                        label="Adj. Profit"
                        value={fc(f.adjustedProfit)}
                        equation={`${fc(f.totalProfit)} − ${fc(f.holdingCost)}`}
                        colorClass={getFinancialColor("adjustedProfit")}
                        icon={<TrendingDown className="h-3 w-3" />}
                    />
                )}
            </div>

            {/* Row 2: Profit metrics (only when sold) */}
            {hasSale && (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
                    {/* Gross Profit */}
                    <MetricCell
                        label="Gross Profit"
                        value={fc(f.grossProfit)}
                        equation={`${fc(f.saleGross)} − ${fc(f.buyGross)}`}
                        colorClass={getProfitColor(f.grossProfit)}
                        icon={<PieChart className="h-3 w-3" />}
                    />

                    {/* Net Profit */}
                    <MetricCell
                        label="Net Profit"
                        value={fc(f.netProfit)}
                        equation={`${fc(f.saleNet)} − ${fc(f.buyNet)}`}
                        colorClass={getProfitColor(f.netProfit)}
                        icon={<TrendingUp className="h-3 w-3" />}
                    />

                    {/* Total Profit — highlighted */}
                    <MetricCell
                        label="Total Profit"
                        value={fc(f.totalProfit)}
                        equation={`${fc(f.saleNet)} − ${fc(f.buyNet)} − ${fc(f.totalTxnCost || 0)}`}
                        colorClass={getTotalProfitColor(f.totalProfit)}
                        icon={<Banknote className="h-3.5 w-3.5 text-primary/50" />}
                        highlight
                    />

                    {/* Margin + ROI side by side */}
                    {f.profitMargin !== null && (
                        <MetricCell
                            label="Margin"
                            value={formatPercent(f.profitMargin)}
                            equation={`${fc(f.totalProfit)} ÷ ${fc(f.saleNet)} × 100`}
                            colorClass={getProfitColor(f.profitMargin)}
                            icon={<Percent className="h-3 w-3" />}
                        />
                    )}

                    {f.roi !== null && (
                        <MetricCell
                            label="ROI"
                            value={formatPercent(f.roi)}
                            equation={`${fc(f.totalProfit)} ÷ ${fc(f.cogs)} × 100`}
                            colorClass={getProfitColor(f.roi)}
                            icon={<LineChart className="h-3 w-3" />}
                        />
                    )}
                </div>
            )}
        </div>
    )
}

