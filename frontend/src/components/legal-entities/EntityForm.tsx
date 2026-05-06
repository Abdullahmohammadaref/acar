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
import type { LegalEntityCreatePayload } from "@/hooks/useLegalEntities"

export interface EntityFormProps {
    data: Partial<LegalEntityCreatePayload>
    onChange: (data: Partial<LegalEntityCreatePayload>) => void
    isNew?: boolean
}

export function EntityForm({ data, onChange }: EntityFormProps) {
    const { t } = useTranslation()

    const handleChange = (field: keyof LegalEntityCreatePayload, value: string) => {
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
                        required
                    />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="le-type">{t("legalEntities.type", "Type")} <span className="text-red-500">*</span></Label>
                    <Select value={data.type || "individual"} onValueChange={(v) => handleChange("type", v)}>
                        <SelectTrigger id="le-type">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="individual">{t("legalEntities.individual", "Individual")}</SelectItem>
                            <SelectItem value="company">{t("legalEntities.company", "Company")}</SelectItem>
                        </SelectContent>
                    </Select>
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
                        required
                    />
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
                            required
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="le-street_number">{t("legalEntities.streetNumber", "Street Number")} <span className="text-red-500">*</span></Label>
                        <Input
                            id="le-street_number"
                            value={data.address_street_number || ""}
                            onChange={(e) => handleChange("address_street_number", e.target.value)}
                            required
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="le-postal_code">{t("legalEntities.postalCode", "Postal Code")} <span className="text-red-500">*</span></Label>
                        <Input
                            id="le-postal_code"
                            value={data.address_postal_code || ""}
                            onChange={(e) => handleChange("address_postal_code", e.target.value)}
                            required
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="le-city">{t("legalEntities.city", "City")} <span className="text-red-500">*</span></Label>
                        <Input
                            id="le-city"
                            value={data.address_city || ""}
                            onChange={(e) => handleChange("address_city", e.target.value)}
                            required
                        />
                    </div>
                    <div className="space-y-2 sm:col-span-2">
                        <Label htmlFor="le-country">{t("legalEntities.country", "Country")} <span className="text-red-500">*</span></Label>
                        <Input
                            id="le-country"
                            value={data.address_country || ""}
                            onChange={(e) => handleChange("address_country", e.target.value)}
                            required
                        />
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
