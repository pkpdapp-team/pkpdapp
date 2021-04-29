#
# This file is part of PKPDApp (https://github.com/pkpdapp-team/pkpdapp) which
# is released under the BSD 3-clause license. See accompanying LICENSE.md for
# copyright notice and full license details.
#

from django.db import models
from jsonfield import JSONField
from pkpdapp.models import Dataset


class Subject(models.Model):
    """
    A subject in a particular dataset.
    """
    id_in_dataset = models.IntegerField(help_text='unique id in the dataset')
    dataset = models.ForeignKey(
        Dataset, on_delete=models.CASCADE,
        help_text='dataset containing this subject'
    )
    dose_group = models.CharField(
        max_length=100, help_text='dosing group for this subject',
        blank=True
    )
    group = models.CharField(
        max_length=100,
        help_text='dataset specific grouping for this subject',
        blank=True
    )
    metadata = JSONField(help_text='subject metadata')

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=['id_in_dataset', 'dataset'],
                                    name='subject_dataset_unique')
        ]

    def __str__(self):
        return str(self.id_in_dataset)
