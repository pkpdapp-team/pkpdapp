#
# This file is part of PKPDApp (https://github.com/pkpdapp-team/pkpdapp) which
# is released under the BSD 3-clause license. See accompanying LICENSE.md for
# copyright notice and full license details.
#

from django.db import models
from django.db.models import Q
import pints
import numpy as np
import scipy.stats as sps
from pkpdapp.models import (
    Variable, BiomarkerType,
    MyokitForwardModel, SubjectGroup
)


class LogLikelihoodParameter(models.Model):
    """
    each parent log_likelihood has one or more parameters, or children.
    This model stores data on which input parameter this relationship
    referres to
    """
    parent = models.ForeignKey(
        'LogLikelihood',
        related_name='parameters',
        on_delete=models.CASCADE
    )
    child = models.ForeignKey(
        'LogLikelihood',
        related_name='outputs',
        on_delete=models.CASCADE
    )
    variable = models.ForeignKey(
        Variable,
        related_name='log_likelihood_parameters',
        blank=True, null=True,
        on_delete=models.CASCADE,
        help_text='input model variable for this parameter.'
    )
    index = models.IntegerField(
        blank=True, null=True,
        help_text=(
            'parameter index for distribution parameters. '
            'null if variable is not null'
        )
    )
    name = models.CharField(
        max_length=100,
        help_text='name of log_likelihood parameter.'
    )

    def set_fixed(self, value):
        self.child.value = value
        self.child.form = self.child.Form.FIXED
        self.child.save()

    def set_uniform_prior(self, lower, upper):
        child = self.child
        child.form = child.Form.UNIFORM
        child.save()
        lower_param = LogLikelihoodParameter.objects.get(
            parent=child, index=0
        )
        lower_param.child.value = lower
        lower_param.child.save()
        upper_param = LogLikelihoodParameter.objects.get(
            parent=child, index=1
        )
        upper_param.child.value = upper
        upper_param.child.save()


