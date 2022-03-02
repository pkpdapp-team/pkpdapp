#
# This file is part of PKPDApp (https://github.com/pkpdapp-team/pkpdapp) which
# is released under the BSD 3-clause license. See accompanying LICENSE.md for
# copyright notice and full license details.
#

from django.db.models import Q
from django.db.models import Max
import matplotlib.pylab as plt
from time import perf_counter
import numpy as np
from django.db import connection
import pints
import time
from pkpdapp.models import (
    MyokitForwardModel, LogLikelihood,
    LogLikelihoodParameter, Inference,
    PriorNormal, PriorUniform, InferenceResult,
    InferenceChain, InferenceFunctionResult)

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





class InferenceMixin:
    def __init__(self, inference):

        # get biomarkers
        self._biomarker_types, self._outputs = (
            self.get_biomarker_types_and_output_variables(inference)
        )
        self._n_outputs = len(self._outputs)

        # # select inference methods
        self._inference_type, self._inference_method = (
            self.get_inference_type_and_method(inference)
        )

        # get data and time points as lists of lists
        dfs = [output.as_pandas() for output in self._biomarker_types]
        self._values = [df['values'].tolist() for df in dfs]
        self._times = [df['times'].tolist() for df in dfs]

        # types needed later
        self.inference = inference

        # get model parameters to be inferred
        # TODO: only one log_likelihood!
        log_likelihood = inference.log_likelihoods.first()
        log_likelihood_priors = [
            param.prior
            for param in log_likelihood.parameters.all()
            if not param.is_fixed()
        ]
        fitted_parameter_names = [
            param.variable.qname
            for param in log_likelihood.parameters.all()
            if not param.is_fixed() and param.is_model_variable()
        ]

        # create pints forward model
        # TODO: only supports a single log_likelihood
        self._pints_forward_model = self.create_pints_forward_model(
            self._outputs, log_likelihood, fitted_parameter_names
        )

        self._collection = self.create_pints_problem_collection(
            self._pints_forward_model, self._times, self._values, self._outputs
        )

        # We'll use the variable ordering based on the forwards model.
        pints_var_names = self._pints_forward_model.variable_parameter_names()

        # we'll need the priors in the same order as the theta vector,
        # so we can write back to the database
        self.priors_in_pints_order = [
            [prior for prior in log_likelihood_priors
             if prior.is_match(name)][0]
            for name in pints_var_names
        ]

        # add remaining (noise) priors to the end
        self.priors_in_pints_order += [
            prior for prior in log_likelihood_priors
            if not prior.is_model_variable_prior()
        ]

        self._pints_log_likelihood = \
            self.create_pints_log_likelihood(
                self._collection, inference
            )

        # get priors / boundaries, using variable ordering already established
        (
            self._pints_log_priors,
            self._pints_boundaries,
            self._pints_transforms
        ) = self.get_priors_boundaries_transforms(self.priors_in_pints_order)

        self._pints_composed_log_prior = pints.ComposedLogPrior(
            *self._pints_log_priors
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
            raise RuntimeError('number of chains not equal to chains in database')

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
                    for xi, this_prior in enumerate(self.priors_in_pints_order):
                        try:
                            last_result = last_values.get(
                                prior__log_likelihood_parameter__name=(
                                    this_prior.log_likelihood_parameter.name
                                )
                            )
                            x0[xi] = last_result.value
                        except InferenceResult.DoesNotExist:
                            pass


                #sim = self._pints_forward_model.simulate(x0, self._times[0])

                #plt.plot(self._times[0], sim, label='sim')
                #plt.plot(self._times[0], self._values[0], label='data')
                #plt.legend()
                #plt.savefig('test.pdf')

                # write x0 to empty chain
                self.inference.number_of_function_evals += 1
                fn_val = self._pints_log_posterior(
                    self._pints_composed_transform.to_search(x0)
                )
                print('starting function value', fn_val)
                self.write_inference_results(x0, fn_val,
                                             self.inference.number_of_iterations, i)

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
                print('x0', x0)
                print('transformed x0', self._pints_composed_transform.to_search(x0))
                print('boundaries', self._pints_boundaries)
                self._inference_objects.append(
                    self._inference_method(
                        x0, boundaries=self._pints_boundaries
                    )
                )

    @staticmethod
    def create_pints_forward_model(
            outputs, log_likelihood, fitted_parameter_names
    ):
        model = log_likelihood.variable.get_model()

        myokit_model = model.get_myokit_model()

        myokit_simulator = model.get_myokit_simulator()

        output_names = [output.qname for output in outputs]

        fixed_parameters_dict = {
            param.variable.qname: param.value
            for param in log_likelihood.parameters.all()
            if param.is_model_variable() and param.is_fixed()
        }
        print('passing fixed_parameters_dict', fixed_parameters_dict)

        return MyokitForwardModel(myokit_simulator, myokit_model,
                                  output_names,
                                  fixed_parameters_dict)

    @staticmethod
    def create_pints_problem_collection(model, times, values, outputs):
        # create a problem collection to handle the case when the outputs or
        # times are wragged
        times_values = []
        for i in range(len(outputs)):
            times_values.append(times[i])
            times_values.append(values[i])
        return pints.ProblemCollection(model, *times_values)

    @staticmethod
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

    @staticmethod
    def get_inference_type_and_method(inference):
        inference_type = inference.algorithm.category
        methodname = inference.algorithm.name
        if inference_type == 'SA':
            method_dict = samplers_dict
        else:
            method_dict = optimisers_dict
        inference_method = method_dict[methodname]
        return inference_type, inference_method

    @staticmethod
    def get_biomarker_types_and_output_variables(inference):
        objs = inference.log_likelihoods.all()
        biomarker_types = []
        output_variables = []
        for obj in objs:
            biomarker_types.append(obj.biomarker_type)
            output_variables.append(obj.variable)
        return biomarker_types, output_variables

    @staticmethod
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

    @staticmethod
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
                pints_transforms.append(pints.LogTransformation(n_parameters=1))
            else:
                pints_transforms.append(pints.IdentityTransformation(n_parameters=1))
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

    def step_inference(self, writer):
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
        writer = ChainWriter(
            self.inference.chains.all(),
            self.priors_in_pints_order,
            write_every_n_iteration
        )
        for i in range(n_iterations, max_iterations):
            if i == initial_phase_iterations:
                print('Turning off initial phase')
                for sampler in self._inference_objects:
                    sampler.set_initial_phase(False)

            self.inference.number_of_iterations += 1
            self.step_inference(writer)
            time_now = time.time()
            self.inference.time_elapsed = time_now - time_start

            if i % write_every_n_iteration == 0:
                self.inference.save()

        # write out the remaining iterations
        writer.write()
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

        self._n_myokit_parameters = self._log_likelihoods[0]._problem.n_parameters()

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
        for noise_slice, ll in zip(self._noise_parameter_slices, self._log_likelihoods):
            params = np.concatenate((
                x[self._myokit_parameter_slice],
                x[noise_slice]
            ))
            log_like += ll(params)
        return log_like

    def n_parameters(self):
        return self._n_myokit_parameters + self._n_noise_parameters
