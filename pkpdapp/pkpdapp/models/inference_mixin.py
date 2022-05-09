#
# This file is part of PKPDApp (https://github.com/pkpdapp-team/pkpdapp) which
# is released under the BSD 3-clause license. See accompanying LICENSE.md for
# copyright notice and full license details.
#

from django.db import transaction
import numpy as np
import pints
import time
import theano.tensor as tt
from theano.compile.io import In
import theano
import scipy.stats as sps
from tdigest import TDigest
from pkpdapp.models import (
    LogLikelihood,
    Inference,
    PriorNormal, PriorUniform, InferenceResult,
    InferenceChain, InferenceFunctionResult,
    InferenceOutputResult,
)

optimisers_dict = {
    'CMAES': pints.CMAES,
    'Nelder-Mead': pints.NelderMead,
    'PSO': pints.PSO,
    'SNES': pints.SNES,
    'XNES': pints.XNES
}


samplers_dict = {
    'Haario-Bardenet': pints.HaarioBardenetACMC,
    'Differential evolution': pints.DifferentialEvolutionMCMC,
    'DREAM': pints.DreamMCMC,
    'Emcee-hammer': pints.EmceeHammerMCMC,
    'Population MCMC': pints.PopulationMCMC
}


class ChainWriter:
    """
    utility class for buffering inference results writes to the database
    """

    def __init__(self, chains, priors, buffer_size):
        self._iterations = []
        self._fn_value_buffers = [
            [] for _ in chains
        ]
        self._x0_buffers = [
            [] for _ in chains
        ]
        self._chains = chains
        self._priors = priors
        self._buffer_size = buffer_size

    def append(self, fn_values, x0s, iteration):
        for buffer, x0 in zip(self._x0_buffers, x0s):
            buffer.append(x0)
        for buffer, fn_value in zip(self._fn_value_buffers, fn_values):
            buffer.append(fn_value)
        self._iterations.append(iteration)
        if len(self._iterations) > self._buffer_size:
            self.write()

    def write(self):
        function_results = []
        inference_results = []
        for x0_buffer, fn_values_buffer, chain in zip(
                self._x0_buffers, self._fn_value_buffers, self._chains
        ):
            for iteration, x0, fn_value in zip(
                    self._iterations, x0_buffer, fn_values_buffer
            ):
                function_results.append(InferenceFunctionResult(
                    chain=chain,
                    iteration=iteration,
                    value=fn_value
                ))
                for i, prior in enumerate(self._priors):
                    inference_results.append(InferenceResult(
                        chain=chain,
                        log_likelihood=prior,
                        iteration=iteration,
                        value=x0[i]
                    ))
        InferenceFunctionResult.objects.bulk_create(function_results)
        InferenceResult.objects.bulk_create(inference_results)

        self._iterations = []
        self._fn_value_buffers = [
            [] for _ in self._chains
        ]
        self._x0_buffers = [
            [] for _ in self._chains
        ]


