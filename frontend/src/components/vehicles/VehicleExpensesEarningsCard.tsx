import { useState, useMemo, useCallback } from "react"
import { Plus, X, TrendingUp, TrendingDown, DollarSign } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { DynamicSelect } from "@/components/ui/dynamic-select"
import { formatCurrency } from "@/lib/utils"
import { useCreateExpenseEarning, useDeleteExpenseEarning } from "@/hooks/useVehicles"
import type { VehicleExpenseEarning, AllChoices } from "@/types/vehicle"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"

interface VehicleExpensesEarningsCardProps {
    vehicleInternalId: number
    entries: VehicleExpenseEarning[]
    choices: AllChoices | undefined
}

export function VehicleExpensesEarningsCard({
    vehicleInternalId,
    entries,
    choices,
}: VehicleExpensesEarningsCardProps) {
    // -- State --
    const [showDialog, setShowDialog] = useState(false)
    const [entryType, setEntryType] = useState<"expense" | "earning">("expense")
    const [amount, setAmount] = useState("")
    const [categoryId, setCategoryId] = useState<number | null>(null)
    const [subcategoryId, setSubcategoryId] = useState<number | null>(null)
    const [formError, setFormError] = useState<string | null>(null)

    // -- Mutations --
    const createMutation = useCreateExpenseEarning()
    const deleteMutation = useDeleteExpenseEarning()

    // -- Derived --
    const totalExpenses = useMemo(
        () => entries.filter((e) => e.type === "expense").reduce((s, e) => s + Number(e.amount), 0),
        [entries]
    )
    const totalEarnings = useMemo(
        () => entries.filter((e) => e.type === "earning").reduce((s, e) => s + Number(e.amount), 0),
        [entries]
    )
    const netBalance = totalEarnings - totalExpenses
    const sign = netBalance < 0 ? "−" : netBalance > 0 ? "+" : ""

    // Category options (already in choices)
    const categoryOptions = useMemo(
        () => choices?.categories?.map((c) => ({ id: c.id, name: c.name })) ?? [],
        [choices?.categories]
    )

    // Filtered subcategories based on selected category
    const subcategoryOptions = useMemo(
        () =>
            categoryId
                ? choices?.subcategories
                    ?.filter((s) => s.category_id === categoryId)
                    .map((s) => ({ id: s.id, name: s.name })) ?? []
                : [],
        [categoryId, choices?.subcategories]
    )

    // -- Handlers --
    const resetForm = useCallback(() => {
        setAmount("")
        setCategoryId(null)
        setSubcategoryId(null)
        setFormError(null)
        setShowDialog(false)
    }, [])

    const isFormValid = Boolean(
        categoryId &&
        subcategoryId &&
        entryType &&
        amount &&
        parseFloat(amount) > 0
    )

    const handleSubmit = useCallback(async () => {
        setFormError(null)
        const parsedAmount = parseFloat(amount)
        if (!isFormValid) return

        try {
            await createMutation.mutateAsync({
                vehicleInternalId,
                payload: {
                    type: entryType,
                    amount: parsedAmount,
                    category_id: categoryId!,
                    subcategory_id: subcategoryId!,
                },
            })
            resetForm()
        } catch (error: unknown) {
            const err = error as { response?: { data?: { detail?: string } }; message?: string }
            setFormError(
                err.response?.data?.detail || err.message || "Failed to save entry"
            )
        }
    }, [amount, categoryId, subcategoryId, entryType, vehicleInternalId, createMutation, resetForm, isFormValid])

    const handleDelete = useCallback(
        async (entryId: number) => {
            try {
                await deleteMutation.mutateAsync({ vehicleInternalId, entryId })
            } catch {
                // silently fail - server error will show elsewhere
            }
        },
        [vehicleInternalId, deleteMutation]
    )

    return (
        <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden h-full flex flex-col">
            {/* Header */}
            <div className="bg-muted/50 px-4 py-3 border-b border-border">
                <div className="flex items-center justify-between mb-3">
                    <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
                        <DollarSign className="h-4 w-4 text-muted-foreground" />
                        Expenses & Earnings
                    </h2>
                    <Button
                        type="button"
                        size="sm"
                        className="h-8 px-3 text-xs bg-blue-600 hover:bg-blue-700 text-white shadow-sm"
                        onClick={() => setShowDialog(true)}
                    >
                        <Plus className="h-3.5 w-3.5 mr-1" />
                        Add
                    </Button>
                </div>

                <div className="flex flex-row flex-wrap items-center gap-x-4 gap-y-1 min-w-0 rounded-md border p-2 shadow-sm transition-colors bg-background border-border/40 hover:border-border/80 w-full">
                    <div className="flex items-center gap-1.5">
                        <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold whitespace-nowrap">Net:</span>
                        <span className={`text-sm font-bold ${netBalance < 0 ? 'text-red-500 dark:text-red-400' : 'text-green-600 dark:text-green-400'} whitespace-nowrap`}>
                            {sign}{formatCurrency(Math.abs(netBalance))}
                        </span>
                    </div>
                    <div className="text-[10px] text-muted-foreground/50 font-medium whitespace-nowrap">
                        Earnings (+{formatCurrency(totalEarnings)}) − Expenses ({formatCurrency(totalExpenses)})
                    </div>
                </div>
            </div>

            {/* Entry List - Pills */}
            <div className="p-4 flex-1 overflow-y-auto max-h-[14rem]">
                {entries.length === 0 ? (
                    <div className="text-center text-xs text-muted-foreground py-4">
                        No expenses or earnings recorded yet.
                    </div>
                ) : (
                    <div className="flex flex-wrap gap-2">
                        {entries.map((entry) => {
                            const isExpense = entry.type === "expense"
                            return (
                                <div
                                    key={entry.id}
                                    className={`flex items-center gap-1.5 rounded-full px-2.5 py-1.5 text-xs font-medium border ${
                                        isExpense
                                            ? "bg-red-100 text-red-700 border-red-200 dark:bg-red-950/50 dark:text-red-300 dark:border-red-900/50"
                                            : "bg-green-100 text-green-700 border-green-200 dark:bg-green-950/50 dark:text-green-300 dark:border-green-900/50"
                                    }`}
                                >
                                    {isExpense ? (
                                        <TrendingDown className="h-3 w-3 flex-shrink-0" />
                                    ) : (
                                        <TrendingUp className="h-3 w-3 flex-shrink-0" />
                                    )}
                                    <span className="truncate max-w-[150px]">
                                        {entry.category_name} • {entry.subcategory_name}
                                    </span>
                                    <span className="font-bold whitespace-nowrap">
                                        {isExpense ? "−" : "+"}{formatCurrency(Number(entry.amount))}
                                    </span>
                                    <button
                                        type="button"
                                        onClick={() => handleDelete(entry.id)}
                                        className={`p-0.5 rounded-full hover:bg-black/10 dark:hover:bg-white/10 transition-colors ml-1 ${
                                            deleteMutation.isPending ? "opacity-50 cursor-not-allowed" : ""
                                        }`}
                                        title="Remove"
                                        disabled={deleteMutation.isPending}
                                    >
                                        <X className="h-3 w-3" />
                                    </button>
                                </div>
                            )
                        })}
                    </div>
                )}
            </div>

            {/* Add Dialog */}
            <Dialog open={showDialog} onOpenChange={setShowDialog}>
                <DialogContent className="sm:max-w-[400px] p-0 overflow-hidden">
                    <DialogHeader className="px-5 py-4 border-b border-border bg-muted/20">
                        <DialogTitle className="text-lg font-semibold text-foreground">Add Entry</DialogTitle>
                    </DialogHeader>

                    <div className="p-5 space-y-4">
                        {/* Category */}
                        <div className="space-y-1.5">
                            <Label className="text-sm font-medium text-foreground">Category</Label>
                            <DynamicSelect
                                choiceType="category"
                                options={categoryOptions}
                                value={categoryId}
                                onChange={(val) => {
                                    setCategoryId(val)
                                    setSubcategoryId(null) // reset dependent
                                }}
                                placeholder="Select category"
                                createLabel="Category"
                            />
                        </div>

                        {/* Subcategory */}
                        <div className="space-y-1.5">
                            <Label className="text-sm font-medium text-foreground">Subcategory</Label>
                            <DynamicSelect
                                choiceType="subcategory"
                                options={subcategoryOptions}
                                value={subcategoryId}
                                onChange={(val) => setSubcategoryId(val)}
                                placeholder={categoryId ? "Select subcategory" : "Select category first"}
                                disabled={!categoryId}
                                createLabel="Subcategory"
                                parentId={categoryId ?? undefined}
                            />
                        </div>

                        {/* Type Toggle */}
                        <div className="space-y-1.5">
                            <Label className="text-sm font-medium text-foreground">Type</Label>
                            <div className="grid grid-cols-2 gap-2 bg-muted/50 p-1 rounded-lg border border-border/50">
                                <button
                                    type="button"
                                    className={`flex items-center justify-center gap-1.5 py-2 text-sm font-medium rounded-md transition-all ${
                                        entryType === "expense"
                                            ? "bg-red-500 text-white shadow-sm"
                                            : "text-muted-foreground hover:bg-muted"
                                    }`}
                                    onClick={() => setEntryType("expense")}
                                >
                                    <TrendingDown className="h-4 w-4" />
                                    Expense
                                </button>
                                <button
                                    type="button"
                                    className={`flex items-center justify-center gap-1.5 py-2 text-sm font-medium rounded-md transition-all ${
                                        entryType === "earning"
                                            ? "bg-green-500 text-white shadow-sm"
                                            : "text-muted-foreground hover:bg-muted"
                                    }`}
                                    onClick={() => setEntryType("earning")}
                                >
                                    <TrendingUp className="h-4 w-4" />
                                    Earning
                                </button>
                            </div>
                        </div>

                        {/* Amount */}
                        <div className="space-y-1.5">
                            <Label className="text-sm font-medium text-foreground">Amount (€)</Label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <span className={`font-medium ${
                                        entryType === "expense" ? "text-red-500" : "text-green-500"
                                    }`}>
                                        {entryType === "expense" ? "−" : "+"}
                                    </span>
                                </div>
                                <Input
                                    type="number"
                                    step="0.01"
                                    min="0.01"
                                    value={amount}
                                    onChange={(e) => setAmount(e.target.value)}
                                    placeholder="0.00"
                                    className="pl-7 bg-background"
                                />
                            </div>
                        </div>

                        {/* Error */}
                        {formError && (
                            <p className="text-sm text-red-500 bg-red-50 dark:bg-red-950/30 p-2 rounded-md">{formError}</p>
                        )}
                    </div>

                    {/* Actions */}
                    <div className="px-5 py-4 border-t border-border bg-muted/20 flex items-center justify-end gap-2">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={resetForm}
                        >
                            Cancel
                        </Button>
                        <Button
                            type="button"
                            onClick={handleSubmit}
                            disabled={!isFormValid || createMutation.isPending}
                            className={
                                isFormValid
                                    ? "bg-blue-600 hover:bg-blue-700 text-white"
                                    : ""
                            }
                        >
                            {createMutation.isPending ? "Adding..." : "Add Entry"}
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    )
}
