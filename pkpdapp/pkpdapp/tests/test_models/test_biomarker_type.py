#
# This file is part of PKPDApp (https://github.com/pkpdapp-team/pkpdapp) which
# is released under the BSD 3-clause license. See accompanying LICENSE.md for
# copyright notice and full license details.
#

from django.test import TestCase
from pkpdapp.models import (
    Dataset,
    BiomarkerType,
    Biomarker,
    Unit,
    Subject,
)
from django.utils import timezone
from django.db.utils import IntegrityError
import numpy as np


class TestBiomarkerTypeModel(TestCase):
    def setUp(self):
        self.dataset = Dataset.objects.create(
            name='my_cool_dataset',
            datetime=timezone.now(),
            description='description for my cool biomarker',
        )

        self.unit = Unit.objects.get(symbol='mg')
        self.biomarker_type = BiomarkerType.objects.create(
            name='my_cool_biomarker_type',
            description='description for my cool biomarker_type',
            dataset=self.dataset,
            unit=self.unit,
        )
        self.subject = Subject.objects.create(
            id_in_dataset=1,
            dataset=self.dataset,
        )
        self.values = [0, 1, 2]
        self.times = [0, 2, 4]
        self.subjects = [self.subject.id, self.subject.id, self.subject.id]
        self.biomarkers = [
            Biomarker.objects.create(
                time=time,
                subject=self.subject,
                biomarker_type=self.biomarker_type,
                value=value
            ) for value, time in zip(self.values, self.times)
        ]

    def test_biomarker_type_creation(self):
        self.assertTrue(
            isinstance(self.biomarker_type, BiomarkerType)
        )

    def test_str(self):
        self.assertEqual(
            str(self.biomarker_type), "my_cool_biomarker_type"
        )

    def test_requires_a_unit(self):
        with self.assertRaises(IntegrityError):
            BiomarkerType.objects.create(
                name='my_cool_biomarker_type2',
                description='description',
                dataset=self.dataset,
            )

    def test_as_pandas(self):
        df = self.biomarker_type.as_pandas()
        np.testing.assert_array_equal(
            df['values'], np.array(self.values)
        )
        np.testing.assert_array_equal(
            df['times'], np.array(self.times)
        )
        np.testing.assert_array_equal(
            df['subjects'], np.array(self.subjects)
        )
