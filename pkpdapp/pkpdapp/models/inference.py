#
# This file is part of PKPDApp (https://github.com/pkpdapp-team/pkpdapp) which
# is released under the BSD 3-clause license. See accompanying LICENSE.md for
# copyright notice and full license details.
#

from django.db import models
from django.db.models import Q
from pkpdapp.models import (
    Project, PharmacodynamicModel,
    DosedPharmacokineticModel,
    PkpdModel,
    StoredModel,
)
from pkpdapp.tasks import run_inference


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


class Inference(StoredModel):
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

    pd_model = models.ForeignKey(
        PharmacodynamicModel,
        blank=True, null=True,
        on_delete=models.CASCADE,
        related_name='inferences',
        help_text='pharmacodynamic model'
    )
    dosed_pk_model = models.ForeignKey(
        DosedPharmacokineticModel,
        blank=True, null=True,
        on_delete=models.CASCADE,
        related_name='inferences',
        help_text='dosed pharmacokinetic model'
    )
    pkpd_model = models.ForeignKey(
        PkpdModel,
        blank=True, null=True,
        on_delete=models.CASCADE,
        related_name='inferences',
        help_text='pharmacokinetic/pharmacokinetic model'
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

    number_of_iterations = models.IntegerField(
        default=0,
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
            name='inference must belong to a model'
        ),
    ]

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

    def run_inference(self):
        """
        when an inference is run, a new model is created (a copy),
        and the model and all its variables are stored
        """
        inference_kwargs = {
            'name': self.name,
            'description': self.description,
            'project': self.project,
            'algorithm': self.algorithm,
            'number_of_chains': self.number_of_chains,
            'max_number_of_iterations': self.max_number_of_iterations,
            'read_only': True,
        }
        if self.pd_model:
            model = self.pd_model.create_stored_model()
            inference_kwargs['pd_model'] = model
        if self.dosed_pk_model:
            model = self.dosed_pk_model.create_stored_model()
            inference_kwargs['dosed_pk_model'] = model
        if self.pkpd_model:
            model = self.pkpd_model.create_stored_model()
            inference_kwargs['pkpd_model'] = model

        new_inference = Inference.objects.create(**inference_kwargs)

        for prior in self.priors.all():
            prior.id = None
            prior.pk = None
            prior.inference = new_inference
            prior.variable = model.variables.get(qname=prior.variable.qname)
            prior.save()

        for objective_function in self.objective_functions.all():
            objective_function.id = None
            objective_function.pk = None
            objective_function.inference = new_inference
            objective_function.variable = model.variables.get(
                qname=objective_function.variable.qname
            )
            objective_function.save()

        new_inference.refresh_from_db()

        run_inference(new_inference)

        return new_inference
