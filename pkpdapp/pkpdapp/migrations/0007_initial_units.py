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
    cL = myokit.Unit.parse_simple("cL")
    h = myokit.Unit.parse_simple("h")
    g = myokit.Unit.parse_simple("g")
    mol = myokit.Unit.parse_simple("mol")
    dimensionless = myokit.Unit()

    units = [
        {
            "symbol": "mol",
            "unit": mol,
        },
        {
            "symbol": "nmol",
            "unit": 1e-9 * mol,
        },
        {
            "symbol": "pmol",
            "unit": 1e-12 * mol,
        },
        {
            "symbol": "µmol",
            "unit": 1e-6 * mol,
        },
        {
            "symbol": "pmol/L",
            "unit": 1e-12 * mol / L,
        },
        {
            "symbol": "nmol/L",
            "unit": 1e-9 * mol / L,
        },
        {
            "symbol": "µmol/L",
            "unit": 1e-6 * mol / L,
        },
        {
            "symbol": "mmol/L",
            "unit": 1e-3 * mol / L,
        },
        {
            "symbol": "mol/L",
            "unit": mol / L,
        },
        {
            "symbol": "pmol/mL",
            "unit": 1e-12 * mol / (1e-3 * L),
        },
        {
            "symbol": "nmol/mL",
            "unit": 1e-9 * mol / (1e-3 * L),
        },
        {
            "symbol": "µmol/mL",
            "unit": 1e-6 * mol / (1e-3 * L),
        },
        {
            "symbol": "mmol/mL",
            "unit": 1e-3 * mol / (1e-3 * L),
        },
        {
            "symbol": "mol/mL",
            "unit": mol / (1e-3 * L),
        },
        {
            "symbol": "µL/min/mg",
            "unit": 1e-6 * L / (60 * h * 1e-3 * g),
        },
        {
            "symbol": "h",
            "unit": h,
        },
        {
            "symbol": "1/h",
            "unit": 1 / h,
        },
        {
            "symbol": "mg",
            "unit": 1e-3 * g,
        },
        {
            "symbol": "day",
            "unit": 24 * h,
        },
        {
            "symbol": "1/day",
            "unit": 1 / (24 * h),
        },
        {
            "symbol": "week",
            "unit": 7 * 24 * h,
        },
        {
            "symbol": "1/week",
            "unit": 1 / (7 * 24 * h),
        },
        {
            "symbol": "min",
            "unit": h / 60,
        },
        {
            "symbol": "s",
            "unit": h / 3600,
        },
        {
            "symbol": "L/mg/day",
            "unit": L / (1e-3 * g * 24 * h),
        },
        {
            "symbol": "L/h/kg",
            "unit": L / (h * 1e3 * g),
        },
        {
            "symbol": "mL/h/kg",
            "unit": 1e-3 * L / (h * 1e3 * g),
        },
        {
            "symbol": "L/day/kg",
            "unit": L / (24 * h * 1e3 * g),
        },
        {
            "symbol": "mL/day/kg",
            "unit": 1e-3 * L / (24 * h * 1e3 * g),
        },
        {
            "symbol": "L/h/pmol",
            "unit": L / (h * 1e-12 * mol),
        },
        {
            "symbol": "L/day/pmol",
            "unit": L / (24 * h * 1e-12 * mol),
        },
        {
            "symbol": "mL/day/pmol",
            "unit": 1e-3 * L / (24 * h * 1e-12 * mol),
        },
        {
            "symbol": "L/h/nmol",
            "unit": L / (h * 1e-9 * mol),
        },
        {
            "symbol": "L/day/nmol",
            "unit": L / (24 * h * 1e-9 * mol),
        },
        {
            "symbol": "mL/day/nmol",
            "unit": 1e-3 * L / (24 * h * 1e-9 * mol),
        },
        {
            "symbol": "L/h/µmol",
            "unit": L / (h * 1e-6 * mol),
        },
        {
            "symbol": "L/day/µmol",
            "unit": L / (24 * h * 1e-6 * mol),
        },
        {
            "symbol": "mL/day/µmol",
            "unit": 1e-3 * L / (24 * h * 1e-6 * mol),
        },
        {"symbol": "L", "unit": L},
        {"symbol": "mL", "unit": 1e-3 * L},
        {"symbol": "L/kg", "unit": L / (1e3 * g)},
        {"symbol": "L/h", "unit": L / h},
        {"symbol": "L/day", "unit": L / (24 * h)},
        {"symbol": "mL/day", "unit": 1e-3 * L / (24 * h)},
        {"symbol": "mL/h", "unit": 1e-3 * L / h},
        {"symbol": "µL/h", "unit": 1e-6 * L / h},
        {"symbol": "1/L", "unit": 1 / L},
        {
            "symbol": "kg",
            "unit": 1e3 * g,
        },
        {
            "symbol": "g",
            "unit": g,
        },
        {
            "symbol": "ng",
            "unit": 1e-9 * g,
        },
        {
            "symbol": "pg/L",
            "unit": 1e-12 * g / L,
        },
        {
            "symbol": "µg/L",
            "unit": 1e-6 * g / L,
        },
        {
            "symbol": "mg/L",
            "unit": 1e-3 * g / L,
        },
        {
            "symbol": "ng/L",
            "unit": 1e-9 * g / L,
        },
        {
            "symbol": "g/L",
            "unit": g / L,
        },
        {
            "symbol": "pg/mL",
            "unit": 1e-12 * g / (1e-3 * L),
        },
        {
            "symbol": "ng/mL",
            "unit": 1e-9 * g / (1e-3 * L),
        },
        {
            "symbol": "µg/mL",
            "unit": 1e-6 * g / (1e-3 * L),
        },
        {
            "symbol": "mg/mL",
            "unit": 1e-3 * g / (1e-3 * L),
        },
        {
            "symbol": "g/mL",
            "unit": g / (1e-3 * L),
        },

        {
            "symbol": "10^6/mcL",
            "unit": 1e6 / (1e-3 * cL),
        },
        {
            "symbol": "10^3/mcL",
            "unit": 1e3 / (1e-3 * cL),
        },
        {
            "symbol": "g/dL",
            "unit": g / (10 * cL),
        },
        {
            "symbol": "",
            "unit": dimensionless,
        },
        {
            "symbol": "g/mol",
            "unit": g / mol,
        },
        {
            "symbol": "g/nmol",
            "unit": g / (1e-6 * mol),
        },
        {
            "symbol": "h*pmol/L",
            "unit": h * 1e-12 * mol / L,
        },
        {
            "symbol": "h*nmol/L",
            "unit": h * 1e-9 * mol / L,
        },
        {
            "symbol": "h*µmol/L",
            "unit": h * 1e-6 * mol / L,
        },
        {
            "symbol": "h*ng/mL",
            "unit": h * 1e-9 * g / (1e-3 * L),
        },
        {
            "symbol": "h*µg/mL",
            "unit": h * 1e-6 * g / (1e-3 * L),
        },
        {
            "symbol": "day*pmol/L",
            "unit": 24 * h * 1e-12 * mol / L,
        },
        {
            "symbol": "day*nmol/L",
            "unit": 24 * h * 1e-9 * mol / L,
        },
        {
            "symbol": "day*µmol/L",
            "unit": 24 * h * 1e-6 * mol / L,
        },
        {
            "symbol": "day*ng/mL",
            "unit": 24 * h * 1e-9 * g / (1e-3 * L),
        },
        {
            "symbol": "day*µg/mL",
            "unit": 24 * h * 1e-6 * g / (1e-3 * L),
        },
        {
            "symbol": "mg/kg",
            "unit": 1e-3 * g / (1e3 * g),
        },
        {
            "symbol": "pg/kg",
            "unit": 1e-12 * g / (1e3 * g),
        },
        {
            "symbol": "ng/kg",
            "unit": 1e-9 * g / (1e3 * g),
        },
        {
            "symbol": "µg/kg",
            "unit": 1e-6 * g / (1e3 * g),
        },
        {
            "symbol": "pmol/kg",
            "unit": 1e-12 * mol / (1e3 * g),
        },
        {
            "symbol": "nmol/kg",
            "unit": 1e-9 * mol / (1e3 * g),
        },
        {
            "symbol": "µmol/kg",
            "unit": 1e-6 * mol / (1e3 * g),
        },
        {
            "symbol": "mL/kg",
            "unit": 1e-3 * L / (1e3 * g),
        },
        {
            "symbol": "L/kg",
            "unit": L / (1e3 * g),
        },
    ]

    for u in units:
        try:
            Unit.objects.get(symbol=u["symbol"])
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
        ("pkpdapp", "0001_initial"),
    ]

    operations = [
        migrations.RunPython(load_units),
    ]
