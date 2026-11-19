#
# This file is part of PKPDApp (https://github.com/pkpdapp-team/pkpdapp) which
# is released under the BSD 3-clause license. See accompanying LICENSE.md for
# copyright notice and full license details.
#

import pkpdapp.tests  # noqa: F401
from django.test import TestCase
from pkpdapp.models import (
    Protocol,
    Compound,
    Unit,
)


class TestProtocolModel(TestCase):
    def test_model_creation(self):
        au = Unit.objects.get(symbol='mg')
        tu = Unit.objects.get(symbol='h')

        c = Compound.objects.create(
            name='my_cool_compound',
            description='placebo',
            molecular_mass=100,
            target_molecular_mass=100,
        )

        # test optional dataset
        p = Protocol.objects.create(
            name='my_cool_protocol',
            compound=c,
            amount_unit=au,
            time_unit=tu,
        )

        self.assertTrue(isinstance(p, Protocol))

    def test_dose_type_can_be_changed_and_saved(self):
        c = Compound.objects.create(name='compound', description='')
        p = Protocol.objects.create(name='protocol', compound=c)
        self.assertEqual(p.dose_type, Protocol.DoseType.DIRECT)

        p.dose_type = Protocol.DoseType.INDIRECT
        p.save()

        p.refresh_from_db()
        self.assertEqual(p.dose_type, Protocol.DoseType.INDIRECT)
