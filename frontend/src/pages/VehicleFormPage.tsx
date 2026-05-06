import { useParams, useNavigate } from "react-router-dom"
import { useQuery } from "@tanstack/react-query"
import { Loader2, ArrowLeft, Car } from "lucide-react"
import { VehicleForm } from "@/components/vehicles/VehicleForm"
import { RelatedTransactionsTable } from "@/components/transactions/RelatedTransactionsTable"
import { useAutoSave } from "@/hooks/useAutoSave"
import { vehicleKeys } from "@/hooks/useVehicles"
import { Button } from "@/components/ui/button"
import api from "@/lib/api"
import { useAuth } from "@/lib/auth"
import type { VehicleDetail } from "@/types/vehicle"
import type { VehicleUpdateInput } from "@/lib/validations"

/**
 * Vehicle form page for creating and editing vehicles
 * 
 * In edit mode:
 * - Auto-saves on field changes (debounced for text, immediate for dropdowns)
 * - Shows navigation arrows instead of Save button
 */
export function VehicleFormPage() {
    const navigate = useNavigate()
    const { user } = useAuth()
    const { business_slug, id } = useParams<{ business_slug: string; id: string }>()
    const isEditing = Boolean(id)
    const vehicleId = id ? Number(id) : 0

    // Fetch vehicle data if editing
    // Use isFetching to distinguish between initial load and navigation refetch
    const { data: vehicle, isLoading, isFetching, isError } = useQuery({
        queryKey: vehicleKeys.detail(vehicleId),
        queryFn: async (): Promise<VehicleDetail> => {
            const response = await api.get(`/vehicles/${id}`)
            return response.data
        },
        enabled: isEditing && Boolean(id),
    })

    // Auto-save hook with cache invalidation (only used in edit mode)
    // - updateQueryKey: Instantly updates the detail cache with response data
    // - invalidateQueryKeys: Marks list queries as stale so navigation shows fresh data
    const { status: autoSaveStatus, errorMessage, saveNow, saveDebounced } = useAutoSave<VehicleUpdateInput>({
        endpoint: `/vehicles/${vehicleId}`,
        method: 'PATCH',  // Vehicle API uses PATCH for partial updates
        // Direct cache update for instant feedback (no visual flicker)
        updateQueryKey: vehicleKeys.detail(vehicleId),
        // Invalidate related queries so list view shows updated data
        invalidateQueryKeys: [
            vehicleKeys.lists(),  // Invalidate all list queries (with any filters)
        ],
    })

    const handleBack = () => {
        // Smart back: use browser history if available, otherwise fallback to vehicles list
        if (window.history.state && window.history.state.idx > 0) {
            navigate(-1)
        } else {
            navigate(`/${business_slug}/vehicles`)
        }
    }

    // Loading state for edit mode - show loading during initial load OR navigation refetch
    if (isEditing && (isLoading || isFetching)) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        )
    }

    // Error state for edit mode
    if (isEditing && (isError || !vehicle)) {
        return (
            <div className="space-y-6">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" onClick={handleBack}>
                        <ArrowLeft className="h-5 w-5" />
                    </Button>
                    <h1 className="text-2xl font-bold text-foreground">Vehicle Not Found</h1>
                </div>
                <p className="text-muted-foreground">
                    The vehicle with ID {id} could not be found.
                </p>
            </div>
        )
    }

    // Get prev/next IDs from the API response
    const prevVehicleId = vehicle?.prev_vehicle_internal_id ?? null
    const nextVehicleId = vehicle?.next_vehicle_internal_id ?? null
    const vehicleName = [vehicle?.make_name, vehicle?.model_name].filter(Boolean).join(" ")

    return (
        <div className="space-y-8">
            {isEditing && vehicle && (
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" onClick={handleBack}>
                        <ArrowLeft className="h-5 w-5" />
                    </Button>
                    <div>
                        <h1 className="flex items-center gap-2 text-2xl font-bold text-foreground">
                            <Car className="h-6 w-6" />
                            Edit Vehicle #{vehicle.internal_id}
                        </h1>
                        {vehicleName && (
                            <p className="text-muted-foreground">{vehicleName}</p>
                        )}
                    </div>
                </div>
            )}

            <VehicleForm
                vehicle={isEditing ? vehicle : undefined}
                isEditing={isEditing}
                onAutoSave={isEditing ? saveNow : undefined}
                onAutoSaveDebounced={isEditing ? saveDebounced : undefined}
                prevVehicleId={prevVehicleId}
                nextVehicleId={nextVehicleId}
                autoSaveStatus={autoSaveStatus}
                autoSaveErrorMessage={errorMessage}
            />

            {/* Related Transactions Table - Only shown in edit mode for users with transactions access */}
            {isEditing && vehicle && vehicle.internal_id && (user?.is_manager || user?.transactions_access) && (
                <RelatedTransactionsTable
                    vehicleId={vehicle.internal_id}
                    vehicleName={`${vehicle.make_name || ''} ${vehicle.model_name || ''}`}
                    hideNavigationLink={true}
                />
            )}

            {/* Spacer for Sticky Footer */}
            <div className={isEditing ? "pb-44 md:pb-36" : "pb-24"} />
        </div>
    )
}
