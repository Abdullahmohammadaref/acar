# Generated data migration
from django.db import migrations

def create_default_currencies(apps, schema_editor):
    """Create default EUR and USD currencies for each business"""
    Currency = apps.get_model('manager', 'Currency')
    Business = apps.get_model('manager', 'Business')
    
    default_currencies = [
        ('Euro', 'EUR'),
        ('US Dollar', 'USD'),
    ]
    
    for business in Business.objects.all():
        for name, code in default_currencies:
            Currency.objects.get_or_create(
                code=code,
                business=business,
                defaults={'name': name, 'is_active': True}
            )

def reverse_currencies(apps, schema_editor):
    """Remove default currencies"""
    Currency = apps.get_model('manager', 'Currency')
    Currency.objects.filter(code__in=['EUR', 'USD']).delete()

class Migration(migrations.Migration):

    dependencies = [
        ('manager', '0054_add_category_subcategory_currency_models'),
    ]

    operations = [
        migrations.RunPython(create_default_currencies, reverse_currencies),
    ]
