#
# This file is part of PKPDApp (https://github.com/pkpdapp-team/pkpdapp) which
# is released under the BSD 3-clause license. See accompanying LICENSE.md for
# copyright notice and full license details.
#

from django.db import migrations


TOLERANCE = 1e-9


def _close_to(value, target):
    return target - TOLERANCE <= value <= target + TOLERANCE


def _is_time_unit(unit):
    return (
        _close_to(unit.s, 1)
        and _close_to(unit.g, 0)
        and _close_to(unit.m, 0)
        and _close_to(unit.A, 0)
        and _close_to(unit.K, 0)
        and _close_to(unit.cd, 0)
        and _close_to(unit.mol, 0)
    )


def _is_concentration_unit(unit):
    is_mass_per_volume = _close_to(unit.g, 1) and _close_to(unit.mol, 0)
    is_molar_concentration = _close_to(unit.mol, 1) and _close_to(unit.g, 0)
    return (
        _close_to(unit.m, -3)
        and _close_to(unit.s, 0)
        and _close_to(unit.A, 0)
        and _close_to(unit.K, 0)
        and _close_to(unit.cd, 0)
        and (is_mass_per_volume or is_molar_concentration)
    )


def load_auc_units(apps, schema_editor):
    Unit = apps.get_model("pkpdapp", "Unit")
    units = list(Unit.objects.all())
    time_units = [unit for unit in units if _is_time_unit(unit)]
    concentration_units = [unit for unit in units if _is_concentration_unit(unit)]

    for time_unit in time_units:
        for concentration_unit in concentration_units:
            symbol = f"{time_unit.symbol}*{concentration_unit.symbol}"
            Unit.objects.update_or_create(
                symbol=symbol,
                defaults={
                    "g": time_unit.g + concentration_unit.g,
                    "m": time_unit.m + concentration_unit.m,
                    "s": time_unit.s + concentration_unit.s,
                    "A": time_unit.A + concentration_unit.A,
                    "K": time_unit.K + concentration_unit.K,
                    "cd": time_unit.cd + concentration_unit.cd,
                    "mol": time_unit.mol + concentration_unit.mol,
                    "multiplier": (
                        time_unit.multiplier + concentration_unit.multiplier
                    ),
                },
            )


class Migration(migrations.Migration):

    dependencies = [
        ("pkpdapp", "0060_update_models"),
    ]

    operations = [
        migrations.RunPython(load_auc_units, reverse_code=migrations.RunPython.noop),
    ]
