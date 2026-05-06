import { useState, useCallback, useEffect } from "react"
import { useSearchParams } from "react-router-dom"
import { useTranslation } from "react-i18next"
import { Plus, Search, X, Trash2, RefreshCw, Building2, User, ArrowUpDown, ChevronUp, ChevronDown, ChevronLeft, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { FilterSelect } from "@/components/ui/filter-select"
import {
    useLegalEntities,
    useCreateLegalEntity,
    useUpdateLegalEntity,
    useDeactivateLegalEntity,
    useActivateLegalEntity,
    type LegalEntity,
    type LegalEntityFilters,
    type LegalEntityCreatePayload,
} from "@/hooks/useLegalEntities"
import { EntityForm } from "@/components/legal-entities/EntityForm"


/**
 * Legal Entities list page with filtering, CRUD operations.
 * Optimized for professional UI ('Amazing' search and layout).
 */
export function LegalEntitiesPage() {
    const { t } = useTranslation()
    const [searchParams] = useSearchParams()

    // Get type from URL query param (for sidebar nav filtering)
    const typeFromUrl = searchParams.get("type") as "individual" | "company" | null

    // Filter state
    const [filters, setFilters] = useState<LegalEntityFilters>({
        page: 1,
        per_page: 20,
        type: typeFromUrl || undefined,
    })

    // Update filters when URL changes
    useEffect(() => {
        setFilters(prev => ({
            ...prev,
            type: typeFromUrl || undefined,
            page: 1, // Reset page when type filter changes
        }))
    }, [typeFromUrl])

    // Search state
    const [searchValue, setSearchValue] = useState("")

    // Dialog states
    const [addDialogOpen, setAddDialogOpen] = useState(false)
    const [editDialogOpen, setEditDialogOpen] = useState(false)
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
    const [selectedEntity, setSelectedEntity] = useState<LegalEntity | null>(null)

    // Form state
    const [formData, setFormData] = useState<Partial<LegalEntityCreatePayload>>({
        type: "individual",
    })

    // Fetch legal entities
    const { data, isLoading, isFetching } = useLegalEntities(filters)

    // Mutations
    const createMutation = useCreateLegalEntity()
    const updateMutation = useUpdateLegalEntity()
    const deactivateMutation = useDeactivateLegalEntity()
    const activateMutation = useActivateLegalEntity()

    // Handle search
    const handleSearch = useCallback(() => {
        setFilters(prev => ({
            ...prev,
            search: searchValue || undefined,
            page: 1,
        }))
    }, [searchValue])

    const handleClearSearch = useCallback(() => {
        setSearchValue("")
        setFilters(prev => ({
            ...prev,
            search: undefined,
            page: 1,
        }))
    }, [])

    // Handle type filter change
    const handleTypeFilter = useCallback((value: string) => {
        setFilters(prev => ({
            ...prev,
            type: value === "all" ? undefined : value as "individual" | "company",
            page: 1,
        }))
    }, [])

    // Handle status filter change
    const handleStatusFilter = useCallback((value: string) => {
        setFilters(prev => ({
            ...prev,
            status: value === "all" ? undefined : value as "active" | "inactive",
            page: 1,
        }))
    }, [])

    // Handle page change
    const handlePageChange = useCallback((page: number) => {
        setFilters(prev => ({ ...prev, page }))
    }, [])

    // Handle sort
    const handleSort = useCallback((column: string) => {
        setFilters(prev => {
            const newOrder = prev.sort === column && prev.order === 'asc' ? 'desc' : 'asc'
            return { ...prev, sort: column, order: newOrder, page: 1 }
        })
    }, [])

    const getSortIndicator = (column: string) => {
        if (filters.sort !== column) {
            return <ArrowUpDown className="ml-1 h-3 w-3 opacity-50" />
        }
        return filters.order === 'asc'
            ? <ChevronUp className="ml-1 h-3 w-3" />
            : <ChevronDown className="ml-1 h-3 w-3" />
    }

    // Open add dialog
    const handleAddClick = useCallback(() => {
        setFormData({ type: "individual" })
        setAddDialogOpen(true)
    }, [])

    // Open edit dialog
    const handleEditClick = useCallback((entity: LegalEntity) => {
        setSelectedEntity(entity)
        setFormData({
            name: entity.name,
            type: entity.type,
            address_street: entity.address_street || "",
            address_street_number: entity.address_street_number?.toString() || "",
            address_postal_code: entity.address_postal_code || "",
            address_city: entity.address_city || "",
            address_country: entity.address_country || "",
            email: entity.email || "",
            phone_number: entity.phone_number || "",
            tax_identification_number: entity.tax_identification_number || "",
        })
        setEditDialogOpen(true)
    }, [])

    // Open delete dialog
    const handleDeleteClick = useCallback((entity: LegalEntity) => {
        setSelectedEntity(entity)
        setDeleteDialogOpen(true)
    }, [])

    // Create entity
    const handleCreate = useCallback(async () => {
        try {
            await createMutation.mutateAsync(formData as LegalEntityCreatePayload)
            setAddDialogOpen(false)
            setFormData({ type: "individual" })
        } catch (error) {
            console.error("Failed to create:", error)
        }
    }, [formData, createMutation])

    // Update entity
    const handleUpdate = useCallback(async () => {
        if (!selectedEntity) return
        try {
            await updateMutation.mutateAsync({
                internalId: selectedEntity.internal_id,
                payload: formData,
            })
            setEditDialogOpen(false)
            setSelectedEntity(null)
        } catch (error) {
            console.error("Failed to update:", error)
        }
    }, [selectedEntity, formData, updateMutation])

    // Deactivate entity
    const handleDeactivate = useCallback(async () => {
        if (!selectedEntity) return
        try {
            await deactivateMutation.mutateAsync(selectedEntity.internal_id)
            setDeleteDialogOpen(false)
            setSelectedEntity(null)
        } catch (error) {
            console.error("Failed to deactivate:", error)
        }
    }, [selectedEntity, deactivateMutation])

    // Activate entity
    const handleActivate = useCallback(async (entity: LegalEntity) => {
        try {
            await activateMutation.mutateAsync(entity.internal_id)
        } catch (error) {
            console.error("Failed to activate:", error)
        }
    }, [activateMutation])

    // Get page title based on type filter
    const getPageTitle = () => {
        if (filters.type === "individual") return t("legalEntities.privatePeople", "Private Persons")
        if (filters.type === "company") return t("legalEntities.companies", "Companies")
        return t("legalEntities.title", "Legal Entities")
    }

    return (
        <div className="flex flex-col h-[calc(100vh-4rem)]">
            {/* Main Content Area - Scrollable */}
            <div className="flex-1 overflow-auto p-6 space-y-6">
                {/* Page Header */}
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-foreground tracking-tight">{getPageTitle()}</h1>
                        <p className="text-muted-foreground">
                            {data?.total || 0} {t("legalEntities.totalEntries", "total entries")}
                        </p>
                    </div>
                    <Button onClick={handleAddClick} className="gap-2 shadow-sm hover:shadow-md transition-all">
                        <Plus className="h-4 w-4" />
                        {t("legalEntities.addNew", "Add New Legal Entity")}
                    </Button>
                </div>

                {/* Toolbar */}
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                    {/* Search bar */}
                    <div className="relative flex-1 group">
                        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground transition-colors group-focus-within:text-primary" />
                        <Input
                            placeholder={t("legalEntities.searchPlaceholder", "Search across ID, name, address, email, phone, tax ID...")}
                            className="pl-10 pr-10 hover:border-primary/50 focus:border-primary transition-all shadow-sm h-11"
                            value={searchValue}
                            onChange={(e) => setSearchValue(e.target.value)}
                            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                        />
                        {searchValue && (
                            <button
                                onClick={handleClearSearch}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        )}
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                        {/* Type Filter */}
                        <div className="w-[180px]">
                            <FilterSelect
                                options={[
                                    { value: "individual", label: t("legalEntities.individual", "Individual") },
                                    { value: "company", label: t("legalEntities.company", "Company") },
                                ]}
                                value={filters.type || undefined}
                                onChange={(value) => handleTypeFilter(value || "all")}
                                placeholder={t("legalEntities.allTypes", "All Types")}
                                allLabel={t("legalEntities.allTypes", "All Types")}
                                searchPlaceholder={t("legalEntities.searchTypes", "Search types...")}
                            />
                        </div>

                        {/* Status Filter */}
                        <div className="w-[180px]">
                            <FilterSelect
                                options={[
                                    { value: "active", label: t("legalEntities.active", "Active") },
                                    { value: "inactive", label: t("legalEntities.inactive", "Inactive") },
                                ]}
                                value={filters.status || undefined}
                                onChange={(value) => handleStatusFilter(value || "all")}
                                placeholder={t("legalEntities.allStatuses", "All Statuses")}
                                allLabel={t("legalEntities.allStatuses", "All Statuses")}
                                searchPlaceholder={t("legalEntities.searchStatuses", "Search statuses...")}
                            />
                        </div>

                        {(filters.search || filters.type || filters.status) && (
                            <Button
                                variant="ghost"
                                size="sm"
                                className="h-10 text-muted-foreground hover:text-foreground group"
                                onClick={() => {
                                    setSearchValue("")
                                    setFilters({
                                        page: 1,
                                        per_page: 20,
                                        type: typeFromUrl || undefined,
                                    })
                                }}
                            >
                                <RefreshCw className="mr-2 h-4 w-4 transition-transform group-hover:rotate-180" />
                                {t("common.reset", "Reset")}
                            </Button>
                        )}
                    </div>
                </div>

                {/* Table */}
                <div className="rounded-xl border border-border bg-card overflow-hidden shadow-sm">
                    <Table>
                        <TableHeader>
                            <TableRow className="hover:bg-transparent bg-muted/30">
                                <TableHead
                                    className="w-[80px] cursor-pointer hover:text-foreground transition-colors"
                                    onClick={() => handleSort('internal_id')}
                                >
                                    <span className="flex items-center">
                                        {t("legalEntities.id", "ID")}
                                        {getSortIndicator("internal_id")}
                                    </span>
                                </TableHead>
                                <TableHead
                                    className="cursor-pointer hover:text-foreground transition-colors"
                                    onClick={() => handleSort('name')}
                                >
                                    <span className="flex items-center">
                                        {t("legalEntities.name", "Name")}
                                        {getSortIndicator("name")}
                                    </span>
                                </TableHead>
                                <TableHead
                                    className="w-[120px] cursor-pointer hover:text-foreground transition-colors"
                                    onClick={() => handleSort('type')}
                                >
                                    <span className="flex items-center">
                                        {t("legalEntities.type", "Type")}
                                        {getSortIndicator("type")}
                                    </span>
                                </TableHead>
                                <TableHead
                                    className="cursor-pointer hover:text-foreground transition-colors"
                                    onClick={() => handleSort('address_city')}
                                >
                                    <span className="flex items-center">
                                        {t("legalEntities.city", "City")}
                                        {getSortIndicator("address_city")}
                                    </span>
                                </TableHead>
                                <TableHead
                                    className="w-[100px] cursor-pointer hover:text-foreground transition-colors"
                                    onClick={() => handleSort('status')}
                                >
                                    <span className="flex items-center">
                                        {t("legalEntities.status", "Status")}
                                        {getSortIndicator("status")}
                                    </span>
                                </TableHead>
                                <TableHead className="w-[100px] text-right">{t("legalEntities.actions", "Actions")}</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                                        <div className="flex flex-col items-center gap-2">
                                            <RefreshCw className="h-8 w-8 animate-spin opacity-20" />
                                            <span>{t("common.loading", "Loading...")}</span>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ) : data?.items && data.items.length > 0 ? (
                                data.items.map((entity) => (
                                    <TableRow
                                        key={entity.id}
                                        className="group cursor-pointer hover:bg-muted/50 transition-colors duration-150"
                                        onClick={() => handleEditClick(entity)}
                                    >
                                        <TableCell className="font-mono text-xs opacity-70">{entity.internal_id}</TableCell>
                                        <TableCell>
                                            <span className="font-medium text-foreground">
                                                {entity.name}
                                            </span>
                                        </TableCell>
                                        <TableCell>
                                            {entity.type === "individual" ? (
                                                <Badge variant="secondary" className="bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400 gap-1 border-blue-100 dark:border-blue-500/20">
                                                    <User className="h-3 w-3" />
                                                    {t("legalEntities.individual", "Individual")}
                                                </Badge>
                                            ) : (
                                                <Badge variant="secondary" className="bg-purple-50 text-purple-700 dark:bg-purple-500/10 dark:text-purple-400 gap-1 border-purple-100 dark:border-purple-500/20">
                                                    <Building2 className="h-3 w-3" />
                                                    {t("legalEntities.company", "Company")}
                                                </Badge>
                                            )}
                                        </TableCell>
                                        <TableCell className="text-muted-foreground">{entity.address_city || "-"}</TableCell>
                                        <TableCell>
                                            {entity.status === "active" ? (
                                                <Badge className="bg-emerald-50 text-emerald-700 border-emerald-100 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20">
                                                    {t("legalEntities.active", "Active")}
                                                </Badge>
                                            ) : (
                                                <Badge variant="secondary" className="bg-zinc-100 text-zinc-600 border-zinc-200 dark:bg-zinc-500/10 dark:text-zinc-400 dark:border-zinc-500/20">
                                                    {t("legalEntities.inactive", "Inactive")}
                                                </Badge>
                                            )}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                {entity.status === "active" ? (
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        onClick={(e) => {
                                                            e.stopPropagation()
                                                            handleDeleteClick(entity)
                                                        }}
                                                        className="text-red-500 hover:bg-red-50 hover:text-red-600 dark:text-red-400 dark:hover:bg-red-900/20"
                                                        title={t("legalEntities.deactivate", "Deactivate")}
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                ) : (
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        onClick={(e) => {
                                                            e.stopPropagation()
                                                            handleActivate(entity)
                                                        }}
                                                        className="text-emerald-500 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20"
                                                        title={t("legalEntities.activate", "Activate")}
                                                    >
                                                        <RefreshCw className="h-4 w-4" />
                                                    </Button>
                                                )}
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={6} className="text-center py-16 text-muted-foreground">
                                        <div className="flex flex-col items-center gap-2">
                                            <Search className="h-10 w-10 opacity-10 mb-2" />
                                            <p>{t("legalEntities.noEntities", "No legal entities found.")}</p>
                                            <button
                                                onClick={handleAddClick}
                                                className="text-primary hover:underline font-medium"
                                            >
                                                {t("legalEntities.addFirst", "Add your first legal entity")}
                                            </button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>
            </div>

            {/* Sticky Footer Pagination */}
            {data && data.pages > 1 && (
                <div className="sticky bottom-0 z-10 border-t border-border bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/60 px-6 py-3">
                    <div className="flex items-center justify-between">
                        <p className="text-sm text-muted-foreground font-medium">
                            {t("common.showing", "Showing")} <span className="text-foreground">{((data.page - 1) * (filters.per_page || 20)) + 1}</span> - <span className="text-foreground">{Math.min(data.page * (filters.per_page || 20), data.total)}</span> {t("common.of", "of")} <span className="text-foreground">{data.total}</span>
                        </p>
                        <div className="flex items-center gap-2">
                            <Button
                                variant="outline"
                                size="sm"
                                disabled={data.page <= 1 || isFetching}
                                onClick={() => handlePageChange(data.page - 1)}
                                className="h-9"
                            >
                                <ChevronLeft className="h-4 w-4 mr-1" />
                                {t("common.previous", "Previous")}
                            </Button>
                            <span className="text-sm text-muted-foreground px-3 font-medium">
                                {t("common.page", "Page")} <span className="text-foreground">{data.page}</span> {t("common.of", "of")} <span className="text-foreground">{data.pages}</span>
                            </span>
                            <Button
                                variant="outline"
                                size="sm"
                                disabled={data.page >= data.pages || isFetching}
                                onClick={() => handlePageChange(data.page + 1)}
                                className="h-9"
                            >
                                {t("common.next", "Next")}
                                <ChevronRight className="h-4 w-4 ml-1" />
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {/* Loading overlay */}
            {isFetching && !isLoading && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/50 backdrop-blur-[1px]">
                    <div className="flex items-center gap-2 bg-card border border-border shadow-lg rounded-full px-4 py-2 text-sm font-medium animate-in fade-in zoom-in duration-300">
                        <RefreshCw className="h-4 w-4 animate-spin text-primary" />
                        <span className="text-muted-foreground">{t("common.updating", "Updating...")}</span>
                    </div>
                </div>
            )}

            {/* Add Dialog */}
            <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="text-xl">{t("legalEntities.addNew", "Add New Legal Entity")}</DialogTitle>
                        <DialogDescription>
                            {t("legalEntities.addDescription", "Fill in the details to create a new legal entity.")}
                        </DialogDescription>
                    </DialogHeader>
                    <EntityForm
                        data={formData}
                        onChange={setFormData}
                        isNew
                    />
                    <DialogFooter className="gap-2 sm:gap-0">
                        <Button variant="ghost" onClick={() => setAddDialogOpen(false)}>
                            {t("common.cancel", "Cancel")}
                        </Button>
                        <Button onClick={handleCreate} disabled={createMutation.isPending} className="shadow-sm">
                            {createMutation.isPending ? t("common.creating", "Creating...") : t("legalEntities.create", "Create Legal Entity")}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Edit Dialog */}
            <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="text-xl">{t("legalEntities.editTitle", "Edit Legal Entity")}</DialogTitle>
                        <DialogDescription>
                            ID: <span className="font-mono text-xs">{selectedEntity?.internal_id}</span>
                        </DialogDescription>
                    </DialogHeader>
                    <EntityForm
                        data={formData}
                        onChange={setFormData}
                    />
                    <DialogFooter className="gap-2 sm:gap-0">
                        <Button variant="ghost" onClick={() => setEditDialogOpen(false)}>
                            {t("common.cancel", "Cancel")}
                        </Button>
                        <Button onClick={handleUpdate} disabled={updateMutation.isPending} className="shadow-sm">
                            {updateMutation.isPending ? t("common.saving", "Saving...") : t("common.saveChanges", "Save Changes")}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Deactivate Dialog */}
            <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle className="text-xl text-red-600">{t("legalEntities.deactivateTitle", "Deactivate Legal Entity")}</DialogTitle>
                        <DialogDescription className="text-base py-4 text-foreground/80">
                            {t("legalEntities.deactivateConfirm", "Are you sure you want to deactivate")} <span className="font-bold underline">"{selectedEntity?.name}"</span>?
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="ghost" onClick={() => setDeleteDialogOpen(false)}>
                            {t("common.cancel", "Cancel")}
                        </Button>
                        <Button
                            variant="destructive"
                            onClick={handleDeactivate}
                            disabled={deactivateMutation.isPending}
                            className="shadow-sm"
                        >
                            {deactivateMutation.isPending ? t("common.deactivating", "Deactivating...") : t("legalEntities.deactivate", "Deactivate")}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}

export default LegalEntitiesPage
