#
# This file is part of PKPDApp (https://github.com/pkpdapp-team/pkpdapp) which
# is released under the BSD 3-clause license. See accompanying LICENSE.md for
# copyright notice and full license details.
#

from django.db import models
from pkpdapp.models import Dataset, StandardUnit


class BiomarkerType(models.Model):
    """
    A type of biomarker measurement associated with a particular dataset, for
    example "concentration in mg", or "tumor volume in cm^3".
    """

    name = models.CharField(
        max_length=100, help_text='name of the biomarker type'
    )
    unit = models.ForeignKey(
        StandardUnit, on_delete=models.CASCADE,
        blank=True, null=True,
        help_text='unit for the value stored in :model:`pkpdapp.Biomarker`'
    )
    description = models.TextField(
        help_text='short description of the biomarker type',
        blank=True, null=True
    )
    dataset = models.ForeignKey(
        Dataset, on_delete=models.CASCADE,
        related_name='biomarker_types',
        help_text='dataset containing this biomarker measurement'
    )

    def __str__(self):
        return str(self.name)
