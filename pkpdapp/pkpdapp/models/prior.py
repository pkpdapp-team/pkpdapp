#
# This file is part of PKPDApp (https://github.com/pkpdapp-team/pkpdapp) which
# is released under the BSD 3-clause license. See accompanying LICENSE.md for
# copyright notice and full license details.
#

from pkpdapp.pkpdapp.models import variable
from django.db import models
from pkpdapp.models import Variable
from django.db.models import Q


class Prior(models.Model):
    """
    Variable prior in inference
    """

    variable = models.ForeignKey(
        Variable,
        blank=True, null=True,
        on_delete=models.CASCADE,
        help_text='variable linked'
    )

    class PriorType(models.TextChoices):
        UNIFORM = 'UN', 'Uniform'
        EXPONENTIAL = 'EX', 'Exponential'

    prior_type = models.CharField(
        max_length=2,
        choices=PriorType.choices,
        default=PriorType.UNIFORM,
    )

class PriorParameter(models.Model):    
    """
    Parameter of the prior
    """

    prior = models.ForeignKey(
        Prior,
        blank=True, null=True,
        on_delete=models.CASCADE,
        help_text='prior defined by this parameter'
    )

    parameter_type = models.TextField(
        help_text='kind of parameter',
        blank=True, default=''
    )

    value = models.FloatField(
        default=1,
        help_text='value of this parameter'
    )