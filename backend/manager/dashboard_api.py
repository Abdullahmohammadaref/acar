"""
Dashboard API — Aggregated KPI & financial data for the dashboard page.

All queries are scoped to `request.user.business` for multi-tenancy.
Returns pre-computed aggregates so the frontend does zero number-crunching.
"""
from datetime import timedelta
from decimal import Decimal, InvalidOperation
from django.db.models import (
    Sum, Count, Case, When, F, FloatField, Value, Q,
    Avg, Min, Max,
)
from django.db.models.functions import Coalesce, TruncMonth
from django.utils import timezone
from ninja import Router, Schema
from typing import Optional

from ninja.security import django_auth

dashboard_router = Router(auth=django_auth, tags=["Dashboard"])


# =============================================================================
# Schemas
# =============================================================================

class StatusCountSchema(Schema):
    purchased: int = 0
    ready_for_sale: int = 0
    reserved: int = 0
    sold: int = 0
    inactive: int = 0


class DaysOnStockSchema(Schema):
    avg_sold: Optional[float] = None
    avg_unsold: Optional[float] = None
    unsold_count: int = 0


class ProfitDistributionSchema(Schema):
    highest: Optional[float] = None
    lowest: Optional[float] = None
    avg_profit: Optional[float] = None
    avg_margin: Optional[float] = None


class MonthlyDataPointSchema(Schema):
    month: str  # "YYYY-MM"
    revenue: float = 0
    expenses: float = 0
    profit: float = 0
    vehicles_sold: int = 0


class TopVehicleSchema(Schema):
    internal_id: int
    make: str
    model: str
    profit: float
    margin: Optional[float] = None
    days_on_stock: Optional[int] = None


class FinancialBreakdownSchema(Schema):
    net_total_revenue: float = 0
    net_total_expenses: float = 0
    net_difference: float = 0
    tax_total_revenue: float = 0
    tax_total_expenses: float = 0
    tax_difference: float = 0
    gross_total_revenue: float = 0
    gross_total_expenses: float = 0
    gross_difference: float = 0


class DashboardResponseSchema(Schema):
    # Inventory
    total_vehicles: int = 0
    in_stock: int = 0
    status_counts: StatusCountSchema
    days_on_stock: DaysOnStockSchema

    # Financial KPIs
    total_revenue: float = 0
    total_cost: float = 0
    total_profit: float = 0
    overall_roi: Optional[float] = None
    overall_margin: Optional[float] = None

    # Distributions
    profit_distribution: ProfitDistributionSchema

    # Monthly trend (last 12 months)
    monthly_trend: list[MonthlyDataPointSchema] = []

    # Top performers
    top_vehicles: list[TopVehicleSchema] = []
    worst_vehicles: list[TopVehicleSchema] = []

    # Financial breakdown (net/tax/gross)
    financial_breakdown: FinancialBreakdownSchema

    # Transaction summary
    total_transactions: int = 0
    total_transaction_expenses: float = 0


# =============================================================================
# Helpers
# =============================================================================

def _safe_float(val) -> float:
    """Safely convert Decimal/string to float."""
    if val is None:
        return 0.0
    try:
        return float(val)
    except (ValueError, TypeError, InvalidOperation):
        return 0.0


def _calc_net(gross, tax_percentage):
    """Calculate net from gross and tax percentage."""
    g = _safe_float(gross)
    pct = _safe_float(tax_percentage)
    if pct == 0:
        return g
    return round(g / (1 + pct / 100), 2)


def _calc_tax_amount(gross, tax_percentage):
    """Calculate tax amount from gross and tax percentage."""
    g = _safe_float(gross)
    pct = _safe_float(tax_percentage)
    if pct == 0:
        return 0.0
    net = g / (1 + pct / 100)
    return round(g - net, 2)


# =============================================================================
# Main endpoint
# =============================================================================

