import { Link } from "react-router-dom"
import { Car, FileText } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { withMediaCacheKey, formatCurrency } from "@/lib/utils"
import {
    calcDaysOnStock,
    getTotalProfitColor,
    getProfitColor,
    getDaysOnStockColor,
    getDaysOnStockBgColor,
    formatPercent,
    formatDays,
} from "@/lib/vehicleFinancials"
import type { VehicleListItem } from "@/types/vehicle"

interface VehicleCardProps {
    vehicle: VehicleListItem
    onStatusChange?: (vehicle: VehicleListItem, newStatus: string) => void
    onDelete?: (vehicle: VehicleListItem) => void
    onGenerateContract?: (vehicle: VehicleListItem) => void
}

/**
 * Status badge colors mapping
 */
const statusColors: Record<string, string> = {
    purchased: "bg-green-600 text-white",
    ready_for_sale: "bg-orange-500 text-white",
    reserved: "bg-blue-600 text-white",
    sold: "bg-red-600 text-white",
    inactive: "bg-gray-600 text-white",
}

const statusLabels: Record<string, string> = {
    purchased: "Purchased",
    ready_for_sale: "Ready",
    reserved: "Reserved",
    sold: "Sold",
    inactive: "Inactive",
}

/**
 * E-commerce style vehicle card component
 * - Entire card is clickable to navigate to edit page
 * - Interactive buttons use stopPropagation to prevent navigation
 */