class LogLikelihood(models.Model):
    """
    model class for log_likelihood functions.
    """

    inference = models.ForeignKey(
        'Inference',
        related_name='log_likelihoods',
        on_delete=models.CASCADE,
        help_text=(
            'Log_likelihood belongs to this inference object. '
        )
    )

    value = models.FloatField(
        help_text='set if a fixed value is required',
        blank=True, null=True,
    )

    children = models.ManyToManyField(
        'LogLikelihood',
        related_name='parents',
        symmetrical=False,
        through=LogLikelihoodParameter,
        blank=True, null=True,
        through_fields=('parent', 'child'),
    )

    variable = models.ForeignKey(
        Variable,
        related_name='log_likelihoods',
        blank=True, null=True,
        on_delete=models.CASCADE,
        help_text='a variable (any) in the deterministic model.'
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
        SUM = 'S', 'Sum'
        MODEL = 'M', 'Model'

    form = models.CharField(
        max_length=2,
        choices=Form.choices,
        default=Form.FIXED,
    )

    class Meta:
        constraints = [
            models.CheckConstraint(
                check=(
                    ~(Q(form='F') & Q(value__isnull=True))
                ),
                name=(
                    '%(class)s: fixed log_likelihood must have a value'
                )
            ),
            models.CheckConstraint(
                check=(
                    ~(Q(form='M') & Q(variable__isnull=True))
                ),
                name=(
                    '%(class)s: model log_likelihood must have a variable'
                )
            ),
            models.CheckConstraint(
                check=(
                    ~(
                        (
                            Q(form='F') | Q(form='S') | Q(form='M')
                        ) &
                        Q(biomarker_type__isnull=False) &
                        Q(subject_group__isnull=False)
                    )
                ),
                name=(
                    '%(class)s: deterministic log_likelihoods cannot have data'
                )
            ),
        ]

    def is_a_distribution(self):
        return (
            self.form == self.Form.NORMAL or
            self.form == self.Form.UNIFORM or
            self.form == self.Form.LOGNORMAL
        )

    def is_a_prior(self):
        """
        True for distributions where there is no observed data
        """
        return (
            self.is_a_distribution() and
            self.biomarker_type is not None
        )

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
            noise_params = self.get_noise_params()
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

    def noise_range(self, output_values, noise_params=None):
        """
        return 10% and 90% noise levels from a set of output values
        """
        if noise_params is None:
            noise_params = self.get_noise_params()
        output_values_min = np.copy(output_values)
        output_values_max = np.copy(output_values)
        if self.form == self.Form.NORMAL:
            for i in range(len(output_values)):
                dist = sps.norm(
                    loc=output_values[i] + noise_params[0],
                    scale=noise_params[1]
                )
                output_values_min[i] = dist.ppf(.1)
                output_values_max[i] = dist.ppf(.9)
        elif self.form == self.Form.LOGNORMAL:
            for i in range(len(output_values)):
                dist = sps.lognorm(
                    loc=output_values[i] + noise_params[0],
                    scale=noise_params[1]
                )
                output_values_min[i] = dist.ppf(.1)
                output_values_max[i] = dist.ppf(.9)

        return output_values_min, output_values_max

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
            param.variable.qname: param.child.value
            for param in self.parameters.all()
            if (
                param.child.form == param.child.Form.FIXED and
                param.variable is not None
            )
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
        param = LogLikelihoodParameter.objects.get(
            parent=self, variable__qname=qname
        )
        return param.child

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
            output_values = pints_model.simulate(param_vector, fake_data_times)
            output_values = self.add_noise(output_values)
            return output_values, fake_data_times

    def get_noise_params(self):
        """
        get ordered list of noise param values
        if any noise params have a prior on them then
        this is sampled
        """
        noise_parameters = self.parameters.filter(
            variable__isnull=True
        ).order_by('index')

        return [
            p.child.sample() for p in noise_parameters
        ]

    def create_pints_transform(self):
        if False:
            return pints.LogTransformation(n_parameters=1)
        else:
            return pints.IdentityTransformation(n_parameters=1)

    def create_pints_prior(self):
        noise_parameters = self.get_noise_params()
        if self.form == self.Form.UNIFORM:
            lower = noise_parameters[0]
            upper = noise_parameters[1]
            pints_log_prior = pints.UniformLogPrior(lower, upper)
        elif self.form == self.Form.NORMAL:
            mean = noise_parameters[0]
            sd = noise_parameters[1]
            pints_log_prior = pints.GaussianLogPrior(mean, sd)
        return pints_log_prior

    def create_pints_problem(self):
        values, times = self.get_inference_data()
        print(times)
        model, fitted_children = self.create_pints_forward_model()
        return pints.SingleOutputProblem(model, times, values), fitted_children

    def create_pints_log_likelihood(self):
        problem, fitted_children = self.create_pints_problem()
        if self.form == self.Form.NORMAL:
            noise_param = self.parameters.get(index=1)
            if noise_param.child.form == noise_param.child.Form.FIXED:
                value = noise_param.value
                return pints.GaussianKnownSigmaLogLikelihood(
                    problem, value
                ), fitted_children
            else:
                return pints.GaussianLogLikelihood(
                    problem
                ), fitted_children + [noise_param.child]
        elif self.form == LogLikelihood.Form.LOGNORMAL:
            noise_param = self.parameters.get(index=1)
            return pints.LogNormalLogLikelihood(
                problem
            ), fitted_children + [noise_param.child]

        raise RuntimeError('unknown log_likelihood form')

    def get_model(self):
        """
        if this is a log_likelihood that includes a mechanistic model
        this model is returned, else None
        """
        if self.form != self.Form.MODEL:
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
        old_children = list(self.children.all())
        old_parameters = [
            LogLikelihoodParameter.objects.get(parent=self, child=c)
            for c in old_children
        ]

        # model parameteers
        for model_variable in self.get_model_variables():
            index = None
            for i, (c, p) in enumerate(zip(old_children, old_parameters)):
                if (
                    p.variable is not None and
                    p.variable.id == model_variable.id
                ):
                    index = i
            if index is None:
                child = LogLikelihood.objects.create(
                    inference=self.inference,
                    value=model_variable.get_default_value(),
                    form=self.Form.FIXED,
                )
                LogLikelihoodParameter.objects.create(
                    parent=self, child=child,
                    variable=model_variable,
                    name=model_variable.qname,
                )

            else:
                del old_children[index]
                del old_parameters[index]

        # distribution parameters
        variable = None
        if self.variable:
            variable = self.variable
        elif self.outputs.count() > 0:
            first_output = self.outputs.first()
            if first_output.variable:
                variable = first_output.variable
            elif first_output.parent.variable:
                variable = first_output.parent.variable

        if self.form == self.Form.NORMAL:
            if variable is not None:
                names = [
                    "mean for " + variable.name,
                    "standard deviation for " + variable.name,
                ]
            else:
                names = [
                    "mean",
                    "standard deviation",
                ]
            if variable is not None:
                defaults = [
                    variable.get_default_value(),
                    0.1 * (variable.upper_bound - variable.lower_bound),
                ]
            else:
                defaults = [0.0, 0.0]
        elif self.form == self.Form.LOGNORMAL:
            if variable is not None:
                names = [
                    "mean for " + variable.name,
                    "sigma for " + variable.name,
                ]
            else:
                names = [
                    "mean",
                    "sigma",
                ]
            if variable is not None:
                defaults = [
                    variable.get_default_value(),
                    0.1 * (variable.upper_bound - variable.lower_bound),
                ]
            else:
                defaults = [0.0, 0.0]
        elif self.form == self.Form.UNIFORM:
            if variable is not None:
                names = [
                    "lower for " + variable.name,
                    "upper for " + variable.name,
                ]
            else:
                names = [
                    "lower",
                    "upper",
                ]
            if variable is not None:
                defaults = [
                    variable.lower_bound,
                    variable.upper_bound,
                ]
            else:
                defaults = [0.0, 0.0]
        else:
            names = []
            defaults = []
        for param_index, (name, default) in enumerate(zip(names, defaults)):
            index = None
            for i, (c, p) in enumerate(zip(old_children, old_parameters)):
                if (
                    p.variable is None and
                    p.index == param_index
                ):
                    index = i
            if index is None:
                child = LogLikelihood.objects.create(
                    inference=self.inference,
                    value=default,
                    form=self.Form.FIXED,
                )
                LogLikelihoodParameter.objects.create(
                    parent=self, child=child,
                    index=param_index,
                    name=name,
                )
            else:
                del old_children[index]
                del old_parameters[index]

        # remove children not in list above
        for c in old_children:
            c.delete()

    def create_stored_log_likelihood(self, inference, new_models):
        """
        create stored log_likelihood, ignoring children for now
        """
        new_variable = None
        if self.variable is not None:
            old_model = self.variable.get_model()
            new_model = new_models[old_model.id]
            variable_qname = self.variable.qname

            new_variable = new_model.variables.get(
                qname=variable_qname
            )

        stored_log_likelihood_kwargs = {
            'inference': inference,
            'value': self.value,
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
