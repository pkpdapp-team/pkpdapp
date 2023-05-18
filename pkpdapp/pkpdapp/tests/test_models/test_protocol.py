#
# This file is part of PKPDApp (https://github.com/pkpdapp-team/pkpdapp) which
# is released under the BSD 3-clause license. See accompanying LICENSE.md for
# copyright notice and full license details.
#

import pkpdapp.tests
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
