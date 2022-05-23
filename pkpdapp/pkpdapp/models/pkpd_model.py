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
        blank=True, null=True,
        help_text='PK part of model'
    )
    pd_model = models.ForeignKey(
        PharmacodynamicModel, on_delete=models.CASCADE,
        related_name='pkpd_models',
        blank=True, null=True,
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
        if self.dosed_pk_model is None:
            pk_model = myokit.Model()
        else:
            pk_model = self.dosed_pk_model.create_myokit_model()
        if self.pd_model is None:
            pd_model = myokit.Model()
        else:
            pd_model = self.pd_model.create_myokit_model()
        have_both_models = (
            self.dosed_pk_model is not None and
            self.pd_model is not None
        )
        have_no_models = (
            self.dosed_pk_model is None and
            self.pd_model is None
        )

        # clone PK model so original model is unaffected
        pkpd_model = pk_model.clone()

        # default model is one with just time
        if have_no_models:
            pkpd_model = myokit.parse_model('''
            [[model]]
            [myokit]
            time = 0 [s] bind time
                in [s]
        ''')

        # remove time binding if
        if have_both_models:
            time_var = pd_model.get('myokit.time')
            time_var.set_binding(None)

        pd_components = list(pd_model.components())
        pd_names = [
            c.name().replace('myokit', 'PD') for c in pd_components
        ]

        if pd_components:
            pkpd_model.import_component(
                pd_components,
                new_name=pd_names,
            )

        # remove imported time var
        if have_both_models:
            imported_pd_component = pkpd_model.get('PD')
            imported_time = imported_pd_component.get('time')
            imported_pd_component.remove_variable(imported_time)

        # do mappings
        for mapping in self.mappings.all():
            pd_var = pkpd_model.get(
                mapping.pd_variable.qname.replace('myokit', 'PD')
            )
            pd_var.set_rhs(mapping.pk_variable.qname)

        pkpd_model.validate()
        return pkpd_model

    def create_myokit_simulator(self):
        model = self.get_myokit_model()
        with lock:
            sim = myokit.Simulation(model)
        return sim


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
