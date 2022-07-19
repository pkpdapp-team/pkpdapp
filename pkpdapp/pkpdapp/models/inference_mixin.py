#
# This file is part of PKPDApp (https://github.com/pkpdapp-team/pkpdapp) which
# is released under the BSD 3-clause license. See accompanying LICENSE.md for
# copyright notice and full license details.
#

from django.db import transaction
import numpy as np
import pints
import myokit
import time
import theano.tensor as tt
import theano
from tdigest import TDigest
from pkpdapp.models import (
    Inference,
    InferenceResult,
    InferenceChain, InferenceFunctionResult,
    InferenceOutputResult,
    LogLikelihood,
    Subject
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
        self._prior_lengths = [
            p.get_total_length() for p in priors
        ]
        self._prior_subjects = [
            p.get_data()[2] for p in priors
        ]
        for i, subjects in enumerate(self._prior_subjects):
            if subjects is not None:
                self._prior_subjects[i] = [
                    Subject.objects.get(id=s) for s in subjects
                ]
        self._prior_slices = []
        curr_index = 0
        for prior_length in self._prior_lengths:
            self._prior_slices.append(
                slice(curr_index, curr_index + prior_length)
            )
            curr_index += prior_length

        # InferenceOutputResult.objects.filter(
        #    chain__in=self._chains,
        # ).delete()

        # InferenceFunctionResult.objects.filter(
        #    chain__in=self._chains,
        # ).delete()

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
                for prior_slice, prior, prior_subjects in zip(
                        self._prior_slices, self._priors, self._prior_subjects
                ):
                    prior_values = x0[prior_slice]
                    if prior_subjects is None:
                        inference_results.append(InferenceResult(
                            chain=chain,
                            log_likelihood=prior,
                            iteration=iteration,
                            value=prior_values[0]
                        ))
                    else:
                        for value, subject in zip(
                                prior_values, prior_subjects
                        ):
                            inference_results.append(InferenceResult(
                                chain=chain,
                                log_likelihood=prior,
                                iteration=iteration,
                                subject=subject,
                                value=value
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
                 store_output_range=True,
                 pooled=True,
                 ):

        self._iterations = []
        self._x0_buffers = [
            [] for _ in chains
        ]

        self._chains = chains

        self._log_likelihoods = log_likelihoods
        self._pints_log_posterior = pints_log_posterior
        data = [ll.get_data() for ll in log_likelihoods]
        self._values = [d[0] for d in data]
        self._times = [d[1] for d in data]
        print('creating output thingo', pooled, 'is_pooled')
        if pooled:
            self._subjects = [
                [None for _ in values]
                for values in self._values
            ]
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
                self._unique_times, self._unique_times_index,
                self._times_index, self._times
            ):
                unique_index = 0
                for i, t in enumerate(times[1:]):
                    if t != unique_times[-1]:
                        times_index.append(i + 1)
                        unique_times.append(t)
                        unique_index += 1
                    unique_times_index.append(unique_index)
        else:
            self._subjects = [
                [Subject.objects.get(id=subject_id) for subject_id in d[2]]
                for d in data
            ]
            for subjects in self._subjects:
                print('subjects', subjects)
            self._unique_times = self._times
            self._unique_times_index = [
                list(range(len(times))) for times in self._times
            ]
            self._times_index = self._unique_times_index

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
            for log_likelihood, times, values, subjects in zip(
                self._log_likelihoods, self._times, self._values,
                self._subjects
            ):
                for time_val, value, subject in zip(times, values, subjects):
                    outputs.append(InferenceOutputResult.objects.create(
                        log_likelihood=log_likelihood,
                        chain=chain,
                        median=0,
                        percentile_min=0,
                        percentile_max=0,
                        subject=subject,
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
                    try:
                        results = \
                            self._pints_log_posterior.sample_generative_model(
                                self._pints_log_posterior.to_search(x0)
                            )
                    except myokit.SimulationError as e:
                        print(e)
                        continue
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
                try:
                    results_min, results, results_max = \
                        self._pints_log_posterior.generative_model_range(
                            self._pints_log_posterior.to_search(x0)
                        )
                except myokit.SimulationError as e:
                    print(e)
                    continue
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
        self._pooled = all([
            ll.get_total_length() == 1 for ll in self._priors
        ])
        self._prior_lengths = [
            p.get_total_length() for p in self._priors
        ]
        self._prior_slices = []
        curr_index = 0
        for prior_length in self._prior_lengths:
            self._prior_slices.append(
                slice(curr_index, curr_index + prior_length)
            )
            curr_index += prior_length
        self._prior_subjects = [
            p.get_data()[2] for p in self._priors
        ]
        for i, subjects in enumerate(self._prior_subjects):
            if subjects is not None:
                self._prior_subjects[i] = [
                    Subject.objects.get(id=s) for s in subjects
                ]

        print('priors are')
        for p in self._priors:
            print(p.name, p.form)

        # create forwards models
        self._observed_log_likelihoods = [
            ll
            for ll in log_likelihoods
            if ll.observed
        ]
        for ll in self._observed_log_likelihoods:
            print('observed', ll.name, ll.biomarker_type)

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
                print('restarting chains!')
                for prior in self._priors:
                    x0.append(
                        prior.get_results(
                            chain=chain,
                            iteration=self.inference.number_of_iterations
                        )
                    )
                x0 = np.hstack(x0)
            else:
                print('sample', [p.sample() for p in self._priors])
                x0 = np.hstack(
                    [p.sample() for p in self._priors]
                )
                if (
                    self.inference.initialization_strategy ==
                    Inference.InitializationStrategy.DEFAULT_VALUE
                ):
                    curr_index = 0
                    for xi, prior in enumerate(self._priors):
                        length = prior.get_total_length()
                        outputs = list(prior.outputs.all())
                        if (
                            len(outputs) > 0 and
                            outputs[0].variable is not None
                        ):
                            value = outputs[0].variable.get_default_value()
                            # if uniform prior then adjust default value
                            # to fall between bounds
                            if prior.form == prior.Form.UNIFORM:
                                lower, upper = \
                                    prior.get_noise_log_likelihoods()
                                if (
                                    lower.form == lower.Form.FIXED and
                                    value < lower.value
                                ):
                                    value = lower.value
                                if (
                                    upper.form == upper.Form.FIXED and
                                    value > upper.value
                                ):
                                    value = upper.value
                            x0[
                                curr_index:curr_index + length
                            ] = value
                        curr_index += length
                elif (
                    self.inference.initialization_strategy ==
                    Inference.InitializationStrategy.FROM_OTHER
                ):
                    other_chain_index = min(i, len(other_chains) - 1)
                    other_chain = other_chains[other_chain_index]
                    curr_index = 0
                    for xi, this_prior in enumerate(
                            self._priors
                    ):
                        try:
                            length = prior.get_total_length()
                            other_prior = LogLikelihood.objects.get(
                                inference=(
                                    self.inference.initialization_inference
                                ),
                                log_likelihood__name=this_prior.name
                            )
                            x0[curr_index:curr_index + length] = \
                                other_prior.get_results(
                                    chain=other_chain,
                                    iteration=other_last_iteration,
                            )

                        except InferenceResult.DoesNotExist:
                            pass

                # write x0 to empty chain
                self.inference.number_of_function_evals += 1
                print('x0', x0)
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
        for prior_slice, prior, prior_subjects in zip(
                self._prior_slices, self._priors, self._prior_subjects
        ):
            prior_values = values[prior_slice]
            if prior_subjects is None:
                InferenceResult.objects.create(
                    chain=chains[chain_index],
                    log_likelihood=prior,
                    iteration=iteration,
                    value=prior_values[0]
                )
            else:
                for value, subject in zip(
                        prior_values, prior_subjects
                ):
                    InferenceResult.objects.create(
                        chain=chains[chain_index],
                        log_likelihood=prior,
                        iteration=iteration,
                        subject=subject,
                        value=prior_values[0]
                    )

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
            store_output_range=self.inference.algorithm.category == 'SA',
            pooled=self._pooled
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
        self._original_prior_names = [
            p.name for p in priors
        ]
        self._transforms = [
            model[p.name].distribution.transform for p in priors
        ]
        self._prior_lengths = [
            p.get_total_length() for p in priors
        ]
        self._prior_slices = []
        curr_index = 0
        for prior_length in self._prior_lengths:
            if prior_length > 1:
                self._prior_slices.append(
                    slice(curr_index, curr_index + prior_length)
                )
            else:
                self._prior_slices.append(curr_index)
            curr_index += prior_length
        print('slices are', self._prior_slices)
        self._transform_names = [
            t if t is None else t.name for t in self._transforms
        ]
        self._transform_backwards = [
            self._transform_backward(t, l == 1) for t, l in zip(
                self._transforms, self._prior_lengths
            )
        ]
        self._transform_forwards = [
            self._transform_forward(t, l == 1) for t, l in zip(
                self._transforms, self._prior_lengths
            )
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
            self._exception_value = np.inf
        else:
            self._function = self._logp
            self._exception_value = -np.inf

    def n_parameters(self):
        return sum(self._prior_lengths)

    def parameter_names(self):
        return self._original_prior_names

    @staticmethod
    def _transform_forward(transform, is_scalar=True):
        if is_scalar:
            x = tt.dscalar('x')
            x.tag.test_value = 1.0
        else:
            x = tt.dvector('x')
            x.tag.test_value = [1.0]
        if transform is None:
            z = x
        else:
            z = transform.forward(x)
        return theano.function([x], z)

    @staticmethod
    def _transform_backward(transform, is_scalar=True):
        if is_scalar:
            x = tt.dscalar('x')
            x.tag.test_value = 1.0
        else:
            x = tt.dvector('x')
            x.tag.test_value = [1.0]
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
        y = x.copy()
        for prior_index, prior_slice in enumerate(self._prior_slices):
            y[prior_slice] = \
                self._transform_forwards[prior_index](
                    y[prior_slice]
            )
        return y

    def to_model(self, x):
        y = x.copy()
        for prior_index, prior_slice in enumerate(self._prior_slices):
            y[prior_slice] = \
                self._transform_backwards[prior_index](
                    y[prior_slice]
            )
        return y

    def get_call_dict_from_params(self, x):
        return {
            self._prior_names[prior_index]: x[prior_slice]
            for prior_index, prior_slice in enumerate(self._prior_slices)
        }

    def __call__(self, x):
        call_dict = self.get_call_dict_from_params(x)
        try:
            result = self._function(call_dict)
        except myokit.SimulationError as e:
            print('ERROR in forward simulation at params:')
            print(call_dict)
            print(e)
            result = self._exception_value
        return result

    def generative_model_range(self, x):
        call_dict = self.get_call_dict_from_params(x)
        results = self._posterior_predictive(call_dict)

        means = results[:self._n_means]
        param1s = self._param1s
        for result, index in zip(results[self._n_means:], self._param1s_index):
            param1s[index] = result
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
        call_dict = self.get_call_dict_from_params(x)
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
