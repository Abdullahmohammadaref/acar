import { useState } from "react"
import { useParams, Link } from "react-router-dom"
import { Plus, ExternalLink, Loader2, ChevronLeft, ChevronRight } from "lucide-react"
import { useTranslation } from "react-i18next"
import { TransactionTable } from "./TransactionTable"
import { Button } from "@/components/ui/button"
import { useTransactions, useDeleteTransaction } from "@/hooks/useTransactions"
import { useVehicle } from "@/hooks/useVehicles"
import type { TransactionListItem } from "@/types/transaction"

interface RelatedTransactionsTableProps {
    vehicleId: number
    vehicleName?: string
    highlightedTransactionId?: number
    hideNavigationLink?: boolean
}

export function RelatedTransactionsTable({
    vehicleId,
    vehicleName,
    highlightedTransactionId,
    hideNavigationLink,
}: RelatedTransactionsTableProps) {
    const { t } = useTranslation()
    const { business_slug, locale } = useParams<{ business_slug: string; locale?: string }>()
    const basePath = locale ? `/${business_slug}/${locale}` : `/${business_slug}`

    // Pagination state
    const [page, setPage] = useState(1)
    const PAGE_SIZE = 10

    // Fetch vehicle details to ensure correct display format
    // vehicleId prop is confirmed to be the internal_id based on api.py and usage
    const { data: vehicle } = useVehicle(vehicleId)

    // Fetch transactions for this vehicle
    const { data, isLoading } = useTransactions({
        vehicle: vehicleId,
        per_page: 100, // Fetch up to 100 most recent transactions
    })

    const deleteMutation = useDeleteTransaction()

    const transactions = data?.transactions?.items ?? []

    // Client-side pagination logic
    const totalPages = Math.ceil(transactions.length / PAGE_SIZE)
    const paginatedTransactions = transactions.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

    // Handle delete (soft delete - set to inactive)
    const handleDelete = async (transaction: TransactionListItem) => {
        if (!confirm(t('transactions.confirmDelete') || `Delete transaction #${transaction.internal_id}?`)) {
            return
        }
        try {
            await deleteMutation.mutateAsync(transaction.internal_id!)
        } catch (error) {
            console.error("Failed to delete transaction:", error)
        }
    }

    // Handle activate (restore from inactive)
    const handleActivate = async (transaction: TransactionListItem) => {
        // This would need an activate mutation - for now just log
        console.log("Activate transaction:", transaction.internal_id)
    }

    const handlePreviousPage = () => {
        setPage((p) => Math.max(1, p - 1))
    }

    const handleNextPage = () => {
        setPage((p) => Math.min(totalPages, p + 1))
    }

    // Dynamic Labels - Explicitly constructed from fetched data
    // Fallback to props/ID if vehicle data not yet loaded
    const displayId = vehicle?.internal_id || vehicleId
    const makeName = vehicle?.make_name || ''
    const modelName = vehicle?.model_name || ''

    // Construct display string: "#{ID} - {Make} {Model}" (or fallback if empty)
    const vehicleDisplayString = (makeName || modelName)
        ? `${makeName} ${modelName}`.trim()
        : (vehicleName || `Vehicle #${displayId}`)

    // Clean up props vehicleName if it already contains ID to avoid duplication in fallback
    // (This is a safety net in case vehicle fetch fails)
    const safeVehicleName = vehicleDisplayString.replace(new RegExp(`^#?${displayId}\\s*-\\s*`), '')

    const fullVehicleLabel = `#${displayId} - ${safeVehicleName}`

    const tableTitle = `${fullVehicleLabel} Transactions`
    const linkLabel = `Go to ${fullVehicleLabel} Details`

    return (
        <div className="space-y-2 mt-0">
            {/* Section Header */}
            <div className="flex items-center justify-between pb-2 gap-2 flex-wrap">
                <div>
                    <h2 className="text-lg font-semibold text-foreground">
                        {tableTitle}
                    </h2>
                </div>

                <div className="flex items-center gap-2">
                    {/* Add Transaction Button */}
                    <Link to={`${basePath}/transactions/new?vehicle_id=${vehicleId}`}>
                        <Button size="sm" className="h-8 gap-1.5 text-xs font-medium">
                            <Plus className="h-3.5 w-3.5" />
                            <span>{t('transactions.addTransaction') || 'Add Transaction'}</span>
                        </Button>
                    </Link>

                    {/* Go to Vehicle Link */}
                    {!hideNavigationLink && (
                        <Link
                            to={`${basePath}/vehicles/${vehicleId}/edit`}
                            className="inline-flex items-center gap-2 text-sm text-primary hover:underline ml-1"
                        >
                            <ExternalLink className="h-4 w-4" />
                            {linkLabel}
                        </Link>
                    )}
                </div>
            </div>

            {/* Loading State */}
            {isLoading ? (
                <div className="flex items-center justify-center h-32 rounded-xl border border-border bg-card">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
            ) : (
                <>
                    <div className="overflow-x-auto">
                        <TransactionTable
                            transactions={paginatedTransactions}
                            isLoading={false}
                            onDelete={handleDelete}
                            onActivate={handleActivate}
                            highlightedRowId={highlightedTransactionId}
                            showEmptyTable={true}
                            maxHeight="400px"
                            compactBadges={true}
                        />
                    </div>

                    {/* Pagination Controls */}
                    {transactions.length > 0 && (
                        <div className="flex items-center justify-between py-2">
                            <p className="text-sm text-muted-foreground">
                                Page {page} of {totalPages || 1}
                            </p>
                            <div className="flex items-center gap-2">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={handlePreviousPage}
                                    disabled={page === 1}
                                >
                                    <ChevronLeft className="h-4 w-4 mr-1" />
                                    Previous
                                </Button>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={handleNextPage}
                                    disabled={page === totalPages || totalPages === 0}
                                >
                                    Next
                                    <ChevronRight className="h-4 w-4 ml-1" />
                                </Button>
                            </div>
                        </div>
                    )}
                </>
            )}
        </div>
    )
}
