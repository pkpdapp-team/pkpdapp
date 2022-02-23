#
# This file is part of PKPDApp (https://github.com/pkpdapp-team/pkpdapp) which
# is released under the BSD 3-clause license. See accompanying LICENSE.md for
# copyright notice and full license details.
#

from django.db import models
from django.db.models import Q
from polymorphic.models import PolymorphicModel
from pkpdapp.models import (
    Variable, LogLikelihoodParameter, LogLikelihood
)


class Prior(PolymorphicModel):
    """
    Model for a generic prior.
    """
    log_likelihood_parameter = models.OneToOneField(
        LogLikelihoodParameter,
        related_name='prior',
        on_delete=models.CASCADE,
    )

    def is_match(self, variable_qname):
        """
        returns True if priors is on the model variable provided
        """
        if self.is_model_variable_prior():
            return (
                variable_qname ==
                self.log_likelihood_parameter.variable.qname
            )

        return False

    def is_model_variable_prior(self):
        return self.log_likelihood_parameter.variable is not None

    def create_stored_prior(
            self, new_log_likelihood,
            model, stored_prior_kwargs
    ):

        new_parameter = new_log_likelihood.parameters.get(
            name=self.log_likelihood_parameter.name
        )

        stored_prior_kwargs.update({
            'log_likelihood_parameter': new_parameter,
        })

        stored_prior = model.objects.create(
            **stored_prior_kwargs
        )

        return stored_prior


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

    def create_stored_prior(
            self, new_log_likelihood
    ):
        stored_prior_kwargs = {
            'lower': self.lower,
            'upper': self.upper,
        }
        return Prior.create_stored_prior(
            self, new_log_likelihood,
            PriorUniform, stored_prior_kwargs
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

    def create_stored_prior(
            self, new_log_likelihood
    ):
        stored_prior_kwargs = {
            'mean': self.mean,
            'sd': self.sd,
        }
        return Prior.create_stored_prior(
            self, new_log_likelihood,
            PriorNormal, stored_prior_kwargs
        )
