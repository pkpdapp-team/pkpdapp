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
    SubjectGroup,
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
        self.time_unit = Unit.objects.get(symbol='h')
        self.biomarker_type = BiomarkerType.objects.create(
            name='my_cool_biomarker_type',
            description='description for my cool biomarker_type',
            dataset=self.dataset,
            stored_unit=self.unit,
            display_unit=self.unit,
            stored_time_unit=self.time_unit,
            display_time_unit=self.time_unit,
        )
        self.subject_group = SubjectGroup.objects.create(
            name='test',
            dataset=self.dataset,
        )
        self.subjects = [
            Subject.objects.create(
                id_in_dataset=1,
                dataset=self.dataset,
            ),
            Subject.objects.create(
                id_in_dataset=2,
                dataset=self.dataset,
            ),
        ]
        self.subject_group.subjects.add(self.subjects[0])

        self.values = [0, 1, 2, 3]
        self.times = [0, 2, 4, 6]
        self.biomarker_subjects = [
            self.subjects[0].id, self.subjects[0].id, self.subjects[0].id,
            self.subjects[1].id
        ]
        self.biomarkers = [
            Biomarker.objects.create(
                time=time,
                subject=self.subjects[0],
                biomarker_type=self.biomarker_type,
                value=value
            ) for value, time in zip(self.values[:-1], self.times[:-1])
        ]
        self.biomarkers.append(
            Biomarker.objects.create(
                time=self.times[-1],
                subject=self.subjects[1],
                biomarker_type=self.biomarker_type,
                value=self.values[-1]
            )
        )

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

    def test_unit_conversion(self):
        new_unit = Unit.objects.get(symbol='g')
        old_values = self.biomarker_type.as_pandas()['values']
        self.biomarker_type.display_unit = new_unit
        self.biomarker_type.save()
        new_values = self.biomarker_type.as_pandas()['values']
        np.testing.assert_array_equal(
            old_values, 1e3 * new_values
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
            df['subjects'], np.array(self.biomarker_subjects)
        )

        df = self.biomarker_type.as_pandas(
            subject_group=self.subject_group
        )
        np.testing.assert_array_equal(
            df['values'], np.array(self.values[:-1])
        )
        np.testing.assert_array_equal(
            df['times'], np.array(self.times[:-1])
        )
        np.testing.assert_array_equal(
            df['subjects'], np.array(self.biomarker_subjects[:-1])
        )

        df = self.biomarker_type.as_pandas(first_time_only=True)

        np.testing.assert_array_equal(
            df['times'], [self.times[0], self.times[3]]
        )
        np.testing.assert_array_equal(
            df['values'], [self.values[0], self.values[3]]
        )

        df = self.biomarker_type.as_pandas(
            subject_group=self.subject_group, first_time_only=True
        )

        np.testing.assert_array_equal(
            df['times'], [self.times[0]]
        )
        np.testing.assert_array_equal(
            df['values'], [self.values[0]]
        )


