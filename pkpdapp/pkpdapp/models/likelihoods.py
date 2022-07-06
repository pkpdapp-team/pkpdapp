#
# This file is part of PKPDApp (https://github.com/pkpdapp-team/pkpdapp) which
# is released under the BSD 3-clause license. See accompanying LICENSE.md for
# copyright notice and full license details.
#

from django.db import models
from django.db.models import Q
import pymc3 as pm
import theano
import pints
import numpy as np
import scipy.stats as sps
from pkpdapp.models import (
    Variable, BiomarkerType,
    MyokitForwardModel, SubjectGroup, Subject,
)


class SolveCached:
    def __init__(self, function):
        self._cachedParam = None
        self._cachedOutput = None
        self._function = function

    def __call__(self, x):
        if np.any(x != self._cachedParam):
            self._cachedOutput = self._function(x)
            self._cachedParam = x
        return self._cachedOutput


class ODEGradop(theano.tensor.Op):
    __props__ = ("name",)

    def __init__(self, name, numpy_vsp, n_outputs):
        self.name = name
        self._numpy_vsp = numpy_vsp
        self._n_outputs = n_outputs

    def make_node(self, x, *gs):
        x = theano.tensor.as_tensor_variable(x)
        gs = [theano.tensor.as_tensor_variable(g) for g in gs]
        node = theano.Apply(self, [x] + gs, [g.type() for g in gs])
        return node

    def perform(self, node, inputs_storage, output_storage):
        x = inputs_storage[0]
        outs = self._numpy_vsp(x, inputs_storage[1:])  # get the numerical VSP
        for i in range(self._n_outputs):
            output_storage[i][0] = outs[0]


class ODEop(theano.tensor.Op):
    __props__ = ("name",)

    def __init__(self, name, ode_model, sensitivities=False):
        self.name = name
        self._ode_model = ode_model
        self._n_outputs = ode_model.n_outputs()
        self._output_shapes = ode_model.output_shapes()
        if sensitivities:
            self._cached_ode_model = SolveCached(self._ode_model.simulateS1)
        else:
            self._cached_ode_model = self._ode_model.simulate

        if sensitivities:
            def function(x):
                state, = self._cached_ode_model(np.array(x, dtype=np.float64))
                return state
        else:
            def function(x):
                state = self._cached_ode_model(np.array(x, dtype=np.float64))
                return state
        self._function = function

        if sensitivities:
            def vjp(x, gs):
                _, sens = self._cached_ode_model(
                    np.array(x, dtype=np.float64)
                )
                return [
                    s.T.dot(g) for s, g in zip(sens, gs)
                ]
        else:
            def vjp(x, g):
                raise NotImplementedError('sensitivities have been turned off')
        self._vjp = vjp

    def infer_shape(self, fgraph, node, input_shapes):
        return self._output_shapes

    def make_node(self, x):
        x = theano.tensor.as_tensor_variable(x)
        outputs = [
            theano.tensor.vector() for _ in range(self._n_outputs)
        ]
        return theano.tensor.Apply(self, [x], outputs)

    def perform(self, node, inputs_storage, output_storage):
        x = inputs_storage[0]
        outs = self._function(x)
        for i in range(self._n_outputs):
            output_storage[i][0] = outs[i]

    def grad(self, inputs, output_grads):
        x = inputs[0]

        # pass the VSP when asked for gradient
        grad_op = ODEGradop('grad of ' + self.name, self._vjp, self._n_outputs)
        grad_op_apply = grad_op(x, *output_grads)

        return [grad_op_apply]