class OutputWriter:
    """
    utility class for generating & writing output
    results writes to the database
    """

    def __init__(self, chains,
                 log_likelihoods,
                 pints_log_posterior,
                 use_every_n_sample=1,
                 buffer_size=100,
                 store_output_range=True):

        self._iterations = []
        self._x0_buffers = [
            [] for _ in chains
        ]

        self._chains = chains

        self._log_likelihoods = log_likelihoods
        self._pints_log_posterior = pints_log_posterior
        data = [ll.get_inference_data() for ll in log_likelihoods]
        self._values = [d[0] for d in data]
        self._times = [d[1] for d in data]
        self._unique_times = [
            [times[0]] for times in self._times
        ]
        self._unique_times_index = [
            [0] for _ in self._times
        ]
        self._times_index = [
            [0] for _ in self._times
        ]
        for unique_times, unique_times_index, times_index, times in zip(
            self._unique_times, self._unique_times_index, self._times_index,
            self._times
        ):
            unique_index = 0
            for i, t in enumerate(times[1:]):
                if t != unique_times[-1]:
                    times_index.append(i + 1)
                    unique_times.append(t)
                    unique_index += 1
                unique_times_index.append(unique_index)

        self._tdigests = [
            [
                [
                    TDigest() for _ in times
                ]
                for times in self._unique_times
            ]
            for _ in chains
        ]

        self._use_every_n_sample = use_every_n_sample
        self._store_output_range = store_output_range
        self._outputs = [
            self.initialise_outputs(chain) for chain in self._chains
        ]
        self._buffer = 0
        self._buffer_size = buffer_size
        self._updated = False

    def initialise_outputs(self, chain):
        outputs = []
        outputs_count = InferenceOutputResult.objects.filter(
            chain=chain,
            log_likelihood__in=self._log_likelihoods,
        ).count()
        if outputs_count != (
                sum([len(times) for times in self._times])
        ):
            InferenceOutputResult.objects.filter(
                chain=chain,
                log_likelihood__in=self._log_likelihoods,
            ).delete()
            for log_likelihood, times, values in zip(
                self._log_likelihoods, self._times, self._values
            ):
                for time_val, value in zip(times, values):
                    outputs.append(InferenceOutputResult.objects.create(
                        log_likelihood=log_likelihood,
                        chain=chain,
                        median=0,
                        percentile_min=0,
                        percentile_max=0,
                        data=value,
                        time=time_val,
                    ))
            return outputs

    def append(self, x0s, iteration):
        for buffer, x0 in zip(self._x0_buffers, x0s):
            buffer.append(x0)
        self._iterations.append(iteration)
        if len(self._iterations) > self._buffer_size:
            self.write()

    def write(self):
        for x0_buffer, tdigests_for_chain, chain, outputs in zip(
            self._x0_buffers, self._tdigests, self._chains, self._outputs
        ):
            if self._store_output_range:
                for iteration, x0 in zip(
                    self._iterations, x0_buffer
                ):
                    if iteration % self._use_every_n_sample != 0:
                        continue
                    results = \
                        self._pints_log_posterior.sample_generative_model(
                            self._pints_log_posterior.to_search(x0)
                        )
                    for times, tdigests, result, unique_times_index in zip(
                        self._times, tdigests_for_chain, results,
                        self._unique_times_index
                    ):
                        for i in range(len(times)):
                            value = result[i]
                            tdigests[unique_times_index[i]].update(value)

                # write new percentiles
                output_index = 0
                for times, unique_times_index, tdigests, result in zip(
                    self._times, self._unique_times_index,
                    tdigests_for_chain, results
                ):
                    for i in range(len(times)):
                        tdigest = tdigests[unique_times_index[i]]
                        maximum = tdigest.percentile(90)
                        minimum = tdigest.percentile(10)
                        median = tdigest.percentile(50)
                        outputs[output_index].median = median
                        outputs[output_index].percentile_min = minimum
                        outputs[output_index].percentile_max = maximum
                        output_index += 1

            else:
                # just use the last parameter values
                output_index = 0
                x0 = x0_buffer[-1]
                results_min, results, results_max = \
                    self._pints_log_posterior.generative_model_range(
                        self._pints_log_posterior.to_search(x0)
                    )
                for times, tdigests, result, result_min, result_max in zip(
                    self._times, tdigests_for_chain,
                    results, results_min, results_max
                ):
                    for i in range(len(times)):
                        outputs[output_index].median = result[i]
                        outputs[output_index].percentile_min = result_min[i]
                        outputs[output_index].percentile_max = result_max[i]
                        output_index += 1

            with transaction.atomic():
                [output.save() for output in outputs]

        self._iterations = []
        self._x0_buffers = [
            [] for _ in self._chains
        ]


