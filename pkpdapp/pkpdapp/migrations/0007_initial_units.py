#
# This file is part of PKPDApp (https://github.com/pkpdapp-team/pkpdapp) which
# is released under the BSD 3-clause license. See accompanying LICENSE.md for
# copyright notice and full license details.
#

from django.db import migrations
import myokit


def load_units(apps, schema_editor):
    Unit = apps.get_model("pkpdapp", "Unit")
    m = myokit.Unit.parse_simple('m')
    L = myokit.Unit.parse_simple('L')
    cL = myokit.Unit.parse_simple('cL')
    h = myokit.Unit.parse_simple('h')
    g = myokit.Unit.parse_simple('g')
    mol = myokit.Unit.parse_simple('mol')
    dimensionless = myokit.Unit()

    units = [
        {
            'symbol': 'nmol/L',
            'unit': 1e-9 * mol / L,
        },
        {
            'symbol': 'µL/min/mg',
            'unit': 1e-6 * L / (60 * h * 1e-3 * g),
        },
        {
            'symbol': 'h',
            'unit': h,
        },
        {
            'symbol': 'mg',
            'unit': 1e-3 * g,
        },
        {
            'symbol': 'd',
            'unit': 24 * h,
        },
        {
            'symbol': '1/d',
            'unit': 1 / (24 * h),
        },
        {
            'symbol': '1/h',
            'unit': 1 / h,
        },
        {
            'symbol': 'L/mg/d',
            'unit': L / (1e-3 * g * 24 * h),
        },
        {
            'symbol': 'L',
            'unit': L
        },
        {
            'symbol': 'L/h',
            'unit': L / h
        },
        {
            'symbol': '1/L',
            'unit': 1 / L
        },
        {
            'symbol': 'cm^3',
            'unit': (1e-2 * m)**3,
        },
        {
            'symbol': 'cm^3/d',
            'unit': (1e-2 * m)**3 / (24 * h),
        },
        {
            'symbol': 'g',
            'unit': g,
        },
        {
            'symbol': 'ng',
            'unit': 1e-9 * g,
        },
        {
            'symbol': 'ng/mL',
            'unit': 1e-9 * g / (1e-3 * L),
        },
        {
            'symbol': 'mg/L',
            'unit': 1e-3 * g / L,
        },
        {
            'symbol': 'ng/L',
            'unit': 1e-9 * g / L,
        },
        {
            'symbol': 'g/L',
            'unit': g / L,
        },
        {
            'symbol': '10^6/mcL',
            'unit': 1e6 / (1e-3 * cL),
        },
        {
            'symbol': '10^3/mcL',
            'unit': 1e3 / (1e-3 * cL),
        },
        {
            'symbol': 'g/dL',
            'unit': g / (10 * cL),
        },
        {
            'symbol': '',
            'unit': dimensionless,
        },
        {
            'symbol': 'g/mol',
            'unit': g / mol,
        },
        {
            'symbol': 'g/nmol',
            'unit': g / (1e-6 * mol),
        },
        {
            'symbol': 'nmol',
            'unit': 1e-6 * mol,
        },

    ]

    for u in units:
        Unit.objects.create(
            symbol=u['symbol'],
            g=u['unit'].exponents()[0],
            m=u['unit'].exponents()[1],
            s=u['unit'].exponents()[2],
            A=u['unit'].exponents()[3],
            K=u['unit'].exponents()[4],
            cd=u['unit'].exponents()[5],
            mol=u['unit'].exponents()[6],
            multiplier=u['unit'].multiplier_log_10(),
        )


class Migration(migrations.Migration):

    dependencies = [
        ('pkpdapp', '0001_initial'),
    ]

    operations = [
        migrations.RunPython(load_units),
    ]
