# Generated by Django 3.2.25 on 2024-10-25 18:36

from django.db import migrations, models
import django.db.models.deletion
import pkpdapp.models.project


class Migration(migrations.Migration):

    dependencies = [
        ("pkpdapp", "0022_combined_model_weight_pkmodel2"),
    ]

    operations = [
        migrations.AddField(
            model_name="combinedmodel",
            name="has_anti_drug_antibodies",
            field=models.BooleanField(
                default=False, help_text="whether the pk model has anti-drug antibodies"
            ),
        ),
        migrations.AlterField(
            model_name="project",
            name="species_weight_unit",
            field=models.ForeignKey(
                default=pkpdapp.models.project.get_species_weight_unit,
                on_delete=django.db.models.deletion.PROTECT,
                related_name="species_weight_units",
                to="pkpdapp.unit",
            ),
        ),
    ]