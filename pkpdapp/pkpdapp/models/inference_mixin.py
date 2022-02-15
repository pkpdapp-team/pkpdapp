#
# This file is part of PKPDApp (https://github.com/pkpdapp-team/pkpdapp) which
# is released under the BSD 3-clause license. See accompanying LICENSE.md for
# copyright notice and full license details.
#

from django.db.models import Q
from django.db.models import Max
import matplotlib.pylab as plt
from time import perf_counter
from django.db import connection
import pints
import time
from pkpdapp.models import (
    MyokitForwardModel, LogLikelihoodNormal,
    LogLikelihoodLogNormal,
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

        model = inference.get_model()

        self._myokit_model = model.get_myokit_model()

        self._myokit_simulator = model.get_myokit_simulator()

        # get biomarkers
        self._biomarker_types, self._outputs = (
            self.get_biomarker_types_and_output_variables(inference)
        )
        self._n_outputs = len(self._outputs)

        # get objectives and fixed noise parameters (we assume they are fixed
        # for now)
        self._observed_loglikelihoods, self._noise_parameter_values = (
            self.get_objectives(inference)
        )

        # get priors / boundaries
        self.priors = inference.priors.all()
        self._pints_log_priors, self._pints_boundaries, self._pints_transforms = (
            self.get_priors_boundaries_transforms(self.priors)
        )

        # get all the constant and state variable names associated with
        # the Myokit model
        all_myokit_variables = model.variables.filter(
            Q(constant=True) | Q(state=True)
        )

        # get fitted parameters: note this will include all parameters,
        # including noise parameters which are not used by Myokit models
        self.fitted_variables = self.get_fitted_variables(self.priors)

        # create a dictionary of key-value pairs for fixed parameters of Myokit
        # model
        self._fixed_parameters_dict = self.create_fixed_parameter_dictionary(
            all_myokit_variables, self.fitted_variables)

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

        # create pints classes
        self._pints_forward_model = self.create_pints_forward_model(
            self._outputs, self._myokit_simulator, self._myokit_model,
            self._fixed_parameters_dict
        )
        self._collection = self.create_pints_problem_collection(
            self._pints_forward_model, self._times, self._values, self._outputs
        )

        self._pints_log_likelihood = self.create_pints_log_likelihood(
            self._collection, self._n_outputs, self._noise_parameter_values,
            self._observed_loglikelihoods
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

        # Creates an initialised sampling / optimisation method that can be
        # called by ask / tell

        # Create lookup for fitted variables (from priors) -> pints variables
        pints_var_names = self._pints_forward_model.variable_parameter_names()
        variables = self.fitted_variables
        priors_var_names = [v.qname for v in variables]

        self._django_to_pints_lookup = {
            qname: pints_var_names.index(qname)
            for qname in priors_var_names
        }
        self._pints_to_django_lookup = {
            qname: priors_var_names.index(qname)
            for qname in pints_var_names
        }

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
                for name in pints_var_names:
                    this_chain = InferenceResult.objects.filter(
                        prior=self.fitted_variables[
                            self._pints_to_django_lookup(name)
                        ],
                        chain=chain
                    )
                    x0.append(this_chain.get(iteration=self.inference.number_of_iterations).value)
            else:
                x0 = self._pints_composed_log_prior.sample().flatten()

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
                self._inference_objects.append(
                    self._inference_method(
                        self._pints_composed_transform.to_search(x0),
                        boundaries=self._pints_boundaries
                    )
                )

    def create_fixed_parameter_dictionary(self, all_myokit_parameters,
                                          fitted_parameters):

        # myokit: inputs and outputs
        myokit_pnames = [param.qname
                         for
                         param in all_myokit_parameters]

        # parameters being fit: currently this gets only Myokit parameters
        fitted_parameter_names = [param.qname
                                  for
                                  param in fitted_parameters]

        # get myokit parameters minus outputs: i.e. just input parameters
        myokit_minus_fixed = [item
                              for
                              item in myokit_pnames
                              if item not in fitted_parameter_names]

        # get index of variables in named list
        self._fixed_variables = [all_myokit_parameters[myokit_pnames.index(v)]
                                 for v in myokit_minus_fixed]

        fixed_parameter_dictionary = {
            param.qname: param.get_default_value()
            for param in self._fixed_variables
        }
        return fixed_parameter_dictionary

    @staticmethod
    def create_pints_forward_model(
            outputs, myokit_simulator, myokit_model, fixed_parameters_dict
    ):
        output_names = [output.qname for output in outputs]

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
            collection, n_outputs, noise_parameter_values,
            observed_loglikelihoods
    ):
        problems = [collection.subproblem(i) for i in range(n_outputs)]

        # these are the PINTS methods
        log_like_methods = observed_loglikelihoods

        # instantiate PINTS log-likelihoods
        log_likes = []
        for i in range(n_outputs):
            log_likes.append(log_like_methods[i](problems[i]))

        # combine them
        return CombinedLogLikelihood(
            noise_parameter_values,
            *log_likes
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
        objs = inference.objective_functions.all()
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
        objs = inference.objective_functions.all()
        observed_loglikelihoods = []
        noise_parameters = []
        for obj in objs:
            if isinstance(obj, LogLikelihoodNormal):
                observed_loglikelihoods.append(pints.GaussianLogLikelihood)
                noise_parameters.append(obj.sd)
            elif isinstance(obj, LogLikelihoodLogNormal):
                observed_loglikelihoods.append(pints.LogNormalLogLikelihood)
                noise_parameters.append(obj.sigma)
        return observed_loglikelihoods, noise_parameters

    @staticmethod
    def get_fitted_variables(priors):
        fitted_parameters = []
        for prior in priors:
            fitted_parameters.append(prior.variable)
        return fitted_parameters

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
                pints_log_priors.append(pints.UniformLogPrior(lower, upper))
            elif isinstance(prior, PriorNormal):
                mean = prior.mean
                sd = prior.sd
                pints_log_priors.append(pints.GaussianLogPrior(mean, sd))
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
        for prior in self.priors:
            value = values[self._pints_to_django_lookup[prior.variable.qname]]
            InferenceResult.objects.create(
                chain=chains[chain_index],
                prior=prior,
                iteration=iteration,
                value=value)

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
                if idx == 1:
                    print('chain {}, x = {}, score = {}'.format(idx, x, score))
            else:
                scores = [self._pints_log_posterior(xi) for xi in x]
                self.inference.number_of_function_evals += len(x)
                obj.tell(scores)
                x = obj.xbest()
                score = obj.fbest()
                if idx == 1:
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
    `PINTS.LogLikelihood` objects. It is assumed that each individual
    log_likelihood has a single noise parameter.
    """

    def __init__(self, fixed_noise_parameter_values, *log_likelihoods):
        self._log_likelihoods = [ll for ll in log_likelihoods]
        self._n_outputs = len(self._log_likelihoods)

        self._n_myokit_parameters = self._log_likelihoods[0].n_parameters() - 1

        # assume each log-likelihood has fixed noise parameter
        # TODO:  add self._n_outputs to this to allow noise-parameters
        self._n_parameters = self._n_myokit_parameters

        if len(fixed_noise_parameter_values) != self._n_outputs:
            raise ValueError(
                "Fixed parameter values must be same length as outputs.")
        self._fixed_noise_parameters = fixed_noise_parameter_values

    def __call__(self, x):
        # assumes noise parameters are at end of parameter list
        noise_parameters = list(self._fixed_noise_parameters)
        myokit_parameters = x
        if not isinstance(myokit_parameters, list):
            myokit_parameters = myokit_parameters.tolist()

        # create subsets for each likelihood and call each
        log_like = 0
        for idx, ll in enumerate(self._log_likelihoods):
            log_like += ll(myokit_parameters + [noise_parameters[idx]])
        return log_like

    def n_parameters(self):
        return self._n_parameters
