import { RotateCcw } from "lucide-react"
import { useTranslation } from "react-i18next"
import { Button } from "@/components/ui/button"
import { FilterSelect } from "@/components/ui/filter-select"
import type { LegalEntityFilters } from "@/hooks/useLegalEntities"

interface LegalEntityFiltersSidebarProps {
    filters: LegalEntityFilters
    onTypeFilterChange: (value: string) => void
    onStatusFilterChange: (value: string) => void
    onResetFilters: () => void
}

export function LegalEntityFiltersSidebar({
    filters,
    onTypeFilterChange,
    onStatusFilterChange,
    onResetFilters,
}: LegalEntityFiltersSidebarProps) {
    const { t } = useTranslation()

    return (
        <div className="flex flex-col bg-card rounded-xl border border-border shadow-sm overflow-hidden">
            <div className="p-4 border-b border-border bg-muted/20">
                <h2 className="text-lg font-semibold text-foreground">{t("common.filters", "Filters")}</h2>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-6">
                <div className="space-y-4">
                    <h3 className="text-sm font-medium text-foreground">
                        {t("legalEntities.details", "Details")}
                    </h3>

                    <div className="space-y-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 text-foreground">
                                {t("legalEntities.type", "Type")}
                            </label>
                            <FilterSelect
                                options={[
                                    { value: "individual", label: t("legalEntities.individual", "Individual") },
                                    { value: "company", label: t("legalEntities.company", "Company") },
                                ]}
                                value={filters.type || undefined}
                                onChange={(value) => onTypeFilterChange(value || "all")}
                                placeholder={t("legalEntities.allTypes", "All Types")}
                                allLabel={t("legalEntities.allTypes", "All Types")}
                                searchPlaceholder={t("legalEntities.searchTypes", "Search types...")}
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 text-foreground">
                                {t("legalEntities.status", "Status")}
                            </label>
                            <FilterSelect
                                options={[
                                    { value: "active", label: t("legalEntities.active", "Active") },
                                    { value: "inactive", label: t("legalEntities.inactive", "Inactive") },
                                ]}
                                value={filters.status || undefined}
                                onChange={(value) => onStatusFilterChange(value || "all")}
                                placeholder={t("legalEntities.allStatuses", "All Statuses")}
                                allLabel={t("legalEntities.allStatuses", "All Statuses")}
                                searchPlaceholder={t("legalEntities.searchStatuses", "Search statuses...")}
                            />
                        </div>
                    </div>
                </div>
            </div>

            {(filters.type || filters.status) && (
                <div className="p-4 border-t border-border bg-muted/20 flex flex-wrap gap-2">
                    <Button variant="outline" onClick={onResetFilters} className="w-full text-foreground">
                        <RotateCcw className="mr-2 h-4 w-4" />
                        {t("common.reset", "Reset")}
                    </Button>
                </div>
            )}
        </div>
    )
}
