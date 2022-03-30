#
# This file is part of PKPDApp (https://github.com/pkpdapp-team/pkpdapp) which
# is released under the BSD 3-clause license. See accompanying LICENSE.md for
# copyright notice and full license details.
#

from django.db import transaction
import numpy as np
import pints
import time
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
                        prior=prior,
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
                 times, values, pints_forward_model,
                 log_likelihood,
                 priors,
                 use_every_n_sample=1,
                 buffer_size=100,
                 store_output_range=True):
        self._tdigests = [
            [TDigest() for _ in times] for _ in chains
        ]
        self._iterations = []
        self._x0_buffers = [
            [] for _ in chains
        ]

        self._chains = chains
        self._priors = priors
        self._noise_param_indices = []
        for i, prior in enumerate(priors):
            if not prior.log_likelihood_parameter.is_model_variable():
                self._noise_param_indices.append(i)
        self._fixed_noise_params = []
        for param in log_likelihood.parameters.all():
            if param.is_fixed() and not param.is_model_variable():
                self._fixed_noise_params.append(param.value)

        self._log_likelihood = log_likelihood
        self._pints_forward_model = pints_forward_model
        self._len_x0 = pints_forward_model.n_parameters()
        self._times = times
        self._values = values
        self._n_times = len(times)
        self._use_every_n_sample = use_every_n_sample
        self._store_output_range = store_output_range
        self._outputs = self.initialise_outputs()
        self._buffer = 0
        self._buffer_size = buffer_size
        self._updated = False

    def initialise_outputs(self):
        outputs = InferenceOutputResult.objects.filter(
            chain__in=self._chains
        )
        if len(outputs) != len(self._times) * len(self._chains):
            InferenceOutputResult.objects.filter(
                chain__in=self._chains,
                log_likelihood=self._log_likelihood
            ).delete()
            outputs = []
            for chain in self._chains:
                for i in range(self._n_times):
                    outputs.append(InferenceOutputResult.objects.create(
                        log_likelihood=self._log_likelihood,
                        chain=chain,
                        median=0,
                        percentile_min=0,
                        percentile_max=0,
                        data=self._values[0][i],
                        time=self._times[i]
                    ))
        return outputs

    def append(self, x0s, iteration):
        for buffer, x0 in zip(self._x0_buffers, x0s):
            buffer.append(x0)
        self._iterations.append(iteration)
        if len(self._iterations) > self._buffer_size:
            self.write()

    def write(self):
        output_index = 0
        for x0_buffer, tdigests, chain in zip(
                self._x0_buffers, self._tdigests, self._chains
        ):
            if self._store_output_range:
                for iteration, x0 in zip(
                        self._iterations, x0_buffer
                ):
                    if iteration % self._use_every_n_sample != 0:
                        continue
                    result = self._pints_forward_model.simulate(
                        x0[:self._len_x0], self._times
                    )

                    noise_params = (
                        [x0[i] for i in self._noise_param_indices] +
                        self._fixed_noise_params
                    )
                    result = self._log_likelihood.add_noise(
                        result, noise_params
                    )

                    for i in range(self._n_times):
                        value = result[i]
                        tdigests[i].update(value)

                for i in range(self._n_times):
                    maximum = tdigests[i].percentile(90)
                    minimum = tdigests[i].percentile(10)
                    median = tdigests[i].percentile(50)
                    self._outputs[output_index].median = median
                    self._outputs[output_index].percentile_min = minimum
                    self._outputs[output_index].percentile_max = maximum
                    output_index += 1
            else:
                # just use the last parameter values
                x0 = x0_buffer[-1]
                result = self._pints_forward_model.simulate(
                    x0[:self._len_x0], self._times
                )
                noise_params = (
                    [x0[i] for i in self._noise_param_indices] +
                    self._fixed_noise_params
                )
                result_min, result_max = self._log_likelihood.noise_range(
                    result, noise_params
                )
                for i in range(self._n_times):
                    self._outputs[output_index].median = result[i]
                    self._outputs[output_index].percentile_min = result_min[i]
                    self._outputs[output_index].percentile_max = result_max[i]
                    output_index += 1

        with transaction.atomic():
            [output.save() for output in self._outputs]

        self._iterations = []
        self._x0_buffers = [
            [] for _ in self._chains
        ]


