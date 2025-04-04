#
# This file is part of PKPDApp (https://github.com/pkpdapp-team/pkpdapp) which
# is released under the BSD 3-clause license. See accompanying LICENSE.md for
# copyright notice and full license details.
#
# Generated by Django 3.2.25 on 2024-11-25 14:15

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('pkpdapp', '0016_auto_20241122_1523'),
    ]

    operations = [
        migrations.AddField(
            model_name='variable',
            name='lower_threshold',
            field=models.FloatField(
                blank=True,
                help_text='lower threshold for this variable',
                null=True
            ),
        ),
        migrations.AddField(
            model_name='variable',
            name='upper_threshold',
            field=models.FloatField(
                blank=True,
                help_text='upper threshold for this variable',
                null=True
            ),
        ),
    ]