@dashboard_router.get("/dashboard/", response=DashboardResponseSchema)
def get_dashboard(request):
    """
    Aggregated dashboard data for the current business.
    Returns all KPIs, trends, and breakdowns in a single request.
    """
    from manager.models import Vehicle, Transaction

    business = request.user.business
    today = timezone.now().date()

    # ── Vehicle Queries ──
    vehicles_qs = Vehicle.objects.filter(business=business)

    # Status counts
    status_agg = vehicles_qs.values("status").annotate(count=Count("id"))
    status_map = {row["status"]: row["count"] for row in status_agg}
    status_counts = StatusCountSchema(
        purchased=status_map.get("purchased", 0),
        ready_for_sale=status_map.get("ready_for_sale", 0),
        reserved=status_map.get("reserved", 0),
        sold=status_map.get("sold", 0),
        inactive=status_map.get("inactive", 0),
    )

    total_vehicles = vehicles_qs.count()
    in_stock = vehicles_qs.exclude(status__in=["sold", "inactive"]).count()

    # ── Sold Vehicle Metrics ──
    sold_vehicles = vehicles_qs.filter(
        status="sold",
        buy_price__isnull=False,
        sale_price__isnull=False,
    ).select_related("buy_tax", "sale_tax")

    total_revenue = 0.0
    total_cost = 0.0
    total_profit = 0.0
    profit_list = []
    margin_list = []
    sold_days_list = []
    top_vehicles_data = []

    for v in sold_vehicles:
        buy_net = _calc_net(v.buy_price, v.buy_tax.percentage if v.buy_tax else 0)
        sale_net = _calc_net(v.sale_price, v.sale_tax.percentage if v.sale_tax else 0)
        profit = round(sale_net - buy_net, 2)

        total_revenue += sale_net
        total_cost += buy_net
        total_profit += profit
        profit_list.append(profit)

        margin = round((profit / sale_net) * 100, 1) if sale_net != 0 else None
        if margin is not None:
            margin_list.append(margin)

        # Days on stock
        days = None
        if v.buy_date:
            end_date = v.sale_date or today
            days = max(0, (end_date - v.buy_date).days)
            sold_days_list.append(days)

        top_vehicles_data.append({
            "internal_id": v.internal_id,
            "make": v.make.name if v.make else "",
            "model": v.model.name if v.model else "",
            "profit": profit,
            "margin": margin,
            "days_on_stock": days,
        })

    # Unsold days on stock
    unsold_qs = vehicles_qs.exclude(
        status__in=["sold", "inactive"]
    ).filter(buy_date__isnull=False)
    unsold_days_list = []
    for v in unsold_qs:
        days = max(0, (today - v.buy_date).days)
        unsold_days_list.append(days)

    # Days on stock summary
    days_on_stock = DaysOnStockSchema(
        avg_sold=round(sum(sold_days_list) / len(sold_days_list)) if sold_days_list else None,
        avg_unsold=round(sum(unsold_days_list) / len(unsold_days_list)) if unsold_days_list else None,
        unsold_count=len(unsold_days_list),
    )

    # Profit distribution
    profit_distribution = ProfitDistributionSchema(
        highest=max(profit_list) if profit_list else None,
        lowest=min(profit_list) if profit_list else None,
        avg_profit=round(sum(profit_list) / len(profit_list), 2) if profit_list else None,
        avg_margin=round(sum(margin_list) / len(margin_list), 1) if margin_list else None,
    )

    # ROI and margin
    overall_roi = round((total_profit / total_cost) * 100, 1) if total_cost > 0 else None
    overall_margin = round((total_profit / total_revenue) * 100, 1) if total_revenue > 0 else None

    # Top/worst vehicles (by profit)
    sorted_vehicles = sorted(top_vehicles_data, key=lambda x: x["profit"], reverse=True)
    top_vehicles = [TopVehicleSchema(**v) for v in sorted_vehicles[:5]]
    worst_vehicles = [TopVehicleSchema(**v) for v in sorted_vehicles[-5:]] if len(sorted_vehicles) >= 5 else [TopVehicleSchema(**v) for v in reversed(sorted_vehicles)]

    # ── Monthly Trend (last 12 months) ──
    twelve_months_ago = today - timedelta(days=365)
    sold_with_dates = vehicles_qs.filter(
        status="sold",
        sale_date__isnull=False,
        sale_date__gte=twelve_months_ago,
        buy_price__isnull=False,
        sale_price__isnull=False,
    ).select_related("buy_tax", "sale_tax")

    monthly_data = {}
    for v in sold_with_dates:
        month_key = v.sale_date.strftime("%Y-%m")
        if month_key not in monthly_data:
            monthly_data[month_key] = {
                "month": month_key,
                "revenue": 0.0,
                "expenses": 0.0,
                "profit": 0.0,
                "vehicles_sold": 0,
            }
        buy_net = _calc_net(v.buy_price, v.buy_tax.percentage if v.buy_tax else 0)
        sale_net = _calc_net(v.sale_price, v.sale_tax.percentage if v.sale_tax else 0)
        monthly_data[month_key]["revenue"] += sale_net
        monthly_data[month_key]["expenses"] += buy_net
        monthly_data[month_key]["profit"] += round(sale_net - buy_net, 2)
        monthly_data[month_key]["vehicles_sold"] += 1

    # Fill missing months
    monthly_trend = []
    for i in range(12):
        d = today - timedelta(days=30 * (11 - i))
        key = d.strftime("%Y-%m")
        if key in monthly_data:
            monthly_trend.append(MonthlyDataPointSchema(**monthly_data[key]))
        else:
            monthly_trend.append(MonthlyDataPointSchema(month=key))

    # Remove duplicate months (keep last occurrence)
    seen = set()
    unique_trend = []
    for point in reversed(monthly_trend):
        if point.month not in seen:
            seen.add(point.month)
            unique_trend.append(point)
    monthly_trend = list(reversed(unique_trend))

    # ── Financial Breakdown (Net/Tax/Gross) ──
    # Revenue side: sale prices of sold vehicles
    gross_revenue = 0.0
    tax_revenue = 0.0
    net_revenue = 0.0
    gross_expenses = 0.0
    tax_expenses = 0.0
    net_expenses = 0.0

    for v in sold_vehicles:
        sg = _safe_float(v.sale_price)
        st = _calc_tax_amount(v.sale_price, v.sale_tax.percentage if v.sale_tax else 0)
        sn = _calc_net(v.sale_price, v.sale_tax.percentage if v.sale_tax else 0)
        gross_revenue += sg
        tax_revenue += st
        net_revenue += sn

        bg = _safe_float(v.buy_price)
        bt = _calc_tax_amount(v.buy_price, v.buy_tax.percentage if v.buy_tax else 0)
        bn = _calc_net(v.buy_price, v.buy_tax.percentage if v.buy_tax else 0)
        gross_expenses += bg
        tax_expenses += bt
        net_expenses += bn

    financial_breakdown = FinancialBreakdownSchema(
        net_total_revenue=round(net_revenue, 2),
        net_total_expenses=round(net_expenses, 2),
        net_difference=round(net_revenue - net_expenses, 2),
        tax_total_revenue=round(tax_revenue, 2),
        tax_total_expenses=round(tax_expenses, 2),
        tax_difference=round(tax_revenue - tax_expenses, 2),
        gross_total_revenue=round(gross_revenue, 2),
        gross_total_expenses=round(gross_expenses, 2),
        gross_difference=round(gross_revenue - gross_expenses, 2),
    )

    # ── Transaction Summary ──
    txn_qs = Transaction.objects.filter(
        business=business,
    ).exclude(status="inactive")

    total_transactions = txn_qs.count()
    txn_expense_total = txn_qs.aggregate(
        total=Coalesce(Sum("amount"), Value(0), output_field=FloatField())
    )["total"]

    return DashboardResponseSchema(
        total_vehicles=total_vehicles,
        in_stock=in_stock,
        status_counts=status_counts,
        days_on_stock=days_on_stock,
        total_revenue=round(total_revenue, 2),
        total_cost=round(total_cost, 2),
        total_profit=round(total_profit, 2),
        overall_roi=overall_roi,
        overall_margin=overall_margin,
        profit_distribution=profit_distribution,
        monthly_trend=monthly_trend,
        top_vehicles=top_vehicles,
        worst_vehicles=worst_vehicles,
        financial_breakdown=financial_breakdown,
        total_transactions=total_transactions,
        total_transaction_expenses=round(_safe_float(txn_expense_total), 2),
    )
