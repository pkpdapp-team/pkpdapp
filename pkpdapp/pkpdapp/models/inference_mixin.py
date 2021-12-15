#
# This file is part of PKPDApp (https://github.com/pkpdapp-team/pkpdapp) which
# is released under the BSD 3-clause license. See accompanying LICENSE.md for
# copyright notice and full license details.
#

import pints
import numpy as np
from pkpdapp.models import (
    MyokitForwardModel, LogLikelihoodNormal,
    LogLikelihoodLogNormal,
    PriorNormal, PriorUniform)

optimisers_dict = {
    'CMAES': pints.CMAES,
    'Nelder-Mead': pints.NelderMead,
    'PSO': pints.PSO,
    'SNES': pints.SNES,
    'XNES': pints.XNES
}

samplers_dict = {
    'Adaptive covariance': pints.HaarioBardenetACMC,
    'Differential evolution': pints.DifferentialEvolutionMCMC,
    'DREAM': pints.DreamMCMC,
    'Emcee-hammer': pints.EmceeHammerMCMC,
    'Population': pints.PopulationMCMC
}


class InferenceMixin:
    def __init__(self, inference):

        model = inference.get_model()

        self._myokit_model = model.get_myokit_model()
        self._myokit_simulator = model.get_myokit_simulator()

        # get biomarkers
        self._biomarker_types, self._outputs = self.get_biomarker_types_and_output_variables(
            inference)
        self._n_outputs = len(self._outputs)

        # get objectives and fixed noise parameters (we assume they are fixed for now)
        self._observed_loglikelihoods, self._noise_parameter_values = self.get_objectives(inference)

        # get priors / boundaries
        self._pints_log_priors = self.get_priors_andor_boundaries(inference)

        # get fitted parameters: note this will include all parameters, including noise
        # parameters which are not used by Myokit models
        fitted_variables = self.get_fitted_variables(inference)

        # get all the variable names associated with the Myokit model minus 'time'
        all_myokit_variables = model.variables.exclude(name='time')

        # create a dictionary of key-value pairs for fixed parameters of Myokit model
        self._fixed_parameters_dict = self.create_fixed_parameter_dictionary(
            all_myokit_variables, fitted_variables)

        # # select inference methods
        inference_type, inference_method = self.get_inference_type_and_method(inference)

        # get data and time points as lists of lists
        dfs = [output.as_pandas() for output in self._biomarker_types]
        self._values = [df['values'].tolist() for df in dfs]
        self._times = [df['times'].tolist() for df in dfs]

    def create_fixed_parameter_dictionary(self, all_myokit_parameters, fitted_parameters):
        # gets fixed parameters for Myokit model only: i.e. does not give noise parameters
        # this works because all_parameters is supposed to contain only Myokit model
        # parameters

        # myokit: inputs and outputs
        all_myokit_parameter_names = [param.qname for param in all_myokit_parameters]

        # parameters being fit: both Myokit parameters and noise ones
        fitted_parameter_names = [param.qname for param in fitted_parameters]

        # get myokit parameters minus outputs: i.e. just input parameters
        myokit_minus_fixed = [item for item in all_myokit_parameter_names if item not in fitted_parameter_names]

        # get index of variables in named list
        self._fixed_variables = [all_myokit_parameters[all_myokit_parameter_names.index(v)] for v in myokit_minus_fixed]

        fixed_parameter_dictionary = {}
        for param in self._fixed_variables:
            fixed_parameter_dictionary[param.name] = param.default_value
        return fixed_parameter_dictionary

    def create_pints_forward_model(self):
        output_names = [output.qname for output in self._outputs]
        model = MyokitForwardModel(self._myokit_model,
                                   self._myokit_simulator,
                                   output_names,
                                   self._fixed_parameters_dict)
        self._pints_forward_model = model
        return self._pints_forward_model

    def get_inference_type_and_method(self, inference):
        inference_type = inference.algorithm.category
        methodname = inference.algorithm.name
        if inference_type == 'Sampling':
            method_dict = samplers_dict
        else:
            method_dict = optimisers_dict
        inference_method = method_dict[methodname]
        return inference_type, inference_method

    def get_biomarker_types_and_output_variables(self, inference):
        objs = inference.objective_functions.all()
        biomarker_types = []
        output_variables = []
        for obj in objs:
            biomarker_types.append(obj.biomarker_type)
            output_variables.append(obj.variable)
        return biomarker_types, output_variables

    def get_objectives(self, inference):
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

    def get_fitted_variables(self, inference):
        priors = inference.priors.all()
        fitted_parameters = []
        for prior in priors:
            fitted_parameters.append(prior.variable)
        return fitted_parameters

    def get_priors_andor_boundaries(self, inference):
        # get all variables being fitted from priors (includes boundaries which are not priors)
        priors = inference.priors.all()
        pints_log_priors = []
        for prior in priors:
            if isinstance(prior, PriorUniform):
                lower = prior.lower
                upper = prior.upper
                pints_log_priors.append(pints.UniformLogPrior(lower, upper))
            elif isinstance(prior, PriorNormal):
                mean = prior.mean
                sd = prior.sd
                pints_log_priors.append(pints.GaussianLogPrior(mean, sd))
        return pints_log_priors

    def get_myokit_model(self):
        return self._myokit_model

    def create_pints_problem_collection(self):
        model = self._pints_forward_model
        times = self._times
        values = self._values

        # here we create a problem collection to handle the case when the
        # outputs / times are wragged
        times_values = []
        for i in range(len(self._outputs)):
            times_values.append(times[i])
            times_values.append(values[i])
        self._collection = pints.ProblemCollection(model,
                                                   *times_values)
        return self._collection

    def create_pints_log_likelihood(self):
        collection = self._collection
        problems = [collection.subproblem(i) for i in range(self._n_outputs)]

        # these are the PINTS methods
        log_like_methods = self._observed_loglikelihoods

        # instantiate PINTS log-likelihoods
        log_likes = []
        for i in range(self._n_outputs):
            log_likes.append(log_like_methods[i](problems[i]))

        # combine them
        self._log_likelihood = CombinedLogLikelihood(
            self._noise_parameter_values,
            *log_likes)
        return self._log_likelihood

    def create_pints_log_prior(self):
        self._composed_log_prior = pints.ComposedLogPrior(*self._pints_log_priors)
        return self._composed_log_prior

    def create_pints_log_posterior(self):
        self._pints_log_posterior = pints.LogPosterior(self._log_likelihood,
                                                       self._composed_log_prior)
        return self._pints_log_posterior

    def create_pints_optimiser(self):
        self._optimiser = h

    def create_pints_sampler(self):
        pass

    def run_inference(self, controller):
        pass

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

        # assume each log-likelihood has fixed noise parameter (later we'll want to add self._n_outputs)
        self._n_parameters = self._n_myokit_parameters

        if len(fixed_noise_parameter_values) != self._n_outputs:
            raise ValueError("Fixed parameter values must be same length as outputs.")
        self._fixed_noise_parameters = fixed_noise_parameter_values

    def __call__(self, x):
        # assumes noise parameters are at end of parameter list
        noise_parameters = list(self._fixed_noise_parameters)
        myokit_parameters = x[:self._n_myokit_parameters]

        # create subsets for each likelihood and call each
        log_like = 0
        k = 0
        for ll in self._log_likelihoods:
            log_like += ll(myokit_parameters + [noise_parameters[k]])
            k += 1
        return log_like

    def n_parameters(self):
        return self._n_parameters
