#
# This file is part of PKPDApp (https://github.com/pkpdapp-team/pkpdapp) which
# is released under the BSD 3-clause license. See accompanying LICENSE.md for
# copyright notice and full license details.
#

from django.db import models
from django.urls import reverse
from pkpdapp.models import (
    MechanisticModel,
    Protocol,
    Project,
    StoredModel,
    MyokitModelMixin,
)
import myokit
from .myokit_model_mixin import lock


class PharmacodynamicModel(MechanisticModel, StoredModel):
    project = models.ForeignKey(
        Project, on_delete=models.CASCADE,
        related_name='pd_models',
        blank=True, null=True,
        help_text='Project that "owns" this model'
    )
    __original_sbml = None

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.__original_sbml = self.sbml

    def get_absolute_url(self):
        return reverse('pd_model-detail', kwargs={'pk': self.pk})

    def get_project(self):
        return self.project

    def save(self, force_insert=False, force_update=False, *args, **kwargs):
        created = not self.pk

        super().save(force_insert, force_update, *args, **kwargs)

        # don't update a stored model
        if self.read_only:
            return

        if created or self.sbml != self.__original_sbml:
            self.update_model()

        self.__original_sbml = self.sbml

    def create_stored_model(self):
        stored_model_kwargs = {
            'name': self.name,
            'description': self.description,
            'project': self.project,
            'sbml': self.sbml,
            'time_max': self.time_max,
            'read_only': True,
        }
        stored_model = PharmacodynamicModel.objects.create(
            **stored_model_kwargs)
        for variable in self.variables.all():
            variable.create_stored_variable(stored_model)
        return stored_model
