import {
    Car,
    TrendingUp,
    TrendingDown,
    DollarSign,
    Package,
    Timer,
    Target,
    Loader2,
    AlertCircle,
    BarChart3,
    Trophy,
    ArrowUpRight,
} from "lucide-react"
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Legend,
    AreaChart,
    Area,
} from "recharts"
import { useParams } from "react-router-dom"
import { useDashboard } from "@/hooks/useDashboard"
import { formatCurrency } from "@/lib/utils"
import {
    getDaysOnStockColor,
    formatPercent,
    formatDays,
} from "@/lib/vehicleFinancials"
import { FinancialSummaryTable } from "@/components/transactions/FinancialSummaryTable"
// Types imported via useDashboard return type

/**
 * Dashboard page — KPI-driven financial overview
 * Powered by dedicated /api/dashboard/ endpoint.
 * All data is pre-computed server-side.
 */
export function DashboardPage() {
    const { business_slug } = useParams<{ business_slug: string }>()
    const { data, isLoading, isError, error } = useDashboard()

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        )
    }

    if (isError || !data) {
        return (
            <div className="space-y-6">
                <div>
                    <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
                </div>
                <div className="flex items-center gap-3 rounded-xl border border-amber-500/30 bg-amber-500/5 p-5">
                    <AlertCircle className="h-5 w-5 text-amber-500 flex-shrink-0" />
                    <div>
                        <p className="text-sm font-medium text-foreground">Unable to load dashboard data</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                            {(error as Error)?.message || "Please try refreshing the page."}
                        </p>
                    </div>
                </div>
            </div>
        )
    }

    // Empty state
    if (data.total_vehicles === 0) {
        return (
            <div className="space-y-6">
                <div>
                    <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
                    <p className="text-muted-foreground">Overview of your vehicle inventory and finances</p>
                </div>
                <div className="flex flex-col items-center justify-center h-64 rounded-xl border border-dashed border-border bg-card/50">
                    <Car className="h-12 w-12 text-muted-foreground/40 mb-3" />
                    <p className="text-lg font-medium text-muted-foreground">No vehicles yet</p>
                    <p className="text-sm text-muted-foreground/60 mt-1">
                        Add your first vehicle to see analytics here.
                    </p>
                    <a
                        href={`/${business_slug}/vehicles/new`}
                        className="mt-4 inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
                    >
                        <Car className="h-4 w-4" />
                        Add Vehicle
                    </a>
                </div>
            </div>
        )
    }

    const d = data
    const statusConfig: Record<string, { label: string; color: string; dotColor: string }> = {
        purchased: { label: "Purchased", color: "bg-green-500", dotColor: "bg-green-500" },
        ready_for_sale: { label: "Ready", color: "bg-orange-500", dotColor: "bg-orange-500" },
        reserved: { label: "Reserved", color: "bg-blue-500", dotColor: "bg-blue-500" },
        sold: { label: "Sold", color: "bg-red-500", dotColor: "bg-red-500" },
        inactive: { label: "Inactive", color: "bg-gray-400", dotColor: "bg-gray-400" },
    }

    const statusEntries = Object.entries(d.status_counts).filter(([, count]) => count > 0)

    // Chart data
    const chartData = d.monthly_trend.map((p) => ({
        name: p.month.substring(5), // "MM" only
        fullMonth: p.month,
        Revenue: Math.round(p.revenue),
        Expenses: Math.round(p.expenses),
        Profit: Math.round(p.profit),
        Sold: p.vehicles_sold,
    }))

    return (
        <div className="space-y-6">
            {/* Page Header */}
            <div>
                <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
                <p className="text-muted-foreground">
                    Overview of your vehicle inventory and finances
                </p>
            </div>

            {/* Top KPI Row */}
            <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
                <KPICard
                    icon={Car}
                    label="Total Vehicles"
                    value={String(d.total_vehicles)}
                    subLabel={`${d.in_stock} in stock`}
                    color="text-primary"
                    bgColor="bg-primary/10"
                />
                <KPICard
                    icon={Package}
                    label="Vehicles Sold"
                    value={String(d.status_counts.sold)}
                    subLabel={`of ${d.total_vehicles} total`}
                    color="text-emerald-600 dark:text-emerald-400"
                    bgColor="bg-emerald-500/10"
                />
                <KPICard
                    icon={DollarSign}
                    label="Total Net Profit"
                    value={formatCurrency(d.total_profit)}
                    subLabel={`avg ${d.profit_distribution.avg_profit !== null ? formatCurrency(d.profit_distribution.avg_profit) : "—"} / vehicle`}
                    color={d.total_profit >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-500"}
                    bgColor={d.total_profit >= 0 ? "bg-emerald-500/10" : "bg-red-500/10"}
                    equation="Σ (saleNet − buyNet)"
                />
                <KPICard
                    icon={Target}
                    label="Overall ROI"
                    value={d.overall_roi !== null ? formatPercent(d.overall_roi) : "—"}
                    subLabel={`Margin: ${d.overall_margin !== null ? formatPercent(d.overall_margin) : "—"}`}
                    color={d.overall_roi !== null && d.overall_roi >= 0 ? "text-fuchsia-600 dark:text-fuchsia-400" : "text-red-500"}
                    bgColor="bg-fuchsia-500/10"
                    equation="profit ÷ cost × 100"
                />
            </div>

            {/* Second Row — Revenue, Expenses, Days */}
            <div className="grid gap-3 grid-cols-2 lg:grid-cols-3">
                <KPICard
                    icon={TrendingUp}
                    label="Total Revenue"
                    value={formatCurrency(d.total_revenue)}
                    subLabel="Net sale prices"
                    color="text-green-500"
                    bgColor="bg-green-500/10"
                />
                <KPICard
                    icon={TrendingDown}
                    label="Total Cost"
                    value={formatCurrency(d.total_cost)}
                    subLabel="Net buy prices"
                    color="text-red-500"
                    bgColor="bg-red-500/10"
                />
                {/* Days on Stock Card */}
                <div className="rounded-xl border border-border bg-card p-4 col-span-2 lg:col-span-1">
                    <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-500/10 flex-shrink-0">
                            <Timer className="h-4 w-4 text-slate-500" />
                        </div>
                        <div className="min-w-0 flex-1">
                            <p className="text-xs text-muted-foreground">Avg Days on Stock</p>
                            <div className="flex items-center gap-4 mt-0.5">
                                <div>
                                    <p className={`text-lg font-bold ${getDaysOnStockColor(d.days_on_stock.avg_sold)}`}>
                                        {d.days_on_stock.avg_sold !== null ? formatDays(d.days_on_stock.avg_sold) : "—"}
                                    </p>
                                    <p className="text-[10px] text-muted-foreground/60">sold</p>
                                </div>
                                <div className="border-l border-border pl-4">
                                    <p className={`text-lg font-bold ${getDaysOnStockColor(d.days_on_stock.avg_unsold)}`}>
                                        {d.days_on_stock.avg_unsold !== null ? formatDays(d.days_on_stock.avg_unsold) : "—"}
                                    </p>
                                    <p className="text-[10px] text-muted-foreground/60">
                                        stock ({d.days_on_stock.unsold_count})
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Status Distribution Bar */}
            <div className="rounded-xl border border-border bg-card p-4">
                <h3 className="text-xs font-medium text-muted-foreground mb-2.5 uppercase tracking-wider">
                    Vehicle Status Distribution
                </h3>
                <div className="h-3 w-full rounded-full overflow-hidden flex bg-muted">
                    {statusEntries.map(([status, count]) => {
                        const pct = (count / d.total_vehicles) * 100
                        const cfg = statusConfig[status] || { color: "bg-gray-400" }
                        return (
                            <div
                                key={status}
                                className={`${cfg.color} transition-all duration-500`}
                                style={{ width: `${pct}%` }}
                                title={`${cfg.label || status}: ${count}`}
                            />
                        )
                    })}
                </div>
                <div className="flex flex-wrap gap-x-5 gap-y-1.5 mt-2.5">
                    {statusEntries.map(([status, count]) => {
                        const cfg = statusConfig[status] || { label: status, dotColor: "bg-gray-400" }
                        return (
                            <div key={status} className="flex items-center gap-1.5 text-xs">
                                <span className={`w-2 h-2 rounded-full ${cfg.dotColor}`} />
                                <span className="text-foreground font-medium">{cfg.label || status}</span>
                                <span className="text-muted-foreground">
                                    {count} ({Math.round((count / d.total_vehicles) * 100)}%)
                                </span>
                            </div>
                        )
                    })}
                </div>
            </div>

            {/* Charts Row */}
            {chartData.some((c) => c.Revenue > 0 || c.Expenses > 0) && (
                <div className="grid gap-3 lg:grid-cols-2">
                    {/* Revenue vs Expenses Bar Chart */}
                    <div className="rounded-xl border border-border bg-card p-4">
                        <h3 className="text-xs font-medium text-muted-foreground mb-3 uppercase tracking-wider flex items-center gap-1.5">
                            <BarChart3 className="h-3.5 w-3.5" />
                            Monthly Revenue vs Cost
                        </h3>
                        <div className="h-56">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={chartData} margin={{ top: 5, right: 5, left: -15, bottom: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
                                    <XAxis dataKey="name" tick={{ fontSize: 11 }} className="fill-muted-foreground" />
                                    <YAxis tick={{ fontSize: 10 }} className="fill-muted-foreground" tickFormatter={(v) => `${Math.round(v / 1000)}k`} />
                                    <Tooltip
                                        contentStyle={{
                                            backgroundColor: "hsl(var(--card))",
                                            border: "1px solid hsl(var(--border))",
                                            borderRadius: "8px",
                                            fontSize: "12px",
                                        }}
                                        formatter={(value) => formatCurrency(Number(value))}
                                    />
                                    <Legend wrapperStyle={{ fontSize: "11px" }} />
                                    <Bar dataKey="Revenue" fill="hsl(142, 71%, 45%)" radius={[3, 3, 0, 0]} />
                                    <Bar dataKey="Expenses" fill="hsl(0, 84%, 60%)" radius={[3, 3, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Profit Trend Area Chart */}
                    <div className="rounded-xl border border-border bg-card p-4">
                        <h3 className="text-xs font-medium text-muted-foreground mb-3 uppercase tracking-wider flex items-center gap-1.5">
                            <TrendingUp className="h-3.5 w-3.5" />
                            Profit Trend
                        </h3>
                        <div className="h-56">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={chartData} margin={{ top: 5, right: 5, left: -15, bottom: 0 }}>
                                    <defs>
                                        <linearGradient id="profitGrad" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="hsl(262, 83%, 58%)" stopOpacity={0.3} />
                                            <stop offset="95%" stopColor="hsl(262, 83%, 58%)" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
                                    <XAxis dataKey="name" tick={{ fontSize: 11 }} className="fill-muted-foreground" />
                                    <YAxis tick={{ fontSize: 10 }} className="fill-muted-foreground" tickFormatter={(v) => `${Math.round(v / 1000)}k`} />
                                    <Tooltip
                                        contentStyle={{
                                            backgroundColor: "hsl(var(--card))",
                                            border: "1px solid hsl(var(--border))",
                                            borderRadius: "8px",
                                            fontSize: "12px",
                                        }}
                                        formatter={(value) => formatCurrency(Number(value))}
                                    />
                                    <Area
                                        type="monotone"
                                        dataKey="Profit"
                                        stroke="hsl(262, 83%, 58%)"
                                        fill="url(#profitGrad)"
                                        strokeWidth={2}
                                    />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>
            )}

            {/* Financial Breakdown (9 Cards) */}
            <div className="space-y-4">
                <div className="flex items-center justify-between px-1">
                    <div className="flex items-center gap-2">
                        <DollarSign className="h-4 w-4 text-primary" />
                        <h3 className="text-sm font-bold text-foreground uppercase tracking-wider">
                            Financial Performance Breakdown
                        </h3>
                    </div>
                    <div className="h-px flex-1 mx-6 bg-border/40" />
                </div>
                <div className="rounded-2xl border border-border bg-card/30 p-2 shadow-sm">
                    <FinancialSummaryTable summary={d.financial_breakdown} />
                </div>
            </div>

            {/* Bottom Row — Profit Distribution + Top Vehicles */}
            <div className="grid gap-3 lg:grid-cols-2">
                {/* Profit Distribution */}
                <div className="rounded-xl border border-border bg-card p-4">
                    <h3 className="text-xs font-medium text-muted-foreground mb-3 uppercase tracking-wider">
                        Profit Distribution
                    </h3>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        <MiniStat label="Highest" value={d.profit_distribution.highest !== null ? formatCurrency(d.profit_distribution.highest) : "—"} color="text-emerald-600 dark:text-emerald-400" />
                        <MiniStat label="Lowest" value={d.profit_distribution.lowest !== null ? formatCurrency(d.profit_distribution.lowest) : "—"} color={d.profit_distribution.lowest !== null && d.profit_distribution.lowest >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-500"} />
                        <MiniStat label="Avg Profit" value={d.profit_distribution.avg_profit !== null ? formatCurrency(d.profit_distribution.avg_profit) : "—"} color={d.profit_distribution.avg_profit !== null && d.profit_distribution.avg_profit >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-500"} />
                        <MiniStat label="Avg Margin" value={d.profit_distribution.avg_margin !== null ? formatPercent(d.profit_distribution.avg_margin) : "—"} color="text-purple-600 dark:text-purple-400" />
                    </div>
                </div>

                {/* Top Performers */}
                {d.top_vehicles.length > 0 && (
                    <div className="rounded-xl border border-border bg-card p-4">
                        <h3 className="text-xs font-medium text-muted-foreground mb-3 uppercase tracking-wider flex items-center gap-1.5">
                            <Trophy className="h-3.5 w-3.5 text-amber-500" />
                            Top Performers
                        </h3>
                        <div className="space-y-1.5">
                            {d.top_vehicles.slice(0, 5).map((v, i) => (
                                <a
                                    key={v.internal_id}
                                    href={`/${business_slug}/vehicles/${v.internal_id}/edit`}
                                    className="flex items-center justify-between rounded-lg px-2.5 py-1.5 hover:bg-muted/50 transition-colors group text-xs"
                                >
                                    <div className="flex items-center gap-2 min-w-0">
                                        <span className="text-muted-foreground font-mono w-4 text-right">{i + 1}.</span>
                                        <span className="text-foreground font-medium truncate">
                                            #{v.internal_id} {v.make} {v.model}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-3 flex-shrink-0">
                                        <span className={`font-bold font-mono ${v.profit >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-500"}`}>
                                            {formatCurrency(v.profit)}
                                        </span>
                                        {v.margin !== null && (
                                            <span className="text-muted-foreground">{formatPercent(v.margin)}</span>
                                        )}
                                        <ArrowUpRight className="h-3 w-3 text-muted-foreground/0 group-hover:text-muted-foreground transition-colors" />
                                    </div>
                                </a>
                            ))}
                        </div>
                    </div>
                )}
            </div>
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
        <div className="rounded-xl border border-border bg-card p-4">
            <div className="flex items-center gap-2.5">
                <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${bgColor} flex-shrink-0`}>
                    <Icon className={`h-4 w-4 ${color}`} />
                </div>
                <div className="min-w-0">
                    <p className="text-xs text-muted-foreground truncate">{label}</p>
                    <p className={`text-lg font-bold ${color} leading-tight`}>{value}</p>
                    {subLabel && (
                        <p className="text-[10px] text-muted-foreground truncate">{subLabel}</p>
                    )}
                    {equation && (
                        <p className="text-[9px] text-muted-foreground/50 mt-0.5 font-mono">{equation}</p>
                    )}
                </div>
            </div>
        </div>
    )
}

function MiniStat({ label, value, color }: { label: string; value: string; color: string }) {
    return (
        <div>
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium mb-0.5">{label}</p>
            <p className={`text-base font-bold ${color}`}>{value}</p>
        </div>
    )
}
