const fc = (n) => new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" }).format(n)

/**
 * ⚠️ EXPLANATION-ONLY MOCKUP — DO NOT IMPLEMENT THIS AS LITERAL UI
 *
 * This exists purely to verify the corrected formulas for the EDIT VEHICLE
 * DETAILS page (the single-vehicle card grid: COGS / VAT Liability /
 * Break-Even / Gross Profit / Net Profit / Total Profit / Margin / ROI).
 *
 * The actual UI layout for these cards ALREADY EXISTS in the app — this
 * mockup is not proposing a new layout. It exists only to walk through the
 * math step by step so the numbers can be verified before implementation.
 *
 * VW Golf #1 — real data:
 *   buy_gross = 15,850.00 | buy_net = 14,409.09 | buy_tax_amount = 1,440.91
 *   sale_gross = 19,990.00 | sale_net = 18,172.73 | sale_tax_amount = 1,817.27
 *   net_exp_earn (signed) = −300.00  (Earnings 0.00 − Expenses 300.00)
 */

const v = {
  buy_gross: 15850.00,
  buy_net: 14409.09,
  buy_tax_amount: 1440.91,
  sale_gross: 19990.00,
  sale_net: 18172.73,
  sale_tax_amount: 1817.27,
  net_exp_earn: -300.00, // SIGNED — this is the root-cause value
}

// ── Corrected formulas ──────────────────────────────────────────────────
const cogs = v.buy_net + v.net_exp_earn                        // 14,109.09
const grossCogs = v.buy_gross + v.net_exp_earn                 // 15,550.00
const grossProfit = v.sale_gross - grossCogs                   // 4,440.00
const netProfit = v.sale_net - cogs                             // 4,063.64
const vatLiability = Math.abs(v.sale_tax_amount - v.buy_tax_amount) // 376.36
const totalProfit = netProfit - vatLiability                    // 3,687.28
const margin = (grossProfit / v.sale_net) * 100
const roi = (grossProfit / cogs) * 100

function Row({ label, formula, result, before }) {
  return (
    <div className="rounded-lg bg-white dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 p-4">
      <div className="flex items-baseline justify-between mb-2">
        <span className="font-bold text-zinc-800 dark:text-zinc-200 text-sm">{label}</span>
        <span className="text-lg font-bold text-green-600 dark:text-green-400">{fc(result)}</span>
      </div>
      <div className="text-xs font-mono text-zinc-500 dark:text-zinc-400">{formula}</div>
      {before && (
        <div className="text-xs font-mono text-red-400 dark:text-red-500 mt-1">
          was: {before}
        </div>
      )}
    </div>
  )
}

export default function EditVehicleFormulaCheck() {
  return (
    <div className="min-h-screen bg-zinc-100 dark:bg-zinc-950 p-6 font-sans">
      <div className="max-w-3xl mx-auto">
        <div className="mb-6 rounded-lg border border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-950/40 p-4">
          <p className="text-sm font-bold text-amber-800 dark:text-amber-300">
            ⚠️ Explanation only — this is NOT a UI redesign
          </p>
          <p className="text-xs text-amber-700 dark:text-amber-400 mt-1">
            The card layout already exists in the app. This just verifies the math for
            COGS, Gross Profit, Net Profit, and Total Profit before implementation.
          </p>
        </div>

        <h1 className="text-lg font-bold text-zinc-900 dark:text-zinc-100 mb-1">
          Edit Vehicle Page — Corrected Formulas
        </h1>
        <p className="text-xs text-zinc-500 mb-5">
          VW Golf #1 · net_exp_earn (signed) = −€300.00
        </p>

        <div className="space-y-3">
          <Row
            label="COGS"
            formula="buy_net + net_exp_earn = 14,409.09 + (−300.00)"
            result={cogs}
            before="14,709.09 € (bug: always added +300 instead of signed value)"
          />
          <Row
            label="Gross COGS (new — internal, used only for Gross Profit calc)"
            formula="buy_gross + net_exp_earn = 15,850.00 + (−300.00)"
            result={grossCogs}
          />
          <Row
            label="Gross Profit"
            formula="sale_gross − Gross COGS = 19,990.00 − 15,550.00"
            result={grossProfit}
            before="4,140.00 € (old formula ignored expenses/earnings entirely)"
          />
          <Row
            label="Net Profit"
            formula="sale_net − COGS = 18,172.73 − 14,109.09"
            result={netProfit}
            before="3,763.64 € (old formula ignored expenses/earnings entirely)"
          />
          <Row
            label="VAT Liability"
            formula="|sale_tax_amount − buy_tax_amount| = |1,817.27 − 1,440.91|"
            result={vatLiability}
          />
          <Row
            label="Total Profit"
            formula="Net Profit − VAT Liability = 4,063.64 − 376.36"
            result={totalProfit}
            before="3,087.28 € (old formula: sale_net − COGS − VAT, double-counted differently)"
          />
        </div>

        <div className="mt-5 grid grid-cols-2 gap-3">
          <div className="rounded-lg bg-white dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 p-4">
            <div className="text-xs font-bold text-zinc-600 dark:text-zinc-400 mb-1">Margin (unchanged formula)</div>
            <div className="text-sm font-mono text-zinc-500">Gross Profit ÷ sale_net</div>
            <div className="text-lg font-bold text-green-600 mt-1">{margin.toFixed(1)}%</div>
          </div>
          <div className="rounded-lg bg-white dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 p-4">
            <div className="text-xs font-bold text-zinc-600 dark:text-zinc-400 mb-1">ROI (unchanged formula)</div>
            <div className="text-sm font-mono text-zinc-500">Gross Profit ÷ COGS</div>
            <div className="text-lg font-bold text-green-600 mt-1">{roi.toFixed(1)}%</div>
          </div>
        </div>

        <div className="mt-6 rounded-lg border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/30 p-4">
          <p className="text-xs font-bold text-blue-800 dark:text-blue-300 mb-2">
            Why Total Profit's formula got simpler
          </p>
          <p className="text-xs text-blue-700 dark:text-blue-400 leading-relaxed">
            Before: Total Profit subtracted COGS AND VAT from sale_net in one step,
            while Gross/Net Profit above it didn't subtract COGS at all — inconsistent.
            Now: Net Profit already has COGS baked in, so Total Profit only needs to
            subtract VAT Liability on top of that. One consistent chain: Gross Profit →
            Net Profit (adds VAT-free view) → Total Profit (final, VAT-adjusted).
          </p>
        </div>
      </div>
    </div>
  )
}