class LogLikelihoodParameter(models.Model):
    """
    each parent log_likelihood has one or more parameters, or children.
    This model stores data on which input parameter this relationship
    referres to
    """
    name = models.CharField(
        max_length=100,
        help_text='name of log_likelihood parameter.'
    )
    parent = models.ForeignKey(
        'LogLikelihood',
        related_name='parameters',
        on_delete=models.CASCADE
    )
    parent_index = models.IntegerField(
        blank=True, null=True,
        help_text=(
            'parameter index for distribution and equation parameters. '
            'blank for models (variable is used instead)'
        )
    )
    child = models.ForeignKey(
        'LogLikelihood',
        related_name='outputs',
        on_delete=models.CASCADE
    )
    child_index = models.IntegerField(
        default=0,
        help_text=(
            'output index for all log_likelihoods. '
        )
    )
    variable = models.ForeignKey(
        Variable,
        related_name='log_likelihood_parameters',
        blank=True, null=True,
        on_delete=models.CASCADE,
        help_text='input model variable for this parameter.'
    )
    length = models.IntegerField(
        blank=True, null=True,
        help_text=(
            'length of array representing parameter. null for scalar'
        )
    )

    def set_fixed(self, value):
        self.child.value = value
        self.child.form = self.child.Form.FIXED
        self.child.save()

    def set_uniform_prior(self, lower, upper, biomarker_type=None):
        child = self.child
        child.form = child.Form.UNIFORM
        if biomarker_type is not None:
            child.biomarker_type = biomarker_type
            child.time_independent_data = True
        child.save()
        if biomarker_type is not None:
            _, _, subjects = child.get_data()
            self.length = len(subjects)
            self.save()
        lower_param = LogLikelihoodParameter.objects.get(
            parent=child, parent_index=0
        )
        lower_param.child.value = lower
        lower_param.child.save()
        upper_param = LogLikelihoodParameter.objects.get(
            parent=child, parent_index=1
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

    name = models.CharField(
        max_length=100,
        help_text='name of log_likelihood.'
    )

    description = models.TextField(
        blank=True, null=True,
        help_text=(
            'description of log_likelihood. For equations will be the '
            'code of that equation using Python syntax: arg1 * arg2^arg3'
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
        help_text=(
            'If form=MODEL, a variable (any) in the deterministic model. '
        )
    )

    biomarker_type = models.ForeignKey(
        BiomarkerType,
        on_delete=models.CASCADE,
        blank=True, null=True,
        help_text=(
            'data associated with this log_likelihood. '
            'This is used for measurement data (observed=True) '
            'or for covariates (observed=False). '
            'The random variable associated with this log_likelihood '
            'has the same shape as this data. '
            'For covariates the subject ids in the data correspond '
            'to the values of the random variable at that location.'
        )
    )

    time_independent_data = models.BooleanField(
        default=True,
        help_text=(
            'True if biomarker_type refers to time-independent data. '
            'If there are multiple timepoints in biomarker_type then only '
            'the first is taken '
        )
    )

    observed = models.BooleanField(
        default=False,
        help_text=(
            'True if this log_likelihood is observed '
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
        EQUATION = 'E', 'Equation'
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
                    ~(
                        Q(form='F') &
                        Q(value__isnull=True) &
                        Q(biomarker_type__isnull=True)
                    )
                ),
                name=(
                    '%(class)s: fixed log_likelihood must have a value '
                    'or biomarker_type'
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

    __original_variable = None
    __original_form = None

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.__original_form = self.form
        self.__original_variable = self.variable

    def is_random(self):
        # if fixed or is a distribution answer is easy
        if self.form == self.Form.FIXED:
            return False
        if self.is_a_distribution():
            return True

        # if model or equation then need to look at the parameters to determine
        # if random or not
        for child in self.children.all():
            if child.is_random():
                return True

    def is_a_distribution(self):
        return (
            self.form == self.Form.NORMAL or
            self.form == self.Form.UNIFORM or
            self.form == self.Form.LOGNORMAL
        )

    def is_a_prior(self):
        """
        True for distributions
        """
        return (
            self.is_a_distribution() and
            not self.observed
        )

    def has_data(self):
        """
        True for distributions where there is data
        """
        return self.biomarker_type is not None

    def sample(self):
        # if fixed or equation just evaluate it
        if self.form == self.Form.FIXED:
            values, _, _ = self.get_data()
            if values is None:
                return self.value
            else:
                return values
        elif self.form == self.Form.EQUATION:
            params = self.get_noise_log_likelihoods()
            param_values = [
                p.sample() for p in params
            ]

            args = [
                'arg{}'.format(i)
                for i, _ in enumerate(param_values)
            ]
            args = ','.join(args)
            code = (
                'import numpy as np\n'
                'def fun({}):\n'
                '  return {}\n'
                'result = np.vectorize(fun)({})\n'
            ).format(args, self.description, args)

            lcls = {
                'arg{}'.format(i): param
                for i, param in enumerate(param_values)
            }

            exec(code, None, lcls)
            return lcls['result']

        # otherwise must be a distribtion
        # TODO: MODEL not supported
        noise_params = self.get_noise_params()
        if self.form == self.Form.NORMAL:
            value = np.random.normal(
                loc=noise_params[0],
                scale=noise_params[1],
            )
        elif self.form == self.Form.LOGNORMAL:
            value = np.random.lognormal(
                mean=noise_params[0],
                scale=noise_params[1],
            )
        elif self.form == self.Form.UNIFORM:
            value = np.random.uniform(
                low=noise_params[0],
                high=noise_params[1],
            )
        return value

    def add_noise(self, output_values, noise_params=None):
        """
        add noise to the simulated data according to the log_likelihood
        """
        if noise_params is None:
            noise_params = self.get_noise_params()
        if self.form == self.Form.NORMAL:
            output_values += np.random.normal(
                loc=noise_params[0],
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

    def get_length_by_index(self):
        outputs = list(self.outputs.order_by('child_index'))
        if len(outputs) == 0:
            n_distinct_outputs = 0
        else:
            n_distinct_outputs = outputs[-1].child_index + 1
        length_by_index = [()] * n_distinct_outputs
        for output in outputs:
            length_by_index[output.child_index] = \
                1 if output.length is None else output.length
        return length_by_index

    def get_total_length(self):
        length_by_index = self.get_length_by_index()
        total_length = sum(length_by_index)
        return total_length

    def get_results(self, chain=None, iteration=None):
        """
        get inference results, respecting order of subjects
        defined by this log_likelihood
        """
        return self.inference_results.filter(
            chain=chain,
            iteration=iteration,
        ).order_by('subject').values_list('value', flat=True)

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

    def _create_pymc3_model(self, pm_model, parent, ops):
        # we are a graph not a tree, so
        # if name already in pm_model return it
        # ode models can have multiple outputs, so make
        # sure to choose the right one

        if parent is not None:
            param = LogLikelihoodParameter.objects.get(
                parent=parent,
                child=self
            )
            parent_index = param.child_index
        else:
            parent_index = 0

        name = self.name
        try:
            return ops[name][parent_index]
        except KeyError:
            pass

        # the distributions need a shape, take this from the data
        # if no data then assume scalar
        values, times, subjects = self.get_data()
        outputs = list(self.outputs.order_by('child_index'))
        if len(outputs) == 0:
            n_distinct_outputs = 0
        else:
            n_distinct_outputs = outputs[-1].child_index + 1
        parents = [output.parent for output in outputs]
        length_by_index = [()] * n_distinct_outputs
        for output in outputs:
            length_by_index[output.child_index] = \
                1 if output.length is None else output.length
        total_length = sum(length_by_index)

        # set shape and check total length of outputs is < this shape
        if values is None:
            shape = ()
            if total_length > 1:
                raise RuntimeError(
                    'log_likelihood {} is scalar but total length of outputs '
                    'is {}'.format(self.name, total_length)
                )
        else:
            shape = (len(values),)
            if total_length > shape[0]:
                raise RuntimeError(
                    'log_likelihood {} has data of length {} but total length '
                    'of outputs is {}'.format(
                        self.name, shape[0], total_length
                    )
                )

        observed = values if self.observed else None

        # if its not random, just evaluate it, otherwise create the pymc3 op
        if not self.is_random():
            value = self.sample()
            if isinstance(value, list):
                value = np.array(value)
            op = theano.shared(value)
        elif self.form == self.Form.NORMAL:
            mean, sigma = self.get_noise_log_likelihoods()
            mean = mean._create_pymc3_model(pm_model, self, ops)
            sigma = sigma._create_pymc3_model(pm_model, self, ops)
            print('create normal', name, mean, sigma, observed, shape)
            op = pm.Normal(
                name, mean, sigma, observed=observed, shape=shape
            )
        elif self.form == self.Form.LOGNORMAL:
            mean, sigma = self.get_noise_log_likelihoods()
            mean = mean._create_pymc3_model(pm_model, self, ops)
            sigma = sigma._create_pymc3_model(pm_model, self, ops)
            op = pm.LogNormal(
                name, mean, sigma, observed=observed, shape=shape
            )
        elif self.form == self.Form.UNIFORM:
            lower, upper = self.get_noise_log_likelihoods()
            lower = lower._create_pymc3_model(pm_model, self, ops)
            upper = upper._create_pymc3_model(pm_model, self, ops)
            op = pm.Uniform(
                name, lower, upper, observed=observed, shape=shape
            )
        elif self.form == self.Form.MODEL:
            # ASSUMPTIONS / LIMITATIONS:
            #   - parents of models must be observed random variables (e.g.
            #   can't have equation to, say, measure 2 * model output
            #   - subject ids of output data, e.g. [0, 1, 2, 8, 10] are the same
            #     subjects of input data, we only check that the lengths of the
            #     subject vectors are the same
            times = []
            subjects = []
            all_subjects = set()
            for parent in parents:
                _, this_times, this_subjects = parent.get_data()
                times.append(this_times)
                subjects.append(this_subjects)
                all_subjects.update(this_subjects)

            all_subjects = sorted(list(all_subjects))
            n_subjects = len(all_subjects)

            # look at all parameters and check their length, if they are all
            # scalar values then we can just run 1 sim, if any are vector
            # values then each value is a different parameter for each subject,
            # so we need to run a sim for every subject
            all_params_scalar = all([
                p.length is None
                for p in self.parameters.all()
            ])

            if all_params_scalar:
                subjects = None
            else:
                # transform subject ids into an index into all_subjects
                for i, this_subjects in enumerate(subjects):
                    subjects[i] = np.searchsorted(all_subjects, this_subjects)

            forward_model, fitted_parameters = self.create_forward_model(
                times, subjects
            )
            forward_model_op = ODEop(name, forward_model)
            if fitted_parameters:
                # create child pymc3 models
                all_params = [
                    param.child._create_pymc3_model(pm_model, self, ops)
                    for param in fitted_parameters
                ]

                # if any vector params, need to broadcast any scalars to
                # max_length and create a 2d tensor to pass to the model with
                # shape (n_params, max_length)
                if not all_params_scalar:
                    max_length = max([
                        param.length if param.length is not None else 1
                        for param in fitted_parameters
                    ])
                    if max_length != n_subjects:
                        raise RuntimeError(
                            'Error: n_subjects given by params is '
                            'different to n_subjects given by output data.'
                        )
                    for index in range(len(all_params)):
                        param = fitted_parameters[index]
                        pymc3_param = all_params[index]
                        if param.length is None:
                            all_params[index] = pymc3_param.reshape(
                                (1, max_length)
                            )
                        elif param.length != max_length:
                            raise RuntimeError(
                                'all parmeters must be scalar '
                                'or the same length'
                            )

                # now we stack them along axis 0
                all_params = pm.math.stack(all_params, axis=0)
            else:
                all_params = []
            op = forward_model_op(all_params)

            # make sure its a list
            if len(parents) == 1:
                op = [op]

            # track outputs of model so we can simulate
            op = [
                pm.Deterministic(name + parent.name, output)
                for output, parent in zip(op, parents)
            ]
        elif self.form == self.Form.EQUATION:
            params = self.get_noise_log_likelihoods()
            pymc3_params = []
            for param in params:
                param = param._create_pymc3_model(
                    pm_model, self, ops
                )
                pymc3_params.append(param)
            lcls = {
                'arg{}'.format(i): param
                for i, param in enumerate(pymc3_params)
            }
            op = eval(self.description, None, lcls)
        elif self.form == self.Form.FIXED:
            if self.biomarker_type is None:
                op = theano.shared(self.value)
            else:
                op = theano.shared(np.array(values))
        else:
            raise RuntimeError('unrecognised form', self.form)

        # split the op into its distinct outputs
        if self.form == self.Form.MODEL:
            ops[name] = op
        elif n_distinct_outputs == 1:
            ops[name] = [op]
        else:
            indexed_list = []
            current_index = 0
            for length in length_by_index:
                indexed_list.append(
                    op[current_index:current_index + length]
                )
            ops[name] = indexed_list

        # if no outputs then we don't need to return anything
        if n_distinct_outputs == 0:
            return None
        return ops[name][parent_index]

    def create_pymc3_model(self, *other_log_likelihoods):
        ops = {}
        with pm.Model() as pm_model:
            self._create_pymc3_model(pm_model, None, ops)
            for ll in other_log_likelihoods:
                ll._create_pymc3_model(pm_model, None, ops)
        return pm_model

    def create_forward_model(self, output_times, output_subjects=None):
        """
        create pints forwards model for this log_likelihood.
        """
        model = self.get_model()
        myokit_model = model.get_myokit_model()
        myokit_simulator = model.get_myokit_simulator()

        outputs = self.outputs.all()
        output_names = [output.variable.qname for output in outputs]

        fixed_parameters_dict = {
            param.variable.qname: param.child.value
            for param in self.parameters.all()
            if (
                not param.child.is_random() and
                param.variable is not None
            )
        }

        pints_model = MyokitForwardModel(
            myokit_simulator, myokit_model,
            output_names, output_times, output_subjects,
            fixed_parameters_dict
        )

        fitted_parameters = [
            self.get_param(name)
            for name in pints_model.variable_parameter_names()
        ]

        return pints_model, fitted_parameters

    def get_param(self, qname):
        param = LogLikelihoodParameter.objects.get(
            parent=self, variable__qname=qname
        )
        return param

    def get_data(self, fake=False):
        """
        return data. if fake=True and no data return
        some fake times
        """
        if self.biomarker_type:
            df = self.biomarker_type.as_pandas(
                subject_group=self.subject_group,
                first_time_only=self.time_independent_data
            )
            return (
                df['values'].tolist(),
                df['times'].tolist(),
                df['subjects'].tolist()
            )
        else:
            return None, None, None

    def get_noise_names(self):
        """
        get ordered list of noise log_likelihoods
        """
        noise_parameters = self.parameters.filter(
            parent_index__isnull=False,
        ).order_by('parent_index')

        return [
            p.name for p in noise_parameters
        ]

    def get_noise_log_likelihoods(self):
        """
        get ordered list of noise log_likelihoods
        """
        noise_parameters = self.parameters.filter(
            parent_index__isnull=False,
        ).order_by('parent_index')

        return [
            p.child for p in noise_parameters
        ]

    def get_noise_params(self):
        """
        get ordered list of noise param values
        if any noise params have a prior on them then
        this is sampled
        """
        return [
            child.sample() for child in self.get_noise_log_likelihoods()
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
        values, times, subjects = self.get_data()
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

    def get_model(self, variable=None):
        """
        if this is a log_likelihood that includes a mechanistic model
        this model is returned, else None
        """
        if self.form != self.Form.MODEL:
            return None
        if variable is None:
            return self.variable.get_model()
        else:
            return variable.get_model()

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

    def get_model_outputs(self):
        """
        if this is a log_likelihood that includes a mechanistic model
        return a list of model parameters, else return []
        """
        model = self.get_model()
        if model is None:
            return []
        else:
            return model.variables.filter(
                Q(constant=False)
            ).exclude(name="time")

    def save(self, force_insert=False, force_update=False, *args, **kwargs):
        created = not self.pk

        set_defaults = (
            created or
            self.get_model() != self.get_model(self.__original_variable) or
            self.form != self.__original_form
        )

        if set_defaults:
            if self.form == self.Form.MODEL:
                self.name = self.variable.get_model().name

        super().save(force_insert, force_update, *args, **kwargs)

        # if the model or form is changed regenerate
        # default children and parents
        if set_defaults:
            for child in self.children.all():
                # make sure we don't delete models from children
                if child.form != self.Form.MODEL:
                    child.delete()
            if self.form == self.Form.MODEL:
                for parent in self.parents.all():
                    parent.delete()
                self.create_model_family()
            if self.form == self.Form.EQUATION:
                # save() is not responsible for generating
                # equation children
                pass
            else:  # a distribution
                self.create_noise_children()

        self.__original_variable = self.variable
        self.__original_form = self.form

    def create_model_family(self):
        for model_variable in self.get_model_variables():
            if model_variable.constant:
                name = model_variable.qname
            else:
                name = 'initial ' + model_variable.qname
            child = LogLikelihood.objects.create(
                name=name,
                inference=self.inference,
                value=model_variable.get_default_value(),
                variable=model_variable,
                form=self.Form.FIXED,
            )
            LogLikelihoodParameter.objects.create(
                parent=self, child=child,
                variable=model_variable,
                name=model_variable.qname,
            )

        for model_variable in self.get_model_outputs():
            parent = LogLikelihood.objects.create(
                name=model_variable.qname,
                inference=self.inference,
                variable=model_variable,
                form=self.Form.NORMAL,
                time_independent_data=False,
            )
            # add the output_model
            mean_param = parent.parameters.get(parent_index=0)
            old_mean = mean_param.child
            mean_param.child = self
            old_mean.delete()
            mean_param.name = model_variable.qname
            mean_param.variable = model_variable
            mean_param.save()

    def create_noise_children(self):
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
        elif self.parameters.count() > 0:
            for param in self.parameters.all():
                if param.variable:
                    variable = param.variable

        if self.form == self.Form.NORMAL:
            pnames = [
                "mean for " + self.name,
                "standard deviation for " + self.name,
            ]
            if variable is not None:
                names = [
                    "mean for " + variable.qname,
                    "standard deviation for " + variable.qname,
                ]
            else:
                names = pnames

            if variable is not None:
                defaults = [
                    variable.get_default_value(),
                    0.1 * (variable.upper_bound - variable.lower_bound),
                ]
            else:
                defaults = [0.0, 1.0]
        elif self.form == self.Form.LOGNORMAL:
            pnames = [
                "mean for " + self.name,
                "sigma for " + self.name,
            ]
            if variable is not None:
                names = [
                    "mean for " + variable.qname,
                    "sigma for " + variable.qname,
                ]
            else:
                names = pnames

            if variable is not None:
                defaults = [
                    variable.get_default_value(),
                    0.1 * (variable.upper_bound - variable.lower_bound),
                ]
            else:
                defaults = [0.0, 1.0]
        elif self.form == self.Form.UNIFORM:
            pnames = [
                "lower for " + self.name,
                "upper for " + self.name,
            ]
            if variable is not None:
                names = [
                    "lower for " + variable.qname,
                    "upper for " + variable.qname,
                ]
            else:
                names = pnames

            if variable is not None:
                defaults = [
                    variable.lower_bound,
                    variable.upper_bound,
                ]
            else:
                defaults = [0.0, 1.0]
        else:
            names = []
            pnames = []
            defaults = []
        for param_index, (name, pname, default) in enumerate(
                zip(names, pnames, defaults)
        ):
            child = LogLikelihood.objects.create(
                name=name,
                inference=self.inference,
                value=default,
                form=self.Form.FIXED,
            )
            LogLikelihoodParameter.objects.create(
                parent=self, child=child,
                parent_index=param_index,
                name=pname,
            )

    def create_stored_log_likelihood(self, inference, new_models):
        """
        create stored log_likelihood, ignoring children for now
        """
        print('create_stored_log_likelihood', self.name)
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
            'name': self.name,
            'value': self.value,
            'variable': new_variable,
            'biomarker_type': self.biomarker_type,
            'observed': self.observed,
            'subject_group': self.subject_group,
            'form': self.form,
        }

        # this will create default children
        stored_log_likelihood = LogLikelihood.objects.create(
            **stored_log_likelihood_kwargs
        )

        return stored_log_likelihood
