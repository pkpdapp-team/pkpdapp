#
# This file is part of PKPDApp (https://github.com/pkpdapp-team/pkpdapp) which
# is released under the BSD 3-clause license. See accompanying LICENSE.md for
# copyright notice and full license details.
#

from django.db import models
from pkpdapp.models import (
    Variable, DraftInference
)


class Prior(models.Model):
    """
    Model for a generic prior.
    """
    variable = models.ForeignKey(
        Variable,
        related_name='%(class)ss',
        on_delete=models.CASCADE,
    )
    inference = models.ForeignKey(
        DraftInference,
        related_name='%(class)ss',
        on_delete=models.CASCADE,
    )

    class Meta:
        abstract = True


class PriorUniform(Prior):
    """
    Model for a uniform prior.
    """
    lower = models.FloatField(
        help_text='lower bound of the uniform distribution.'
    )
    upper = models.FloatField(
        help_text='upper bound of the uniform distribution.'
    )


class PriorNormal(Prior):
    """
    Model for a normal prior.
    """
    mean = models.FloatField(
        help_text='mean of normal prior distribution.'
    )

    sd = models.FloatField(
        help_text='sd of normal prior distribution.'
    )


class Boundary(Prior):
    """
    Model for a single parameter boundary for use in optimisation.
    """
