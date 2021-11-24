#
# This file is part of PKPDApp (https://github.com/pkpdapp-team/pkpdapp) which
# is released under the BSD 3-clause license. See accompanying LICENSE.md for
# copyright notice and full license details.
#

from django.db import models
from pkpdapp.models import (
    Project, PharmacodynamicModel,
    DosedPharmacokineticModel,
    PkpdModel, Inference,
    Prior, StoredModel,
)


class InferenceChain(models.Model):
    inference = models.ForeignKey(
        Inference,
        on_delete=models.CASCADE,
        related_name='chains',
        help_text='inference for this chain'
    )

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
    prior = models.ForeignKey(
        Prior,
        on_delete=models.CASCADE,
        related_name='inference_results',
        help_text='prior/variable for this value'
    )

    iteration = models.IntegerField(
        help_text='Iteration'
    )
    value = models.FloatField(
        help_text='estimated parameter value'
    )