class InferenceMixin:
    def __init__(self, inference):
        print('inference mixin', inference.number_of_iterations)

        # # select inference methods
        self._inference_type, self._inference_method = (
            self.get_inference_type_and_method(inference)
        )

        # types needed later
        self.inference = inference

        # get model parameters to be inferred
        log_likelihoods = inference.log_likelihoods.all()

        # this list defines the ordering in the parameter vector
        # for the sampler
        self._priors = [
            ll
            for ll in log_likelihoods
            if ll.is_a_prior()
        ]
        print('priors are')
        for p in self._priors:
            print(p.name, p.form)

        # create forwards models
        self._observed_log_likelihoods = [
            ll
            for ll in log_likelihoods
            if ll.has_data()
        ]

        if len(self._observed_log_likelihoods) == 0:
            raise RuntimeError(
                'Error: must have at least one observed random variable '
                'in model'
            )

        pymc3_model = \
            self._observed_log_likelihoods[0].create_pymc3_model(
                *self._observed_log_likelihoods[1:]
            )

        self._pints_log_posterior = PyMC3LogPosterior(
            pymc3_model, self._observed_log_likelihoods, self._priors,
            optimisation=(self.inference.algorithm.category == 'OP')
        )

        # create chains if not exist
        if self.inference.chains.count() == 0:
            print('creating chains')
            for i in range(self.inference.number_of_chains):
                InferenceChain.objects.create(inference=self.inference)

        if self.inference.chains.count() != self.inference.number_of_chains:
            raise RuntimeError(
                'number of chains not equal to chains in database'
            )

        # create sampler objects
        # If results already exist append to them, otherwise randomly
        # sample prior for initial values.
        # set inference results objects for each fitted parameter to be
        # initial values
        self._inference_objects = []
        if (
            self.inference.initialization_strategy ==
            Inference.InitializationStrategy.FROM_OTHER
        ):
            other_chains = self.inference.initialization_inference.chains.all()
            other_last_iteration = \
                self.inference.initialization_inference.number_of_iterations
        for i, chain in enumerate(self.inference.chains.all()):
            x0 = []
            if self.inference.number_of_iterations > 0:
                print('restarting chains!', self.inference.number_of_iterations, 'nit')
                for prior in self._priors:
                    this_chain = InferenceResult.objects.filter(
                        log_likelihood=prior,
                        chain=chain
                    )
                    x0.append(
                        this_chain.get(
                            iteration=self.inference.number_of_iterations
                        ).value
                    )
                x0 = np.array(x0)
            else:
                x0 = np.array(
                    [p.sample() for p in self._priors]
                )
                if (
                    self.inference.initialization_strategy ==
                    Inference.InitializationStrategy.DEFAULT_VALUE
                ):
                    for xi, prior in enumerate(self._priors):
                        if prior.variable is not None:
                            x0[xi] = prior.variable.get_default_value()
                elif (
                    self.inference.initialization_strategy ==
                    Inference.InitializationStrategy.FROM_OTHER
                ):
                    other_chain_index = min(i, len(other_chains) - 1)
                    other_chain = other_chains[other_chain_index]
                    last_values = InferenceResult.objects.filter(
                        chain=other_chain,
                        iteration=other_last_iteration

                    )
                    for xi, this_prior in enumerate(
                            self._priors
                    ):
                        try:
                            last_result = last_values.get(
                                log_likelihood__name=this_prior.name
                            )
                            x0[xi] = last_result.value
                        except InferenceResult.DoesNotExist:
                            pass

                # write x0 to empty chain
                self.inference.number_of_function_evals += 1
                fn_val = self._pints_log_posterior(
                    self._pints_log_posterior.to_search(x0)
                )
                print('starting function value', fn_val)
                self.write_inference_results(
                    x0, fn_val,
                    self.inference.number_of_iterations, i
                )

            # apply transformations to initial point and create default sigma0
            sigma0 = x0**2
            sigma0[sigma0 == 0] = 1
            # Use to create diagonal matrix
            sigma0 = 0.01 * sigma0
            print('sigma0', sigma0)
            x0 = self._pints_log_posterior.to_search(x0)
            self._inference_objects.append(
                self._inference_method(x0, sigma0)
            )

    @ staticmethod
    def get_inference_type_and_method(inference):
        inference_type = inference.algorithm.category
        methodname = inference.algorithm.name
        if inference_type == 'SA':
            method_dict = samplers_dict
        else:
            method_dict = optimisers_dict
        inference_method = method_dict[methodname]
        return inference_type, inference_method

    def write_inference_results(self, values, fn_value, iteration,
                                chain_index):
        # Writes inference results to one chain
        chains = self.inference.chains.all()
        InferenceFunctionResult.objects.create(
            chain=chains[chain_index],
            iteration=iteration,
            value=fn_value
        )
        for i, prior in enumerate(self._priors):
            InferenceResult.objects.create(
                chain=chains[chain_index],
                log_likelihood=prior,
                iteration=iteration,
                value=values[i])

    def step_inference(self, writer, output_writer):
        # runs one set of ask / tell
        fn_values = []
        x0s = []
        for obj in self._inference_objects:
            x = obj.ask()
            if self._inference_type == "SA":  # sampling
                score = self._pints_log_posterior(x)
                self.inference.number_of_function_evals += 1
                x, score, accepted = obj.tell(score)
            else:
                scores = [self._pints_log_posterior(xi) for xi in x]
                self.inference.number_of_function_evals += len(x)
                obj.tell(scores)
                x = obj.xbest()
                score = obj.fbest()

            x0s.append(self._pints_log_posterior.to_model(x))
            fn_values.append(score)
        writer.append(fn_values, x0s, self.inference.number_of_iterations)
        output_writer.append(x0s, self.inference.number_of_iterations)

    def run_inference(self):
        # runs ask / tell
        time_start = time.time()
        max_iterations = self.inference.max_number_of_iterations
        n_iterations = self.inference.number_of_iterations
        initial_phase_iterations = -1
        print('running inference')
        if (
            self.inference.algorithm.category == 'SA' and
            self._inference_objects[0].needs_initial_phase()
        ):
            print('need to consider an initial phase')
            dimensions = len(self._priors)
            initial_phase_iterations = 500 * dimensions
            if n_iterations < initial_phase_iterations:
                print('Turning on initial phase')
                for sampler in self._inference_objects:
                    sampler.set_initial_phase(True)

        write_every_n_iteration = 500
        evaluate_model_every_n_iterations = 10

        writer = ChainWriter(
            self.inference.chains.all(),
            self._priors,
            write_every_n_iteration,
        )

        output_writer = OutputWriter(
            self.inference.chains.all(),
            self._observed_log_likelihoods,
            self._pints_log_posterior,
            use_every_n_sample=evaluate_model_every_n_iterations,
            buffer_size=write_every_n_iteration,
            store_output_range=self.inference.algorithm.category == 'SA'
        )
        for i in range(n_iterations, max_iterations):
            if i == initial_phase_iterations:
                print('Turning off initial phase')
                for sampler in self._inference_objects:
                    sampler.set_initial_phase(False)

            self.inference.number_of_iterations += 1
            self.step_inference(writer, output_writer)
            time_now = time.time()
            self.inference.time_elapsed = time_now - time_start

            if i % write_every_n_iteration == 0:
                # only save fields we've updated
                self.inference.save(
                    update_fields=[
                        'number_of_iterations',
                        'number_of_function_evals',
                        'time_elapsed',
                    ]
                )

        # write out the remaining iterations
        writer.write()
        output_writer.write()
        self.inference.save()

    def fixed_variables(self):
        return self._fixed_variables


