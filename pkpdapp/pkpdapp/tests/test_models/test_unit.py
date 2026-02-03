#
# This file is part of PKPDApp (https://github.com/pkpdapp-team/pkpdapp) which
# is released under the BSD 3-clause license. See accompanying LICENSE.md for
# copyright notice and full license details.
#

import pkpdapp.tests  # noqa: F401
from django.test import TestCase
from pkpdapp.models import Unit, Compound
from math import log10


class TestUnitModel(TestCase):
    def setUp(self):
        self.compound = Compound.objects.create(
            name="test_unit_model",
            description="description for my cool compound",
        )

    def check_myokit_unit(self, unit_symbol):
        unit = Unit.objects.get(symbol=unit_symbol)
        myokit_unit = unit.get_myokit_unit()
        self.assertEqual(unit.multiplier, log10(myokit_unit.multiplier()))

    def check_compatible_unit(self, unit_symbol, compatible_units, compound=None):
        unit = Unit.objects.get(symbol=unit_symbol)
        compat_symbols = [
            u.symbol for u in unit.get_compatible_units(compound=compound)
        ]
        self.assertCountEqual(compat_symbols, compatible_units)

    def test_time_unit_conversion(self):
        for symbol in ["s", "min", "h", "day", "week"]:
            self.check_myokit_unit(symbol)

    def test_compatible_units(self):
        self.check_compatible_unit("s", ["s", "min", "h", "day", "week"])
        self.check_compatible_unit(
            "ng/mL",
            [
                "ng/mL",
                "µg/mL",
                "mg/L",
                "ng/L",
                "g/L",
                "g/dL",
                "pg/mL",
                "pg/L",
                "µg/L",
                "mg/mL",
                "g/mL",
            ],
        )

    def test_compatible_units_mols(self):
        self.check_compatible_unit("nmol", ["mol", "nmol", "pmol", "µmol"])
        self.check_compatible_unit(
            "nmol",
            ["mol", "nmol", "pmol", "µmol", "mg", "g", "ng", "kg"],
            compound=self.compound,
        )
        self.check_compatible_unit("mg", ["mg", "g", "ng", "kg"])
        self.check_compatible_unit(
            "mg",
            ["mol", "nmol", "pmol", "µmol", "mg", "g", "ng", "kg"],
            compound=self.compound,
        )
        self.check_compatible_unit(
            "nmol/L",
            [
                "nmol/L",
                "pmol/L",
                "µmol/L",
                "mg/L",
                "g/L",
                "ng/mL",
                "ng/L",
                "pg/mL",
                "µg/mL",
                "g/dL",
                "mmol/L",
                "mol/L",
                "pmol/mL",
                "nmol/mL",
                "µmol/mL",
                "mmol/mL",
                "mol/mL",
                "pg/L",
                "µg/L",
                "mg/mL",
                "g/mL",
            ],
            compound=self.compound,
        )

    def test_compatible_units_mols_per_kg(self):
        self.check_compatible_unit("nmol/kg", ["nmol/kg", "pmol/kg", "µmol/kg"])
        self.check_compatible_unit(
            "nmol/kg",
            ["nmol/kg", "pmol/kg", "µmol/kg", "mg/kg", "pg/kg", "µg/kg", "ng/kg", ""],
            compound=self.compound,
        )
        self.check_compatible_unit("mg/kg", ["mg/kg", "pg/kg", "µg/kg", "ng/kg", ""])
        self.check_compatible_unit(
            "mg/kg",
            [
                "nmol/kg",
                "pmol/kg",
                "µmol/kg",
                "mg/kg",
                "pg/kg",
                "µg/kg",
                "ng/kg",
                "g/mol",
                "g/nmol",
                "kg/mol",
                "",
            ],
            compound=self.compound,
        )
