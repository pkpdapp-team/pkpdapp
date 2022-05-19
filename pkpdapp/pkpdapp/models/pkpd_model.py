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
    DosedPharmacokineticModel,
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


class PkpdModel(MyokitModelMixin, StoredModel):
    dosed_pk_model = models.ForeignKey(
        DosedPharmacokineticModel, on_delete=models.CASCADE,
        related_name='pkpd_models',
        help_text='PK part of model'
    )
    pd_model = models.ForeignKey(
        PharmacodynamicModel, on_delete=models.CASCADE,
        related_name='pkpd_models',
        help_text='PD part of model'
    )
    project = models.ForeignKey(
        Project, on_delete=models.CASCADE,
        related_name='pkpd_models',
        blank=True, null=True,
        help_text='Project that "owns" this model'
    )

    def get_project(self):
        return self.project

    __original_pd_model = None
    __original_dosed_pk_model = None

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.__original_pd_model = self.pd_model
        self.__original_dosed_pk_model = self.dosed_pk_model

    def create_stored_model(self, new_pk_model, new_pd_model):
        stored_model_kwargs = {
            'name': self.name,
            'project': self.project,
            'dosed_pk_model': new_pk_model,
            'pd_model': new_pk_model,
            'read_only': True,
        }
        stored_model = PkpdModel.objects.create(
            **stored_model_kwargs)
        new_variables = {}
        for variable in self.variables.all():
            new_variable = variable.create_stored_variable(stored_model)
            new_variables[new_variable.qname] = new_variable

        for mapping in self.mappings.all():
            mapping.create_stored_mapping(stored_model, new_variables)
        return stored_model

    def create_myokit_model(self):
        pk_model = self.dosed_pk_model.create_myokit_model()
        pd_model = self.pd_model.create_myokit_model()

        # clone PD model so original model is unaffected
        pkpd_model = pd_model.clone()

        # remove time binding
        time_var = pk_model.get('myokit.time')
        time_var.set_binding(None)

        pk_components = list(pk_model.components())
        pk_names = [
            c.name().replace('myokit', 'PK') for c in pk_components
        ]
        pkpd_model.import_component(pk_components, new_name=pk_names)

        # remove imported time var
        imported_pk_component = pkpd_model.get('PK')
        imported_time = imported_pk_component.get('time')
        imported_pk_component.remove_variable(imported_time)

        pkpd_model.validate()
        return pkpd_model

    def create_myokit_simulator(self):
        model = self.get_myokit_model()
        with lock:
            sim = myokit.Simulation(model)
        return sim

    def save(self, force_insert=False, force_update=False, *args, **kwargs):
        created = not self.pk

        super().save(force_insert, force_update, *args, **kwargs)

        # don't update a stored model
        if self.read_only:
            return

        if (
            created or
            self.pd_model != self.__original_pd_model or
            self.dosed_pk_model != self.__original_dosed_pk_model
        ):
            print('update model')
            self.update_model()

        self.__original_pd_model = self.pd_model
        self.__original_dosed_pk_model = self.dosed_pk_model


class PkpdMapping(StoredModel):
    pkpd_model = models.ForeignKey(
        PkpdModel, on_delete=models.CASCADE,
        related_name='mappings',
        help_text='PKPD model that this mapping is for'
    )
    pk_variable = models.ForeignKey(
        'Variable', on_delete=models.CASCADE,
        related_name='pk_mappings',
        help_text='variable in PK part of model'
    )
    pd_variable = models.ForeignKey(
        'Variable', on_delete=models.CASCADE,
        related_name='pd_mappings',
        help_text='variable in PD part of model'
    )

    def create_stored_mapping(self, new_pkpd_model, new_variables):
        new_pk_variable = new_variables[self.pk_variable.qname]
        new_pd_variable = new_variables[self.pd_variable.qname]
        stored_kwargs = {
            'pkpd_model': new_pkpd_model,
            'pk_variable': new_pk_variable,
            'pd_variable': new_pd_variable,
            'read_only': True,
        }
        stored_mapping = PkpdMapping.objects.create(
            **stored_kwargs)
        return stored_mapping
