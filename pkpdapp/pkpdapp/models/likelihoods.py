#
# This file is part of PKPDApp (https://github.com/pkpdapp-team/pkpdapp) which
# is released under the BSD 3-clause license. See accompanying LICENSE.md for
# copyright notice and full license details.
#

from django.db import models
from django.db.models import Q
from pkpdapp.models import (
    Variable, BiomarkerType, Inference,
    PharmacodynamicModel,
    DosedPharmacokineticModel,
    PkpdModel,
    StoredModel,
    MyokitForwardModel,
)


class LogLikelihoodParameter(models.Model):
    """
    LogLikelihoods for ODE models have many parameters
    which are encoded as a `pkpdapp.Variable`. This models
    parameters of the log_likelihood itself
    """

    name = models.CharField(
        max_length=100,
    )

    value = models.FloatField(
        help_text='set if a fixed value for the parameter is required',
        blank=True, null=True,
    )

    log_likelihood = models.ForeignKey(
        'LogLikelihood',
        related_name='parameters',
        on_delete=models.CASCADE,
    )

    variable = models.ForeignKey(
        Variable,
        related_name='log_likelihood_parameter',
        on_delete=models.CASCADE,
        blank=True, null=True,
        help_text='this parameter corresponds to this model variable.'
    )

    class Meta:
        unique_together = (('name', 'log_likelihood'),)

    def is_fixed(self):
        return not hasattr(self, 'prior')

    def is_model_variable(self):
        return self.variable is not None


class LogLikelihood(models.Model):
    """
    model class for log_likelihood functions.
    """
    variable = models.ForeignKey(
        Variable,
        related_name='log_likelihoods',
        on_delete=models.CASCADE,
        help_text='variable for the log_likelihood.'
    )

    inference = models.ForeignKey(
        Inference,
        related_name='log_likelihoods',
        on_delete=models.CASCADE,
        help_text=(
            'Log_likelihood belongs to this inference object. '
        )
    )

    biomarker_type = models.ForeignKey(
        BiomarkerType,
        on_delete=models.CASCADE,
    )

    class Form(models.TextChoices):
        NORMAL = 'N', 'Normal'
        LOGNORMAL = 'LN', 'Log-Normal'

    form = models.CharField(
        max_length=2,
        choices=Form.choices,
        default=Form.NORMAL,
    )

    def create_pints_forward_model(self, fitted_parameter_names, outputs=None):
        """
        create pints forwards model for this log_likelihood.

        Parameters
        ----------
        outputs: [Variable] (optional)
            list of outputs that the forward model will produce
            if None then the output of the log_likelihood will be used
        fitted_parameter_names: [str]
            list of parameters that are input to the pints forwards model
        """

        model = self.variable.get_model()
        myokit_model = model.get_myokit_model()
        myokit_simulator = model.get_myokit_simulator()

        if outputs is None:
            outputs = [self.variable]
        output_names = [output.qname for output in outputs]

        fixed_parameters_dict = {
            param.variable.qname: param.value
            for param in self.parameters.all()
            if param.is_model_variable() and param.is_fixed()
        }

        return MyokitForwardModel(myokit_simulator, myokit_model,
                                  output_names,
                                  fixed_parameters_dict)

    def get_model(self):
        return self.variable.get_model()

    def get_priors(self):
        return [
            param.prior
            for param in self.parameters.all()
            if not param.is_fixed()
        ]

    def save(self, force_insert=False, force_update=False, *args, **kwargs):
        created = not self.pk

        super().save(force_insert, force_update, *args, **kwargs)

        # if created then add the necessary parameters
        if created:
            if self.form == self.Form.NORMAL:
                parameters = [
                    LogLikelihoodParameter.objects.create(
                        name="standard deviation",
                        log_likelihood=self,
                        value=self.variable.get_default_value(),
                    )
                ]
            elif self.form == self.Form.LOGNORMAL:
                parameters = [
                    LogLikelihoodParameter.objects.create(
                        name="sigma",
                        log_likelihood=self,
                        value=self.variable.get_default_value(),
                    )
                ]
            for model_variable in self.variable.get_model(
            ).variables.filter(
                Q(constant=True) | Q(state=True)
            ).exclude(name="time"):
                parameters.append(
                    LogLikelihoodParameter.objects.create(
                        name=model_variable.qname,
                        value=model_variable.get_default_value(),
                        log_likelihood=self,
                        variable=model_variable,
                    )
                )
            self.parameters.set(parameters)

    def create_stored_log_likelihood(self, inference, new_models):
        old_parameters = self.parameters.all()
        for parameter in old_parameters:
            if (
                parameter.is_fixed() and
                parameter.value is None
            ):
                raise RuntimeError(
                    'All LogLikelihood parameters must have a '
                    'set value or a prior'
                )

        old_model = self.variable.get_model()
        new_model = new_models[old_model.id]
        variable_qname = self.variable.qname

        new_variable = new_model.variables.get(
            qname=variable_qname
        )

        stored_log_likelihood_kwargs = {
            'variable': new_variable,
            'inference': inference,
            'biomarker_type': self.biomarker_type,
            'form': self.form,
        }

        # this will create parameters
        stored_log_likelihood = LogLikelihood.objects.create(
            **stored_log_likelihood_kwargs
        )

        # now we copy over the parameter values
        # and the priors
        for parameter in old_parameters:
            new_parameter = stored_log_likelihood.parameters.get(
                name=parameter.name
            )
            new_prior = None
            if not parameter.is_fixed():
                new_prior = parameter.prior.create_stored_prior(
                    stored_log_likelihood
                )
            new_parameter.value = parameter.value
            new_parameter.prior = new_prior
            new_parameter.save()

        return stored_log_likelihood
