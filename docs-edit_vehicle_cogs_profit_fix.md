# 📝 Documentation: Edit Vehicle Financial Formulas & COGS Sign Fix

**Date:** 2026-08-22  
**Plan Reference:** `prompt_edit_vehicle_cogs_profit_fix.md` & `edit_vehicle_formula_explanation.jsx`  
**Scope:** Edit Vehicle Details Page Financial Metrics Calculation Engine (`vehicleFinancials.ts`) & UI Display (`FinancialMetricsStrip.tsx`)

---

## 🎯 Summary of Changes

This update fixes the sign bug in the vehicle-scoped expense/earning calculation and restructures Gross Profit, Net Profit, and Total Profit formulas on the Vehicle Edit Details page:

### 1. Root Cause Fix: `calcNetExpensesEarnings` Sign Convention
- **Previous bug**: `entries.reduce((sum, e) => sum + (e.type === "expense" ? amt : -amt))` returned positive values for expenses and negative values for earnings, which inverted the true signed net balance.
- **Fix**: Updated to `sum + (e.type === "earning" ? amt : -amt)` (i.e. `totalEarnings − totalExpenses`).
- **Result**: Matches the literal `NET` display in `VehicleExpensesEarningsCard` (e.g. €300 expense with €0 earnings produces a signed value of `−300.00 €`).

### 2. COGS & Gross COGS Formula Alignment
- **COGS**: `buy_net + net_exp_earn` (where `net_exp_earn` is signed).  
  *Example*: `14,409.09 + (−300.00) = 14,109.09 €`
- **Gross COGS** (introduced as `grossCogs`): `buy_gross + net_exp_earn`  
  *Example*: `15,850.00 + (−300.00) = 15,550.00 €`

### 3. Restructured Profit Metrics (Gross, Net, Total Profit)
- **Gross Profit**: `sale_gross + Gross COGS`.  
- **Net Profit**: `sale_net + COGS`.  
- **VAT Liability**: `|sale_tax_amount − buy_tax_amount|` (unchanged).  
- **Total Profit**: Simplified to `Net Profit − VAT Liability`.  
- **Margin & ROI**:
  - `Margin`: `(Gross Profit ÷ sale_net) × 100`
  - `ROI`: `(Gross Profit ÷ COGS) × 100`

### 4. Financial Metrics Strip Equations
Updated equation text under each metric cell in `FinancialMetricsStrip.tsx`:
- **COGS**: `${fc(buyNet)} + (${fc(netExpensesEarnings)})` (or `+ ${fc(netExpensesEarnings)}`)
- **Gross Profit**: `${fc(saleGross)} + ${fc(grossCogs)}` (or `+ (${fc(grossCogs)})` if negative)
- **Net Profit**: `${fc(saleNet)} + ${fc(cogs)}` (or `+ (${fc(cogs)})` if negative)
- **Total Profit**: `${fc(netProfit)} − ${fc(taxLiability)}` (or `+ (${fc(taxLiability)})` if negative)
- **Margin**: `${fc(grossProfit)} ÷ ${fc(saleNet)} × 100`
- **ROI**: `${fc(grossProfit)} ÷ ${fc(cogs)} × 100`
- **VAT Liability** & **Break-Even**: Unchanged.

---

### 5. Vehicles Page Header Financial Summary Alignment
Aligned `calculate_financial_summary` in `backend/manager/api.py` and `calculate_summary` in `backend/manager/vehicle_api.py` with the vehicle financial calculations:
- **Gross Revenue**: `sum(vehicle.sale_price)`
- **Net Revenue**: `sum(vehicle.sale_price_net)`
- **Gross Expenses**: `sum(Gross COGS)` = `sum(buy_gross + net_exp_earn)`
- **Net Expenses**: `sum(COGS)` = `sum(buy_net + net_exp_earn)`
- **Gross Profit**: `sum(sale_gross + Gross COGS)`
- **Net Profit**: `sum(sale_net + COGS)`
- **VAT Liability**: `sum(|sale_tax_amount − buy_tax_amount|)`
- **Total Profit**: `sum(Net Profit − VAT Liability)`

---

## 📁 Modified Files

| File | Changes |
|------|---------|
| `backend/manager/api.py` | Updated `calculate_financial_summary` to aggregate vehicle-scoped COGS, Gross COGS, VAT liability, and profits. |
| `backend/manager/vehicle_api.py` | Updated `calculate_summary` and `VehicleSummarySchema` with matching financial calculations. |
| `backend/manager/schemas.py` | Updated `FinancialSummary` schema with `total_profit` and margin fields. |
| `frontend/src/types/vehicle.ts` | Added `total_profit` to `FinancialSummary` interface. |
| `frontend/src/components/vehicles/FinancialSummary.tsx` | Updated 5-card summary layout and aligned VAT Liability and Total Profit displays. |
| `frontend/src/lib/vehicleFinancials.ts` | Fixed `calcNetExpensesEarnings` sign calculation, added `calcGrossCOGS`, updated `calcGrossProfit(saleGross, grossCogs)`, `calcNetProfit(saleNet, cogs)`, `calcTotalProfit(netProfit, taxLiability)`, `calcProfitMargin(grossProfit, saleNet)`, `calcROI(grossProfit, cogs)`, added `grossCogs` to `VehicleFinancials` and `getFinancialColor`. |
| `frontend/src/components/vehicles/FinancialMetricsStrip.tsx` | Updated `MetricCell` equation props for COGS, Gross Profit, Net Profit, Total Profit, Margin, and ROI. |
| `.agents/design-system/components.md` | Updated Section 7 (FinancialMetricsStrip) formula specifications. |
| `.agents/artifacts/PROJECT_MAP.md` | Documented the financial formula fix and new documentation reference. |
