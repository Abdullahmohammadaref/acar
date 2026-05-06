from django.contrib import admin

# Register your models here.

from manager.models import (
    Business, Branch, User, Vehicle, LegalEntity, Transaction,
    PaymentMethod, VehicleType, BodyType, Make, VehicleModel, Color, FuelType, DamageType, DoorsChoice, TaxPercentage
)


# Register your models here.

@admin.register(Business)
class BusinessAdmin(admin.ModelAdmin):
    pass

@admin.register(Branch)
class BranchAdmin(admin.ModelAdmin):
    pass

@admin.register(User)
class UserAdmin(admin.ModelAdmin):
    pass

@admin.register(Vehicle)
class VehicleAdmin(admin.ModelAdmin):
    pass

@admin.register(LegalEntity)
class LegalEntityAdmin(admin.ModelAdmin):
    list_display = ('name', 'type', 'business', 'status')
    list_filter = ('type', 'status', 'business')
    search_fields = ('name', 'email', 'phone_number')

@admin.register(Transaction)
class TransactionAdmin(admin.ModelAdmin):
    pass


# Dynamic Choice Models
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
