#
# This file is part of PKPDApp (https://github.com/pkpdapp-team/pkpdapp) which
# is released under the BSD 3-clause license. See accompanying LICENSE.md for
# copyright notice and full license details.
#

from django.db import models
from pkpdapp.models import Inference
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

    