class PyMC3LogPosterior(pints.LogPDF):
    def __init__(self, model, log_likelihoods, priors, optimisation=False):
        self._transforms = [
            model[p.name].distribution.transform for p in priors
        ]
        self._transform_names = [
            t if t is None else t.name for t in self._transforms
        ]
        self._transform_backwards = [
            self._transform_backward(t) for t in self._transforms
        ]
        self._transform_forwards = [
            self._transform_forward(t) for t in self._transforms
        ]
        self._prior_names = [
            self._get_name(p, t) for p, t in zip(priors, self._transforms)
        ]
        self._log_likelihoods = log_likelihoods
        self._log_likelihood_names = [
            self._get_name(ll, None) for ll in log_likelihoods
        ]
        mean_rvs = []
        param1s_rvs = []
        param1s_index = []
        param1s = []
        # assumes that all observed ll have 2 noise params
        # assumes that the mean comes from a model
        for i, ll in enumerate(self._log_likelihoods):
            mean, param1 = ll.get_noise_log_likelihoods()
            mean_name = mean.name + ll.name
            mean_rvs.append(model[mean_name])
            if param1.form == param1.Form.FIXED:
                param1s.append(param1.value)
            else:
                param1s_rvs.append(model[param1.name])
                param1s_index.append(i)
                param1s.append(np.nan)
        self._n_means = len(self._log_likelihoods)
        self._param1s_index = param1s_index
        self._param1s = np.array(param1s)
        print('posterior_predictive', mean_rvs, param1s_rvs)
        self._posterior_predictive = model.fastfn(mean_rvs + param1s_rvs)
        self._model = model
        self._logp = model.logp
        if optimisation:
            def function(x):
                return -self._logp(x)
            self._function = function
        else:
            self._function = self._logp

    def n_parameters(self):
        return len(self._prior_names)

    @staticmethod
    def _transform_forward(transform):
        x = tt.dscalar('x')
        x.tag.test_value = 1.0
        if transform is None:
            z = x
        else:
            z = transform.forward(x)
        return theano.function([x], z)

    @staticmethod
    def _transform_backward(transform):
        x = tt.dscalar('x')
        x.tag.test_value = 1.0
        if transform is None:
            z = x
        else:
            z = transform.backward(x)
        return theano.function([x], z)

    def _get_name(self, prior, transform):
        if transform is None:
            return prior.name
        return prior.name + '_{}__'.format(transform.name)

    def _get_input_name(self, log_likelihood):
        mean = log_likelihood.get_noise_log_likelihoods()[0]
        print('name is ', mean.name + log_likelihood.name)
        return mean.name + log_likelihood.name

    def to_search(self, x):
        return np.array([
            t(xi) for xi, t in zip(x, self._transform_forwards)
        ])

    def to_model(self, x):
        return np.array([
            t(xi) for xi, t in zip(x, self._transform_backwards)
        ])

    def __call__(self, x):
        call_dict = {
            name: value for name, value in zip(self._prior_names, x)
        }
        return self._function(call_dict)

    def generative_model_range(self, x):
        call_dict = {
            name: value for name, value in zip(self._prior_names, x)
        }
        results = self._posterior_predictive(call_dict)
        means = results[:self._n_means]
        param1s = self._param1s
        for result, index in zip(results[self._n_means:], self._param1s_index):
            param1s[index] = result
        print('generative_model_range', param1s, self._param1s_index, self._param1s)
        values = []
        values_min = []
        values_max = []
        for output_values, param1, log_likelihood in zip(
                means, param1s, self._log_likelihoods
        ):
            output_values_min, output_values_max = \
                log_likelihood.noise_range(output_values, [0, param1])
            values.append(output_values)
            values_min.append(output_values_min)
            values_max.append(output_values_max)
        return values_min, values, values_max

    def sample_generative_model(self, x):
        call_dict = {
            name: value for name, value in zip(self._prior_names, x)
        }
        results = self._posterior_predictive(call_dict)
        means = results[:self._n_means]
        param1s = self._param1s
        for result, index in zip(results[self._n_means:], self._param1s_index):
            param1s[index] = result
        sampled_values = []
        for output_values, param1, log_likelihood in zip(
                means, param1s, self._log_likelihoods
        ):
            output_values = \
                log_likelihood.add_noise(output_values, [0, param1])
            sampled_values.append(output_values)

        return sampled_values


