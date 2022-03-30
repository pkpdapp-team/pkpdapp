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


class LogLikelihood(models.Model):
    """
    model class for log_likelihood functions.
    """

    inference = models.ForeignKey(
        Inference,
        related_name='log_likelihood',
        blank=True, null=True,
        on_delete=models.CASCADE,
        help_text=(
            'Log_likelihood belongs to this inference object. '
        )
    )

    name = models.CharField(
        max_length=100,
    )

    value = models.FloatField(
        help_text='set if a fixed value is required',
        blank=True, null=True,
    )

    children = models.ManyToManyField(
        'LogLikelihood',
        related_name='parents',
        symmetrical=False,
        blank=True, null=True,
        on_delete=models.CASCADE,
    )

    index = models.IntegerField(
        blank=True, null=True,
        help_text=(
            'parameter index for distribution parameters. '
            'null if variable is not null'
        )
    )

    variable = models.ForeignKey(
        Variable,
        related_name='log_likelihoods',
        blank=True, null=True,
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
        UNIFORM = 'U', 'Uniform'
        LOGNORMAL = 'LN', 'Log-Normal'
        FIXED = 'F', 'Fixed'

    form = models.CharField(
        max_length=2,
        choices=Form.choices,
        default=Form.FIXED,
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

    def is_a_prior(self):
        """
        False for fixed parameters, and log_likelihoods on
        non-constant model parameters
        """
        if self.form is self.Form.Fixed:
            return False
        if (
            self.variable is not None and
            not self.variable.constant
        ):
            return False

        return True

    def get_model(self):
        """
        if this is a log_likelihood that includes a mechanistic model
        this model is returned, else None
        """
        if self.variable is None:
            return None
        if self.variable.constant:
            return None
        return self.variable.get_model()

    def get_model_variables(self):
        """
        if this is a log_likelihood that includes a mechanistic model
        return a list of model parameters, else return []
        """
        model = self.get_model()
        if model is None:
            return []
        else:
            return model.variables.filter(
                Q(constant=True) | Q(state=True)
            ).exclude(name="time")

    def is_on_variable(self):
        return self.variable is not None

    def save(self, force_insert=False, force_update=False, *args, **kwargs):

        super().save(force_insert, force_update, *args, **kwargs)

        # update children
        old_children = self.children.all()
        new_children = []

        # model parameteers
        for model_variable in self.get_model_variables():
            index = None
            for i, p in enumerate(old_children):
                if (
                    p.is_on_variable() and
                    p.variable.id == model_variable.id
                ):
                    index = i
            if index is None:
                new_children.append(
                    LogLikelihood.objects.create(
                        name=model_variable.qname,
                        value=model_variable.get_default_value(),
                        form=self.Form.FIXED,
                        variable=model_variable,
                    )
                )
            else:
                new_children.append(old_children[index])

        # distribution parameters
        if self.form == self.Form.NORMAL:
            name = (
                "standard deviation for " +
                self.variable.name
            )
            index = None
            for i, p in enumerate(old_children):
                if (
                    not p.is_on_variable() and
                    p.index == 0
                ):
                    index = i
            if index is None:
                new_children.append(
                    LogLikelihood.objects.create(
                        name=name,
                        value=self.variable.get_default_value(),
                        index=0,
                        self.Form.FIXED,
                    )
                )
            else:
                new_children.append(old_children[index])
        elif self.form == self.Form.LOGNORMAL:
            name = (
                "noise sigma for " +
                self.variable.name
            )
            index = None
            for i, p in enumerate(old_children):
                if (
                    not p.is_on_variable() and
                    p.index == 0
                ):
                    index = i
            if index is None:
                new_children.append(
                    LogLikelihood.objects.create(
                        name=name,
                        value=match.variable.get_default_value(),
                        index=0,
                        self.Form.FIXED,
                    )
                )
            else:
                new_children.append(old_children[index])

            self.children.set(new_children)

    def create_stored_log_likelihood(self, inference, new_models):
        """
        create stored log_likelihood, ignoring children for now
        """
        old_children = self.children.all()
        for child in old_children:
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
            'inference': inference,
            'name': self.name,
            'value': self.value,
            'index': self.index,
            'variable': new_variable,
            'biomarker_type': self.biomarker_type,
            'subject_group': self.subject_group,
            'form': self.form,
        }

        # this will create default children
        stored_log_likelihood = LogLikelihood.objects.create(
            **stored_log_likelihood_kwargs
        )

        return stored_log_likelihood
