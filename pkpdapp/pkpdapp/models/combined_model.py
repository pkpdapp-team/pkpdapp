#
# This file is part of PKPDApp (https://github.com/pkpdapp-team/pkpdapp) which
# is released under the BSD 3-clause license. See accompanying LICENSE.md for
# copyright notice and full license details.
#

import myokit
from pkpdapp.models import (
    MyokitModelMixin,
    Project, StoredModel,
    PharmacodynamicModel,
    PharmacokineticModel,
    Unit,
)
from django.db import models
from django.urls import reverse
import logging
logger = logging.getLogger(__name__)


class CombinedModel(MyokitModelMixin, StoredModel):
    """
    PK model plus dosing and protocol information
    """
    name = models.CharField(max_length=100, help_text='name of the model')
    project = models.ForeignKey(
        Project, on_delete=models.CASCADE,
        related_name='pk_models',
        blank=True, null=True,
        help_text='Project that "owns" this model'
    )

    class SpeciesType(models.TextChoices):
        HUMAN = 'H', 'human'
        RAT = 'R', 'rat'
        NHP = 'N', 'non-human primate'
        MOUSE = 'M', 'mouse'

    species = models.CharField(
        max_length=1,
        choices=SpeciesType.choices,
        default=SpeciesType.HUMAN,
        help_text='species'
    )

    pk_model = models.ForeignKey(
        PharmacokineticModel,
        on_delete=models.PROTECT,
        blank=True, null=True,
        help_text='model'
    )

    has_saturation = models.BooleanField(
        default=False,
        help_text='whether the pk model has saturation'
    )
    has_effect = models.BooleanField(
        default=False,
        help_text='whether the pk model has effect compartment'
    )
    has_lag = models.BooleanField(
        default=False,
        help_text='whether the pk model has lag'
    )

    pd_model = models.ForeignKey(
        PharmacodynamicModel, on_delete=models.PROTECT,
        related_name='pkpd_models',
        blank=True, null=True,
        help_text='PD part of model'
    )

    has_hill_coefficient = models.BooleanField(
        default=False,
        help_text='whether the pd model has hill coefficient'
    )

    pd_model2 = models.ForeignKey(
        PharmacodynamicModel, on_delete=models.PROTECT,
        related_name='pkpd_models2',
        blank=True, null=True,
        help_text='second PD part of model'
    )

    time_max = models.FloatField(
        default=30,
        help_text=(
            'suggested time to simulate after the last dose (in the time '
            'units specified by the mmt model)'
        )
    )
    __original_pk_model = None
    __original_pd_model = None
    __original_pd_model2 = None
    __original_species = None
    __original_has_saturation = None
    __original_has_effect = None
    __original_has_lag = None
    __original_has_hill_coefficient = None

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)

    @classmethod
    def from_db(cls, db, field_names, values):
        instance = super().from_db(db, field_names, values)
        # fix for infinite recursion when deleting project
        if 'pk_model' in field_names:
            instance.__original_pk_model = instance.pk_model
        if 'pd_model' in field_names:
            instance.__original_pd_model = instance.pd_model
        if 'pd_model2' in field_names:
            instance.__original_pd_model2 = instance.pd_model2
        if 'species' in field_names:
            instance.__original_species = instance.species
        if 'has_saturation' in field_names:
            instance.__original_has_saturation = instance.has_saturation
        if 'has_effect' in field_names:
            instance.__original_has_effect = instance.has_effect
        if 'has_lag' in field_names:
            instance.__original_has_lag = instance.has_lag
        if 'has_hill_coefficient' in field_names:
            instance.__original_has_hill_coefficient = \
                instance.has_hill_coefficient
        return instance

    def get_project(self):
        return self.project

    def get_time_max(self):
        time_max = self.time_max
        if self.pd_model:
            time_max = max(time_max, self.pd_model.time_max)
        return time_max

    def get_mmt(self):
        myokit_model = self.get_myokit_model()
        return myokit_model.code()

    def create_stored_model(self, new_pd_model=None):
        stored_model_kwargs = {
            'name': self.name,
            'project': self.project,
            'pk_model': self.pk_model,
            'pd_model': new_pd_model,
            'time_max': self.time_max,
            'read_only': True,
        }
        stored_model = CombinedModel.objects.create(
            **stored_model_kwargs)

        new_variables = {}
        for variable in self.variables.all():
            new_variable = variable.create_stored_variable(stored_model)
            new_variables[new_variable.qname] = new_variable

        for mapping in self.mappings.all():
            mapping.create_stored_mapping(stored_model, new_variables)

        return stored_model

    def create_myokit_model(self):
        if self.pk_model is None:
            pk_model = myokit.Model()
        else:
            pk_model = self.pk_model.create_myokit_model()
        if self.pd_model is None:
            pd_model = myokit.Model()
        else:
            pd_model = self.pd_model.create_myokit_model()
        if self.pd_model2 is None:
            pd_model2 = myokit.Model()
        else:
            pd_model2 = self.pd_model2.create_myokit_model()

        have_both_models = (
            self.pk_model is not None and
            self.pd_model is not None
        )
        have_no_models = (
            self.pk_model is None and
            self.pd_model is None
        )

        # combine the two pd models.
        # If any constants overlap prefer the pd_model (remove the constant from pd_model2)
        # If any state variables overlap then add the rhs terms
        
        if self.pd_model2 is not None:
            pd2_time_var = pd_model2.binding('time')
            pd2_time_var.set_binding(None)
            pd2_time_component = pd2_time_var.parent()
            pd2_time_component.remove_variable(pd2_time_var)
            if pd2_time_component.count_variables() == 0:
                pd_model2.remove_component(pd2_time_component)

            pd2_components = list(pd_model2.components())
            pd2_names = [ c.name().replace('PDCompartment', 'PDCompartment2') for c in pd2_components ]
            pd_model.import_component(
                pd2_components,
                new_name=pd2_names,
            )

            # deal with any state variables that overlap
            for old_pd2_var in pd_model2.variables(state=True):
                if pd_model.has_variable(old_pd2_var.qname()):
                    pd_var = pd_model.get(old_pd2_var.qname())
                    pd2_var = pd_model.get(pd_var.qname().replace('PDCompartment', 'PDCompartment2'))
                    pd_var.set_rhs(myokit.Plus(pd_var.rhs(), pd2_var.rhs().clone({myokit.Name(pd2_var): myokit.Name(pd_var)})))
                    for eqn in pd_model.get('PDCompartment2').equations():
                        if eqn.rhs.depends_on(myokit.Name(pd2_var)):
                            lhs_var = eqn.lhs.var()
                            lhs_var.set_rhs(eqn.rhs.clone({myokit.Name(pd2_var): myokit.Name(pd_var)}))
                    pd2_var.parent().remove_variable(pd2_var)

            # deal with any constants that overlap
            for old_pd2_var in pd_model2.variables(const=True):
                if pd_model.has_variable(old_pd2_var.qname()):
                    pd2_var = pd_model.get(old_pd2_var.qname().replace('PDCompartment', 'PDCompartment2'))
                    pd2_var.parent().remove_variable(pd2_var)

        # use pk model as the base and import the pd model
        pkpd_model = pk_model

        # default model is one with just time
        if have_no_models:
            pkpd_model = myokit.parse_model('''
            [[model]]
            [myokit]
            time = 0 [s] bind time
                in [s]
        ''')

        # remove time binding and variable from pd model
        if have_both_models:
            time_var = pd_model.binding('time')
            time_var.set_binding(None)
            time_component = time_var.parent()
            time_component.remove_variable(time_var)
            if time_component.count_variables() == 0:
                pd_model.remove_component(time_component)

        pd_components = list(pd_model.components())
        pd_names = [
            c.name().replace('myokit', 'PD') for c in pd_components
        ]

        if pd_components:
            pkpd_model.import_component(
                pd_components,
                new_name=pd_names,
            )

        # do mappings
        for mapping in self.mappings.all():
            pd_var = pkpd_model.get(
                mapping.pd_variable.qname.replace('myokit', 'PD')
            )
            pk_var = pkpd_model.get(
                mapping.pk_variable.qname
            )

            pk_to_pd_conversion_multiplier = Unit.convert_between_myokit_units(
                pk_var.unit(), pd_var.unit(), compound=self.project.compound
            )
            pd_to_pk_conversion_multiplier = Unit.convert_between_myokit_units(
                pk_var.unit(), pd_var.unit(), compound=self.project.compound
            )

            # pd var will be an intermediary variable driven by pk_var
            if pd_var.is_state():
                # add pd_var rate equation to pk_var
                pk_var.set_rhs(
                    myokit.Plus(
                        pk_var.rhs(),
                        myokit.Multiply(
                            myokit.Number(pd_to_pk_conversion_multiplier),
                            pd_var.rhs()
                        )
                    )
                )

                # demote pd_var to an intermediary variable
                pd_var.demote()

            pd_var.set_rhs(
                myokit.Multiply(
                    myokit.Number(pk_to_pd_conversion_multiplier),
                    myokit.Name(pk_var)
                )
            )

        # do receptor occupancies
        for ro in self.receptor_occupancies.all():
            myokit_var = pkpd_model.get(ro.pk_variable.qname)
            myokit_compartment = myokit_var.parent()
            # add a new variable
            var_name = ro.pk_variable.name
            var = myokit_compartment.add_variable(f'{var_name}_RO')
            var.set_unit(myokit.Unit())
            kd = self.project.compound.dissociation_constant
            kd_unit = self.project.compound.dissociation_unit.get_myokit_unit()
            kd_factor = myokit.Unit.conversion_factor(
                kd_unit, myokit_var.unit()
            ).value()
            kd_value = kd * kd_factor
            target_conc = self.project.compound.target_concentration
            target_conc_unit = self.project.compound \
                                   .target_concentration_unit \
                                   .get_myokit_unit()
            target_conc_factor = myokit.Unit.conversion_factor(
                target_conc_unit, myokit_var.unit()
            ).value()
            target_value = target_conc * target_conc_factor
            kd_plus_target_value = kd_value + target_value
            four_times_target_value = 4 * target_value
            b = f'{kd_plus_target_value} + {var_name}'
            c = f'{four_times_target_value} * {var_name}'
            var.set_rhs(
                f'100 * ({b} - (({b})^2 - {c})^0.5) / (2 * {target_value})')

        pkpd_model.validate()
        return pkpd_model

    def get_absolute_url(self):
        return reverse('dosed_pk_model-detail', kwargs={'pk': self.pk})

    def save(self, force_insert=False, force_update=False, *args, **kwargs):
        created = not self.pk

        super().save(force_insert, force_update, *args, **kwargs)

        # don't update a stored model
        if self.read_only:
            return

        if (
            created or
            self.pk_model != self.__original_pk_model or
            self.pd_model != self.__original_pd_model or
            self.pd_model2 != self.__original_pd_model2 or
            self.has_saturation != self.__original_has_saturation or
            self.has_effect != self.__original_has_effect or
            self.has_lag != self.__original_has_lag or
            self.has_hill_coefficient != self.__original_has_hill_coefficient
        ):
            self.update_model()

        self.__original_pd_model = self.pd_model
        self.__original_pd_model2 = self.pd_model2
        self.__original_pk_model = self.pk_model
        self.__original_species = self.species
        self.__original_has_saturation = self.has_saturation
        self.__original_has_effect = self.has_effect
        self.__original_has_lag = self.has_lag
        self.__original_has_hill_coefficient = self.has_hill_coefficient


