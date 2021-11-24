#
# This file is part of PKPDApp (https://github.com/pkpdapp-team/pkpdapp) which
# is released under the BSD 3-clause license. See accompanying LICENSE.md for
# copyright notice and full license details.
#

from django.db import models
from polymorphic.models import PolymorphicModel
from pkpdapp.models import (
    Variable, BiomarkerType, DraftInference
)



class ObjectiveFunction(PolymorphicModel):
    """
    Abstract model class for objective functions.
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
    biomarker_type = models.ForeignKey(
        BiomarkerType,
        on_delete=models.CASCADE,
    )


class LogLikelihoodNormal(ObjectiveFunction):
    """
    Model for the normal log-likelihood.
    """
    sd = models.FloatField(
        help_text='sd of normal prior distribution.'
    )


class LogLikelihoodLogNormal(ObjectiveFunction):
    """
    Model for the log-normal log-likelihood.
    """
    sigma = models.FloatField(
        help_text='sigma of log-normal prior distribution.'
    )


class SumOfSquaredErrorsScoreFunction(ObjectiveFunction):
    """
    Model for sum of squared errors score function.
    """
