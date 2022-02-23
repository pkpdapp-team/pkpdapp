#
# This file is part of PKPDApp (https://github.com/pkpdapp-team/pkpdapp) which
# is released under the BSD 3-clause license. See accompanying LICENSE.md for
# copyright notice and full license details.
#

from django.db import models
from django.db.models import Q
from polymorphic.models import PolymorphicModel
from pkpdapp.models import (
    Variable, Inference, LogLikelihoodParameter, LogLikelihood
)


class Prior(PolymorphicModel):
    """
    Model for a generic prior.
    """
    log_likelihood_parameter = models.OneToOneField(
        LogLikelihoodParameter,
        related_name='prior',
        blank=True, null=True,
        on_delete=models.CASCADE,
    )


    def create_stored_prior(
            self, inference, new_models, new_log_likelihood,
            model, stored_prior_kwargs
    ):

        new_variable = None
        if self.variable is not None:
            old_model = self.variable.get_model()
            new_model = new_models[old_model.id]
            variable_qname = self.variable.qname
            new_variable = new_model.variables.get(
                qname=variable_qname
            )

        new_parameter = None
        if self.log_likelihood_parameter is not None:
            new_parameter = new_log_likelihood.parameters.get(
                name=self.log_likelihood_parameter.name
            )

        stored_prior_kwargs.update({
            'variable': new_variable,
            'log_likelihood': new_log_likelihood,
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
            self, inference, new_models, new_log_likelihood
    ):
        stored_prior_kwargs = {
            'lower': self.lower,
            'upper': self.upper,
        }
        return Prior.create_stored_prior(
            self, inference, new_models, new_log_likelihood,
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
            self, inference, new_models, new_log_likelihood
    ):
        stored_prior_kwargs = {
            'mean': self.mean,
            'sd': self.sd,
        }
        return Prior.create_stored_prior(
            self, inference, new_models, new_log_likelihood,
            PriorNormal, stored_prior_kwargs
        )
