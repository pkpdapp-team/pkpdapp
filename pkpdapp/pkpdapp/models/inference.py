#
# This file is part of PKPDApp (https://github.com/pkpdapp-team/pkpdapp) which
# is released under the BSD 3-clause license. See accompanying LICENSE.md for
# copyright notice and full license details.
#

from django.db import models
from django.db.models import Q
from pkpdapp.models import (
    StoredPkpdModel, StoredPharmacodynamicModel,
    StoredDosedPharmacokineticModel,
    Project, InferenceChain, InferenceResult,
)


class Inference(models.Model):
    """
    An inference process.
    """
    description = models.TextField(
        help_text='short description of what this inference does',
        blank=True, default=''
    )

    project = models.ForeignKey(
        Project, on_delete=models.CASCADE,
        related_name='inferences',
        help_text='Project that "owns" this inference object'
    )

    datetime = models.DateTimeField(
        help_text=(
            'date/time the experiment was conducted. '
            'All time measurements are relative to this date/time, '
            'which is in YYYY-MM-DD HH:MM:SS format. For example, '
            '2020-07-18 14:30:59'
        ),
        null=True, blank=True
    )

    class InferenceType(models.TextChoices):
        SAMPLING = 'SA', 'Sampling'
        OPTIMISATION = 'OP', 'Optimisation'

    inference_type = models.CharField(
        max_length=10,
        choices=InferenceType.choices,
        default=InferenceType.OPTIMISATION,
    )

    class SamplingAlgorithm(models.TextChoices):
        HB = 'HB', 'Haario-Bardenet'
        DE = 'DE', 'Differential evolution'
        DR = 'DR', 'DREAM'
        PO = 'PO', 'Population MCMC'

    sampling_algorithm = models.CharField(
        max_length=10,
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
        max_length=10,
        choices=OptimisationAlgorithm.choices,
        default=OptimisationAlgorithm.CMAES,
        help_text='optimisation algorithm to use for inference'
    )

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

    pd_model = models.OneToOneField(
        StoredPharmacodynamicModel,
        blank=True, null=True,
        on_delete=models.CASCADE,
        related_name='inference',
        help_text='pharmacodynamic model'
    )
    dosed_pk_model = models.OneToOneField(
        StoredDosedPharmacokineticModel,
        blank=True, null=True,
        on_delete=models.CASCADE,
        related_name='inference',
        help_text='dosed pharmacokinetic model'
    )
    pkpd_model = models.OneToOneField(
        StoredPkpdModel,
        blank=True, null=True,
        on_delete=models.CASCADE,
        related_name='inference',
        help_text='pharmacokinetic/pharmacokinetic model'
    )

    constraints = [
        models.CheckConstraint(
            check=(
                (Q(pk_model__isnull=True) &
                 Q(dosed_pk_model__isnull=True) &
                 Q(pd_model__isnull=False)) |
                (Q(pk_model__isnull=False) &
                 Q(dosed_pk_model__isnull=True) &
                 Q(pd_model__isnull=True)) |
                (Q(pk_model__isnull=True) &
                 Q(dosed_pk_model__isnull=False) &
                 Q(pd_model__isnull=True))
            ),
            name='%(class)s: inference must belong to a model'
        ),
    ]

    def get_project(self):
        return self.project

    def as_pandas(self):
        chains = InferenceChain.objects.filter(
                Q(prior_uniform__variable__=owner) | Q(moderated=False)
        )
        self.
        times_subjects_values = \
            self.biomarkers.order_by('time').values_list(
                'time', 'subject__id', 'value'
            )
        times, subjects, values = list(zip(*times_subjects_values))
        df = pd.DataFrame.from_dict({
            'times': times,
            'subjects': subjects,
            'values': values,
        })

        conversion_factor = self.stored_unit.convert_to(
            self.display_unit
        )
        time_conversion_factor = self.stored_time_unit.convert_to(
            self.display_time_unit
        )

        df['values'] *= conversion_factor
        df['times'] *= time_conversion_factor

        return df

