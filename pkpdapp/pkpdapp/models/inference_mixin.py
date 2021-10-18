#
# This file is part of PKPDApp (https://github.com/pkpdapp-team/pkpdapp) which
# is released under the BSD 3-clause license. See accompanying LICENSE.md for
# copyright notice and full license details.
#
import pints


class InferenceMixin:
    def __init__(self):

        self._log_likelihood_method_dict = {
            'ConstantAndMultiplicative': pints.ConstantAndMultiplicativeLogLikelihood,
            'GaussianKnownSigma': pints.GaussianKnownSigmaLogLikelihood,
            'GaussianUnknownSigma': pints.GaussianUnknownSigmaLogLikelihood,
            'LogNormal': pints.LogNormalLogLikelihood,
            'StudentT': pints.StudentTLogLikelihood
        }

        self._log_prior_method_dict = {
            'Exponential': pints.ExponentialLogPrior,
            'Uniform': pints.UniformLogPrior,
            'Gaussian': pints.GaussianLogPrior
        }

        self._optimisers_dict = {
            'CMAES': pints.CMAES,
            'Nelder-Mead': pints.NelderMead,
            'PSO': pints.PSO,
            'SNES': pints.SNES,
            'XNES': pints.XNES
        }

        self._samplers_dict = {
            'Adaptive covariance': pints.HaarioBardenetACMC,
            'Differential evolution': pints.DifferentialEvolutionMCMC,
            'DRAM': pints.DRAM,
            'DREAM': pints.DREAM,
            'Emcee-hammer': pints.EmceeHammerMCMC,
            'Population': pints.PopulationMCMC
        }

    def create_pints_forward_model(self):
        model = MyokitForwardModel(self._myokit_model,
                                   self._myokit_simulator,
                                   self._outputs_observed,
                                   self._fixed_parameters)
        self._pints_forward_model = model

    def get_myokit_model(self):
        return self._myokit_model

    def get_parameter_bounds(self):
        return self._bounds

    def create_pints_problem(self):
        model = self._model
        times = self._times
        values = self._values
        if model.n_outputs() == 1:
            self._pints_problem = pints.SingleOutputProblem(model, times, values)
        else:
            self._pints_problem = pints.MultiOutputProblem(model, times, values)

    def create_pints_log_likelihood(self):
        likelihood_method = self._log_likelihood_dict(self._log_likelihood_name)
        self._pints_log_likelihood = likelihood_method(self._pints_problem)

        # at this point, we will need to do something to create the extra vars
        # to store in Xavier's DB

    def create_pints_log_prior(self):
        self._log_prior = pints.ComposedLogPrior(self._log_priors)

    def create_pints_log_posterior(self):
        self._pints_log_posterior = pints.LogPosterior(self._pints_log_likelihood,
                                                       self._pints_log_prior)

    def create_pints_optimiser(self):
        self._optimiser = h

    def create_pints_sampler(self):
        pass

    def run_inference(self, controller):
        pass

    def fixed_parameters(self):
        return self._fixed_parameters
