#
# This file is part of PKPDApp (https://github.com/pkpdapp-team/pkpdapp) which
# is released under the BSD 3-clause license. See accompanying LICENSE.md for
# copyright notice and full license details.
#

from django.db import migrations


def load_units(apps, schema_editor):
    Unit = apps.get_model("pkpdapp", "Unit")
    StandardUnit = apps.get_model("pkpdapp", "StandardUnit")

    standard_units = [
        {'symbol': 'h'},
        {'symbol': 'μg'},
        {'symbol': 'mL'},
        {'symbol': 'ng/mL'},
        {'symbol': '1/mL'},
    ]

    units = [
        {
            'symbol': 'cm^3',
            'standard_unit': 'mL',
            'multiplier': 1.0,
        },
        {
            'symbol': 'd',
            'standard_unit': 'h',
            'multiplier': 24.0,
        },
        {
            'symbol': 'hours',
            'standard_unit': 'h',
            'multiplier': 1.0,
        },
        {
            'symbol': 'mg',
            'standard_unit': 'μg',
            'multiplier': 1e3,
        },
        {
            'symbol': 'g',
            'standard_unit': 'μg',
            'multiplier': 1e6,
        },
        {
            'symbol': 'g/dL',
            'standard_unit': 'ng/mL',
            'multiplier': 1e7,
        },
        {
            'symbol': '10^3/mcL',
            'standard_unit': '1/mL',
            'multiplier': 1,
        },
        {
            'symbol': '10^6/mcL',
            'standard_unit': '1/mL',
            'multiplier': 1e-3,
        },

    ]

    for u in standard_units:
        standard_unit = StandardUnit.objects.create(symbol=u['symbol'])
        Unit.objects.create(
            symbol=u['symbol'],
            standard_unit=standard_unit,
            multiplier=1.0,
        )
    for u in units:
        Unit.objects.create(
            symbol=u['symbol'],
            standard_unit=StandardUnit.objects.get(symbol=u['standard_unit']),
            multiplier=u['multiplier'],
        )


class Migration(migrations.Migration):

    dependencies = [
        ('pkpdapp', '0001_initial'),
    ]

    operations = [
        migrations.RunPython(load_units),
    ]
