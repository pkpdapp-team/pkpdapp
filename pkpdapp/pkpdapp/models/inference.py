#
# This file is part of PKPDApp (https://github.com/pkpdapp-team/pkpdapp) which
# is released under the BSD 3-clause license. See accompanying LICENSE.md for
# copyright notice and full license details.
#

from django.db import models
from django.db.models import Q
from pkpdapp.models import (
    Variable, Dataset, PharmacodynamicModel,
    PharmacokineticModel, DosedPharmacokineticModel,
    BiomarkerType)


class Inference(models.Model):
    """
    An inference process.
    """
    description = models.TextField(
        help_text='short description of what this inference does',
        blank=True, default=''
    )

    datetime = models.DateTimeField(
        help_text=(
            'date/time the experiment was conducted. '
            'All time measurements are relative to this date/time, ' +
            'which is in YYYY-MM-DD HH:MM:SS format. For example, ' +
            '2020-07-18 14:30:59'
        ),
        null=True, blank=True
    )

    class InferenceType(models.TextChoices):
        SAMPLING = 'SA', 'Sampling'
        OPTIMISATION = 'OP', 'Optimisation'

    inference_type = models.CharField(
        max_length=2,
        choices=InferenceType.choices,
        default=InferenceType.OPTIMISATION,
    )

    class SamplingAlgorithm(models.TextChoices):
        HB = 'HB', 'Haario-Bardenet'
        DE = 'DE', 'Differential evolution'
        DR = 'DR', 'DREAM'
        PO = 'PO', 'Population MCMC'

    sampling_algorithm = models.CharField(
        choices=SamplingAlgorithm.choices,
        default=SamplingAlgorithm.HB,
        help_text='sampling algorithm to use for inference')

    class OptimisationAlgorithm(models.TextChoices):
        CMAES = 'CMAES', 'CMAES'
        XNES = 'XNES', 'XNES'
        SNES = 'SNES', 'SNES'
        PSO = 'PSO', 'PSO'
        NM = 'NM', 'Nelder-Mead'

    optimisation_algorithm = models.CharField(
        choices=OptimisationAlgorithm.choices,
        default=OptimisationAlgorithm.CMAES,
        help_text='optimisation algorithm to use for inference')

    number_of_iterations = models.IntegerField(
        help_text='number of iterations'
    )

    time_elapsed = models.IntegerField(
        default=0,
        help_text='Elapsed run time for inference in seconds'
    )

    # potentially for optimisation too (as in number of starting points)
    number_of_chains = models.IntegerField(
        help_text='number of chains'
    )

    number_of_function_evals = models.IntegerField(
        help_text='number of function evaluations'
    )


class StoredPharmacodynamicModel(PharmacodynamicModel):
    """
    Stored PD model.
    """


class StoredPharmacokineticModel(PharmacokineticModel):
    """
    Stored PK model.
    """


class DosedPharmacokineticModel(DosedPharmacokineticModel):
    """
    Stored dosed PK model.
    """


class ObjectiveFunction(Variable):
    """
    Abstract model class for objective functions.
    """
    biomarker_type = models.OnetoOne(
        BiomarkerType,
        on_delete=models.CASCADE,
        blank=True, null=False)
    pd_model = models.ForeignKey(
        StoredPharmacodynamicModel,
        blank=True, null=True,
        on_delete=models.CASCADE,
        help_text='pharmacodynamic model'
    )
    pk_model = models.ForeignKey(
        StoredPharmacokineticModel,
        blank=True, null=True,
        on_delete=models.CASCADE,
        help_text='pharmacokinetic model'
    )
    dosed_pk_model = models.ForeignKey(
        StoredDosedPharmacokineticModel,
        blank=True, null=True,
        on_delete=models.CASCADE,
        help_text='dosed pharmacokinetic model'
    )
    inference = models.ForeignKey(Inference, blank=True, null=False)


class LogLikelihoodNormal(ObjectiveFunction):
    """
    Model for the normal log-likelihood.
    """
    sd = models.FloatField(
        help_text='sd of normal prior distribution.'
    )


class LogLikelihoodLogNormal(ObjectiveFunction):
    """
    Model for the log-normal log-likelihood.
    """
    sigma = models.FloatField(
        help_text='sigma of log-normal prior distribution.'
    )


class SumOfSquaredErrorsScoreFunction(ObjectiveFunction):
    """
    Model for sum of squared errors score function.
    """


class InferenceParameterProperties(Variable):
    """
    Abstract model that points to inference model.
    """
    pd_model = models.ForeignKey(
        StoredPharmacodynamicModel,
        blank=True, null=True,
        on_delete=models.CASCADE,
        help_text='pharmacodynamic model'
    )
    pk_model = models.ForeignKey(
        StoredPharmacokineticModel,
        blank=True, null=True,
        on_delete=models.CASCADE,
        help_text='pharmacokinetic model'
    )
    dosed_pk_model = models.ForeignKey(
        StoredDosedPharmacokineticModel,
        blank=True, null=True,
        on_delete=models.CASCADE,
        help_text='dosed pharmacokinetic model'
    )
    inference = models.ForeignKey(Inference, blank=True, null=False)


class PriorUniform(InferenceParameterProperties):
    """
    Model for a uniform prior.
    """


class PriorNormal(InferenceParameterProperties):
    """
    Model for a normal prior.
    """
    mean = models.FloatField(
        help_text='mean of normal prior distribution.'
    )

    sd = models.FloatField(
        help_text='sd of normal prior distribution.'
    )


class Boundary(InferenceParameterProperties):
    """
    Model for a single parameter boundary for use in optimisation.
    """


class InferenceResults(models.Model):
    """
    Abstract class for inference results.
    """
    prior_uniform = models.OneToOne(
        PriorUniform,
        blank=True, null=True,
        on_delete=models.CASCADE,
        help_text='uniform prior'
    )
    prior_normal = models.OneToOne(
        PriorUniform,
        blank=True, null=True,
        on_delete=models.CASCADE,
        help_text='normal prior'
    )
    boundary = models.OnetoOne(
        Boundary,
        blank=True, null=True,
        on_delete=models.CASCADE,
        help_text='parameter boundary'
    )
    value = models.FloatField(
        help_text='estimated parameter value'
    )
    chain = models.IntegerField(
        default=1,
        help_text='Chain related to the row'
    )
    iteration = models.IntegerField(
        default=1,
        help_text='Iteration'
    )


class MCMCDiagnostic(models.Model):
    prior_uniform = models.OneToOne(
        PriorUniform,
        blank=True, null=True,
        on_delete=models.CASCADE,
        help_text='uniform prior'
    )
    prior_normal = models.OneToOne(
        PriorUniform,
        blank=True, null=True,
        on_delete=models.CASCADE,
        help_text='normal prior'
    )
    boundary = models.OnetoOne(
        Boundary,
        blank=True, null=True,
        on_delete=models.CASCADE,
        help_text='parameter boundary'
    )
    value = models.FloatField(
        help_text='rhat diagnostic statistic'
    )


class Rhat(MCMCDiagnostic):

class ESS(MCMCDiagnostic):


class InferenceMixin:
    # the instantiation will look different for this
    # since all the current inputs will be accessed from
    # the PKPD model DB in Django. These are just effectively
    # a list of all the items that will need to be accessible
    # by this class
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
