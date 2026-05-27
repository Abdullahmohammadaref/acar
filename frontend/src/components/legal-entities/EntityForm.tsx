/**
 * Reusable Legal Entity form component.
 * Extracted from LegalEntitiesPage so it can be used both on the Legal Entities page
 * and inline from Vehicle forms (Buyer/Seller modals).
 *
 * Renders the full form: Name, Type, Tax ID (companies), Address, and Contact fields.
 */
import { useTranslation } from "react-i18next"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { DynamicSelect } from "@/components/ui/dynamic-select"
import { useChoices } from "@/hooks/useVehicles"
import type { LegalEntityCreatePayload } from "@/hooks/useLegalEntities"
import { cn } from "@/lib/utils"

export interface EntityFormProps {
    data: Partial<LegalEntityCreatePayload>
    onChange: (data: Partial<LegalEntityCreatePayload>) => void
    isNew?: boolean
    errors?: Record<string, string>
}

export function EntityForm({ data, onChange, errors }: EntityFormProps) {
    const { t } = useTranslation()
    const { data: choicesData } = useChoices()

    const handleChange = (field: keyof LegalEntityCreatePayload, value: any) => {
        onChange({ ...data, [field]: value })
    }

    return (
        <div className="space-y-6">
            {/* Basic Info */}
            <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                    <Label htmlFor="le-name">{t("legalEntities.name", "Name")} <span className="text-red-500">*</span></Label>
                    <Input
                        id="le-name"
                        value={data.name || ""}
                        onChange={(e) => handleChange("name", e.target.value)}
                        className={cn(errors?.name && "border-red-500 focus-visible:ring-red-500")}
                        required
                    />
                    {errors?.name && <p className="text-xs text-red-500">{errors.name}</p>}
                </div>
                <div className="space-y-2">
                    <Label htmlFor="le-type">{t("legalEntities.type", "Type")} <span className="text-red-500">*</span></Label>
                    <Select value={data.type || "individual"} onValueChange={(v) => handleChange("type", v)}>
                        <SelectTrigger id="le-type" className={cn(errors?.type && "border-red-500 focus:ring-red-500")}>
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="individual">{t("legalEntities.individual", "Individual")}</SelectItem>
                            <SelectItem value="company">{t("legalEntities.company", "Company")}</SelectItem>
                        </SelectContent>
                    </Select>
                    {errors?.type && <p className="text-xs text-red-500">{errors.type}</p>}
                </div>
            </div>

            {/* Tax ID (only for companies) */}
            {data.type === "company" && (
                <div className="space-y-2">
                    <Label htmlFor="le-tax_id">{t("legalEntities.taxId", "Tax Identification Number")} <span className="text-red-500">*</span></Label>
                    <Input
                        id="le-tax_id"
                        value={data.tax_identification_number || ""}
                        onChange={(e) => handleChange("tax_identification_number", e.target.value)}
                        className={cn(errors?.tax_identification_number && "border-red-500 focus-visible:ring-red-500")}
                        required
                    />
                    {errors?.tax_identification_number && <p className="text-xs text-red-500">{errors.tax_identification_number}</p>}
                </div>
            )}

            {/* Address Section */}
            <div>
                <h4 className="text-sm font-medium mb-4">{t("legalEntities.address", "Address")}</h4>
                <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                        <Label htmlFor="le-street">{t("legalEntities.street", "Street")} <span className="text-red-500">*</span></Label>
                        <Input
                            id="le-street"
                            value={data.address_street || ""}
                            onChange={(e) => handleChange("address_street", e.target.value)}
                            className={cn(errors?.address_street && "border-red-500 focus-visible:ring-red-500")}
                            required
                        />
                        {errors?.address_street && <p className="text-xs text-red-500">{errors.address_street}</p>}
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="le-street_number">{t("legalEntities.streetNumber", "Street Number")} <span className="text-red-500">*</span></Label>
                        <Input
                            id="le-street_number"
                            value={data.address_street_number || ""}
                            onChange={(e) => handleChange("address_street_number", e.target.value)}
                            className={cn(errors?.address_street_number && "border-red-500 focus-visible:ring-red-500")}
                            required
                        />
                        {errors?.address_street_number && <p className="text-xs text-red-500">{errors.address_street_number}</p>}
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="le-postal_code">{t("legalEntities.postalCode", "Postal Code")} <span className="text-red-500">*</span></Label>
                        <Input
                            id="le-postal_code"
                            value={data.address_postal_code || ""}
                            onChange={(e) => handleChange("address_postal_code", e.target.value)}
                            className={cn(errors?.address_postal_code && "border-red-500 focus-visible:ring-red-500")}
                            required
                        />
                        {errors?.address_postal_code && <p className="text-xs text-red-500">{errors.address_postal_code}</p>}
                    </div>
                    <div className="space-y-2 sm:col-span-2">
                        <Label htmlFor="le-country">{t("legalEntities.country", "Country")} <span className="text-red-500">*</span></Label>
                        <DynamicSelect
                            choiceType="country"
                            options={choicesData?.countries || []}
                            value={data.address_country_id}
                            onChange={(v) => {
                                onChange({
                                    ...data,
                                    address_country_id: v,
                                    address_city_id: null
                                })
                            }}
                            placeholder={t("legalEntities.selectCountry", "Select Country")}
                            hasError={!!errors?.address_country_id}
                        />
                        {errors?.address_country_id && <p className="text-xs text-red-500">{errors.address_country_id}</p>}
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="le-city">{t("legalEntities.city", "City")} <span className="text-red-500">*</span></Label>
                        <DynamicSelect
                            choiceType="city"
                            options={choicesData?.cities?.filter(c => c.country_id === data.address_country_id) || []}
                            value={data.address_city_id}
                            onChange={(v) => handleChange("address_city_id", v)}
                            placeholder={t("legalEntities.selectCity", "Select City")}
                            disabled={!data.address_country_id}
                            parentId={data.address_country_id || undefined}
                            hasError={!!errors?.address_city_id}
                        />
                        {errors?.address_city_id && <p className="text-xs text-red-500">{errors.address_city_id}</p>}
                    </div>
                </div>
            </div>

            {/* Contact Section */}
            <div>
                <h4 className="text-sm font-medium mb-4">{t("legalEntities.contact", "Contact Information")}</h4>
                <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                        <Label htmlFor="le-email">{t("legalEntities.email", "Email")}</Label>
                        <Input
                            id="le-email"
                            type="email"
                            value={data.email || ""}
                            onChange={(e) => handleChange("email", e.target.value)}
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="le-phone">{t("legalEntities.phone", "Phone Number")}</Label>
                        <Input
                            id="le-phone"
                            value={data.phone_number || ""}
                            onChange={(e) => handleChange("phone_number", e.target.value)}
                        />
                    </div>
                </div>
            </div>
        </div>
    )
}
