#
# This file is part of PKPDApp (https://github.com/pkpdapp-team/pkpdapp) which
# is released under the BSD 3-clause license. See accompanying LICENSE.md for
# copyright notice and full license details.
#

from django.db import models
from django.db.models import Q
from pkpdapp.celery import app
from pkpdapp.models import (
    Project, PharmacodynamicModel,
    DosedPharmacokineticModel,
    PkpdModel,
    StoredModel,
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

    class InitializationStrategy(models.TextChoices):
        DEFAULT_VALUE = 'D', 'Default Value of model'
        RANDOM = 'R', 'Random from prior'
        FROM_OTHER = 'F', 'From other inference'

    initialization_strategy = models.CharField(
        max_length=1,
        choices=InitializationStrategy.choices,
        default=InitializationStrategy.RANDOM,
    )

    initialization_inference = models.ForeignKey(
        'Inference',
        on_delete=models.CASCADE,
        blank=True, null=True,
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

    task_id = models.CharField(
        max_length=40,
        blank=True, null=True,
        help_text='If executing, this is the celery task id'
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

    def run_inference(self, test=False):
        """
        when an inference is run, a new model is created (a copy),
        and the model and all its variables are stored
        """
        # save related objects so we can recreate them
        old_priors = self.priors.all()
        old_log_likelihoods = self.log_likelihoods.all()

        self.id = None
        self.pk = None

        if self.pd_model:
            self.pd_model = self.pd_model.create_stored_model()
            model = self.pd_model
        if self.dosed_pk_model:
            self.dosed_pk_model = self.dosed_pk_model.create_stored_model()
            model = self.dosed_pk_model
        if self.pkpd_model:
            self.pkpd_model = self.pkpd_model.create_stored_model()
            model = self.pkpd_model

        # save new as readonly
        self.read_only = True

        self.save()

        for prior in old_priors:
            prior.id = None
            prior.pk = None
            prior.inference = self
            if prior.variable is not None:
                prior.variable = model.variables.get(qname=prior.variable.qname)
            prior.save()

        for log_likelihood in old_log_likelihoods:
            old_priors = log_likelihood.parameters.all()
            log_likelihood.id = None
            log_likelihood.pk = None
            log_likelihood.inference = self
            log_likelihood.variable = model.variables.get(
                qname=log_likelihood.variable.qname
            )
            for param in old_parameters:
                for prior in param.priors:
                    prior.log
            log_likelihood.save()

        self.refresh_from_db()

        if not test:
            from pkpdapp.tasks import run_inference
            try:
                result = run_inference.delay(self.id)
            self.task_id = result.id
            self.save()
        except run_inference.OperationalError as exc:
            print('Sending task raised: {}'.format(exc))

    def stop_inference(self):
        if self.task_id is not None:
            app.control.revoke(self.task_id, terminate=True)
