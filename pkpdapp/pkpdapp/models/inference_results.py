#
# This file is part of PKPDApp (https://github.com/pkpdapp-team/pkpdapp) which
# is released under the BSD 3-clause license. See accompanying LICENSE.md for
# copyright notice and full license details.
#

from django.db import models
from pkpdapp.models import Inference, Variable
from django.db.models import Q


class InferenceResults(models.Model):
    """
    Results of an inference process. 
    """
    inference = models.ForeignKey(
        Inference,
        blank=True, null=True,
        on_delete=models.CASCADE,
        help_text='inference protocol'
    )

    class InferenceType(models.TextChoices):
        SAMPLING = 'SA', 'Sampling'
        OPTIMISATION = 'OP', 'Optimisation'

    inference_type = models.CharField(
        max_length=2,
        choices=InferenceType.choices,
        default=InferenceType.OPTIMISATION,
    )

    time_elapsed = models.IntegerField(
        default=0,
        help_text='Elapsed inference time in seconds'
    )

    operations_nb = models.IntegerField(
        default=0,
        help_text='Number of operations to finalize inference'
    )


class InferenceResultsRow(models.Model):
    "A single row in the inference results"

    inference_results = models.ForeignKey(
        InferenceResults,
        blank=True, null=True,
        on_delete=models.CASCADE,
        help_text='inference protocol results'
    )

    chain = models.IntegerField(
        default=1,
        help_text='Chain related to the row'
    )

    iteration = models.IntegerField(
        default=1,
        help_text='Iteration'
    )

    variables = models.ManyToManyField(Variable) #TO DISCUSS, might need a new Variable field
