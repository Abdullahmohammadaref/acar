from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin

from manager.models import (
    Business, Branch, User, Country, City, LegalEntity,
    PaymentMethod, VehicleType, BodyType, Make, VehicleModel,
    Color, FuelType, DamageType, DoorsChoice, TaxPercentage,
    Category, Subcategory, Currency, KeyNumber,
    Vehicle, Transaction, VehicleExpenseEarning,
    AuthActionRequest, ActivityLog
)


# =============================================================================
# Core Business & Auth Models
# =============================================================================

@admin.register(Business)
class BusinessAdmin(admin.ModelAdmin):
    list_display = ('name', 'telephone_number', 'email', 'managing_director', 'tax_id')
    search_fields = ('name', 'email', 'tax_id', 'managing_director')


@admin.register(Branch)
class BranchAdmin(admin.ModelAdmin):
    list_display = ('name', 'business', 'is_active')
    list_filter = ('business', 'is_active')
    search_fields = ('name', 'address')


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    list_display = ('username', 'email', 'first_name', 'last_name', 'business', 'is_manager', 'is_staff', 'is_active')
    list_filter = ('is_manager', 'is_staff', 'is_active', 'business')
    search_fields = ('username', 'email', 'first_name', 'last_name')
    fieldsets = BaseUserAdmin.fieldsets + (
        ('Business & Permissions', {
            'fields': ('business', 'is_manager', 'transactions_access', 'legal_entities_access', 'backup_email', 'last_activity_viewed_at'),
        }),
    )


# =============================================================================
# Geographic Models
# =============================================================================

@admin.register(Country)
class CountryAdmin(admin.ModelAdmin):
    list_display = ('name', 'business', 'is_active')
    list_filter = ('business', 'is_active')
    search_fields = ('name',)


@admin.register(City)
class CityAdmin(admin.ModelAdmin):
    list_display = ('name', 'country', 'business', 'is_active')
    list_filter = ('country', 'business', 'is_active')
    search_fields = ('name', 'country__name')


# =============================================================================
# Legal Entity Model
# =============================================================================

@admin.register(LegalEntity)
class LegalEntityAdmin(admin.ModelAdmin):
    list_display = ('name', 'internal_id', 'type', 'business', 'status')
    list_filter = ('type', 'status', 'business')
    search_fields = ('name', 'email', 'phone_number', 'internal_id')


# =============================================================================
# Vehicle Choice Models
# =============================================================================

@admin.register(PaymentMethod)
class PaymentMethodAdmin(admin.ModelAdmin):
    list_display = ('name', 'business', 'is_active')
    list_filter = ('business', 'is_active')
    search_fields = ('name',)


@admin.register(VehicleType)
class VehicleTypeAdmin(admin.ModelAdmin):
    list_display = ('name', 'business', 'is_active')
    list_filter = ('business', 'is_active')
    search_fields = ('name',)


@admin.register(BodyType)
class BodyTypeAdmin(admin.ModelAdmin):
    list_display = ('name', 'business', 'is_active')
    list_filter = ('business', 'is_active')
    search_fields = ('name',)


@admin.register(Make)
class MakeAdmin(admin.ModelAdmin):
    list_display = ('name', 'business', 'is_active')
    list_filter = ('business', 'is_active')
    search_fields = ('name',)


@admin.register(VehicleModel)
class VehicleModelAdmin(admin.ModelAdmin):
    list_display = ('name', 'make', 'business', 'is_active')
    list_filter = ('make', 'business', 'is_active')
    search_fields = ('name', 'make__name')


@admin.register(Color)
class ColorAdmin(admin.ModelAdmin):
    list_display = ('name', 'business', 'is_active')
    list_filter = ('business', 'is_active')
    search_fields = ('name',)


@admin.register(FuelType)
class FuelTypeAdmin(admin.ModelAdmin):
    list_display = ('name', 'business', 'is_active')
    list_filter = ('business', 'is_active')
    search_fields = ('name',)


