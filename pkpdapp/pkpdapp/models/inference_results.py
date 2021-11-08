#
# This file is part of PKPDApp (https://github.com/pkpdapp-team/pkpdapp) which
# is released under the BSD 3-clause license. See accompanying LICENSE.md for
# copyright notice and full license details.
#

from django.db import models
from django.db.models import Q
from pkpdapp.models import (
    Inference
)


class InferenceChain(models.Model):
    inference = models.ForeignKey(
        Inference,
        on_delete=models.CASCADE,
        related_name='chains',
        help_text='uniform prior'
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

    def as_list(self):
        return \
            self.inference_results.order_by('iteration').values_list(
                'value', flat=True
            )


class InferenceResult(models.Model):
    """
    Abstract class for inference results.
    """
    chain = models.ForeignKey(
        InferenceChain,
        on_delete=models.CASCADE,
        related_name='inference_results',
        help_text='Chain related to the row'
    )
    iteration = models.IntegerField(
        help_text='Iteration'
    )
    value = models.FloatField(
        help_text='estimated parameter value'
    )
