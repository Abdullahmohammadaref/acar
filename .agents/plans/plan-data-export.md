# plan-data-export.md — Business Data Export (Owner Backup Download)

> **Date:** 2026-05-17
> **Agent target:** Antigravity / Claude Code
> **Scope:** One new backend endpoint + one button in BusinessSettingsPage
> **Pre-read (mandatory):** `idea.md`, `developer-guide.md`, `PROJECT_MAP.md`, `SKILL.md`

---

## What This Is

A **"Download My Data"** button in the Business Settings page. The manager clicks it, waits a few seconds, and a `.zip` file downloads containing everything: all vehicles, transactions, legal entities, choices, and all uploaded images — scoped strictly to their business. If something catastrophic ever happens (server wipes, accidental data loss), they hand you the zip and you restore from it.

This is deliberately simple. It is not a live sync, not automatic, not cloud-synced. It's a manual "I want a copy of my data right now" button. That's exactly right for this use case.

---

## What the ZIP Contains

```
acar_export_YYYY-MM-DD/
├── data/
│   ├── vehicles.json
│   ├── transactions.json
│   ├── legal_entities.json
│   ├── choices.json          (all choice types: makes, colors, fuel types, etc.)
│   └── business.json         (business info, branches)
└── media/
    └── images/
        └── vehicles/
            ├── car1.jpg
            └── car2.png
```

All JSON files are clean, human-readable, and structured to be re-importable. Images are the actual uploaded files from `media/`.

