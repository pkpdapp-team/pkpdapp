#
# This file is part of PKPDApp (https://github.com/pkpdapp-team/pkpdapp) which
# is released under the BSD 3-clause license. See accompanying LICENSE.md for
# copyright notice and full license details.
#

from django.db import models
from django.urls import reverse

ADMINISTRATION_TYPE_CHOICES = (
    ('T1', 'type1'),
    ('T2', 'type2'),
)


class Dataset(models.Model):
    """
    A PKPD dataset containing one or more :model:`pkpdapp.Biomarker`.
    """
    name = models.CharField(max_length=100, help_text='name of the dataset')
    datetime = models.DateTimeField(
        help_text=(
            'Date/time the experiment was conducted. ',
            'All time measurements are relative to this date/time',
        )
    )
    description = models.TextField(
        help_text='short description of the dataset'
    )
    administration_type = models.CharField(
        max_length=10, choices=ADMINISTRATION_TYPE_CHOICES,
        help_text='method of drug administration'
    )

    def get_absolute_url(self):
        return reverse('dataset-detail', kwargs={'pk': self.pk})
