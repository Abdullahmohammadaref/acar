"""
State-only migration to reconcile the Python model renames
(Manufacturer → Make, ManufacturerModel → VehicleModel)
with Django's migration framework.

The actual database tables were already renamed via db_table & db_column
overrides in models.py and the raw SQL in migration 0060.
This migration only updates Django's internal migration state so that
the test framework can replay migrations correctly.
"""

import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('manager', '0060_make_model_rename'),
    ]

    operations = [
        # =====================================================================
        # Step 1: Use SeparateDatabaseAndState to:
        #   - In STATE: remove old fields & models, create new ones
        #   - In DATABASE: do nothing (tables already exist with correct schema)
        # =====================================================================
        migrations.SeparateDatabaseAndState(
            state_operations=[
                # Remove old FK from vehicle.manufacturer → old Manufacturer model
                migrations.RemoveField(
                    model_name='vehicle',
                    name='manufacturer',
                ),
                # Remove old FK from manufacturermodel.manufacturer → old Manufacturer model
                migrations.RemoveField(
                    model_name='manufacturermodel',
                    name='manufacturer',
                ),
                # Drop uniqueness constraints (state-only)
                migrations.AlterUniqueTogether(
                    name='manufacturermodel',
                    unique_together=None,
                ),
                # Remove business FK from old ManufacturerModel
                migrations.RemoveField(
                    model_name='manufacturermodel',
                    name='business',
                ),
                # Update the legacy text field
                migrations.AlterField(
                    model_name='vehicle',
                    name='manufacturer_model',
                    field=models.CharField(
                        blank=True, max_length=100, null=True,
                        verbose_name='manufacturer model (legacy)'
                    ),
                ),
                # Create the new Make model in state
                migrations.CreateModel(
                    name='Make',
                    fields=[
                        ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                        ('name', models.CharField(max_length=100, verbose_name='name')),
                        ('is_active', models.BooleanField(default=True, verbose_name='is active')),
                        ('business', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='makes', to='manager.business', verbose_name='business')),
                    ],
                    options={
                        'verbose_name': 'Make',
                        'verbose_name_plural': 'Makes',
                        'db_table': 'manager_manufacturer',
                        'ordering': ['name'],
                        'unique_together': {('name', 'business')},
                    },
                ),
                # Add new vehicle.make FK
                migrations.AddField(
                    model_name='vehicle',
                    name='make',
                    field=models.ForeignKey(
                        blank=True, db_column='manufacturer_id', null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name='vehicles', to='manager.make', verbose_name='make',
                    ),
                ),
                # Create the new VehicleModel model in state
                migrations.CreateModel(
                    name='VehicleModel',
                    fields=[
                        ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                        ('name', models.CharField(max_length=100, verbose_name='name')),
                        ('is_active', models.BooleanField(default=True, verbose_name='is active')),
                        ('business', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='vehicle_models', to='manager.business', verbose_name='business')),
                        ('make', models.ForeignKey(db_column='manufacturer_id', on_delete=django.db.models.deletion.CASCADE, related_name='models', to='manager.make', verbose_name='make')),
                    ],
                    options={
                        'verbose_name': 'Vehicle Model',
                        'verbose_name_plural': 'Vehicle Models',
                        'db_table': 'manager_manufacturermodel',
                        'ordering': ['name'],
                        'unique_together': {('name', 'make', 'business')},
                    },
                ),
                # Update vehicle.model FK to point at the new VehicleModel
                migrations.AlterField(
                    model_name='vehicle',
                    name='model',
                    field=models.ForeignKey(
                        blank=True, null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name='vehicles', to='manager.vehiclemodel', verbose_name='model',
                    ),
                ),
                # Delete old models from state
                migrations.DeleteModel(name='Manufacturer'),
                migrations.DeleteModel(name='ManufacturerModel'),
            ],
            database_operations=[
                # No DB changes needed — tables already exist with correct schema
            ],
        ),
    ]
