#
# This file is part of PKPDApp (https://github.com/pkpdapp-team/pkpdapp) which
# is released under the BSD 3-clause license. See accompanying LICENSE.md for
# copyright notice and full license details.
#

from django.db import models
from django.db.models import Q
import numpy as np
import scipy.stats as sps
from pkpdapp.models import (
    Variable, BiomarkerType, Inference,
    MyokitForwardModel, SubjectGroup
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
        help_text='this parameter corresponds to this model input variable.'
    )

    output = models.ForeignKey(
        'VariableBiomarkerMatch',
        related_name='log_likelihood_parameter',
        on_delete=models.CASCADE,
        blank=True, null=True,
        help_text='this parameter corresponds to this output model variable.'
    )

    class Meta:
        unique_together = (('name', 'log_likelihood'),)
        models.CheckConstraint(
            check=(
                (Q(variable__isnull=True) &
                 Q(output__isnull=False)) |
                (Q(variable__isnull=False) &
                 Q(output__isnull=True))
            ),
            name='%(class)s: parameter must belong to input or output variable'
        )

    def is_fixed(self):
        return not hasattr(self, 'prior')

    def is_model_variable(self):
        return self.variable is not None


class VariableBiomarkerMatch(models.Model):
    log_likelihood = models.ForeignKey(
        'LogLikelihood',
        related_name='variable_biomarker_matches',
        on_delete=models.CASCADE,
    )
    variable = models.ForeignKey(
        Variable,
        related_name='log_likelihoods',
        on_delete=models.CASCADE,
        help_text='variable for the log_likelihood.'
    )
    biomarker_type = models.ForeignKey(
        BiomarkerType,
        on_delete=models.CASCADE,
        blank=True, null=True,
        help_text=(
            'biomarker_type for measurements. '
            'if blank then simulated data is used, '
            'with non-fixed parameters sampled at the start of inference'
        )
    )
    subject_group = models.ForeignKey(
        SubjectGroup,
        on_delete=models.CASCADE,
        blank=True, null=True,
        help_text=(
            'filter data on this subject group '
            '(null implies all subjects)'
        )
    )

    class Form(models.TextChoices):
        NORMAL = 'N', 'Normal'
        LOGNORMAL = 'LN', 'Log-Normal'

    form = models.CharField(
        max_length=2,
        choices=Form.choices,
        default=Form.NORMAL,
    )

    def add_noise(self, output_values, noise_params):
        """
        add noise to the simulated data according to the log_likelihood
        """
        if self.form == self.Form.NORMAL:
            output_values += np.random.normal(
                scale=noise_params[0],
                size=output_values.shape
            )
        elif self.form == self.Form.LOGNORMAL:
            output_values += (
                np.random.lognormal(
                    scale=noise_params[0],
                    size=output_values.shape
                )
            )
        return output_values

    def noise_range(self, output_values, noise_params):
        """
        return 10% and 90% noise levels from a set of output values
        """
        output_values_min = np.copy(output_values)
        output_values_max = np.copy(output_values)
        if self.form == self.Form.NORMAL:
            for i in range(len(output_values)):
                dist = sps.norm(loc=output_values[i], scale=noise_params[0])
                output_values_min[i] = dist.ppf(.1)
                output_values_max[i] = dist.ppf(.9)
        elif self.form == self.Form.LOGNORMAL:
            for i in range(len(output_values)):
                dist = sps.lognorm(loc=output_values[i], scale=noise_params[0])
                output_values_min[i] = dist.ppf(.1)
                output_values_max[i] = dist.ppf(.9)

        return output_values_min, output_values_max

    def create_stored_variable_biomarker_match(
            self, log_likelihood, new_models
    ):
        old_model = self.variable.get_model()
        new_model = new_models[old_model.id]
        variable_qname = self.variable.qname

        new_variable = new_model.variables.get(
            qname=variable_qname
        )
        stored_match_kwargs = {
            'log_likelihood': log_likelihood,
            'variable': new_variable,
            'biomarker_type': self.biomarker_type,
            'subject_group': self.subject_group,
        }
        stored_match = VariableBiomarkerMatch.objects.create(
            **stored_match_kwargs
        )
        return stored_match


class LogLikelihood(models.Model):
    """
    model class for log_likelihood functions.
    """

    inference = models.OneToOneField(
        Inference,
        related_name='log_likelihood',
        on_delete=models.CASCADE,
        blank=True, null=True,
        help_text=(
            'Log_likelihood belongs to this inference object. '
        )
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

        model = self.get_model()
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
        first_match = self.variable_biomarker_matches.first()
        if first_match is None:
            return None
        else:
            return first_match.variable.get_model()

    def get_model_variables(self):
        model = self.get_model()
        if model is None:
            return []
        else:
            return model.variables.filter(
                Q(constant=True) | Q(state=True)
            ).exclude(name="time")

    def get_priors(self):
        return [
            param.prior
            for param in self.parameters.all()
            if not param.is_fixed()
        ]

    def save(self, force_insert=False, force_update=False, *args, **kwargs):

        super().save(force_insert, force_update, *args, **kwargs)

        # update parameters
        old_parameters = self.parameters.all()
        new_parameters = []

        # model parameteers
        for model_variable in self.get_model_variables():
            index = None
            for i, p in enumerate(old_parameters):
                if (
                    p.is_model_variable() and
                    p.variable.id == model_variable.id
                ):
                    index = i
            if index is None:
                new_parameters.append(
                    LogLikelihoodParameter.objects.create(
                        name=model_variable.qname,
                        value=model_variable.get_default_value(),
                        log_likelihood=self,
                        variable=model_variable,
                    )
                )
            else:
                new_parameters.append(old_parameters[index])

        # noise parameters
        for match in self.variable_biomarker_matches.all():
            index = None
            for i, p in enumerate(old_parameters):
                if (
                    not p.is_model_variable() and
                    p.output.id == match.id
                ):
                    index = i

            if index is None:
                if match.form == match.Form.NORMAL:
                    name = (
                        "noise standard deviation for " +
                        match.variable.name
                    )
                    new_parameters.append(
                        LogLikelihoodParameter.objects.create(
                            name=name,
                            log_likelihood=self,
                            output=match,
                            value=match.variable.get_default_value(),
                        )
                    )
                elif self.form == self.Form.LOGNORMAL:
                    name = (
                        "noise sigma for " +
                        match.variable.name
                    )
                    new_parameters.append(
                        LogLikelihoodParameter.objects.create(
                            name=name,
                            log_likelihood=self,
                            output=match,
                            value=match.variable.get_default_value(),
                        )
                    )
            else:
                new_parameters.append(old_parameters[index])

            self.parameters.set(new_parameters)

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

        stored_log_likelihood_kwargs = {
            'inference': inference,
            'form': self.form,
        }

        # this will create parameters
        stored_log_likelihood = LogLikelihood.objects.create(
            **stored_log_likelihood_kwargs
        )

        # now re-create matches
        for match in self.variable_biomarker_matches.all():
            match.create_stored_variable_biomarker_match(
                stored_log_likelihood, new_models
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
