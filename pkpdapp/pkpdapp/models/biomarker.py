#
# This file is part of PKPDApp (https://github.com/pkpdapp-team/pkpdapp) which
# is released under the BSD 3-clause license. See accompanying LICENSE.md for
# copyright notice and full license details.
#

from django.db import models
from pkpdapp.models import BiomarkerType, Subject


class Biomarker(models.Model):
    """
    A single biomarker measurement value stored in a :model:`pkpdapp.Dataset`.
    Each biomarker is assigned a type stored in :model:`pkpdapp.BiomarkerType`.

    For observations, there will be multiple biomarker measurements for each
    subject at each measurement time.

    For covariates, there will be only a single biomarker measurement for each
    subject. The time point is arbitrary as the value is piecewise constant
    over time

    For regressors, there will be multiple biomarker measurements for each
    subject. For time values between measurements the predicted effect is
    piecewise constant over time.

    Note for categorical covariates the :model:`pkpdapp.CategoricalBiomarker`
    is used instead.
    """
    time = models.FloatField(
        help_text='time point of measurement, in hours.'
    )
    subject = models.ForeignKey(
        Subject, on_delete=models.CASCADE,
        related_name='biomarkers',
        help_text='subject associated with this biomarker'
    )
    biomarker_type = models.ForeignKey(
        BiomarkerType, on_delete=models.CASCADE,
        related_name='biomarkers',
        help_text='biomarker type, for example "concentration in mg"'
    )
    value = models.FloatField(help_text='value of the measurement')

    def get_project(self):
        return self.biomarker_type.get_project()