export function VehicleCard({
    vehicle,
    onStatusChange,
    onDelete,
    onGenerateContract,
}: VehicleCardProps) {
    const status = vehicle.status || "unknown"
    const vehicleImageUrl = withMediaCacheKey(vehicle.image_url, "vehicle-photo")

    // Helper for safe price formatting
    const formatPrice = (price: number | string | null | undefined): string => {
        if (price === null || price === undefined) return "—"
        const num = typeof price === 'string' ? parseFloat(price) : price
        return isNaN(num) ? "—" : `€${num.toFixed(2)}`
    }


    // Can generate any contract?
    const canGenerateAnyContract = vehicle.can_generate_buy_contract || vehicle.can_generate_sale_contract

    // Compact financial indicators
    const hasBothPrices = vehicle.buy_price_net != null && vehicle.sale_price_net != null
    const buyNetNum = typeof vehicle.buy_price_net === 'string' ? parseFloat(vehicle.buy_price_net) : (vehicle.buy_price_net ?? 0)
    const saleNetNum = typeof vehicle.sale_price_net === 'string' ? parseFloat(vehicle.sale_price_net) : (vehicle.sale_price_net ?? 0)
    const totalProfit = hasBothPrices ? Math.round((saleNetNum - buyNetNum) * 100) / 100 : null
    const profitMargin = totalProfit !== null && saleNetNum !== 0
        ? Math.round((totalProfit / saleNetNum) * 100 * 10) / 10
        : null
    const daysOnStock = calcDaysOnStock(vehicle.buy_date, vehicle.sale_date)

    return (
        <article
            className="relative w-full bg-card border border-border rounded-xl p-4 shadow-sm hover:shadow-lg hover:scale-[1.01] hover:bg-gray-50 dark:hover:bg-gray-800 transition-all cursor-pointer"
        >
            <Link
                to={`${vehicle.internal_id}/edit`}
                aria-label={`Edit vehicle #${vehicle.internal_id}`}
                className="absolute inset-0 z-0 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            />

            <div className="pointer-events-none relative z-10 grid grid-cols-12 gap-4 items-start">
                {/* Image */}
                <div className="col-span-12 sm:col-span-2 flex items-center justify-center self-center">
                    <div className="w-full sm:w-44 h-32 sm:h-32 rounded-md overflow-hidden bg-muted flex items-center justify-center">
                        {vehicleImageUrl ? (
                            <img
                                src={vehicleImageUrl}
                                alt={`${vehicle.make_name} ${vehicle.model_name}`}
                                className="w-full h-full object-contain"
                                loading="lazy"
                            />
                        ) : (
                            <Car className="w-20 h-20 text-muted-foreground" />
                        )}
                    </div>
                </div>

                {/* Details */}
                <div className="col-span-12 sm:col-span-8 min-w-0">
                    <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                            <h4 className="text-base font-semibold text-foreground truncate">
                                {vehicle.make_name} {vehicle.model_name}
                                {vehicle.year_of_construction && ` • ${vehicle.year_of_construction}`}
                            </h4>
                            <div className="text-lg font-bold text-foreground mt-1 truncate">
                                #{vehicle.internal_id} <span className="text-sm font-normal text-muted-foreground">• Branch: {vehicle.branch_name || "—"}</span>
                            </div>
                        </div>

                        <div className="text-right flex-shrink-0">
                            {vehicle.sale_price ? (
                                <div className="text-lg font-semibold text-foreground">
                                    {formatPrice(vehicle.sale_price)}
                                </div>
                            ) : vehicle.buy_price ? (
                                <div className="text-lg font-semibold text-foreground">
                                    {formatPrice(vehicle.buy_price)}
                                </div>
                            ) : (
                                <div className="text-sm text-muted-foreground">—</div>
                            )}
                            <div className="text-xs text-muted-foreground mt-1">
                                Active for: {vehicle.active_for ?? 0} days
                            </div>
                            {/* Compact Financial Indicators */}
                            {hasBothPrices && (
                                <div className="flex items-center justify-end gap-2 mt-1.5 text-xs">
                                    {totalProfit !== null && (
                                        <span className={`font-semibold ${getTotalProfitColor(totalProfit)}`}>
                                            {formatCurrency(totalProfit)}
                                        </span>
                                    )}
                                    {profitMargin !== null && (
                                        <span className={`${getProfitColor(profitMargin)}`}>
                                            {formatPercent(profitMargin)}
                                        </span>
                                    )}
                                    {daysOnStock !== null && (
                                        <span className="inline-flex items-center gap-0.5">
                                            <span className={`inline-block w-1.5 h-1.5 rounded-full ${getDaysOnStockBgColor(daysOnStock)}`} />
                                            <span className={getDaysOnStockColor(daysOnStock)}>
                                                {formatDays(daysOnStock)}
                                            </span>
                                        </span>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Details Grid */}
                    <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-sm text-muted-foreground">
                        {/* Column 1: Buy & Sale */}
                        <div className="space-y-1">
                            <div className="truncate">
                                <strong>Buy (Gross):</strong>{" "}
                                {formatPrice(vehicle.buy_price)}
                            </div>
                            <div className="truncate">
                                <strong>Buy date:</strong>{" "}
                                {vehicle.buy_date || "—"}
                            </div>
                            <div className="mt-2 truncate">
                                <strong>Sale (Gross):</strong>{" "}
                                {formatPrice(vehicle.sale_price)}
                            </div>
                            <div className="truncate">
                                <strong>Sale date:</strong>{" "}
                                {vehicle.sale_date || "—"}
                            </div>
                        </div>

                        {/* Column 2: Identifiers */}
                        <div className="space-y-1">
                            <div className="truncate">
                                <strong>Chassis:</strong>{" "}
                                {vehicle.chassis_number || "—"}
                            </div>
                            <div className="truncate">
                                <strong>Reg:</strong>{" "}
                                {vehicle.motor_vehicle_registration_number || "—"}
                            </div>
                            <div className="truncate">
                                <strong>Plate:</strong>{" "}
                                {vehicle.official_license_plate || "—"}
                            </div>
                        </div>

                        {/* Column 3: Specs */}
                        <div className="space-y-1">
                            <div className="truncate">
                                <strong>Damage:</strong>{" "}
                                {vehicle.damage_type_name || "—"}
                            </div>
                            <div className="truncate">
                                <strong>Year:</strong>{" "}
                                {vehicle.year_of_construction || "—"}
                            </div>
                            <div className="truncate">
                                <strong>KM:</strong>{" "}
                                {vehicle.kilometer?.toLocaleString() || "—"}
                            </div>
                        </div>

                        {/* Column 4: More Details */}
                        <div className="space-y-1">
                            <div className="truncate">
                                <strong>Type:</strong> {vehicle.vehicle_type_name || "—"}
                            </div>
                            <div className="truncate">
                                <strong>Body:</strong> {vehicle.body_type_name || "—"}
                            </div>
                            <div className="truncate">
                                <strong>Color:</strong> {vehicle.color_name || "—"}
                            </div>
                            <div className="truncate">
                                <strong>Fuel:</strong> {vehicle.fuel_type_name || "—"}
                            </div>
                            <div className="truncate">
                                <strong>Power:</strong> {vehicle.power_kw || "—"} KW
                            </div>
                        </div>
                    </div>

                    {vehicle.internal_comments && (
                        <div className="mt-2 text-sm text-muted-foreground truncate">
                            {vehicle.internal_comments}
                        </div>
                    )}
                </div>

                {/* Actions Column */}
                <div className="pointer-events-none relative z-20 col-span-12 sm:col-span-2 flex flex-col items-end gap-2">
                    {/* Status Badge */}
                    <Badge className={statusColors[status] || "bg-gray-500"}>
                        {statusLabels[status] || status}
                    </Badge>

                    {/* Single Contract Button - always enabled to show modal */}
                    <Button
                        variant="outline"
                        size="sm"
                        className={canGenerateAnyContract
                            ? "gap-2 pointer-events-auto"
                            : "gap-2 opacity-75 pointer-events-auto"
                        }
                        onClick={(e) => {
                            e.stopPropagation()
                            onGenerateContract?.(vehicle)
                        }}
                        title="Generate documents"
                    >
                        <FileText className="h-4 w-4" />
                        Documents
                    </Button>

                    {/* Delete/Activate */}
                    <div className="w-full mt-2 flex flex-col items-end gap-2">
                        {status === "inactive" ? (
                            <Button
                                size="sm"
                                className="bg-green-600 hover:bg-green-700 text-white pointer-events-auto"
                                onClick={(e) => {
                                    e.stopPropagation()
                                    onStatusChange?.(vehicle, "purchased")
                                }}
                            >
                                Activate
                            </Button>
                        ) : (
                            <Button
                                size="sm"
                                variant="destructive"
                                className="pointer-events-auto"
                                onClick={(e) => {
                                    e.stopPropagation()
                                    onDelete?.(vehicle)
                                }}
                            >
                                Delete
                            </Button>
                        )}
                    </div>

                    {/* Status Change Buttons */}
                    <div className="w-full mt-2 flex flex-col items-end gap-2">
                        {status === "purchased" && (
                            <>
                                <Button
                                    size="sm"
                                    className="bg-orange-600 hover:bg-orange-700 text-white pointer-events-auto"
                                    onClick={(e) => {
                                        e.stopPropagation()
                                        onStatusChange?.(vehicle, "ready_for_sale")
                                    }}
                                >
                                    Ready
                                </Button>
                                <Button
                                    size="sm"
                                    className="bg-blue-600 hover:bg-blue-700 text-white pointer-events-auto"
                                    onClick={(e) => {
                                        e.stopPropagation()
                                        onStatusChange?.(vehicle, "reserved")
                                    }}
                                >
                                    Reserve
                                </Button>
                            </>
                        )}
                        {(status === "ready_for_sale" || status === "reserved") && (
                            <Button
                                size="sm"
                                className="bg-red-600 hover:bg-red-700 text-white pointer-events-auto"
                                disabled={!vehicle.can_generate_sale_contract}
                                onClick={(e) => {
                                    e.stopPropagation()
                                    onStatusChange?.(vehicle, "sold")
                                }}
                                title={
                                    !vehicle.can_generate_sale_contract
                                        ? "Complete sale details first"
                                        : "Mark as sold"
                                }
                            >
                                Sold
                            </Button>
                        )}
                    </div>
                </div>
            </div>
        </article>
    )
}
