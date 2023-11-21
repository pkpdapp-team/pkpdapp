#
# This file is part of PKPDApp (https://github.com/pkpdapp-team/pkpdapp) which
# is released under the BSD 3-clause license. See accompanying LICENSE.md for
# copyright notice and full license details.
#

from django.db import models
from pkpdapp.celery import app
from pkpdapp.models import (
    Project, PharmacodynamicModel,
    CombinedModel,
    StoredModel, LogLikelihoodParameter,
    InferenceFunctionResult, InferenceResult
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
        on_delete=models.PROTECT,
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
        on_delete=models.PROTECT,
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

    burn_in = models.IntegerField(
        default=0,
        help_text='final iteration of burn-in',
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

    # error = models.TextField(
    #    blank=True, null=True,
    #    help_text='If inference failed, an error message is here'
    # )

    metadata = models.JSONField(
        default=dict,
        help_text="metadata for inference",
    )

    def reset(self):
        print('reset', self)
        self.chains.all().delete()
        self.log_likelihoods.all().delete()
        self.number_of_iterations = 0
        self.time_elapsed = 0
        self.number_of_function_evals = 0
        self.metadata = {}

    def get_project(self):
        return self.project

    def store_inference(self):
        # store related objects so we can recreate them later
        old_log_likelihoods = self.log_likelihoods.all()

        # save models used in this inference
        old_pd_models = list(PharmacodynamicModel.objects.filter(
            variables__log_likelihoods__inference=self
        ).distinct())

        old_pk_models = list(CombinedModel.objects.filter(
            variables__log_likelihoods__inference=self
        ).distinct())
        # old_models += list(PkpdModel.objects.filter(
        #    variables__log_likelihoods__in=old_log_likelihoods
        # ).distinct())

        # create a map between old and new models so we can transfer
        # the relationships
        new_models = {
            model.id: model.create_stored_model() for model in old_pd_models
        }

        # store pd models referred to by pk models
        new_models.update({
            model.pd_model.id: model.pd_model.create_stored_model()
            for model in old_pk_models
            if model.pd_model is not None
        })

        # finally store the pk models
        new_models.update({
            model.id: model.create_stored_model(
                new_models[
                    model.pd_model.id if model.pd_model is not None else None
                ]
            )
            for model in old_pk_models
        })

        self.id = None
        self.pk = None

        # save new as readonly
        self.read_only = True
        self.save()

        # recreate log_likelihoods and remove default children
        new_log_likelihoods = []
        for log_likelihood in old_log_likelihoods:
            new_ll = log_likelihood.create_stored_log_likelihood(
                self, new_models
            )

            # delete auto-generated parents and children
            new_ll.children.all().delete()
            new_ll.parents.all().delete()

            new_log_likelihoods.append(new_ll)

        # recreate children relationships using indicies
        # of old_log_likelihoods
        for parent_index, parent in enumerate(old_log_likelihoods):
            new_parent = new_log_likelihoods[parent_index]
            for child in parent.children.all():
                child_index = None
                for i, ll in enumerate(old_log_likelihoods):
                    if ll == child:
                        child_index = i
                new_child = new_log_likelihoods[child_index]

                # get old parameter and save it as a new relationship
                old_param = LogLikelihoodParameter.objects.get(
                    parent=parent, child=child
                )
                old_param.id = None
                old_param.pk = None
                old_param.parent = new_parent
                old_param.child = new_child
                old_param.save()

        self.refresh_from_db()

    def run_inference(self, test=False):
        ll_names = [
            ll.name for ll in self.log_likelihoods.all()
        ]
        if len(set(ll_names)) < len(ll_names):
            raise RuntimeError(
                (
                    'inference has log-likelihoods '
                    'with identical names! {}'
                ).format(ll_names)
            )

        if not test:
            from pkpdapp.tasks import run_inference
            try:
                result = run_inference.delay(self.id)
                self.task_id = result.id
                self.save()
            except run_inference.OperationalError as exc:
                print('Sending task raised: {}'.format(exc))

    def get_maximum_likelihood(self):
        chains = self.chains.all()

        max_function_value = (
            InferenceFunctionResult.objects.filter(
                chain__in=chains
            ).order_by(
                '-value'
            ).first()
        )
        results_for_mle = (
            InferenceResult.objects.filter(
                chain=max_function_value.chain,
                iteration=max_function_value.iteration
            )
        )

        return results_for_mle

    def stop_inference(self):
        if self.task_id is not None:
            app.control.revoke(self.task_id, terminate=True)
