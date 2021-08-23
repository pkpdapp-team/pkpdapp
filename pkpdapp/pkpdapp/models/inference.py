#
# This file is part of PKPDApp (https://github.com/pkpdapp-team/pkpdapp) which
# is released under the BSD 3-clause license. See accompanying LICENSE.md for
# copyright notice and full license details.
#

from django.db import models
from django.db.models import Q


class Inference(models.Model):
    """
    An inference process.
    """

    log_likelihood = models.CharField(max_length=40, help_text='log likelihood type')

    class InferenceType(models.TextChoices):
        SAMPLING = 'SA', 'Sampling'
        OPTIMISATION = 'OP', 'Optimisation'

    inference_type = models.CharField(
        max_length=2,
        choices=InferenceType.choices,
        default=InferenceType.OPTIMISATION,
    )

    algorithm = models.CharField(max_length=40, help_text='algorithm to use for inference')