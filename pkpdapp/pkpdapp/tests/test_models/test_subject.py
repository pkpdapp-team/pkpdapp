#
# This file is part of PKPDApp (https://github.com/pkpdapp-team/pkpdapp) which
# is released under the BSD 3-clause license. See accompanying LICENSE.md for
# copyright notice and full license details.
#

import pkpdapp.tests  # noqa: F401
from django.test import TestCase
from pkpdapp.models import (
    Dataset,
    Subject,
)
from django.utils import timezone
from django.db.utils import IntegrityError


class TestSubjectModel(TestCase):
    def setUp(self):
        self.dataset = Dataset.objects.create(
            name='test_subject_model',
            datetime=timezone.now(),
            description='description for my cool dataset',
        )

    def test_subject_creation(self):
        metadata = {
            'test': 2
        }
        s = Subject.objects.create(
            id_in_dataset=1, dataset=self.dataset, metadata=metadata
        )
        self.assertTrue(isinstance(s, Subject))

    def test_subject_unique_constraint(self):

        metadata = {
            'test': 2
        }
        Subject.objects.create(
            id_in_dataset=2, dataset=self.dataset, metadata=metadata
        )

        # this is ok
        d2 = Dataset.objects.create(
            name='test_subject_model2',
            datetime=timezone.now(),
            description='description for my cool dataset',
        )
        Subject.objects.create(
            id_in_dataset=2, dataset=d2, metadata=metadata
        )

        # this should raise error
        with self.assertRaises(IntegrityError):
            Subject.objects.create(
                id_in_dataset=2, dataset=self.dataset, metadata=metadata
            )
