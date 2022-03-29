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

    def test_dataset_creation(self):
        self.assertTrue(
            isinstance(self.dataset, Dataset)
        )

    def test_dataset_deletion(self):
        self.dataset.delete()
        with self.assertRaises(BiomarkerType.DoesNotExist):
            BiomarkerType.objects.get(id=self.biomarker_type.id)
        with self.assertRaises(Biomarker.DoesNotExist):
            Biomarker.objects.get(id=self.biomarkers[0].id)

    def test_migration(self):
        dataset = Dataset.objects.get(name='demo_pk_data')
        protocols = set([subject.protocol for subject in dataset.subjects.all()])
        self.assertEqual(len(protocols), 39)
