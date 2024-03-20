#
# This file is part of PKPDApp (https://github.com/pkpdapp-team/pkpdapp) which
# is released under the BSD 3-clause license. See accompanying LICENSE.md for
# copyright notice and full license details.
#
# Generated by Django 3.2.24 on 2024-03-08 08:38

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('pkpdapp', '0006_biomarkertype_mapped_qname'),
    ]

    operations = [
        migrations.AddField(
            model_name='protocol',
            name='mapped_qname',
            field=models.CharField(
                default='',
                help_text='qname of the mapped dosing compartment for each dose',
                max_length=50
            ),
        ),
    ]