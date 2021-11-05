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
        default=1000,
        help_text='number of iterations'
    )

    time_elapsed = models.IntegerField(
        blank=True, null=True,
        help_text='Elapsed run time for inference in seconds'
    )

    # potentially for optimisation too (as in number of starting points)
    number_of_chains = models.IntegerField(
        default=4,
        help_text='number of chains'
    )

    number_of_function_evals = models.IntegerField(
        blank=True, null=True,
        help_text='number of function evaluations'
    )
