#
# This file is part of PKPDApp (https://github.com/pkpdapp-team/pkpdapp) which
# is released under the BSD 3-clause license. See accompanying LICENSE.md for
# copyright notice and full license details.
#

from django.test import TestCase
from pkpdapp.models import (
    Dataset,
    Protocol,
    Compound,
    Unit,
)
from django.utils import timezone


class TestProtocolModel(TestCase):
    def test_model_creation(self):
        au = Unit.objects.get(symbol='mg')
        tu = Unit.objects.get(symbol='h')

        c = Compound.objects.create(
            name='my_cool_compound',
            description='placebo',
        )

        # test optional dataset
        p = Protocol.objects.create(
            name='my_cool_protocol',
            compound=c,
            subject_id=1,
            amount_unit=au,
            time_unit=tu,
        )

        self.assertTrue(isinstance(p, Protocol))

        # test with dataset
        d = Dataset.objects.create(
            name='test_protocol_creation',
            datetime=timezone.now(),
            description='description for my cool dataset',
        )
        p = Protocol.objects.create(
            name='my_cool_protocol',
            compound=c,
            dataset=d,
            subject_id=1,
            amount_unit=au,
            time_unit=tu,
        )
