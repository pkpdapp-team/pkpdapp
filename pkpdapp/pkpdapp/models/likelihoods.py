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

    def is_on_variable(self):
        return self.variable is not None

    def sample(self):
        if self.form == self.Form.FIXED:
            return self.value

        noise_params = self.get_noise_params()
        if self.form == self.Form.NORMAL:
            self.value = np.random.normal(
                loc=noise_params[0],
                scale=noise_params[1],
            )
        elif self.form == self.Form.LOGNORMAL:
            self.value = np.random.lognormal(
                mean=noise_params[0],
                scale=noise_params[1],
            )
        elif self.form == self.Form.UNIFORM:
            self.value = np.random.uniform(
                low=noise_params[0],
                high=noise_params[1],
            )
        self.save()
        return self.value

    def add_noise(self, output_values, noise_params=None):
        """
        add noise to the simulated data according to the log_likelihood
        """
        if noise_params is None:
            params = self.get_noise_params()
        if self.form == self.Form.NORMAL:
            output_values += np.random.normal(
                mean=noise_params[0],
                scale=noise_params[1],
                size=output_values.shape
            )
        elif self.form == self.Form.LOGNORMAL:
            output_values += (
                np.random.lognormal(
                    mean=noise_params[0],
                    sigma=noise_params[1],
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

    def create_pints_forward_model(self):
        """
        create pints forwards model for this log_likelihood.

        Parameters
        ----------
        outputs: [Variable] (optional)
            list of outputs that the forward model will produce
            if None then the output of the log_likelihood will be used
        """

        model = self.get_model()
        myokit_model = model.get_myokit_model()
        myokit_simulator = model.get_myokit_simulator()

        outputs = [self.variable]
        output_names = [output.qname for output in outputs]

        fixed_parameters_dict = {
            param.variable.qname: param.value
            for param in self.children.all()
            if param.is_on_variable() and param.form == param.Form.FIXED
        }

        pints_model = MyokitForwardModel(
            myokit_simulator, myokit_model,
            output_names,
            fixed_parameters_dict
        )

        fitted_children = [
            self.get_child(name)
            for name in pints_model.variable_parameter_names()
        ]

        return pints_model, fitted_children

    def get_child(self, qname):
        return self.children.filter(
            variable__qname=qname
        )

    def get_inference_data(self):
        # if we have data then use it, otherwise
        # use simulated data
        if self.biomarker_type:
            df = self.biomarker_type.as_pandas(
                subject_group=self.subject_group
            )
            return df['values'].tolist(), df['times'].tolist()
        else:
            # sample from model
            model = self.get_model()
            pints_model, param_children = self.create_pints_forward_model()
            param_vector = [
                child.sample()
                for child in param_children
            ]
            fake_data_times = np.linspace(0, model.time_max, 20)
            result = forward_model.simulate(param_vector, fake_data_times)

            output_values = obj.add_noise(output_values)
            return output_values, times

    def get_noise_params(self):
        """
        get ordered list of noise params
        """
        params = self.children.all()
        noise_children = [p for p in params if not p.is_on_variable()]
        noise_params = [] * len(noise_children)
        for c in noise_children:
            noise_params[c.index] = c.sample()

    def create_pints_transform(self):
        if False:
            return pints.LogTransformation(n_parameters=1)
        else:
            return pints.IdentityTransformation(n_parameters=1)

    def create_pints_prior(self):
        noise_parameters = prior.get_noise_params()
        if prior.form == prior.Form.UNIFORM:
            lower = noise_parameters[0]
            upper = noise_parameters[1]
            pints_log_prior = pints.UniformLogPrior(lower, upper)
        elif prior.form == prior.Form.NORMAL:
            mean = noise_parameters[0]
            sd = noise_parameters[1]
            pints_log_prior = pints.GaussianLogPrior(mean, sd)

    def create_pints_problem(self):
        values, times = self.get_inference_data()
        model, fitted_children = self.create_pints_forward_model()
        return pints.SingleOutputProblem(model, values, times), fitted_children

    def create_pints_log_likelihood(self):
        problem, fitted_children = self.create_pints_problem()
        if self.form == self.Form.NORMAL:
            noise_param = self.children.get(
                index=1
            )
            if noise_param.form == noise_param.Form.FIXED:
                value = noise_param.value
                return pints.GaussianKnownnoiseLogLikelihood(
                    problem, value
                ), fitted_children
            else:
                return pints.GaussianLogLikelihood(
                    problem
                ), fitted_children + [noise_param]
        elif self.form == LogLikelihood.Form.LOGNORMAL:
            noise_param = self.children.get(
                index=1
            )
            return pints.LogNormalLogLikelihood(
                problem
            ), fitted_children + [noise_param]

        raise RuntimeError('unknown log_likelihood form')

    def get_forward_model_and_data(self):
        model = self.get_model()
        pints_forward_model = self.create_pints_forward_model()

        # if we're using fake data sample from composed prior
        # and store the values
        use_fake_data = any([
            ll.biomarker_type is None for ll in log_likelihoods
        ])
        if self.biomarker_type:
            fake_data_times = np.linspace(0, model.time_max, 20)
            fake_data_x0 = pints_composed_log_prior.sample().flatten()
            for x, prior in zip(fake_data_x0, priors_in_pints_order):
                prior.log_likelihood_parameter.value = x
                prior.log_likelihood_parameter.save()
            result = pints_forward_model.simulate(
                fake_data_x0[:pints_forward_model.n_parameters()],
                fake_data_times
            )

        values = []
        times = []
        result_index = 0
        for obj in log_likelihoods:

            # if we have data then use it, otherwise
            # use simulated data
            if obj.biomarker_type:
                df = obj.biomarker_type.as_pandas(
                    subject_group=obj.subject_group
                )
                values.append(df['values'].tolist())
                times.append(df['times'].tolist())
            else:
                output_values = result[
                    result_index:result_index + len(fake_data_times)
                ]

                # noise param value could be fixed or in priors
                x0_noise_params = []
                for param in obj.parameters.all():
                    if param.is_fixed() and not param.is_model_variable():
                        x0_noise_params.append(param.value)
                n_parameters = pints_forward_model.n_parameters()
                for i, prior in enumerate(
                        priors_in_pints_order[n_parameters:]
                ):
                    param = prior.log_likelihood_parameter
                    if (
                            param.log_likelihood == obj and
                            not param.is_model_variable()
                    ):
                        x0_noise_params.append(fake_data_x0[n_parameters + i])

                print('adding noise to fake data with params', x0_noise_params)
                output_values = obj.add_noise(output_values, x0_noise_params)

                values.append(output_values)
                times.append(fake_data_times)
                result_index += len(fake_data_times)

        print('output values', values)

        return values, times

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
            names = [
                "mean for " + self.variable.name,
                "standard deviation for " + self.variable.name,
            ]
        elif self.form == self.Form.LOGNORMAL:
            names = [
                "mean for " + self.variable.name,
                "sigma for " + self.variable.name,
            ]
        elif self.form == self.Form.LOGNORMAL:
            names = [
                "lower for " + self.variable.name,
                "upper for " + self.variable.name,
            ]
        for param_index, name in enumerate(names)
          index = None
           for i, p in enumerate(old_children):
                if (
                    not p.is_on_variable() and
                    p.index == param_index
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
