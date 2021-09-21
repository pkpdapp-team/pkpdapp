#
# This file is part of PKPDApp (https://github.com/pkpdapp-team/pkpdapp) which
# is released under the BSD 3-clause license. See accompanying LICENSE.md for
# copyright notice and full license details.
#

from django.db import models
from django.db.models import Q
from pkpdapp.models import (
    Variable, Dataset,PharmacodynamicModel,
    PharmacokineticModel,DosedPharmacokineticModel)


class Inference(models.Model):
    """
    An inference process.
    """
    description = models.TextField(
        help_text='short description of what this inference does',
        blank=True, default=''
    )

    score_function = models.CharField(
        max_length=40,
        blank=True, null=True,
        help_text='score function')

    log_likelihood = models.CharField(
        max_length=40, 
        blank=True, null=True,
        help_text='log likelihood type')

    class InferenceType(models.TextChoices):
        SAMPLING = 'SA', 'Sampling'
        OPTIMISATION = 'OP', 'Optimisation'

    inference_type = models.CharField(
        max_length=2,
        choices=InferenceType.choices,
        default=InferenceType.OPTIMISATION,
    )

    algorithm = models.CharField(max_length=40, help_text='algorithm to use for inference')

    variables = models.ManyToManyField(Variable)

    dataset = models.ForeignKey(
        Dataset,
        blank=True, null=True,
        on_delete=models.CASCADE,
        help_text='Dataset to fit the model on'
    )
    
    pd_model = models.ForeignKey(
        PharmacodynamicModel,
        blank=True, null=True,
        on_delete=models.CASCADE,
        help_text='pharmacodynamic model'
    )
    pk_model = models.ForeignKey(
        PharmacokineticModel,
        blank=True, null=True,
        on_delete=models.CASCADE,
        help_text='pharmacokinetic model'
    )
    dosed_pk_model = models.ForeignKey(
        DosedPharmacokineticModel,
        blank=True, null=True,
        on_delete=models.CASCADE,
        help_text='dosed pharmacokinetic model'
    )

    class Meta:
        constraints = [
            models.CheckConstraint(
                check=(
                    (Q(log_likelihood__isnull=True) &
                     Q(score_function__isnull=False)) |
                    (Q(log_likelihood__isnull=False) &
                     Q(score_function__isnull=True))
                ),
                name='inference must have to a log-likelihood or a score function'
            ),
        ]
