"""
PDF Generation Helper - Compatibility layer for legacy PDF views.

The legacy views.py PDF generation functions use old-style Choice field methods
(get_*_display()) which no longer exist because those fields have been migrated
to ForeignKey relationships. This module provides helper functions to safely
extract display values from the Vehicle model.
"""


def safe_display(fk_field, fallback=""):
    """Get the .name of a FK field, or return fallback."""
    if fk_field is not None:
        return str(fk_field.name) if hasattr(fk_field, 'name') else str(fk_field)
    return fallback


def get_vehicle_display_name(vehicle):
    """Get a display string like 'BMW X5 SUV/...' from a vehicle."""
    make = safe_display(vehicle.make)
    model = vehicle.model.name if vehicle.model else (vehicle.manufacturer_model or "")
    body = safe_display(vehicle.body_type)
    parts = [p for p in [make, model, body] if p]
    return " ".join(parts)


def patch_vehicle_for_pdf(vehicle):
    """
    Monkey-patch a vehicle instance to add get_*_display() methods
    so legacy PDF generation code works without modification.
    """
    # manufacturer → make (skip if it's a property, which already returns the correct value)
    if not isinstance(type(vehicle).manufacturer, property):
        vehicle.manufacturer = safe_display(vehicle.make)
    # manufacturer_model → model.name (if not already set via legacy field)
    if not vehicle.manufacturer_model and vehicle.model:
        vehicle.manufacturer_model = vehicle.model.name

    # Add get_*_display() methods that the legacy code expects
    vehicle.get_manufacturer_display = lambda: safe_display(vehicle.make)
    vehicle.get_vehicle_type_display = lambda: safe_display(vehicle.vehicle_type)
    vehicle.get_body_type_display = lambda: safe_display(vehicle.body_type)
    vehicle.get_color_display = lambda: safe_display(vehicle.color)
    vehicle.get_fuel_type_display = lambda: safe_display(vehicle.fuel_type)
    vehicle.get_buy_payment_method_display = lambda: safe_display(vehicle.buy_payment_method, "N/A")
    vehicle.get_sale_payment_method_display = lambda: safe_display(vehicle.sale_payment_method, "N/A")
    vehicle.get_damage_type_display = lambda: safe_display(vehicle.damage_type)

    # Handle missing buy_price_taxes / sale_price_taxes (removed in new model)
    if not hasattr(vehicle, 'buy_price_taxes') or vehicle.__class__.__dict__.get('buy_price_taxes') is None:
        # Calculate from FK: buy_price * buy_tax.percentage / 100
        if vehicle.buy_price and vehicle.buy_tax and vehicle.buy_tax.percentage:
            vehicle.buy_price_taxes = float(vehicle.buy_price) * float(vehicle.buy_tax.percentage) / 100
        else:
            vehicle.buy_price_taxes = 0

    if not hasattr(vehicle, 'sale_price_taxes') or vehicle.__class__.__dict__.get('sale_price_taxes') is None:
        if vehicle.sale_price and vehicle.sale_tax and vehicle.sale_tax.percentage:
            vehicle.sale_price_taxes = float(vehicle.sale_price) * float(vehicle.sale_tax.percentage) / 100
        else:
            vehicle.sale_price_taxes = 0

    return vehicle
