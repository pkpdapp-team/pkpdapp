#
# This file is part of PKPDApp (https://github.com/pkpdapp-team/pkpdapp) which
# is released under the BSD 3-clause license. See accompanying LICENSE.md for
# copyright notice and full license details.
#

from django.db import migrations
import myokit


def load_units(apps, schema_editor):
    Unit = apps.get_model("pkpdapp", "Unit")
    L = myokit.Unit.parse_simple("L")
    h = myokit.Unit.parse_simple("h")
    g = myokit.Unit.parse_simple("g")

    units = [
        {
            "symbol": "h*mg/mL",
            "unit": h * 1e-3 * g / (1e-3 * L),
        },
        {
            "symbol": "day*mg/mL",
            "unit": 24 * h * 1e-3 * g / (1e-3 * L),
        },
    ]

    for u in units:
        try:
            unit = Unit.objects.get(symbol=u["symbol"])
            unit.g = u["unit"].exponents()[0]
            unit.m = u["unit"].exponents()[1]
            unit.s = u["unit"].exponents()[2]
            unit.A = u["unit"].exponents()[3]
            unit.K = u["unit"].exponents()[4]
            unit.cd = u["unit"].exponents()[5]
            unit.mol = u["unit"].exponents()[6]
            unit.multiplier = u["unit"].multiplier_log_10()
            unit.save()
        except Unit.DoesNotExist:
            Unit.objects.create(
                symbol=u["symbol"],
                g=u["unit"].exponents()[0],
                m=u["unit"].exponents()[1],
                s=u["unit"].exponents()[2],
                A=u["unit"].exponents()[3],
                K=u["unit"].exponents()[4],
                cd=u["unit"].exponents()[5],
                mol=u["unit"].exponents()[6],
                multiplier=u["unit"].multiplier_log_10(),
            )


class Migration(migrations.Migration):
    dependencies = [
        ("pkpdapp", "0050_alter_variable_secondary_unit"),
    ]

    operations = [
        migrations.RunPython(load_units),
    ]
