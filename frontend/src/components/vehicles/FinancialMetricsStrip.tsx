/**
 * FinancialMetricsStrip — Compact inline financial summary
 *
 * Used on the Vehicle Form (add/edit) to show live-calculated
 * financial metrics in a tight horizontal grid. Each metric shows:
 * - Colored value (14-16px, weight 500)
 * - Muted equation text (11px, gray)
 *
 * Follows Rule 1 (minimal vertical space) and Rule 2 (show equations).
 */
import {
    Banknote,
    LineChart,
    PackageSearch,
    Percent,
    PieChart,
    Receipt,
    Scale,
    Target,
    Timer,
    TrendingUp,
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
        <div className={`flex flex-col min-w-0 rounded-md border p-2.5 shadow-sm transition-colors ${
            highlight 
                ? "bg-primary/5 border-primary/20 shadow-primary/5" 
                : "bg-background border-border/40 hover:border-border/80"
        } ${highlight ? "md:col-span-2 xl:col-span-1" : ""}`}>
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-1.5 flex items-center justify-between">
                <span className="truncate pr-1">{label}</span>
                {icon && <span className="flex-shrink-0 text-muted-foreground/40">{icon}</span>}
            </div>
            <div
                className={`text-sm font-bold ${colorClass} ${highlight ? "text-base" : ""} leading-none truncate`}
            >
                {value}
            </div>
            {equation && (
                <div className="text-[10px] text-muted-foreground/50 leading-tight mt-1.5 truncate font-medium">
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

    if (compact) {
        // Compact: just totalProfit, margin, days
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

    return (
        <div className="rounded-xl border border-border/40 bg-muted/20 p-3">
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-3">
                {/* COGS */}
                <MetricCell
                    label="COGS"
                    value={f.cogs !== null ? formatCurrency(f.cogs) : "—"}
                    equation={!hideTransactions 
                        ? `buyNet(${formatCurrency(f.buyNet || 0)}) + txnCost(${formatCurrency(f.totalTxnCost || 0)})` 
                        : `buyNet(${formatCurrency(f.buyNet || 0)})`}
                    colorClass={getFinancialColor("cogs")}
                    icon={<PackageSearch className="h-3.5 w-3.5" />}
                />

                {/* Total Txn Cost — only if transactions exist */}
                {!hideTransactions && (
                    <MetricCell
                        label="Transaction Expenses"
                        value={
                            f.txnCount > 0
                                ? formatCurrency(f.totalTxnCost)
                                : "€0.00"
                        }
                        equation={f.txnCount > 0 ? `${f.txnCount} txns` : "no txns"}
                        colorClass={getFinancialColor("totalTxnCost")}
                        icon={<Receipt className="h-3.5 w-3.5" />}
                    />
                )}

                {/* Gross Profit */}
                {hasSale && (
                    <MetricCell
                        label="Gross Profit"
                        value={f.grossProfit !== null ? formatCurrency(f.grossProfit) : "—"}
                        equation={`saleGross(${formatCurrency(f.saleGross || 0)}) − buyGross(${formatCurrency(f.buyGross || 0)})`}
                        colorClass={getProfitColor(f.grossProfit)}
                        icon={<PieChart className="h-3.5 w-3.5" />}
                    />
                )}

                {/* Net Profit */}
                {hasSale && (
                    <MetricCell
                        label="Net Profit"
                        value={f.netProfit !== null ? formatCurrency(f.netProfit) : "—"}
                        equation={`saleNet(${formatCurrency(f.saleNet || 0)}) − buyNet(${formatCurrency(f.buyNet || 0)})`}
                        colorClass={getProfitColor(f.netProfit)}
                        icon={<TrendingUp className="h-3.5 w-3.5" />}
                    />
                )}

                {/* Total Profit — highlight this most prominently */}
                {hasSale && (
                    <MetricCell
                        label="Total Profit"
                        value={
                            f.totalProfit !== null ? formatCurrency(f.totalProfit) : "—"
                        }
                        equation={`saleNet(${formatCurrency(f.saleNet || 0)}) − buyNet(${formatCurrency(f.buyNet || 0)}) − txnCost(${formatCurrency(f.totalTxnCost || 0)})`}
                        colorClass={getTotalProfitColor(f.totalProfit)}
                        icon={<Banknote className="h-4 w-4 text-primary/60" />}
                        highlight
                    />
                )}

                {/* Profit Margin */}
                {hasSale && f.profitMargin !== null && (
                    <MetricCell
                        label="Margin"
                        value={formatPercent(f.profitMargin)}
                        equation={`totalProfit(${formatCurrency(f.totalProfit || 0)}) ÷ revenue(${formatCurrency(f.saleNet || 0)}) × 100`}
                        colorClass={getProfitColor(f.profitMargin)}
                        icon={<Percent className="h-3.5 w-3.5" />}
                    />
                )}

                {/* ROI */}
                {hasSale && f.roi !== null && (
                    <MetricCell
                        label="ROI (Return on Investment)"
                        value={formatPercent(f.roi)}
                        equation={`totalProfit(${formatCurrency(f.totalProfit || 0)}) ÷ COGS(${formatCurrency(f.cogs || 0)}) × 100`}
                        colorClass={getProfitColor(f.roi)}
                        icon={<LineChart className="h-3.5 w-3.5" />}
                    />
                )}

                {/* Holding Cost */}
                {f.holdingCost !== null && (
                    <MetricCell
                        label="Holding Cost"
                        value={formatCurrency(f.holdingCost)}
                        equation={`COGS(${formatCurrency(f.cogs || 0)}) × target(${annualTargetRate ?? 10}%) ÷ 365 × days(${f.daysOnStock || 0})`}
                        colorClass={getFinancialColor("holdingCost")}
                        icon={<Timer className="h-3.5 w-3.5" />}
                    />
                )}

                {/* Adjusted Profit */}
                {hasSale && f.adjustedProfit !== null && (
                    <MetricCell
                        label="Adjusted Profit"
                        value={formatCurrency(f.adjustedProfit)}
                        equation={`totalProfit(${formatCurrency(f.totalProfit || 0)}) − holdingCost(${formatCurrency(f.holdingCost || 0)})`}
                        colorClass={
                            f.adjustedProfit > 0
                                ? "text-emerald-600 dark:text-emerald-400"
                                : "text-red-600 dark:text-red-400"
                        }
                        icon={<Scale className="h-3.5 w-3.5" />}
                    />
                )}

                {/* Break-Even Price */}
                {f.breakEvenPrice !== null && (
                    <MetricCell
                        label="Break-Even"
                        value={formatCurrency(f.breakEvenPrice)}
                        equation={`COGS(${formatCurrency(f.cogs || 0)}) × (1 + margin(10%))`}
                        colorClass={getFinancialColor("breakEvenPrice")}
                        icon={<Target className="h-3.5 w-3.5" />}
                    />
                )}
            </div>
        </div>
    )
}
