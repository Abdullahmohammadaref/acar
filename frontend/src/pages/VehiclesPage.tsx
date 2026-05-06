import { useState, useCallback, useEffect } from "react"
import { Link, useSearchParams } from "react-router-dom"
import { Plus, Filter, Search, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { SortMenuButton } from "@/components/ui/SortMenuButton"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { useVehicles, useDeleteVehicle, useChangeVehicleStatus } from "@/hooks/useVehicles"
import { VehicleCard } from "@/components/vehicles/VehicleCard"
import { VehicleFiltersSheet } from "@/components/vehicles/VehicleFilters"
import { FinancialSummaryCard } from "@/components/vehicles/FinancialSummary"
import { ContractModal } from "@/components/vehicles/ContractModal"
import { StickyFooter } from "@/components/StickyFooter"
import type { VehicleFilters, VehicleListItem } from "@/types/vehicle"

const VEHICLE_SORT_OPTIONS = [
    { value: "internal_id", label: "Vehicle ID" },
    { value: "make", label: "Make" },
    { value: "status", label: "Status" },
    { value: "buy_price", label: "Buy Price" },
    { value: "sale_price", label: "Sale Price" },
    { value: "buy_date", label: "Buy Date" },
    { value: "sale_date", label: "Sale Date" },
    { value: "kilometer", label: "Kilometers" },
    { value: "year_of_construction", label: "Year" },
]

/**
 * Vehicles list page with cards, filters, and financial summary
 */
export function VehiclesPage() {
    const [searchParams] = useSearchParams()

    // Filter state - initialize from URL
    const [filters, setFilters] = useState<VehicleFilters>(() => {
        const statusFromUrl = searchParams.get("status")
        return {
            page: 1,
            per_page: 20,
            order: "desc",
            sort: "internal_id",
            status: statusFromUrl || undefined,
        }
    })

    // Quick search (debounced)
    const [searchValue, setSearchValue] = useState("")

    // Update filters when URL changes (sidebar navigation)
    useEffect(() => {
        const statusFromUrl = searchParams.get("status")
        setFilters(prev => ({
            ...prev,
            status: statusFromUrl || undefined,
            page: 1, // Reset to first page when filter changes
        }))
    }, [searchParams])

    // Sheet open state
    const [filtersOpen, setFiltersOpen] = useState(false)

    // Delete confirmation dialog
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
    const [vehicleToDelete, setVehicleToDelete] =
        useState<VehicleListItem | null>(null)

    // Contract modal state
    const [contractModalOpen, setContractModalOpen] = useState(false)
    const [vehicleForContract, setVehicleForContract] =
        useState<VehicleListItem | null>(null)

    // Fetch vehicles
    const { data, isLoading, isFetching } = useVehicles(filters)

    // Mutations
    const deleteMutation = useDeleteVehicle()
    const statusMutation = useChangeVehicleStatus()

    // Count active filters (excluding pagination and sort)
    const activeFilterCount = Object.entries(filters).filter(([key, value]) => {
        if (
            ["page", "per_page", "sort", "order"].includes(key)
        )
            return false
        return value !== undefined && value !== null && value !== ""
    }).length

    // Handle page change
    const handlePageChange = useCallback((page: number) => {
        setFilters((prev) => ({ ...prev, page }))
    }, [])

    // Handle filter apply
    const handleApplyFilters = useCallback((newFilters: VehicleFilters) => {
        setFilters((prev) => ({
            ...newFilters,
            page: 1, // Reset to first page on filter change
            per_page: prev.per_page,
        }))
    }, [])

    const handleSortChange = useCallback((sort: string) => {
        setFilters((prev) => ({
            ...prev,
            sort,
            page: 1,
        }))
    }, [])

    const handleSortOrderChange = useCallback((order: "asc" | "desc") => {
        setFilters((prev) => ({
            ...prev,
            order,
            page: 1,
        }))
    }, [])

    // Handle quick search
    const handleQuickSearch = useCallback(
        (e: React.KeyboardEvent<HTMLInputElement>) => {
            if (e.key === "Enter") {
                setFilters((prev) => ({
                    ...prev,
                    search: searchValue || undefined,
                    page: 1,
                }))
            }
        },
        [searchValue]
    )

    // Clear search
    const handleClearSearch = useCallback(() => {
        setSearchValue("")
        setFilters((prev) => ({
            ...prev,
            search: undefined,
            page: 1,
        }))
    }, [])

    // Handle delete click
    const handleDeleteClick = useCallback((vehicle: VehicleListItem) => {
        setVehicleToDelete(vehicle)
        setDeleteDialogOpen(true)
    }, [])

    // Confirm delete
    const handleConfirmDelete = useCallback(async () => {
        if (vehicleToDelete?.internal_id) {
            await deleteMutation.mutateAsync(vehicleToDelete.internal_id)
            setDeleteDialogOpen(false)
            setVehicleToDelete(null)
        }
    }, [vehicleToDelete, deleteMutation])

    return (
        <div className="space-y-6">
            {/* Page Header */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-foreground">Vehicles</h1>
                    <p className="text-muted-foreground">
                        Manage your vehicle inventory
                    </p>
                </div>
                <Link
                    to="new"
                    className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground shadow-sm hover:bg-primary/90"
                >
                    <Plus className="h-4 w-4" />
                    Add Vehicle
                </Link>
            </div>

            {/* Financial Summary */}
            <FinancialSummaryCard
                summary={data?.financial_summary}
                isLoading={isLoading}
            />

            {/* Toolbar */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                {/* Search */}
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                        type="text"
                        placeholder="Search by Make, Model, ID, VIN..."
                        className="pl-10 pr-10"
                        value={searchValue}
                        onChange={(e) => setSearchValue(e.target.value)}
                        onKeyDown={handleQuickSearch}
                    />
                    {searchValue && (
                        <button
                            onClick={handleClearSearch}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        >
                            <X className="h-4 w-4" />
                        </button>
                    )}
                </div>

                <div className="flex flex-wrap items-center gap-2">
                    <SortMenuButton
                        options={VEHICLE_SORT_OPTIONS}
                        sort={filters.sort || "internal_id"}
                        order={filters.order || "desc"}
                        onSortChange={handleSortChange}
                        onOrderChange={handleSortOrderChange}
                    />

                    <Button
                        variant="outline"
                        className="gap-2"
                        onClick={() => setFiltersOpen(true)}
                    >
                        <Filter className="h-4 w-4" />
                        Filters
                        {activeFilterCount > 0 && (
                            <Badge variant="secondary" className="ml-1 h-5 px-1.5">
                                {activeFilterCount}
                            </Badge>
                        )}
                    </Button>
                </div>
            </div>

            {/* Results Count & Sort Controls */}
            <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                    Showing {data?.vehicles?.items?.length || 0} of {data?.vehicles?.total || 0} vehicles
                </p>
            </div>

            {/* Vehicle Cards Grid */}
            <div className="space-y-4">
                {isLoading ? (
                    // Loading skeleton
                    Array.from({ length: 5 }).map((_, i) => (
                        <div
                            key={i}
                            className="h-48 animate-pulse rounded-xl bg-muted"
                        />
                    ))
                ) : data?.vehicles?.items?.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-border p-12 text-center">
                        <p className="text-muted-foreground">No vehicles found</p>
                    </div>
                ) : (
                    data?.vehicles?.items?.map((vehicle) => (
                        <VehicleCard
                            key={vehicle.id}
                            vehicle={vehicle}
                            onDelete={handleDeleteClick}
                            onStatusChange={(v, status) => {
                                if (v.internal_id) {
                                    statusMutation.mutate({ internalId: v.internal_id, status })
                                }
                            }}
                            onGenerateContract={(v) => {
                                setVehicleForContract(v)
                                setContractModalOpen(true)
                            }}
                        />
                    ))
                )}
            </div>

            {/* Padding to prevent sticky footer overlap */}
            <div className="pb-24" />

            {/* Pagination Sticky Footer */}
            {data?.vehicles && data.vehicles.total > (filters.per_page || 20) && (
                <StickyFooter>
                    <p className="text-sm text-muted-foreground">
                        Page {data.vehicles.page} of {Math.ceil(data.vehicles.total / (filters.per_page || 20))}
                    </p>
                    <div className="flex gap-2">
                        <Button
                            variant="outline"
                            disabled={data.vehicles.page <= 1}
                            onClick={() => handlePageChange(data.vehicles.page - 1)}
                        >
                            Previous
                        </Button>
                        <Button
                            variant="outline"
                            disabled={data.vehicles.page >= Math.ceil(data.vehicles.total / (filters.per_page || 20))}
                            onClick={() => handlePageChange(data.vehicles.page + 1)}
                        >
                            Next
                        </Button>
                    </div>
                </StickyFooter>
            )}

            {/* Loading overlay */}
            {isFetching && !isLoading && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/50">
                    <div className="text-sm text-muted-foreground">Updating...</div>
                </div>
            )}

            {/* Filters Sheet */}
            <VehicleFiltersSheet
                open={filtersOpen}
                onOpenChange={setFiltersOpen}
                filters={filters}
                onApplyFilters={handleApplyFilters}
            />

            {/* Delete Confirmation Dialog */}
            <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Delete Vehicle</DialogTitle>
                        <DialogDescription>
                            Are you sure you want to delete vehicle #{vehicleToDelete?.internal_id} (
                            {vehicleToDelete?.make_name}{" "}
                            {vehicleToDelete?.model_name})?
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => setDeleteDialogOpen(false)}
                        >
                            Cancel
                        </Button>
                        <Button
                            variant="destructive"
                            onClick={handleConfirmDelete}
                            disabled={deleteMutation.isPending}
                        >
                            {deleteMutation.isPending ? "Deleting..." : "Delete"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Contract Generation Modal */}
            <ContractModal
                open={contractModalOpen}
                onOpenChange={setContractModalOpen}
                vehicle={vehicleForContract}
            />
        </div>
    )
}