class CombinedLogLikelihood(pints.LogPDF):
    """
    Creates a `PINTS.LogLikelihood` object from a list of individual
    `PINTS.LogLikelihood` objects.
    """

    def __init__(self, log_likelihoods, param_indicies):
        self._log_likelihoods = log_likelihoods
        self._param_indicies = []
        for indicies in param_indicies:
            if indicies == list(range(indicies[0], indicies[-1] + 1)):
                self._param_indicies.append(
                    slice(indicies[0], indicies[-1] + 1)
                )
            else:
                self._param_indicies.append(
                    np.array(indicies, dtype=np.int)
                )

        self._n_parameters = max([
            max(indicies)
            for indicies in param_indicies
        ]) + 1

    def __call__(self, x):
        log_like = 0
        for log_likelihood, indicies in zip(
            self._log_likelihoods, self._param_indicies
        ):
            log_like += log_likelihood(x[indicies])
        return log_like

    def get_measured_data(self):
        times = []
        values = []
        for log_likelihood, indicies in zip(
            self._log_likelihoods, self._param_indicies
        ):
            problem = log_likelihood._problem
            times.append(problem._times)
            values.append(problem._values)
        return times, values

    def generative_model_range(self, x_all):
        values = []
        values_min = []
        values_max = []
        for log_likelihood, indicies in zip(
            self._log_likelihoods, self._param_indicies
        ):
            x = x_all[indicies]
            problem = log_likelihood._problem
            if problem.n_parameters() < len(x):
                x = x[:problem.n_parameters()]
            output_values = problem.evaluate(x)
            output_values_min = np.copy(output_values)
            output_values_max = np.copy(output_values)
            noise_params = x[problem.n_parameters():]
            if isinstance(log_likelihood, pints.GaussianLogLikelihood):
                for i in range(len(output_values)):
                    dist = sps.norm(
                        loc=output_values[i],
                        scale=noise_params[0]
                    )
                    output_values_min[i] = dist.ppf(.1)
                    output_values_max[i] = dist.ppf(.9)
            elif isinstance(
                log_likelihood, pints.GaussianKnownSigmaLogLikelihood
            ):
                for i in range(len(output_values)):
                    dist = sps.norm(
                        loc=output_values[i],
                        scale=np.sqrt(1 / log_likelihood._isigma2)
                    )
                    output_values_min[i] = dist.ppf(.1)
                    output_values_max[i] = dist.ppf(.9)
            elif isinstance(log_likelihood, pints.LogNormalLogLikelihood):
                for i in range(len(output_values)):
                    dist = sps.lognorm(
                        loc=output_values[i],
                        scale=noise_params[0]
                    )
                    output_values_min[i] = dist.ppf(.1)
                    output_values_max[i] = dist.ppf(.9)

            values.append(output_values)
            values_min.append(output_values_min)
            values_max.append(output_values_max)
        return values_min, values, values_max

    def sample_generative_model(self, x_all):
        sampled_values = []
        for log_likelihood, indicies in zip(
            self._log_likelihoods, self._param_indicies
        ):
            x = x_all[indicies]
            problem = log_likelihood._problem
            if problem.n_parameters() < len(x):
                x = x[:problem.n_parameters()]
            output_values = problem.evaluate(x)
            noise_params = x[problem.n_parameters():]
            if isinstance(log_likelihood, pints.GaussianLogLikelihood):
                output_values += np.random.normal(
                    scale=noise_params[0],
                    size=output_values.shape
                )
            elif isinstance(
                log_likelihood, pints.GaussianKnownSigmaLogLikelihood
            ):
                output_values += np.random.normal(
                    scale=np.sqrt(1 / log_likelihood._isigma2),
                    size=output_values.shape
                )
            elif isinstance(log_likelihood, pints.LogNormalLogLikelihood):
                output_values += (
                    np.random.lognormal(
                        sigma=noise_params[0],
                        size=output_values.shape
                    )
                )
            sampled_values.append(output_values)

        return sampled_values

    def n_parameters(self):
        return self._n_parameters
