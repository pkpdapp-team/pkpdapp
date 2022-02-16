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

        # create a dictionary of key-value pairs for fixed parameters of Myokit
        # model

        # create pints forward model
        self._pints_forward_model = self.create_pints_forward_model(
            self._outputs, inference
        )

        self._collection = self.create_pints_problem_collection(
            self._pints_forward_model, self._times, self._values, self._outputs
        )

        # We'll use the variable ordering based on the forwards model.
        pints_var_names = self._pints_forward_model.variable_parameter_names()

        # we'll need the priors in the same order as the theta vector,
        # so we can write back to the database
        self.priors_in_pints_order = [
            inference.priors.get(variable__qname=name)
            for name in pints_var_names
        ]

        # this function returns the noise priors in the right order
        self._pints_log_likelihood, noise_priors = \
            self.create_pints_log_likelihood(
                self._collection, inference
            )

        # add noise priors to the list
        self.priors_in_pints_order += noise_priors

        # get priors / boundaries, using variable ordering already established
        (
            self._pints_log_priors,
            self._pints_boundaries,
            self._pints_transforms
        ) = self.get_priors_boundaries_transforms(
            inference, self.priors_in_pints_order
        )

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
        for i, chain in enumerate(inference.chains.all()):
            x0 = []
            if self.inference.number_of_iterations > 0:
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
                    for i, prior in enumerate(self.priors_in_pints_order):
                        if prior.variable is not None:
                            x0[i] = prior.variable.get_default_value()

                sim = self._pints_forward_model.simulate(x0, self._times[0])

                plt.plot(self._times[0], sim, label='sim')
                plt.plot(self._times[0], self._values[0], label='data')
                plt.legend()
                plt.savefig('test.pdf')

                # write x0 to empty chain
                self.inference.number_of_function_evals += 1
                fn_val = self._pints_log_posterior(
                    self._pints_composed_transform.to_search(x0)
                )
                print('starting function value', fn_val)
                self.write_inference_results(x0, fn_val,
                                             self.inference.number_of_iterations, i)

            if self._pints_boundaries is None:
                self._inference_objects.append(
                    self._inference_method(
                        self._pints_composed_transform.to_search(x0),
                    )
                )
            else:
                print('x0', x0)
                print('transformed x0', self._pints_composed_transform.to_search(x0))
                print('boundaries', self._pints_boundaries)
                self._inference_objects.append(
                    self._inference_method(
                        self._pints_composed_transform.to_search(x0),
                        boundaries=self._pints_boundaries
                    )
                )

    @staticmethod
    def create_pints_forward_model(
            outputs, inference,
    ):
        model = inference.get_model()

        myokit_model = model.get_myokit_model()

        myokit_simulator = model.get_myokit_simulator()

        output_names = [output.qname for output in outputs]

        # get all myokit names
        all_myokit_variables = model.variables.filter(
            Q(constant=True) | Q(state=True)
        )

        # myokit: inputs and outputs
        myokit_pnames = [param.qname
                         for
                         param in all_myokit_variables]

        # get myokit parameters minus outputs: i.e. just input parameters
        fitted_parameter_names = [
            prior.variable.qname
            for prior in inference.priors.all()
            if prior.variable is not None
        ]
        myokit_minus_fixed = [item
                              for
                              item in myokit_pnames
                              if item not in fitted_parameter_names]

        # get index of variables in named list
        fixed_variables = [all_myokit_variables[myokit_pnames.index(v)]
                           for v in myokit_minus_fixed]

        fixed_parameters_dict = {
            param.qname: param.get_default_value()
            for param in fixed_variables
        }

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
        priors = []
        for problem, log_likelihood in zip(problems, log_likelihoods):
            if log_likelihood.form == LogLikelihood.Form.NORMAL:
                if log_likelihood.parameters.first().value is not None:
                    value = log_likelihood.parameters.first().value
                    pints_log_likelihoods.append(
                        pints.GaussianKnownSigmaLogLikelihood(
                            problem, value
                        )
                    )
                else:
                    priors.append(
                        log_likelihood.parameters.first().priors.first()
                    )
                    pints_log_likelihoods.append(
                        pints.GaussianLogLikelihood(problem)
                    )
            elif log_likelihood.form == LogLikelihood.Form.LOGNORMAL:
                priors.append(
                    log_likelihood.parameters.first().priors.first()
                )
                pints_log_likelihoods.append(
                    pints.LogNormalLogLikelihood(problem)
                )

        # combine them
        return CombinedLogLikelihood(
            *pints_log_likelihoods
        ), priors

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
    def prior_to_pints_prior(prior):
        if isinstance(prior, PriorUniform):
            lower = prior.lower
            upper = prior.upper
            pints_log_prior = pints.UniformLogPrior(lower, upper)
        elif isinstance(prior, PriorNormal):
            mean = prior.mean
            sd = prior.sd
            pints_log_prior = pints.GaussianLogPrior(mean, sd)
        return pints_log_prior

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
            pints_log_priors.append(self._prior_to_pints_prior(prior))

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
        for i, prior in self.priors_in_pints_order:
            InferenceResult.objects.create(
                chain=chains[chain_index],
                prior=prior,
                iteration=iteration,
                value=values[i])

        # free up connection since this is probably going to be in a loop
        connection.close()

    def step_inference(self):
        # runs one set of ask / tell
        for idx, obj in enumerate(self._inference_objects):
            x = obj.ask()
            if self._inference_type == "SA":  # sampling
                score = self._pints_log_posterior(x)
                self.inference.number_of_function_evals += 1
                x, score, _ = obj.tell(score)
                if idx == 0:
                    print('chain {}, x = {}, score = {}'.format(idx, x, score))
            else:
                scores = [self._pints_log_posterior(xi) for xi in x]
                self.inference.number_of_function_evals += len(x)
                obj.tell(scores)
                x = obj.xbest()
                score = obj.fbest()
                if idx == 0:
                    print('chain {}, x = {}, score = {}'.format(idx, x, score, scores))
            self.write_inference_results(
                self._pints_composed_transform.to_model(x),
                score, self.inference.number_of_iterations, idx
            )

    def run_inference(self):
        # runs ask / tell
        time_start = time.time()
        max_iterations = self.inference.max_number_of_iterations
        n_iterations = self.inference.number_of_iterations
        for i in range(n_iterations, max_iterations):
            self.inference.number_of_iterations += 1
            self.step_inference()
            time_now = time.time()
            self.inference.time_elapsed = time_now - time_start
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
        self._myokit_parameter_slice = slice(
            start=0,
            end=self._n_myokit_parameters
        )

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
                slice(
                    start=curr_index,
                    end=curr_index + n_noise_parameters
                )
            )
            curr_index += n_noise_parameters
            self._n_noise_parameters += n_noise_parameters

    def __call__(self, x):
        # use pre-calculated slices to get the parameter vector for each
        # log-likelihood
        log_like = 0
        for noise_slice, ll in zip(self._noise_parameter_slices, self._log_likelihoods):
            log_like += ll(
                np.concatenate((
                    x[self._myokit_parameter_slice],
                    x[noise_slice]
                ))
            )
        return log_like

    def n_parameters(self):
        return self._n_myokit_parameters + self._n_noise_parameters