**What is NOT included:**
- User passwords (never export these — they're hashed anyway and useless without the server)
- `AuthActionRequest` records (temporary auth tokens — irrelevant to restore)
- `ActivityLog` (nice-to-have but adds significant size; skip for now)
- Other businesses' data (strictly business-scoped)

---

## Why JSON, Not a Raw SQLite Dump

You mentioned "I'll use SQL queries or tell AI to do it." JSON is actually better for that use case:

- **SQLite dump:** requires SQLite installed, exact schema match, raw SQL. Hard to hand to an AI or inspect manually.
- **JSON:** human-readable, AI can import it directly, easy to inspect and fix, works even if the schema changed slightly between export and restore.

For full-schema restores, you (the developer) have the server backups from the `plan-deployment-cicd-backup.md` plan. This in-app export is for the **manager's peace of mind and self-service partial restores**.

---

## Backend Implementation

### New Endpoint in `settings_api.py`

**File:** `backend/manager/settings_api.py`

Read `SKILL.md` before touching this file — the import pattern matters. The router in `settings_api.py` uses `Router(auth=django_auth)`. Follow that exact pattern.

Add at the bottom of `settings_api.py`:

```python
import zipfile
import json
import io
import os
from django.http import HttpResponse
from django.core.serializers.json import DjangoJSONEncoder

@settings_router.get("/business/export-data")
def export_business_data(request):
    """
    Export all business data as a downloadable ZIP file.
    Manager only. Scoped strictly to request.user.business.
    
    ZIP contains:
    - data/vehicles.json
    - data/transactions.json
    - data/legal_entities.json
    - data/choices.json
    - data/business.json
    - media/images/vehicles/* (all uploaded vehicle images)
    """
    if not request.user.is_manager:
        return HttpResponse(status=403)
    
    business = get_user_business(request)
    
    # Build the ZIP in memory
    zip_buffer = io.BytesIO()
    
    with zipfile.ZipFile(zip_buffer, 'w', zipfile.ZIP_DEFLATED) as zf:
        
        # --- data/business.json ---
        business_data = {
            "name": business.name,
            "slug": business.slug,
            "address": business.address,
            "phone": business.phone,
            "email": business.email,
            "website": getattr(business, 'website', None),
            "tax_id": getattr(business, 'tax_id', None),
            "court_registration": getattr(business, 'court_registration', None),
            "bank_name": getattr(business, 'bank_name', None),
            "bank_iban": getattr(business, 'bank_iban', None),
            "bank_bic": getattr(business, 'bank_bic', None),
            "branches": list(
                Branch.objects.filter(business=business).values(
                    'id', 'name', 'address', 'phone'
                )
            ),
        }
        zf.writestr(
            "data/business.json",
            json.dumps(business_data, indent=2, cls=DjangoJSONEncoder)
        )
        
        # --- data/legal_entities.json ---
        entities = list(
            LegalEntity.objects.filter(business=business).values(
                'internal_id', 'entity_type', 'first_name', 'last_name',
                'company_name', 'email', 'phone', 'address_street',
                'address_city', 'address_zip', 'address_country',
                'id_number', 'is_active', 'created_at'
            )
        )
        zf.writestr(
            "data/legal_entities.json",
            json.dumps(entities, indent=2, cls=DjangoJSONEncoder)
        )
        
        # --- data/vehicles.json ---
        vehicles_qs = Vehicle.objects.filter(business=business).select_related(
            'make', 'model', 'vehicle_type', 'body_type', 'color',
            'fuel_type', 'damage_type', 'doors', 'buy_tax', 'sale_tax',
            'buy_payment_method', 'sale_payment_method', 'seller', 'buyer',
            'branch'
        )
        vehicles_data = []
        for v in vehicles_qs:
            vehicles_data.append({
                "internal_id": v.internal_id,
                "status": v.status,
                "vin": v.vin,
                "license_plate": v.license_plate,
                "registration_number": v.registration_number,
                "make": v.make.name if v.make else None,
                "model": v.model.name if v.model else None,
                "vehicle_type": v.vehicle_type.name if v.vehicle_type else None,
                "body_type": v.body_type.name if v.body_type else None,
                "color": v.color.name if v.color else None,
                "fuel_type": v.fuel_type.name if v.fuel_type else None,
                "damage_type": v.damage_type.name if v.damage_type else None,
                "doors": v.doors.name if v.doors else None,
                "year_of_construction": str(v.year_of_construction) if v.year_of_construction else None,
                "mileage": str(v.mileage) if v.mileage else None,
                "engine_displacement": str(v.engine_displacement) if v.engine_displacement else None,
                "power_kw": str(v.power_kw) if v.power_kw else None,
                "branch": v.branch.name if v.branch else None,
                # Buy details
                "buy_date": v.buy_date.isoformat() if v.buy_date else None,
                "buy_price": str(v.buy_price) if v.buy_price else None,
                "buy_tax_percentage": v.buy_tax.percentage if v.buy_tax else None,
                "buy_payment_method": v.buy_payment_method.name if v.buy_payment_method else None,
                "seller_internal_id": v.seller.internal_id if v.seller else None,
                # Sale details
                "sale_date": v.sale_date.isoformat() if v.sale_date else None,
                "sale_price": str(v.sale_price) if v.sale_price else None,
                "sale_tax_percentage": v.sale_tax.percentage if v.sale_tax else None,
                "sale_payment_method": v.sale_payment_method.name if v.sale_payment_method else None,
                "buyer_internal_id": v.buyer.internal_id if v.buyer else None,
                # Image path (relative)
                "image": v.image.name if v.image else None,
                "created_at": v.created_at.isoformat() if hasattr(v, 'created_at') and v.created_at else None,
            })
        zf.writestr(
            "data/vehicles.json",
            json.dumps(vehicles_data, indent=2, cls=DjangoJSONEncoder)
        )
        
        # --- data/transactions.json ---
        transactions_qs = Transaction.objects.filter(business=business).select_related(
            'vehicle', 'category', 'subcategory', 'currency', 'payment_method', 'tax'
        )
        transactions_data = []
        for t in transactions_qs:
            transactions_data.append({
                "transaction_date": t.transaction_date.isoformat() if t.transaction_date else None,
                "status": t.status,
                "description": t.description,
                "amount": str(t.amount) if t.amount else None,
                "type": t.type,
                "currency": t.currency.name if t.currency else None,
                "payment_method": t.payment_method.name if t.payment_method else None,
                "tax_percentage": t.tax.percentage if t.tax else None,
                "category": t.category.name if t.category else None,
                "subcategory": t.subcategory.name if t.subcategory else None,
                "vehicle_internal_id": t.vehicle.internal_id if t.vehicle else None,
                "notes": getattr(t, 'notes', None),
                "created_at": t.created_at.isoformat() if hasattr(t, 'created_at') and t.created_at else None,
            })
        zf.writestr(
            "data/transactions.json",
            json.dumps(transactions_data, indent=2, cls=DjangoJSONEncoder)
        )
        
        # --- data/choices.json ---
        choices_data = {
            "makes": list(Make.objects.filter(business=business).values('name', 'is_active')),
            "vehicle_models": [
                {"make": m.make.name, "name": m.name, "is_active": m.is_active}
                for m in VehicleModel.objects.filter(business=business).select_related('make')
            ],
            "vehicle_types": list(VehicleType.objects.filter(business=business).values('name', 'is_active')),
            "body_types": list(BodyType.objects.filter(business=business).values('name', 'is_active')),
            "colors": list(Color.objects.filter(business=business).values('name', 'is_active')),
            "fuel_types": list(FuelType.objects.filter(business=business).values('name', 'is_active')),
            "damage_types": list(DamageType.objects.filter(business=business).values('name', 'is_active')),
            "doors": list(DoorsChoice.objects.filter(business=business).values('name', 'is_active')),
            "tax_percentages": list(TaxPercentage.objects.filter(business=business).values('name', 'percentage', 'is_active')),
            "payment_methods": list(PaymentMethod.objects.filter(business=business).values('name', 'is_active')),
            "currencies": list(Currency.objects.filter(business=business).values('name', 'is_active')),
            "categories": list(Category.objects.filter(business=business).values('name', 'is_active')),
            "subcategories": [
                {"category": s.category.name, "name": s.name, "is_active": s.is_active}
                for s in Subcategory.objects.filter(business=business).select_related('category')
            ],
            "key_numbers": [
                {
                    "number": k.number,
                    "is_active": k.is_active,
                    "assigned_to_vehicle_internal_id": k.vehicle.internal_id if k.vehicle else None
                }
                for k in KeyNumber.objects.filter(business=business).select_related('vehicle')
            ],
        }
        zf.writestr(
            "data/choices.json",
            json.dumps(choices_data, indent=2, cls=DjangoJSONEncoder)
        )
        
        # --- media/images/vehicles/* ---
        # Include all uploaded vehicle images
        media_root = settings.MEDIA_ROOT
        vehicle_images_dir = os.path.join(media_root, 'images', 'vehicles')
        
        if os.path.exists(vehicle_images_dir):
            for filename in os.listdir(vehicle_images_dir):
                file_path = os.path.join(vehicle_images_dir, filename)
                if os.path.isfile(file_path):
                    zf.write(file_path, f"media/images/vehicles/{filename}")
        
        # Also include business logo if it exists
        if business.logo:
            logo_path = business.logo.path
            if os.path.exists(logo_path):
                logo_filename = os.path.basename(logo_path)
                zf.write(logo_path, f"media/logo/{logo_filename}")
    
    # Prepare response
    zip_buffer.seek(0)
    date_str = __import__('datetime').date.today().isoformat()
    filename = f"acar_export_{business.slug}_{date_str}.zip"
    
    response = HttpResponse(zip_buffer.read(), content_type='application/zip')
    response['Content-Disposition'] = f'attachment; filename="{filename}"'
    return response
```

**Imports to add at top of `settings_api.py`** (check which are already imported first):

```python
from django.conf import settings
from django.http import HttpResponse
from django.core.serializers.json import DjangoJSONEncoder
import zipfile
import json
import io
import os
from .models import (
    Branch, LegalEntity, Vehicle, Transaction,
    Make, VehicleModel, VehicleType, BodyType, Color,
    FuelType, DamageType, DoorsChoice, TaxPercentage,
    PaymentMethod, Currency, Category, Subcategory, KeyNumber
)
```

Only add what isn't already imported. Run `python manage.py check` after adding.

---

## Frontend Implementation

### Button in `BusinessSettingsPage.tsx`

**File:** `frontend/src/pages/BusinessSettingsPage.tsx`

This is a simple download link — not a mutation, not a form submission. A direct `<a href="...">` pointing to the API endpoint. When the browser navigates to it, Django returns a ZIP with `Content-Disposition: attachment` headers, and the browser downloads it automatically.

Add a new section at the bottom of the business settings page, below the existing settings cards:

```tsx
{/* Data Export Section */}
<div className="rounded-xl border border-border bg-card p-6">
    <div className="flex items-start justify-between gap-4">
        <div>
            <h3 className="text-base font-semibold text-foreground">
                {t("settings.exportData", "Export Business Data")}
            </h3>
            <p className="mt-1 text-sm text-muted-foreground">
                {t("settings.exportDataDescription", "Download a ZIP file containing all your business data — vehicles, transactions, legal entities, and uploaded images. Keep a copy somewhere safe.")}
            </p>
        </div>
        <a
            href="/api/settings/business/export-data"
            download
            className="flex-shrink-0 inline-flex items-center gap-2 rounded-lg border border-border bg-background px-4 py-2 text-sm font-medium text-foreground hover:bg-muted/50 hover:border-primary/40 transition-colors"
        >
            <Download className="h-4 w-4" />
            {t("settings.downloadExport", "Download Export")}
        </a>
    </div>
</div>
```

Add `Download` to the existing lucide-react import at the top of the file:

```tsx
import { ..., Download } from "lucide-react"
```

**That's it for the frontend.** No mutation, no loading state, no special handling needed. The browser handles the file download natively when it sees the `Content-Disposition: attachment` header.

---

## Add Locale Keys

**Files:** `frontend/src/locales/en.json`, `de.json`, `tr.json`, `ar.json`

Add under `"settings"` (or wherever your settings keys live — check the existing structure):

```json
"settings.exportData": "Export Business Data",
"settings.exportDataDescription": "Download a ZIP file containing all your business data — vehicles, transactions, legal entities, and uploaded images. Keep a copy somewhere safe.",
"settings.downloadExport": "Download Export"
```

---

## Files Modified Summary

| File | Change |
|---|---|
| `backend/manager/settings_api.py` | Add `GET /settings/business/export-data` endpoint |
| `frontend/src/pages/BusinessSettingsPage.tsx` | Add Data Export section with download link |
| `frontend/src/locales/en.json` | Add export locale keys |
| `frontend/src/locales/de.json` | Same |
| `frontend/src/locales/tr.json` | Same |
| `frontend/src/locales/ar.json` | Same |

---

## Important Notes for the Agent

**1. Check existing imports first** — `settings_api.py` already imports some models. Don't duplicate imports.

**2. Run `python manage.py check` after touching `settings_api.py`** — per `SKILL.md`. A bad import in any API file crashes the entire app.

**3. Field names** — the vehicle and transaction field names in the JSON export are based on the current model. Before writing the `values()` calls, scan the actual model fields in `models.py` for `Vehicle` and `Transaction`. Some field names used in the plan above (like `v.buy_price`, `v.sale_price`, `v.image`) may differ slightly from the actual model — verify each one against `models.py` before using it.

**4. The `image` field on Vehicle** — vehicles have an image upload field. Check what it's actually named in `models.py` (`image`? `photo`? `vehicle_image`?) and adjust accordingly.

**5. `business.logo`** — check that `Business` model has a `logo` field before including the logo export block. If not, remove that block.

**6. Performance** — for a business with 500 vehicles and 200 images (maybe 50MB total), this runs fine synchronously. If the business ever has thousands of vehicles, this would need to be made async (Celery task). Not needed now.

**7. Manager-only** — the `if not request.user.is_manager: return HttpResponse(status=403)` guard is mandatory. Employees must not be able to export business data.
