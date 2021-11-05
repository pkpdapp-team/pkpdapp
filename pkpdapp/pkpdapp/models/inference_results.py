#
# This file is part of PKPDApp (https://github.com/pkpdapp-team/pkpdapp) which
# is released under the BSD 3-clause license. See accompanying LICENSE.md for
# copyright notice and full license details.
#

from django.db import models
from django.db.models import Q
from pkpdapp.models import (
    PriorUniform, PriorNormal, Boundary
)


class InferenceChain(models.Model):
    prior_uniform = models.OneToOneField(
        PriorUniform,
        blank=True, null=True,
        on_delete=models.CASCADE,
        help_text='uniform prior'
    )
    prior_normal = models.OneToOneField(
        PriorNormal,
        blank=True, null=True,
        on_delete=models.CASCADE,
        help_text='normal prior'
    )
    boundary = models.OneToOneField(
        Boundary,
        blank=True, null=True,
        on_delete=models.CASCADE,
        help_text='parameter boundary'
    )


class InferenceResult(models.Model):
    """
    Abstract class for inference results.
    """
    chain = models.ForeignKey(
        InferenceChain,
        on_delete=models.CASCADE,
        help_text='Chain related to the row'
    )
    iteration = models.IntegerField(
        help_text='Iteration'
    )
    value = models.FloatField(
        help_text='estimated parameter value'
    )
