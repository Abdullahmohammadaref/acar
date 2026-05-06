# Generated migration for default TaxPercentage options

from django.db import migrations
from decimal import Decimal


def create_default_taxes(apps, schema_editor):
    """Create default 'No Tax (0%)' option for each business"""
    Business = apps.get_model('manager', 'Business')
    TaxPercentage = apps.get_model('manager', 'TaxPercentage')
    
    for business in Business.objects.all():
        # Only create if doesn't exist
        if not TaxPercentage.objects.filter(business=business, is_no_tax=True).exists():
            TaxPercentage.objects.create(
                name='No Tax',
                percentage=Decimal('0.00'),
                business=business,
                is_active=True,
                is_no_tax=True
            )


def reverse_default_taxes(apps, schema_editor):
    """Remove the default 'No Tax' options (only the system-created ones)"""
    TaxPercentage = apps.get_model('manager', 'TaxPercentage')
    TaxPercentage.objects.filter(is_no_tax=True, name='No Tax', percentage=Decimal('0.00')).delete()


class Migration(migrations.Migration):

    dependencies = [
        ('manager', '0052_remove_vehicle_buy_price_taxes_and_more'),
    ]

    operations = [
        migrations.RunPython(create_default_taxes, reverse_default_taxes),
    ]
