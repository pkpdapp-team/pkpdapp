#
# This file is part of PKPDApp (https://github.com/pkpdapp-team/pkpdapp) which
# is released under the BSD 3-clause license. See accompanying LICENSE.md for
# copyright notice and full license details.
#

from django.db import models
from pkpdapp.models import Compound, Dataset


class Dose(models.Model):
    """
    A single dose event.
    """
    time = models.FloatField(
        help_text='time point of dose, in days'
    )
    subject_id = models.IntegerField(
        help_text='subject id'
    )
    compound = models.ForeignKey(
        Compound, on_delete=models.CASCADE,
        help_text='drug compound'
    )
    dataset = models.ForeignKey(
        Dataset, on_delete=models.CASCADE,
        help_text='dataset containing this biomarker measurement'
    )
    amount = models.FloatField(
        help_text='amount of compound administered, in XXX'
    )
