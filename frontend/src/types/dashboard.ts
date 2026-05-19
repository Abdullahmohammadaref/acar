/**
 * Dashboard Types — Matches backend DashboardResponseSchema exactly.
 */

export interface StatusCounts {
    purchased: number
    ready_for_sale: number
    reserved: number
    sold: number
    inactive: number
}

export interface DaysOnStock {
    avg_sold: number | null
    avg_unsold: number | null
    unsold_count: number
}

export interface ProfitDistribution {
    highest: number | null
    lowest: number | null
    avg_profit: number | null
    avg_margin: number | null
}

export interface MonthlyDataPoint {
    month: string // "YYYY-MM"
    revenue: number
    expenses: number
    profit: number
    vehicles_sold: number
}

export interface TopVehicle {
    internal_id: number
    make: string
    model: string
    profit: number
    margin: number | null
    days_on_stock: number | null
}

export interface FinancialBreakdown {
    net_total_revenue: number
    net_total_expenses: number
    net_difference: number
    tax_total_revenue: number
    tax_total_expenses: number
    tax_difference: number
    gross_total_revenue: number
    gross_total_expenses: number
    gross_difference: number
}

export interface DashboardData {
    // Inventory
    total_vehicles: number
    in_stock: number
    status_counts: StatusCounts
    days_on_stock: DaysOnStock

    // Financial KPIs
    total_revenue: number
    total_cost: number
    total_profit: number
    overall_roi: number | null
    overall_margin: number | null

    // Distributions
    profit_distribution: ProfitDistribution

    // Monthly trend
    monthly_trend: MonthlyDataPoint[]

    // Top performers
    top_vehicles: TopVehicle[]
    worst_vehicles: TopVehicle[]

    // Financial breakdown
    financial_breakdown: FinancialBreakdown

    // Transaction summary
    total_transactions: number
    total_transaction_expenses: number
}
