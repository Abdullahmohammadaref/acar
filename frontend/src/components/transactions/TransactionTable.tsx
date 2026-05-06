import { Link, useParams } from "react-router-dom"
import { FileText, Trash2, RotateCcw, ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react"
import { useTranslation } from "react-i18next"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import type { TransactionListItem } from "@/types/transaction"

interface TransactionTableProps {
    transactions: TransactionListItem[]
    isLoading?: boolean
    onDelete: (transaction: TransactionListItem) => void
    onActivate: (transaction: TransactionListItem) => void
    // Sorting props
    sortField?: string
    sortOrder?: "asc" | "desc"
    onSort?: (field: string) => void
    // Highlight a specific row (for Related Transactions view)
    highlightedRowId?: number
    // Show empty state with table headers instead of simple message
    showEmptyTable?: boolean
    // Max height for the table body container (enables vertical scrolling)
    maxHeight?: string | number
}

/**
 * Transaction data table matching legacy transactions_table.html
 */
export function TransactionTable({
    transactions,
    isLoading,
    onDelete,
    onActivate,
    sortField,
    sortOrder,
    onSort,
    highlightedRowId,
    showEmptyTable,
    maxHeight,
}: TransactionTableProps) {
    const { business_slug, locale } = useParams<{ business_slug: string; locale?: string }>()
    const { t, i18n } = useTranslation()
    const rowLinkClass = "block h-full px-2 py-2 text-inherit no-underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
    const getTransactionHref = (internalId: number | null) =>
        locale
            ? `/${business_slug}/${locale}/transactions/${internalId}/edit`
            : `/${business_slug}/transactions/${internalId}/edit`

    // Helper for sortable header rendering
    const renderSortableHeader = (field: string, children: React.ReactNode, className?: string) => {
        const isSorted = sortField === field
        const icon = !isSorted ? (
            <ArrowUpDown className="h-3.5 w-3.5 ml-1 opacity-50" />
        ) : sortOrder === "asc" ? (
            <ArrowUp className="h-3.5 w-3.5 ml-1" />
        ) : (
            <ArrowDown className="h-3.5 w-3.5 ml-1" />
        )

        return (
            <TableHead className={cn("font-semibold cursor-pointer select-none hover:bg-muted/70", className)}>
                <button
                    type="button"
                    onClick={() => onSort?.(field)}
                    className="flex items-center gap-1 w-full"
                >
                    {children}
                    {icon}
                </button>
            </TableHead>
        )
    }


    // Format currency - handles Decimal (string) or number
    const formatCurrency = (amount: number | string | null | undefined, currency: string | null) => {
        if (amount === null || amount === undefined) return "-"
        const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount
        if (isNaN(numAmount)) return "-"

        let currencyCode = currency || "EUR"
        // If currency contains brackets like "US Dollar (USD)", extract the code "USD"
        const offset = currencyCode.indexOf("(")
        if (offset !== -1) {
            const match = currencyCode.match(/\(([^)]+)\)/)
            if (match) {
                currencyCode = match[1]
            }
        }

        try {
            const formattedNum = new Intl.NumberFormat("de-DE", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
            }).format(numAmount)
            return `${formattedNum} ${currencyCode}`
        } catch {
            return `${numAmount} ${currencyCode}`
        }
    }

    // Format date - handles both string and Date object
    const formatDate = (dateValue: string | Date | null | undefined) => {
        if (!dateValue) return "-"
        const date = typeof dateValue === 'string' ? new Date(dateValue) : dateValue
        if (isNaN(date.getTime())) return "-"
        return date.toLocaleDateString(i18n.language)
    }

    const getStatusBadge = (status: string | null, statusDisplay: string | null) => {
        if (!status) return null

        const variants: Record<string, { class: string }> = {
            confirmed: {
                class: "bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-300 dark:border-green-800",
            },
            review_required: {
                class: "bg-red-100 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-300 dark:border-red-800",
            },
            inactive: {
                class: "bg-muted text-muted-foreground",
            },
        }

        return (
            <Badge
                variant="outline"
                className={cn(
                    "font-medium border-0",
                    variants[status]?.class || "bg-muted text-muted-foreground"
                )}
            >
                {t(`status.${status}`) || statusDisplay || status}
            </Badge>
        )
    }

    if (isLoading) {
        return (
            <div className="rounded-xl border border-border bg-card">
                <div className="h-64 animate-pulse bg-muted rounded" />
            </div>
        )
    }

    if (!transactions.length) {
        // If showEmptyTable is true, show table with headers and empty state message
        if (showEmptyTable) {
            return (
                <div className="rounded-xl border border-border bg-card overflow-hidden">
                    <div
                        className="overflow-x-auto"
                        style={maxHeight ? { maxHeight, overflowY: 'auto' } : undefined}
                    >
                        <Table>
                            <TableHeader>
                                <TableRow className="bg-muted/50 hover:bg-muted/50">
                                    <TableHead className="font-semibold">{t('transactions.table.transaction')}</TableHead>
                                    <TableHead className="font-semibold text-right">{t('transactions.table.amount')}</TableHead>
                                    <TableHead className="font-semibold">{t('transactions.table.date')}</TableHead>
                                    <TableHead className="font-semibold">{t('transactions.table.method')}</TableHead>
                                    <TableHead className="font-semibold">{t('transactions.table.status')}</TableHead>
                                    <TableHead className="font-semibold w-24 text-center">{t('transactions.table.actions')}</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                <TableRow>
                                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                                        {t('transactions.noTransactionsForVehicle') || 'No transactions yet for this vehicle.'}
                                    </TableCell>
                                </TableRow>
                            </TableBody>
                        </Table>
                    </div>
                </div>
            )
        }
        return (
            <div className="rounded-xl border border-dashed border-border p-12 text-center">
                <p className="text-muted-foreground">{t('transactions.noTransactions')}</p>
            </div>
        )
    }

    return (
        <div className="rounded-xl border border-border bg-card overflow-hidden">
            <div
                className="overflow-x-auto"
                style={maxHeight ? { maxHeight, overflowY: 'auto' } : undefined}
            >
                <Table>
                    <TableHeader>
                        <TableRow className="bg-muted/50 hover:bg-muted/50">
                            <TableHead className="font-semibold">{t('transactions.table.transaction')}</TableHead>
                            {renderSortableHeader("amount", t('transactions.table.amount'), "text-right")}
                            {renderSortableHeader("date", t('transactions.table.date'))}
                            <TableHead className="font-semibold">{t('transactions.table.method')}</TableHead>
                            {renderSortableHeader("status", t('transactions.table.status'))}
                            <TableHead className="font-semibold w-24 text-center">{t('transactions.table.actions')}</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {transactions.map((tx) => {
                            const transactionHref = getTransactionHref(tx.internal_id)

                            return (
                                <TableRow
                                    key={tx.id}
                                    className={cn(
                                        "cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors duration-150",
                                        tx.status === "inactive" && "opacity-50",
                                        highlightedRowId === tx.internal_id && "bg-primary/10 ring-1 ring-primary ring-inset"
                                    )}
                                >
                                {/* Transaction Info */}
                                <TableCell className="p-0">
                                    <Link
                                        to={transactionHref}
                                        className={rowLinkClass}
                                    >
                                        <div className="flex flex-col">
                                            <span className="font-medium text-foreground">
                                                #{tx.internal_id} - {tx.category_display || tx.category || t('transactions.table.uncategorized')}
                                            </span>
                                            {tx.subcategory && (
                                                <span className="text-sm text-muted-foreground">
                                                    {tx.subcategory}
                                                </span>
                                            )}
                                            {tx.vehicle_display && (
                                                <span className="text-xs text-muted-foreground mt-1">
                                                    {t('transactions.table.vehicleLabel')}: {tx.vehicle_display}
                                                </span>
                                            )}
                                        </div>
                                    </Link>
                                </TableCell>

                                {/* Amount */}
                                <TableCell className="p-0 text-right">
                                    <Link
                                        to={transactionHref}
                                        className={cn(rowLinkClass, "text-right")}
                                    >
                                        <span
                                            className={cn(
                                                "font-mono font-semibold",
                                                parseFloat(String(tx.amount ?? 0)) >= 0
                                                    ? "text-success-600 dark:text-success-400"
                                                    : "text-red-500"
                                            )}
                                        >
                                            {formatCurrency(tx.amount, tx.currency)}
                                        </span>
                                    </Link>
                                </TableCell>

                                {/* Date */}
                                <TableCell className="p-0 text-muted-foreground">
                                    <Link
                                        to={transactionHref}
                                        className={rowLinkClass}
                                    >
                                        {formatDate(tx.date)}
                                    </Link>
                                </TableCell>

                                {/* Method */}
                                <TableCell className="p-0 text-muted-foreground">
                                    <Link
                                        to={transactionHref}
                                        className={rowLinkClass}
                                    >
                                        {tx.method_display || tx.method || "-"}
                                    </Link>
                                </TableCell>

                                {/* Status */}
                                <TableCell className="p-0">
                                    <Link
                                        to={transactionHref}
                                        className={rowLinkClass}
                                    >
                                        {getStatusBadge(tx.status, tx.status_display)}
                                    </Link>
                                </TableCell>

                                {/* Actions */}
                                <TableCell>
                                    <div className="grid grid-cols-2 gap-2 w-16">
                                        {/* Create Document / PDF */}
                                        <div className="flex justify-center">
                                            {tx.can_generate_pdf && (
                                                <a
                                                    href={`/api/transactions/${tx.internal_id}/pdf`}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    onClick={(e) => e.stopPropagation()}
                                                    className="inline-flex items-center justify-center h-8 w-8 rounded-md hover:bg-muted transition-colors"
                                                    title={t('common.pdf') || "PDF"}
                                                >
                                                    <FileText className="h-4 w-4 text-muted-foreground" />
                                                </a>
                                            )}
                                        </div>

                                        {/* Delete/Activate */}
                                        <div className="flex justify-center">
                                            {tx.status === "inactive" ? (
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-8 w-8"
                                                    onClick={(e) => {
                                                        e.stopPropagation()
                                                        onActivate(tx)
                                                    }}
                                                    title={t('common.activate') || "Activate"}
                                                >
                                                    <RotateCcw className="h-4 w-4 text-success-600" />
                                                </Button>
                                            ) : (
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-8 w-8 text-red-500 hover:bg-red-100 hover:text-red-700 dark:hover:bg-red-900/40 dark:hover:text-red-400"
                                                    onClick={(e) => {
                                                        e.stopPropagation()
                                                        onDelete(tx)
                                                    }}
                                                    title={t('common.delete') || "Delete"}
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            )}
                                        </div>
                                    </div>
                                </TableCell>
                                </TableRow>
                            )
                        })}
                    </TableBody>
                </Table>
            </div>
        </div>
    )
}
