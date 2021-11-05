#
# This file is part of PKPDApp (https://github.com/pkpdapp-team/pkpdapp) which
# is released under the BSD 3-clause license. See accompanying LICENSE.md for
# copyright notice and full license details.
#

from django.db import models
from django.db.models import Q
from pkpdapp.models import (
    StoredVariable, BiomarkerType
)

class ObjectiveFunction(models.Model):
    """
    Abstract model class for objective functions.
    """
    variable = models.OneToOneField(
        StoredVariable,
        on_delete=models.CASCADE,
        primary_key=True,
    )
    biomarker_type = models.OneToOneField(
        BiomarkerType,
        on_delete=models.CASCADE,
    )

    class Meta:
        abstract = True


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
