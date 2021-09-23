#
# This file is part of PKPDApp (https://github.com/pkpdapp-team/pkpdapp) which
# is released under the BSD 3-clause license. See accompanying LICENSE.md for
# copyright notice and full license details.
#

from django.db import models
from pkpdapp.models import Dataset, Unit
import pandas as pd

class BiomarkerType(models.Model):
    """
    A type of biomarker measurement associated with a particular dataset, for
    example "concentration in mg", or "tumor volume in cm^3".
    """

    name = models.CharField(
        max_length=100, help_text='name of the biomarker type'
    )
    unit = models.ForeignKey(
        Unit, on_delete=models.CASCADE,
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
    display = models.BooleanField(
        default=True,
        help_text=(
            'True if this biomarker type will be displayed in the '
            'frontend, False otherwise'
        )
    )
    color = models.IntegerField(
        default=0,
        help_text=(
            'Color index associated with this biomarker type. '
            'For plotting purposes in the frontend'
        )
    )
    __original_unit= None

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.__original_unit = self.unit

    def as_pandas(self):
        times_subjects_values = \
            self.biomarkers.order_by('time').values_list(
                'time', 'subject__id', 'value'
            )
        times, subjects, values = list(zip(*times_subjects_values))
        return pd.DataFrame.from_dict({
            'times': times,
            'subjects': subjects,
            'values': values,
        })

    def __str__(self):
        return str(self.name)

    def save(self, force_insert=False, force_update=False, *args, **kwargs):
        created = not self.pk

        super().save(force_insert, force_update, *args, **kwargs)

        if not created and self.unit != self.__original_unit:
            conversion_factor = \
                self.__original_unit.convert_to(self.unit)

            for biomarker in self.biomarkers.all():
                biomarker.value *= conversion_factor

        self.__original_unit = self.unit

