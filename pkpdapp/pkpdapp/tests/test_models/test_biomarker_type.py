#
# This file is part of PKPDApp (https://github.com/pkpdapp-team/pkpdapp) which
# is released under the BSD 3-clause license. See accompanying LICENSE.md for
# copyright notice and full license details.
#

from django.test import TestCase
from pkpdapp.models import (
    Dataset,
    BiomarkerType,
    Unit,
)
from django.utils import timezone
from django.db.utils import IntegrityError


class TestBiomarkerTypeModel(TestCase):
    def test_biomarker_type_creation(self):
        d = Dataset.objects.create(
            name='my_cool_dataset',
            datetime=timezone.now(),
            description='description for my cool biomarker',
        )

        u = Unit.objects.get(symbol='mg')
        bt = BiomarkerType.objects.create(
            name='my_cool_biomarker_type',
            description='description for my cool biomarker_type',
            dataset=d,
            unit=u,
        )
        self.assertTrue(isinstance(bt, BiomarkerType))

        # requires a unit
        with self.assertRaises(IntegrityError):
            BiomarkerType.objects.create(
                name='my_cool_biomarker_type2',
                description='description',
                dataset=d,
            )