@admin.register(DamageType)
class DamageTypeAdmin(admin.ModelAdmin):
    list_display = ('name', 'business', 'is_active')
    list_filter = ('business', 'is_active')
    search_fields = ('name',)


@admin.register(DoorsChoice)
class DoorsChoiceAdmin(admin.ModelAdmin):
    list_display = ('name', 'business', 'is_active')
    list_filter = ('business', 'is_active')
    search_fields = ('name',)


@admin.register(TaxPercentage)
class TaxPercentageAdmin(admin.ModelAdmin):
    list_display = ('name', 'percentage', 'is_no_tax', 'business', 'is_active')
    list_filter = ('business', 'is_active', 'is_no_tax')
    search_fields = ('name',)


# =============================================================================
# Financial Category, Subcategory, Currency & Key Number Models
# =============================================================================

@admin.register(Category)
class CategoryAdmin(admin.ModelAdmin):
    list_display = ('name', 'business', 'is_active')
    list_filter = ('business', 'is_active')
    search_fields = ('name',)


@admin.register(Subcategory)
class SubcategoryAdmin(admin.ModelAdmin):
    list_display = ('name', 'category', 'business', 'is_active')
    list_filter = ('category', 'business', 'is_active')
    search_fields = ('name', 'category__name')


@admin.register(Currency)
class CurrencyAdmin(admin.ModelAdmin):
    list_display = ('name', 'code', 'business', 'is_active')
    list_filter = ('business', 'is_active')
    search_fields = ('name', 'code')


@admin.register(KeyNumber)
class KeyNumberAdmin(admin.ModelAdmin):
    list_display = ('number', 'vehicle', 'business', 'is_active')
    list_filter = ('business', 'is_active')
    search_fields = ('number', 'vehicle__internal_id')


# =============================================================================
# Vehicle & Transaction Models
# =============================================================================

@admin.register(Vehicle)
class VehicleAdmin(admin.ModelAdmin):
    list_display = ('internal_id', 'make', 'model', 'status', 'buy_price', 'sale_price', 'business', 'branch')
    list_filter = ('status', 'business', 'branch', 'make', 'fuel_type', 'damage_type')
    search_fields = ('internal_id', 'chassis_number', 'official_license_plate', 'make__name', 'model__name')


@admin.register(Transaction)
class TransactionAdmin(admin.ModelAdmin):
    list_display = ('internal_id', 'amount', 'from_or_to', 'date', 'status', 'business', 'vehicle')
    list_filter = ('status', 'business', 'date')
    search_fields = ('description', 'from_or_to', 'internal_id')


@admin.register(VehicleExpenseEarning)
class VehicleExpenseEarningAdmin(admin.ModelAdmin):
    list_display = ('vehicle', 'type', 'amount', 'category', 'subcategory', 'business', 'created_at', 'is_active')
    list_filter = ('type', 'business', 'is_active', 'category')
    search_fields = ('vehicle__internal_id', 'category__name', 'subcategory__name')


# =============================================================================
# System, Security & Activity Logs
# =============================================================================

@admin.register(AuthActionRequest)
class AuthActionRequestAdmin(admin.ModelAdmin):
    list_display = ('request_id', 'action_type', 'user', 'status', 'created_at', 'expires_at', 'approved_at')
    list_filter = ('action_type', 'status')
    search_fields = ('request_id', 'user__username', 'user__email')
    readonly_fields = ('request_id', 'approval_token', 'created_at')


@admin.register(ActivityLog)
class ActivityLogAdmin(admin.ModelAdmin):
    list_display = ('timestamp', 'user', 'action', 'entity_type', 'entity_id', 'entity_name', 'business')
    list_filter = ('action', 'entity_type', 'business', 'timestamp')
    search_fields = ('entity_name', 'details', 'user__username')
    readonly_fields = ('timestamp',)
