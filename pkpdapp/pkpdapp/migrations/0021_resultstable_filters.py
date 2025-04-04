#
# This file is part of PKPDApp (https://github.com/pkpdapp-team/pkpdapp) which
# is released under the BSD 3-clause license. See accompanying LICENSE.md for
# copyright notice and full license details.
#
# Generated by Django 3.2.25 on 2024-11-28 11:21

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('pkpdapp', '0020_rename_results_resultstable'),
    ]

    operations = [
        migrations.AddField(
            model_name='resultstable',
            name='filters',
            field=models.JSONField(
                blank=True,
                help_text='Filters to apply to the table.',
                null=True
            ),
        ),
    ]
