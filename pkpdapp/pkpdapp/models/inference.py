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
        OTHER = 'OT', 'Optimisation'

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

    def get_project(self):
        return self.project

    def run_inference(self, test=False):
        """
        when an inference is run, a new model is created (a copy),
        and the model and all its variables are stored
        """
        # store related objects so we can recreate them later
        old_log_likelihoods = self.log_likelihoods.all()

        # save models used in this inference
        old_models = list(PharmacodynamicModel.objects.filter(
            variables__log_likelihoods__inference=self
        ).distinct())

        old_models += list(DosedPharmacokineticModel.objects.filter(
            variables__log_likelihoods__inference=self
        ).distinct())
        # old_models += list(PkpdModel.objects.filter(
        #    variables__log_likelihoods__in=old_log_likelihoods
        # ).distinct())
        print('all models', old_models)

        # create a map between old and new models so we can transfer
        # the relationships
        new_models = {
            model.id: model.create_stored_model() for model in old_models
        }

        self.id = None
        self.pk = None

        # save new as readonly
        self.read_only = True
        self.save()

        # recreate log_likelihoods
        for log_likelihood in old_log_likelihoods:
            log_likelihood.create_stored_log_likelihood(self, new_models)

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
