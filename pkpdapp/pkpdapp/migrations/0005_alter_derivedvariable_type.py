#
# This file is part of PKPDApp (https://github.com/pkpdapp-team/pkpdapp) which
# is released under the BSD 3-clause license. See accompanying LICENSE.md for
# copyright notice and full license details.
#
# Generated by Django 3.2.23 on 2024-01-24 12:31

from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("pkpdapp", "0004_merge_initial_data"),
    ]

    operations = [
        migrations.AlterField(
            model_name="derivedvariable",
            name="type",
            field=models.CharField(
                choices=[
                    ("RO", "receptor occupancy"),
                    ("FUP", "faction unbound plasma"),
                    ("BPR", "blood plasma ratio"),
                    ("TLG", "dosing lag time"),
                ],
                help_text="type of derived variable",
                max_length=3,
            ),
        ),
    ]