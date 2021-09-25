#
# This file is part of PKPDApp (https://github.com/pkpdapp-team/pkpdapp) which
# is released under the BSD 3-clause license. See accompanying LICENSE.md for
# copyright notice and full license details.
#

from django.test import TestCase
from pkpdapp.models import (
    Dataset, Biomarker, BiomarkerType,
    Unit,
)
from django.utils import timezone


class TestBiomarkerModel(TestCase):
    def test_biomarker_creation(self):
        u = Unit.objects.get(symbol='mg')
        time_unit = Unit.objects.get(symbol='h')
        d = Dataset.objects.create(
            name='my_cool_dataset',
            datetime=timezone.now(),
            description='description for my cool biomarker',
        )

        b = BiomarkerType.objects.create(
            name='my type',
            stored_unit=u,
            display_unit=u,
            stored_time_unit=time_unit,
            display_time_unit=time_unit,
            dataset=d,
        )
        b = Biomarker.objects.create(
            time=0.0,
            value=1.0,
            subject_id=1,
            biomarker_type=b
        )
        self.assertTrue(isinstance(b, Biomarker))
