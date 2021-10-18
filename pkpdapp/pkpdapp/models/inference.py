#
# This file is part of PKPDApp (https://github.com/pkpdapp-team/pkpdapp) which
# is released under the BSD 3-clause license. See accompanying LICENSE.md for
# copyright notice and full license details.
#

from django.db import models
from django.db.models import Q
from pkpdapp.models import (
    Variable, BaseVariable, Dataset, PharmacodynamicModel,
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


class StoredVariable(BaseVariable):
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


class ObjectiveFunction(StoredVariable):
    """
    Abstract model class for objective functions.
    """
    biomarker_type = models.OnetoOne(
        BiomarkerType,
        on_delete=models.CASCADE,
        blank=True, null=False)


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


class PriorUniform(StoredVariable):
    """
    Model for a uniform prior.
    """


class PriorNormal(StoredVariable):
    """
    Model for a normal prior.
    """
    mean = models.FloatField(
        help_text='mean of normal prior distribution.'
    )

    sd = models.FloatField(
        help_text='sd of normal prior distribution.'
    )


class Boundary(StoredVariable):
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
