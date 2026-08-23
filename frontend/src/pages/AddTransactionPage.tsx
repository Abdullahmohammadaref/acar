import { useNavigate, useParams, useSearchParams } from "react-router-dom"
import { ArrowLeft, Plus, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { TransactionForm } from "@/components/transactions/TransactionForm"
import { useCreateTransaction, useNextTransactionId } from "@/hooks/useTransactions"
import type { TransactionFormData } from "@/types/transaction"

/**
 * Add Transaction Page
 * Route: /:business_slug/transactions/new
 */
export function AddTransactionPage() {
    const navigate = useNavigate()
    const { business_slug, locale } = useParams<{ business_slug: string; locale?: string }>()
    const [searchParams] = useSearchParams()
    const vehicleParam = searchParams.get("vehicle_id") || searchParams.get("vehicle")
    const parsedVehicleId = vehicleParam ? parseInt(vehicleParam, 10) : undefined
    const initialVehicleId = parsedVehicleId && !isNaN(parsedVehicleId) ? parsedVehicleId : undefined

    const createMutation = useCreateTransaction()

    // Fetch the projected next ID
    const { data: nextId, isLoading: nextIdLoading } = useNextTransactionId()

    const basePath = locale ? `/${business_slug}/${locale}` : `/${business_slug}`

    const handleSubmit = async (data: TransactionFormData) => {
        try {
            await createMutation.mutateAsync(data)
            // Redirect with success message
            navigate(`${basePath}/transactions?success=${encodeURIComponent("Transaction added successfully.")}`)
        } catch (error) {
            console.error("Failed to create transaction:", error)
        }
    }

    const handleBack = () => {
        // Smart back: use browser history if available, otherwise fallback to transactions list
        if (window.history.state && window.history.state.idx > 0) {
            navigate(-1)
        } else {
            navigate(`${basePath}/transactions`)
        }
    }

    return (
        <div className="space-y-6">
            {/* Page Header */}
            <div className="flex items-center gap-4">
                <Button variant="ghost" size="icon" onClick={handleBack}>
                    <ArrowLeft className="h-5 w-5" />
                </Button>
                <div>
                    <div className="flex items-center gap-3">
                        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
                            <Plus className="h-6 w-6" />
                            Add New Transaction
                        </h1>
                        {/* Next ID Badge */}
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                            {nextIdLoading ? (
                                <Loader2 className="h-3 w-3 animate-spin mr-1" />
                            ) : null}
                            Next ID: #{nextId ?? '...'}
                        </span>
                    </div>
                    <p className="text-muted-foreground mt-1">
                        Create a new financial transaction record
                    </p>
                </div>
            </div>

            {/* Transaction Form */}
            <TransactionForm
                mode="create"
                initialVehicleId={initialVehicleId}
                onSubmit={handleSubmit}
                isLoading={createMutation.isPending}
            />
        </div>
    )
}
