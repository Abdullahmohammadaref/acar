# Generated manual migration for Make/Model refactor
# This migration adds the new model_id column to the Vehicle table
# Other changes (Python renames) don't require database changes due to db_table/db_column settings

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('manager', '0059_activitylog'),
    ]

    operations = [
        # Add the new 'model_id' column to the vehicle table
        # This creates a new FK column pointing to the manufacturermodel table
        migrations.RunSQL(
            sql='''
                ALTER TABLE manager_vehicle ADD COLUMN model_id INTEGER NULL REFERENCES manager_manufacturermodel(id);
            ''',
            reverse_sql='''
                ALTER TABLE manager_vehicle DROP COLUMN model_id;
            ''',
            state_operations=[
                migrations.AddField(
                    model_name='vehicle',
                    name='model',
                    field=models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=models.deletion.SET_NULL,
                        related_name='vehicles',
                        to='manager.manufacturermodel',
                        verbose_name='model',
                    ),
                ),
            ],
        ),
    ]
