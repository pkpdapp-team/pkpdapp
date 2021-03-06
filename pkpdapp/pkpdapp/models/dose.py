#
# This file is part of PKPDApp (https://github.com/pkpdapp-team/pkpdapp) which
# is released under the BSD 3-clause license. See accompanying LICENSE.md for
# copyright notice and full license details.
#

from django.db import models
from pkpdapp.models import Protocol


class Dose(models.Model):
    """
    A single dose event.
    """
    protocol = models.ForeignKey(
        Protocol, on_delete=models.CASCADE,
        help_text='protocol containing this dose'
    )
    start_time = models.FloatField(
        help_text='starting time point of dose, in hours'
    )
    amount = models.FloatField(
        help_text='amount of compound administered, in grams'
    )
    duration = models.FloatField(
        default=0.0,
        help_text=(
            'Duration of dose administration in hours. '
            'For a bolus injection, set a dose duration of 0.'
        )
    )
