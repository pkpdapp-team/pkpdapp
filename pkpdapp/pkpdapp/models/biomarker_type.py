#
# This file is part of PKPDApp (https://github.com/pkpdapp-team/pkpdapp) which
# is released under the BSD 3-clause license. See accompanying LICENSE.md for
# copyright notice and full license details.
#

from django.db import models
from django.db.models import OuterRef, Subquery
from pkpdapp.models import Unit
import pandas as pd


class BiomarkerType(models.Model):
    """
    A type of biomarker measurement associated with a particular dataset, for
    example "concentration in mg", or "tumor volume in cm^3".
    """

    name = models.CharField(
        max_length=100, help_text='name of the biomarker type'
    )
    stored_unit = models.ForeignKey(
        Unit, on_delete=models.PROTECT,
        related_name='biomarker_types_stored',
        help_text='unit for the value stored in :model:`pkpdapp.Biomarker`'
    )
    description = models.TextField(
        help_text='short description of the biomarker type',
        blank=True, null=True
    )
    dataset = models.ForeignKey(
        'Dataset', on_delete=models.CASCADE,
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
    display_unit = models.ForeignKey(
        Unit, on_delete=models.PROTECT,
        related_name='biomarker_types_display',
        help_text='unit to use when sending or displaying biomarker values'
    )
    stored_time_unit = models.ForeignKey(
        Unit, on_delete=models.PROTECT,
        related_name='biomarker_types_time_stored',
        help_text=(
            'unit for the time values stored in '
            ':model:`pkpdapp.Biomarker`'
        )
    )
    display_time_unit = models.ForeignKey(
        Unit, on_delete=models.PROTECT,
        related_name='biomarker_types_time_display',
        help_text='unit to use when sending or displaying time values'
    )
    color = models.IntegerField(
        default=0,
        help_text=(
            'Color index associated with this biomarker type. '
            'For plotting purposes in the frontend'
        )
    )
    axis = models.BooleanField(
        default=False,
        help_text=(
            'True/False if biomarker type displayed on LHS/RHS axis'
        )
    )

    def get_project(self):
        return self.dataset.get_project()

    def is_categorical(self):
        return self.categorical_biomarkers.exists()

    def is_continuous(self):
        return self.biomarkers.exists()

    def data(self, first_time_only=False):
        """
        if first_time_only then ordered by subject
        if not first_time_only then ordered by time
        """
        is_continuous = self.is_continuous()
        is_categorical = self.is_categorical()
        if is_continuous:
            biomarkers = self.biomarkers
        elif is_categorical:
            biomarkers = self.categorical_biomarkers
        else:
            return pd.DataFrame.from_dict({
                'times': [],
                'subjects': [],
                'values': [],
            })
        if first_time_only:
            earliest = biomarkers.filter(
                subject=OuterRef('subject')).order_by('time')
            times_subjects_values = biomarkers.filter(
                time=Subquery(earliest.values('time')[:1])
            ).order_by('subject').values_list(
                'time', 'subject__id', 'value'
            )
        else:
            times_subjects_values = biomarkers.order_by(
                'time'
            ).values_list(
                'time', 'subject__id', 'value'
            )

        if not times_subjects_values:
            return None

        times, subjects, values = list(zip(*times_subjects_values))
        df = pd.DataFrame.from_dict({
            'times': times,
            'subjects': subjects,
            'values': values,
        })

        time_conversion_factor = self.stored_time_unit.convert_to(
            self.display_time_unit
        )
        df['times'] *= time_conversion_factor

        if is_continuous:
            conversion_factor = self.stored_unit.convert_to(
                self.display_unit
            )
            df['values'] *= conversion_factor

        return df

    def __str__(self):
        return str(self.name)
