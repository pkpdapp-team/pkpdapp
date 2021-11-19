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
    Project, PharmacodynamicModel,
    DosedPharmacokineticModel,
    PkpdModel,
)


class Algorithm(models.Model):
    name = models.CharField(
        max_length=100,
        help_text='name of the algorithm'
    )

    class Category(models.TextChoices):
        SAMPLING = 'SA', 'Sampling'
        OPTIMISATION = 'OP', 'Optimisation'

    category = models.CharField(
        max_length=10,
        choices=Category.choices
    )


def get_default_optimisation_algorithm():
    return Algorithm.objects.get(name='CMAES')


class BaseInference(models.Model):
    """
    An inference process.
    """
    name = models.CharField(
        max_length=100,
        help_text='name of the dataset'
    )
    description = models.TextField(
        help_text='short description of what this inference does',
        blank=True, default=''
    )

    project = models.ForeignKey(
        Project, on_delete=models.CASCADE,
        help_text='Project that "owns" this inference object'
    )

    algorithm = models.ForeignKey(
        Algorithm,
        on_delete=models.CASCADE,
        default=get_default_optimisation_algorithm,
        help_text='algorithm used to perform the inference'
    )

    # potentially for optimisation too (as in number of starting points)
    number_of_chains = models.IntegerField(
        default=4,
        help_text='number of chains'
    )

    max_number_of_iterations = models.IntegerField(
        default=1000,
        help_text='maximum number of iterations'
    )

    constraints = [
        models.CheckConstraint(
            check=(
                (Q(pkpd_model__isnull=True) &
                 Q(dosed_pk_model__isnull=True) &
                 Q(pd_model__isnull=False)) |
                (Q(pkpd_model__isnull=False) &
                 Q(dosed_pk_model__isnull=True) &
                 Q(pd_model__isnull=True)) |
                (Q(pkpd_model__isnull=True) &
                 Q(dosed_pk_model__isnull=False) &
                 Q(pd_model__isnull=True))
            ),
            name='%(class)s: inference must belong to a model'
        ),
    ]

    class Meta:
        abstract = True

    def get_project(self):
        return self.project

    def get_model(self):
        model = None
        if self.pd_model:
            model = self.pd_model
        if self.dosed_pk_model:
            model = self.dosed_pk_model
        if self.pkpd_model:
            model = self.pkpd_model
        return model

class DraftInference(BaseInference):
    pd_model = models.OneToOneField(
        PharmacodynamicModel,
        blank=True, null=True,
        on_delete=models.CASCADE,
        related_name='draft_inference',
        help_text='pharmacodynamic model'
    )
    dosed_pk_model = models.OneToOneField(
        DosedPharmacokineticModel,
        blank=True, null=True,
        on_delete=models.CASCADE,
        related_name='draft_inference',
        help_text='dosed pharmacokinetic model'
    )
    pkpd_model = models.OneToOneField(
        PkpdModel,
        blank=True, null=True,
        on_delete=models.CASCADE,
        related_name='draft_inference',
        help_text='pharmacokinetic/pharmacokinetic model'
    )

    def create_inference(self):
        inference_kwargs = {
            'name': self.name,
            'description': self.description,
            'project': self.project,
            'algorithm': self.algorithm,
            'number_of_chains': self.number_of_chains,
            'max_number_of_iterations': self.max_number_of_iterations,
        }
        if self.pd_model:
            inference_kwargs['pd_model'] = self.pd_model.create_stored_model()
        if self.dosed_pk_model:
            inference_kwargs['dosed_pk_model'] = self.dosed_pk_model.create_stored_model()
        if self.pkpd_model:
            inference_kwargs['pkpd_model'] = self.pkpd_model.create_stored_model()

        return Inference.objects.create(**inference_kwargs)


class Inference(BaseInference):
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

    number_of_iterations = models.IntegerField(
        default=1000,
        help_text='number of iterations calculated'
    )

    time_elapsed = models.IntegerField(
        default=0,
        help_text='Elapsed run time for inference in seconds'
    )

    number_of_function_evals = models.IntegerField(
        default=0,
        help_text='number of function evaluations'
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


class InferenceChain(models.Model):
    inference = models.ForeignKey(
        Inference,
        on_delete=models.CASCADE,
        related_name='chains',
        help_text='uniform prior'
    )

    def as_list(self):
        return \
            self.inference_results.order_by('iteration').values_list(
                'value', flat=True
            )


class InferenceResult(models.Model):
    """
    Abstract class for inference results.
    """
    chain = models.ForeignKey(
        InferenceChain,
        on_delete=models.CASCADE,
        related_name='inference_results',
        help_text='Chain related to the row'
    )
    iteration = models.IntegerField(
        help_text='Iteration'
    )
    value = models.FloatField(
        help_text='estimated parameter value'
    )
