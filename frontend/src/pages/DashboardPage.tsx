import { useMemo } from "react"
import {
    Car,
    TrendingUp,
    TrendingDown,
    DollarSign,
    Package,
    Timer,
    Target,
    Loader2,
} from "lucide-react"
import { useVehicles } from "@/hooks/useVehicles"
import { useTransactions } from "@/hooks/useTransactions"
import { formatCurrency } from "@/lib/utils"
import {
    calcDaysOnStock,
    getDaysOnStockColor,
    formatPercent,
    formatDays,
} from "@/lib/vehicleFinancials"

/**
 * Dashboard page — KPI-driven financial overview
 * This page has NO vertical space constraints (per requirements).
 * All data is sourced from the vehicle and transaction list endpoints.
 */
export function DashboardPage() {
    // Fetch all vehicles (up to 500 for aggregate stats)
    const { data: vehicleData, isLoading: vehiclesLoading } = useVehicles({
        per_page: 500,
    })
    // Fetch all transactions
    const { data: transactionData, isLoading: transactionsLoading } = useTransactions({
        per_page: 500,
    })
    // Use transactionData in future enhancements
    void transactionData

    const isLoading = vehiclesLoading || transactionsLoading
    const vehicles = vehicleData?.vehicles?.items ?? []
    const financialSummary = vehicleData?.financial_summary

    // Compute KPIs from vehicle data
    const kpis = useMemo(() => {
        if (!vehicles.length) return null

        const totalVehicles = vehicles.length
        const statusCounts: Record<string, number> = {}
        vehicles.forEach((v) => {
            const s = v.status || "unknown"
            statusCounts[s] = (statusCounts[s] || 0) + 1
        })

        // Price metrics — only vehicles with both buy and sale net values
        const soldVehicles = vehicles.filter(
            (v) => v.status === "sold" && v.buy_price_net != null && v.sale_price_net != null,
        )
        const totalSold = soldVehicles.length

        let totalProfit = 0
        let totalRevenue = 0
        let totalCost = 0
        const profitPerVehicle: number[] = []
        const marginPerVehicle: number[] = []
        const daysOnStockList: number[] = []

        soldVehicles.forEach((v) => {
            const buyNet = typeof v.buy_price_net === "string" ? parseFloat(v.buy_price_net) : (v.buy_price_net ?? 0)
            const saleNet = typeof v.sale_price_net === "string" ? parseFloat(v.sale_price_net) : (v.sale_price_net ?? 0)
            const profit = Math.round((saleNet - buyNet) * 100) / 100
            totalProfit += profit
            totalRevenue += saleNet
            totalCost += buyNet
            profitPerVehicle.push(profit)
            if (saleNet !== 0) {
                marginPerVehicle.push(Math.round((profit / saleNet) * 100 * 10) / 10)
            }
            const days = calcDaysOnStock(v.buy_date, v.sale_date)
            if (days !== null) daysOnStockList.push(days)
        })

        // Unsold vehicles — days on stock
        const unsoldVehicles = vehicles.filter(
            (v) => v.status !== "sold" && v.status !== "inactive" && v.buy_date,
        )
        const unsoldDays: number[] = []
        unsoldVehicles.forEach((v) => {
            const days = calcDaysOnStock(v.buy_date, null)
            if (days !== null) unsoldDays.push(days)
        })

        const avgProfit = totalSold > 0 ? totalProfit / totalSold : null
        const avgMargin = marginPerVehicle.length > 0
            ? marginPerVehicle.reduce((a, b) => a + b, 0) / marginPerVehicle.length
            : null
        const avgDaysSold = daysOnStockList.length > 0
            ? Math.round(daysOnStockList.reduce((a, b) => a + b, 0) / daysOnStockList.length)
            : null
        const avgDaysUnsold = unsoldDays.length > 0
            ? Math.round(unsoldDays.reduce((a, b) => a + b, 0) / unsoldDays.length)
            : null
        const overallROI = totalCost > 0
            ? Math.round((totalProfit / totalCost) * 100 * 10) / 10
            : null
        const overallMargin = totalRevenue > 0
            ? Math.round((totalProfit / totalRevenue) * 100 * 10) / 10
            : null

        return {
            totalVehicles,
            statusCounts,
            totalSold,
            totalProfit: Math.round(totalProfit * 100) / 100,
            totalRevenue: Math.round(totalRevenue * 100) / 100,
            totalCost: Math.round(totalCost * 100) / 100,
            avgProfit: avgProfit !== null ? Math.round(avgProfit * 100) / 100 : null,
            avgMargin,
            avgDaysSold,
            avgDaysUnsold,
            overallROI,
            overallMargin,
            unsoldCount: unsoldVehicles.length,
            profitPerVehicle,
        }
    }, [vehicles])

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        )
    }

    if (!kpis) {
        return (
            <div className="space-y-8">
                <div>
                    <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
                    <p className="text-muted-foreground">No vehicle data available yet.</p>
                </div>
            </div>
        )
    }

    // Status breakdown data for visual bar
    const statusConfig: Record<string, { label: string; color: string; bgColor: string }> = {
        purchased: { label: "Purchased", color: "bg-green-500", bgColor: "bg-green-500/10" },
        ready_for_sale: { label: "Ready", color: "bg-orange-500", bgColor: "bg-orange-500/10" },
        reserved: { label: "Reserved", color: "bg-blue-500", bgColor: "bg-blue-500/10" },
        sold: { label: "Sold", color: "bg-red-500", bgColor: "bg-red-500/10" },
        inactive: { label: "Inactive", color: "bg-gray-400", bgColor: "bg-gray-400/10" },
    }

    return (
        <div className="space-y-8">
            {/* Page Header */}
            <div>
                <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
                <p className="text-muted-foreground">
                    Overview of your vehicle inventory and finances
                </p>
            </div>

            {/* Top KPI Row — 4 primary cards */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                {/* Total Vehicles */}
                <KPICard
                    icon={Car}
                    label="Total Vehicles"
                    value={String(kpis.totalVehicles)}
                    subLabel={`${kpis.unsoldCount} in stock`}
                    color="text-primary"
                    bgColor="bg-primary/10"
                />

                {/* Total Sold */}
                <KPICard
                    icon={Package}
                    label="Vehicles Sold"
                    value={String(kpis.totalSold)}
                    subLabel={`of ${kpis.totalVehicles} total`}
                    color="text-emerald-600 dark:text-emerald-400"
                    bgColor="bg-emerald-500/10"
                />

                {/* Total Profit */}
                <KPICard
                    icon={DollarSign}
                    label="Total Net Profit"
                    value={formatCurrency(kpis.totalProfit)}
                    subLabel={`avg ${kpis.avgProfit !== null ? formatCurrency(kpis.avgProfit) : "—"} / vehicle`}
                    color={kpis.totalProfit >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-500"}
                    bgColor={kpis.totalProfit >= 0 ? "bg-emerald-500/10" : "bg-red-500/10"}
                    equation="Σ (saleNet − buyNet)"
                />

                {/* Overall ROI */}
                <KPICard
                    icon={Target}
                    label="Overall ROI (Return on Investment)"
                    value={kpis.overallROI !== null ? formatPercent(kpis.overallROI) : "—"}
                    subLabel={`Margin: ${kpis.overallMargin !== null ? formatPercent(kpis.overallMargin) : "—"}`}
                    color={kpis.overallROI !== null && kpis.overallROI >= 0 ? "text-fuchsia-600 dark:text-fuchsia-400" : "text-red-500"}
                    bgColor="bg-fuchsia-500/10"
                    equation="totalProfit ÷ totalCost × 100"
                />
            </div>

            {/* Second Row — Revenue, Expenses, Days */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {/* Total Revenue */}
                <KPICard
                    icon={TrendingUp}
                    label="Total Revenue"
                    value={formatCurrency(kpis.totalRevenue)}
                    subLabel="Net sale prices"
                    color="text-green-500"
                    bgColor="bg-green-500/10"
                    equation="Σ saleNet"
                />

                {/* Total Cost */}
                <KPICard
                    icon={TrendingDown}
                    label="Total Cost"
                    value={formatCurrency(kpis.totalCost)}
                    subLabel="Net buy prices"
                    color="text-red-500"
                    bgColor="bg-red-500/10"
                    equation="Σ buyNet"
                />

                {/* Avg Days on Stock */}
                <div className="rounded-xl border border-border bg-card p-5">
                    <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-500/10">
                            <Timer className="h-5 w-5 text-slate-500" />
                        </div>
                        <div className="min-w-0">
                            <p className="text-sm text-muted-foreground">Avg Days on Stock</p>
                            <div className="flex items-center gap-4 mt-1">
                                {/* Sold vehicles avg */}
                                <div>
                                    <p className={`text-xl font-bold ${getDaysOnStockColor(kpis.avgDaysSold)}`}>
                                        {kpis.avgDaysSold !== null ? formatDays(kpis.avgDaysSold) : "—"}
                                    </p>
                                    <p className="text-[10px] text-muted-foreground/60">sold vehicles</p>
                                </div>
                                {/* Unsold vehicles avg */}
                                <div className="border-l border-border pl-4">
                                    <p className={`text-xl font-bold ${getDaysOnStockColor(kpis.avgDaysUnsold)}`}>
                                        {kpis.avgDaysUnsold !== null ? formatDays(kpis.avgDaysUnsold) : "—"}
                                    </p>
                                    <p className="text-[10px] text-muted-foreground/60">
                                        current stock ({kpis.unsoldCount})
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Status Distribution */}
            <div className="rounded-xl border border-border bg-card p-5">
                <h3 className="text-sm font-medium text-muted-foreground mb-3">
                    Vehicle Status Distribution
                </h3>
                {/* Visual bar */}
                <div className="h-4 w-full rounded-full overflow-hidden flex bg-muted">
                    {Object.entries(kpis.statusCounts).map(([status, count]) => {
                        const pct = (count / kpis.totalVehicles) * 100
                        const cfg = statusConfig[status] || { color: "bg-gray-400" }
                        return (
                            <div
                                key={status}
                                className={`${cfg.color} transition-all`}
                                style={{ width: `${pct}%` }}
                                title={`${cfg.label || status}: ${count}`}
                            />
                        )
                    })}
                </div>
                {/* Legend */}
                <div className="flex flex-wrap gap-4 mt-3">
                    {Object.entries(kpis.statusCounts).map(([status, count]) => {
                        const cfg = statusConfig[status] || {
                            label: status,
                            color: "bg-gray-400",
                        }
                        return (
                            <div key={status} className="flex items-center gap-2 text-sm">
                                <span className={`w-3 h-3 rounded-full ${cfg.color}`} />
                                <span className="text-foreground font-medium">{cfg.label || status}</span>
                                <span className="text-muted-foreground">
                                    {count} ({Math.round((count / kpis.totalVehicles) * 100)}%)
                                </span>
                            </div>
                        )
                    })}
                </div>
            </div>

            {/* Financial Summary from API */}
            {financialSummary && (
                <div className="rounded-xl border border-border bg-card overflow-hidden">
                    <div className="px-5 py-4 border-b border-border">
                        <h3 className="text-base font-medium">Financial Breakdown</h3>
                        <p className="text-xs text-muted-foreground mt-0.5">
                            Net / Tax / Gross split from all vehicle transactions
                        </p>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-border bg-muted/50">
                                    <th className="px-5 py-3 text-left font-medium text-muted-foreground w-24">Type</th>
                                    <th className="px-5 py-3 text-right font-medium text-green-500">Revenue</th>
                                    <th className="px-5 py-3 text-center font-medium text-muted-foreground w-8">−</th>
                                    <th className="px-5 py-3 text-right font-medium text-red-500">Expenses</th>
                                    <th className="px-5 py-3 text-center font-medium text-muted-foreground w-8">=</th>
                                    <th className="px-5 py-3 text-right font-medium text-foreground">Difference</th>
                                </tr>
                            </thead>
                            <tbody>
                                {[
                                    {
                                        label: "Net",
                                        revenue: financialSummary.net_total_revenue,
                                        expenses: financialSummary.net_total_expenses,
                                        diff: financialSummary.net_difference,
                                    },
                                    {
                                        label: "Tax",
                                        revenue: financialSummary.tax_total_revenue,
                                        expenses: financialSummary.tax_total_expenses,
                                        diff: financialSummary.tax_difference,
                                        hasDivider: true,
                                    },
                                    {
                                        label: "Gross",
                                        revenue: financialSummary.gross_total_revenue,
                                        expenses: financialSummary.gross_total_expenses,
                                        diff: financialSummary.gross_difference,
                                    },
                                ].map((row) => (
                                    <tr
                                        key={row.label}
                                        className={`transition-colors hover:bg-muted/30 ${
                                            row.hasDivider ? "border-b-2 border-border" : ""
                                        }`}
                                    >
                                        <td className="px-5 py-3 font-medium text-foreground">{row.label}</td>
                                        <td className="px-5 py-3 text-right text-green-500 font-mono">
                                            {formatCurrency(row.revenue)}
                                        </td>
                                        <td className="px-5 py-3 text-center text-muted-foreground">−</td>
                                        <td className="px-5 py-3 text-right text-red-500 font-mono">
                                            {formatCurrency(row.expenses)}
                                        </td>
                                        <td className="px-5 py-3 text-center text-muted-foreground">=</td>
                                        <td
                                            className={`px-5 py-3 text-right font-mono font-semibold ${
                                                row.diff >= 0 ? "text-green-500" : "text-red-500"
                                            }`}
                                        >
                                            {formatCurrency(row.diff)}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Profit Distribution (text-based since no chart library) */}
            {kpis.profitPerVehicle.length > 0 && (
                <div className="rounded-xl border border-border bg-card p-5">
                    <h3 className="text-sm font-medium text-muted-foreground mb-3">
                        Profit Distribution (Sold Vehicles)
                    </h3>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                        <MiniStat
                            label="Highest Profit"
                            value={formatCurrency(Math.max(...kpis.profitPerVehicle))}
                            color="text-emerald-600 dark:text-emerald-400"
                        />
                        <MiniStat
                            label="Lowest Profit"
                            value={formatCurrency(Math.min(...kpis.profitPerVehicle))}
                            color={Math.min(...kpis.profitPerVehicle) >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-500"}
                        />
                        <MiniStat
                            label="Avg Profit"
                            value={kpis.avgProfit !== null ? formatCurrency(kpis.avgProfit) : "—"}
                            color={kpis.avgProfit !== null && kpis.avgProfit >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-500"}
                        />
                        <MiniStat
                            label="Avg Margin"
                            value={kpis.avgMargin !== null ? formatPercent(kpis.avgMargin) : "—"}
                            color={kpis.avgMargin !== null && kpis.avgMargin >= 0 ? "text-purple-600 dark:text-purple-400" : "text-red-500"}
                        />
                    </div>
                </div>
            )}
        </div>
    )
}

// =============================================================================
// Sub-components
// =============================================================================

interface KPICardProps {
    icon: React.ComponentType<{ className?: string }>
    label: string
    value: string
    subLabel?: string
    color: string
    bgColor: string
    equation?: string
}

function KPICard({ icon: Icon, label, value, subLabel, color, bgColor, equation }: KPICardProps) {
    return (
        <div className="rounded-xl border border-border bg-card p-5">
            <div className="flex items-center gap-3">
                <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${bgColor}`}>
                    <Icon className={`h-5 w-5 ${color}`} />
                </div>
                <div className="min-w-0">
                    <p className="text-sm text-muted-foreground">{label}</p>
                    <p className={`text-xl font-bold ${color}`}>{value}</p>
                    {subLabel && (
                        <p className="text-xs text-muted-foreground">{subLabel}</p>
                    )}
                    {equation && (
                        <p className="text-[10px] text-muted-foreground/60 mt-0.5">{equation}</p>
                    )}
                </div>
            </div>
        </div>
    )
}

function MiniStat({
    label,
    value,
    color,
}: {
    label: string
    value: string
    color: string
}) {
    return (
        <div>
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium mb-1">
                {label}
            </p>
            <p className={`text-lg font-bold ${color}`}>{value}</p>
        </div>
    )
}
