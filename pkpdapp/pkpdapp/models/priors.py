#
# This file is part of PKPDApp (https://github.com/pkpdapp-team/pkpdapp) which
# is released under the BSD 3-clause license. See accompanying LICENSE.md for
# copyright notice and full license details.
#

from django.db import models
from django.db.models import Q
from polymorphic.models import PolymorphicModel
from pkpdapp.models import (
    Variable, Inference, LogLikelihoodParameter
)


class Prior(PolymorphicModel):
    """
    Model for a generic prior.
    """
    variable = models.ForeignKey(
        Variable,
        related_name='priors',
        blank=True, null=True,
        on_delete=models.CASCADE,
    )
    log_likelihood_parameter = models.ForeignKey(
        LogLikelihoodParameter,
        related_name='priors',
        blank=True, null=True,
        on_delete=models.CASCADE,
    )
    inference = models.ForeignKey(
        Inference,
        related_name='priors',
        on_delete=models.CASCADE,
    )

    class Meta:
        constraints = [
            models.CheckConstraint(
                check=(
                    (Q(variable__isnull=True) &
                     Q(log_likelihood_parameter__isnull=False)) |
                    (Q(variable__isnull=False) &
                     Q(log_likelihood_parameter__isnull=True))
                ),
                name=(
                    '%(class)s: prior must belong to a variable '
                    'or log likelihood parameter'
                )
            )
        ]


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
