#
# This file is part of PKPDApp (https://github.com/pkpdapp-team/pkpdapp) which
# is released under the BSD 3-clause license. See accompanying LICENSE.md for
# copyright notice and full license details.
#

from django.db import models
from pkpdapp.models import BiomarkerType, Subject


class CategoricalBiomarker(models.Model):
    """
    A single categorical biomarker state stored in a :model:`pkpdapp.Dataset`.
    Each biomarker is assigned a type stored in :model:`pkpdapp.BiomarkerType`.

    For categorical covariates, there will be only a single biomarker state for each
    subject. The time point is arbitrary as the value is piecewise constant over time
    
    For categorical regressors, there will be multiple biomarker state for each
    subject. For time values between measurements the state is 
    piecewise constant over time.
    
    Note for continuous covariates the :model:`pkpdapp.Biomarker`
    is used instead.
    """
    time = models.FloatField(
        help_text='time point of measurement, in hours.'
    )
    subject = models.ForeignKey(
        Subject, on_delete=models.CASCADE,
        related_name='categorical_biomarkers',
        help_text='subject associated with this biomarker'
    )
    biomarker_type = models.ForeignKey(
        BiomarkerType, on_delete=models.CASCADE,
        related_name='categorical_biomarkers',
        help_text='biomarker type, for example "weight in kg"'
    )
    value = models.CharField(
        max_length=100,
        help_text='category name'
    )

    def get_project(self):
        return self.biomarker_type.get_project()
