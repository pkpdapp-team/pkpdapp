#
# This file is part of PKPDApp (https://github.com/pkpdapp-team/pkpdapp) which
# is released under the BSD 3-clause license. See accompanying LICENSE.md for
# copyright notice and full license details.
#

from django.db import models
from pkpdapp.models import BiomarkerType


class Biomarker(models.Model):
    """
    A single biomarker measurement value stored in a :model:`pkpdapp.Dataset`.
    Each biomarker is assigned a type stored in :model:`pkpdapp.BiomarkerType`.
    """
    time = models.FloatField(
        help_text='time point of measurement, in days'
    )
    subject_id = models.IntegerField(
        help_text='subject id for biomarker measurement'
    )
    value = models.FloatField(help_text='value of the measurement')
    biomarker_type = models.ForeignKey(
        BiomarkerType, on_delete=models.CASCADE,
        help_text='biomarker type, for example "concentration in mg"'
    )
