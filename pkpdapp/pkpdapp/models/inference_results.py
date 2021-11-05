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
    prior_uniform = models.ForeignKey(
        PriorUniform,
        blank=True, null=True,
        on_delete=models.CASCADE,
        help_text='uniform prior'
    )
    prior_normal = models.ForeignKey(
        PriorNormal,
        blank=True, null=True,
        on_delete=models.CASCADE,
        help_text='normal prior'
    )
    boundary = models.ForeignKey(
        Boundary,
        blank=True, null=True,
        on_delete=models.CASCADE,
        help_text='parameter boundary'
    )

    class Meta:
        constraints = [
            models.CheckConstraint(
                check=(
                    (Q(prior_uniform__isnull=True) &
                     Q(prior_uniform__isnull=True) &
                     Q(boundary__isnull=False)) |
                    (Q(prior_uniform__isnull=True) &
                     Q(prior_uniform__isnull=False) &
                     Q(boundary__isnull=True)) |
                    (Q(prior_uniform__isnull=False) &
                     Q(prior_uniform__isnull=True) &
                     Q(boundary__isnull=True))
                ),
                name='inference chain must belong to a prior'
            ),
        ]


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