class PkpdMapping(StoredModel):
    pkpd_model = models.ForeignKey(
        CombinedModel, on_delete=models.CASCADE,
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

    __original_pk_variable = None
    __original_pd_variable = None

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.__original_pk_variable = self.pk_variable
        self.__original_pd_variable = self.pd_variable

    def save(self, force_insert=False, force_update=False, *args, **kwargs):
        created = not self.pk

        super().save(force_insert, force_update, *args, **kwargs)

        # don't update a stored model
        if self.read_only:
            return

        if (
            created or
            self.pk_variable != self.__original_pk_variable or
            self.pd_variable != self.__original_pd_variable
        ):
            self.pkpd_model.update_model()

        self.__original_pk_variable = self.pk_variable
        self.__original_pd_variable = self.pd_variable

    def delete(self):
        pkpd_model = self.pkpd_model
        super().delete()
        pkpd_model.update_model()

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


class ReceptorOccupancy(StoredModel):
    pkpd_model = models.ForeignKey(
        CombinedModel, on_delete=models.CASCADE,
        related_name='receptor_occupancies',
        help_text='PKPD model that this mapping is for'
    )
    pk_variable = models.ForeignKey(
        'Variable', on_delete=models.CASCADE,
        related_name='receptor_occupancies',
        help_text='variable in PK part of model'
    )

    __original_pk_variable = None

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.__original_pk_variable = self.pk_variable

    def save(self, force_insert=False, force_update=False, *args, **kwargs):
        created = not self.pk

        super().save(force_insert, force_update, *args, **kwargs)

        # don't update a stored model
        if self.read_only:
            return

        if (
            created or
            self.pk_variable != self.__original_pk_variable
        ):
            self.pkpd_model.update_model()

        self.__original_pk_variable = self.pk_variable

    def delete(self):
        pkpd_model = self.pkpd_model
        super().delete()
        pkpd_model.update_model()

    def create_stored_mapping(self, new_pkpd_model, new_variables):
        new_pk_variable = new_variables[self.pk_variable.qname]
        stored_kwargs = {
            'pkpd_model': new_pkpd_model,
            'pk_variable': new_pk_variable,
            'read_only': True,
        }
        stored_mapping = ReceptorOccupancy.objects.create(
            **stored_kwargs)
        return stored_mapping