class InferenceMixin:
    def __init__(self, inference):

        # # select inference methods
        self._inference_type, self._inference_method = (
            self.get_inference_type_and_method(inference)
        )

        # types needed later
        self.inference = inference

        # get model parameters to be inferred
        self._log_likelihoods = inference.log_likelihoods.all()

        # this list defines the ordering in the parameter vector
        # for the sampler
        self._priors = [
            ll
            for ll in self._log_likelihoods
            if ll.is_a_prior()
        ]

        # create forwards models
        self._model_log_likelihoods = [
            ll
            for ll in self._log_likelihoods
            if ll.get_model() is not None
        ]

        # generate forward models from top-level model log_likelihoods
        self._pints_forward_models = [
            ll.create_pints_forward_model()
            for ll in self._model_log_likelihoods
        ]

        # get priors / boundaries, using variable ordering already established
        (
            self._pints_log_priors,
            self._pints_boundaries,
            self._pints_transforms
        ) = self.get_priors_boundaries_transforms(self.priors)

        self._pints_composed_log_prior = pints.ComposedLogPrior(
            *self._pints_log_priors
        )

        # get data
        self._values, self._times = (
            self.get_data(
                self._log_likelihoods, self._pints_forward_model,
                self.priors_in_pints_order, self._pints_composed_log_prior
            )
        )
        self._times_all = np.sort(list(set(np.concatenate(self._times))))

        self._collection = self.create_pints_problem_collection(
            self._pints_forward_model, self._times, self._values, self._outputs
        )

        self._pints_log_likelihood = self.create_pints_log_likelihood(
            self._collection, inference
        )

        self._pints_composed_transform = pints.ComposedTransformation(
            *self._pints_transforms
        )
        self._pints_log_posterior = pints.LogPosterior(
            self._pints_log_likelihood,
            self._pints_composed_log_prior
        )

        # transform function and boundaries
        self._pints_log_posterior = (
            self._pints_composed_transform.convert_log_pdf(
                self._pints_log_posterior
            )
        )
        if self._pints_boundaries is not None:
            self._pints_boundaries = (
                self._pints_composed_transform.convert_boundaries(
                    self._pints_boundaries
                )
            )

        # if doing an optimisation use a probability based error to maximise
        # the posterior
        if inference.algorithm.category == 'OP':
            self._pints_log_posterior = (
                pints.ProbabilityBasedError(
                    self._pints_log_posterior
                )
            )
        # if doing a sampler, we can't use boundaries
        else:
            self._pints_boundaries = None

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
                for prior in self.priors_in_pints_order:
                    this_chain = InferenceResult.objects.filter(
                        prior=prior,
                        chain=chain
                    )
                    x0.append(
                        this_chain.get(
                            iteration=self.inference.number_of_iterations
                        ).value
                    )
                x0 = np.array(x0)
            else:
                x0 = self._pints_composed_log_prior.sample().flatten()
                if (
                    self.inference.initialization_strategy ==
                    Inference.InitializationStrategy.DEFAULT_VALUE
                ):
                    for xi, prior in enumerate(self.priors_in_pints_order):
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
                            self.priors_in_pints_order
                    ):
                        try:
                            last_result = last_values.get(
                                prior__log_likelihood_parameter__name=(
                                    this_prior.log_likelihood_parameter.name
                                )
                            )
                            x0[xi] = last_result.value
                        except InferenceResult.DoesNotExist:
                            pass

                # sim = self._pints_forward_model.simulate(x0, self._times[0])

                # plt.plot(self._times[0], sim, label='sim')
                # plt.plot(self._times[0], self._values[0], label='data')
                # plt.legend()
                # plt.savefig('test.pdf')

                # write x0 to empty chain
                self.inference.number_of_function_evals += 1
                fn_val = self._pints_log_posterior(
                    self._pints_composed_transform.to_search(x0)
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
            sigma0 = np.diag(0.01 * sigma0)
            sigma0 = self._pints_composed_transform.convert_covariance_matrix(
                sigma0, x0
            )
            x0 = self._pints_composed_transform.to_search(x0)
            if self._pints_boundaries is None:
                self._inference_objects.append(
                    self._inference_method(x0, sigma0)
                )
            else:
                self._inference_objects.append(
                    self._inference_method(
                        x0, boundaries=self._pints_boundaries
                    )
                )

    @ staticmethod
    def create_pints_problem_collection(model, times, values, outputs):
        # create a problem collection to handle the case when the outputs or
        # times are wragged
        times_values = []
        for i in range(len(outputs)):
            times_values.append(times[i])
            times_values.append(values[i])
        return pints.ProblemCollection(model, *times_values)

    @ staticmethod
    def create_pints_log_likelihood(
            collection, inference,
    ):
        log_likelihoods = inference.log_likelihoods.all()

        n_outputs = len(log_likelihoods)

        problems = [collection.subproblem(i) for i in range(n_outputs)]

        # instantiate PINTS log-likelihoods
        pints_log_likelihoods = []
        for problem, log_likelihood in zip(problems, log_likelihoods):
            if log_likelihood.form == LogLikelihood.Form.NORMAL:
                noise_param = log_likelihood.parameters.get(
                    variable__isnull=True
                )
                if noise_param.is_fixed():
                    value = noise_param.value
                    pints_log_likelihoods.append(
                        pints.GaussianKnownSigmaLogLikelihood(
                            problem, value
                        )
                    )
                else:
                    pints_log_likelihoods.append(
                        pints.GaussianLogLikelihood(problem)
                    )
            elif log_likelihood.form == LogLikelihood.Form.LOGNORMAL:
                pints_log_likelihoods.append(
                    pints.LogNormalLogLikelihood(problem)
                )

        # combine them
        return CombinedLogLikelihood(
            *pints_log_likelihoods
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

    @ staticmethod
    def get_data(log_likelihoods, pints_forward_model, priors_in_pints_order,
                 pints_composed_log_prior):

        # if we're using fake data sample from composed prior
        # and store the values
        use_fake_data = any([
            ll.biomarker_type is None for ll in log_likelihoods
        ])
        if use_fake_data:
            t_max = max([
                ll.get_model().time_max for ll in log_likelihoods
            ])
            fake_data_times = np.linspace(0, t_max, 20)
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

    @ staticmethod
    def get_objectives(inference):
        # determine objective function and observed biomarker types
        # to simulate
        objs = inference.log_likelihoods.all()
        observed_loglikelihoods = []
        for obj in objs:
            if obj.form == LogLikelihood.Form.NORMAL:
                if obj.parameters.first().value is not None:
                    observed_loglikelihoods.append(
                        pints.GaussianKnownSigmaLogLikelihood)
                else:
                    observed_loglikelihoods.append(pints.GaussianLogLikelihood)

                observed_loglikelihoods.append(pints.GaussianLogLikelihood)
            elif obj.form == LogLikelihood.Form.LOGNORMAL:
                observed_loglikelihoods.append(pints.LogNormalLogLikelihood)
        return observed_loglikelihoods

    @ staticmethod
    def get_priors_boundaries_transforms(priors):
        # get all variables being fitted from priors
        pints_log_priors = []
        pints_transforms = []
        if all([isinstance(p, PriorUniform) for p in priors]):
            lower = [p.lower for p in priors]
            upper = [p.upper for p in priors]
            pints_boundaries = pints.RectangularBoundaries(lower, upper)
        else:
            pints_boundaries = None
        for prior in priors:
            # if prior.variable.is_log:
            if False:
                pints_transforms.append(
                    pints.LogTransformation(n_parameters=1)
                )
            else:
                pints_transforms.append(
                    pints.IdentityTransformation(n_parameters=1)
                )
            if isinstance(prior, PriorUniform):
                lower = prior.lower
                upper = prior.upper
                pints_log_prior = pints.UniformLogPrior(lower, upper)
            elif isinstance(prior, PriorNormal):
                mean = prior.mean
                sd = prior.sd
                pints_log_prior = pints.GaussianLogPrior(mean, sd)
            pints_log_priors.append(pints_log_prior)

        return pints_log_priors, pints_boundaries, pints_transforms

    def get_myokit_model(self):
        return self._myokit_model

    def write_inference_results(self, values, fn_value, iteration,
                                chain_index):
        # Writes inference results to one chain
        chains = self.inference.chains.all()
        InferenceFunctionResult.objects.create(
            chain=chains[chain_index],
            iteration=iteration,
            value=fn_value
        )
        for i, prior in enumerate(self.priors_in_pints_order):
            InferenceResult.objects.create(
                chain=chains[chain_index],
                prior=prior,
                iteration=iteration,
                value=values[i])

    def step_inference(self, writer, output_writer):
        # runs one set of ask / tell
        fn_values = []
        x0s = []
        for idx, obj in enumerate(self._inference_objects):
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

            x0s.append(self._pints_composed_transform.to_model(x))
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
            dimensions = len(self.priors_in_pints_order)
            initial_phase_iterations = 500 * dimensions
            if n_iterations < initial_phase_iterations:
                print('Turning on initial phase')
                for sampler in self._inference_objects:
                    sampler.set_initial_phase(True)

        write_every_n_iteration = 100
        evaluate_model_every_n_iterations = 1

        writer = ChainWriter(
            self.inference.chains.all(),
            self.priors_in_pints_order,
            write_every_n_iteration,
        )

        output_writer = OutputWriter(
            self.inference.chains.all(),
            self._times_all,
            self._values,
            self._pints_forward_model,
            self.inference.log_likelihoods.first(),
            self.priors_in_pints_order,
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
                    ]
                )

        # write out the remaining iterations
        writer.write()
        output_writer.write()
        self.inference.save()

    def fixed_variables(self):
        return self._fixed_variables


class CombinedLogLikelihood(pints.LogPDF):
    """
    Creates a `PINTS.LogLikelihood` object from a list of individual
    `PINTS.LogLikelihood` objects.
    """

    def __init__(self, *log_likelihoods):
        self._log_likelihoods = [ll for ll in log_likelihoods]
        self._n_outputs = len(self._log_likelihoods)

        self._n_myokit_parameters = \
            self._log_likelihoods[0]._problem.n_parameters()

        # the myokit forwards model parameters are at the start of the
        # parameter vector
        self._myokit_parameter_slice = slice(0, self._n_myokit_parameters)

        # we're going to put all the noise parameters for each log-likelihood
        # at the end of the parameter vector, so loop through them all and
        # pre-calculate the slice of the parameter vector corrseponding to
        # the noise parameters for each log_likelihood
        curr_index = self._n_myokit_parameters
        self._n_noise_parameters = 0
        self._noise_parameter_slices = []
        for ll in self._log_likelihoods:
            n_noise_parameters = ll.n_parameters() - self._n_myokit_parameters
            self._noise_parameter_slices.append(
                slice(curr_index, curr_index + n_noise_parameters)
            )
            curr_index += n_noise_parameters
            self._n_noise_parameters += n_noise_parameters

    def __call__(self, x):
        # use pre-calculated slices to get the parameter vector for each
        # log-likelihood
        log_like = 0
        for noise_slice, ll in zip(
                self._noise_parameter_slices, self._log_likelihoods
        ):
            params = np.concatenate((
                x[self._myokit_parameter_slice],
                x[noise_slice]
            ))
            log_like += ll(params)
        return log_like

    def n_parameters(self):
        return self._n_myokit_parameters + self._n_noise_parameters
