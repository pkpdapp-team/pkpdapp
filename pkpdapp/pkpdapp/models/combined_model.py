#
# This file is part of PKPDApp (https://github.com/pkpdapp-team/pkpdapp) which
# is released under the BSD 3-clause license. See accompanying LICENSE.md for
# copyright notice and full license details.
#

from django.db import models
from django.urls import reverse
from pkpdapp.models import (
    MyokitModelMixin,
    MechanisticModel,
    Protocol,
    Project, StoredModel,
    PharmacodynamicModel,
    PharmacokineticModel,
)
import myokit
from .myokit_model_mixin import lock


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
            instance.__original_has_hill_coefficient = instance.has_hill_coefficient
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
        have_both_models = (
            self.pk_model is not None and
            self.pd_model is not None
        )
        have_no_models = (
            self.pk_model is None and
            self.pd_model is None
        )

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

        # remove time binding if
        if have_both_models:
            time_var = pd_model.binding('time')
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
            pk_var = pkpd_model.get(
                mapping.pk_variable.qname
            )

            helpers = None

            # if pd unit is in mol, then use the project compound to convert to grams
            if pd_var.unit().exponents()[-1] != 0:
                compound = self.project.compound
                if compound is None:
                    raise RuntimeError(
                        'PD unit is in mol, but no compound listed for '
                        'protocol to convert to grams'
                    )
                if compound.molecular_mass is None:
                    raise RuntimeError(
                        'PD unit is in mol, but no molecular mass '
                        'is listed for compound '
                        '{}'.format(compound.name)
                    )
                if compound.molecular_mass_unit is None:
                    raise RuntimeError(
                        'PD unit is in mol, but no molecular mass unit '
                        'is listed for compound '
                        '{}'.format(compound.name)
                    )

                mol_mass = myokit.Quantity(
                    compound.molecular_mass,
                    compound.molecular_mass_unit.get_myokit_unit()
                )
                helpers = [mol_mass]

            pk_to_pd_conversion_multiplier = myokit.Unit.conversion_factor(
                pk_var.unit(), pd_var.unit(), helpers=helpers
            )
            pd_to_pk_conversion_multiplier = myokit.Unit.conversion_factor(
                pd_var.unit(), pk_var.unit(), helpers=helpers
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
            self.pd_model2 != self.__original_pd_model2
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


def _add_dose_compartment(model, drug_amount, time_unit):
    """
    Adds a dose compartment to the model with a linear absorption rate to
    the connected compartment.
    """
    # Add a dose compartment to the model
    dose_comp = model.add_component_allow_renaming('dose')

    # Create a state variable for the drug amount in the dose compartment
    dose_drug_amount = dose_comp.add_variable('drug_amount')
    dose_drug_amount.set_rhs(0)
    dose_drug_amount.set_unit(drug_amount.unit())
    dose_drug_amount.promote()

    # Create an absorption rate variable
    absorption_rate = dose_comp.add_variable('absorption_rate')
    absorption_rate.set_rhs(1)
    absorption_rate.set_unit(1 / time_unit)

    # Add outflow expression to dose compartment
    dose_drug_amount.set_rhs(
        myokit.Multiply(myokit.PrefixMinus(myokit.Name(absorption_rate)),
                        myokit.Name(dose_drug_amount)))

    # Add inflow expression to connected compartment
    rhs = drug_amount.rhs()
    drug_amount.set_rhs(
        myokit.Plus(
            rhs,
            myokit.Multiply(myokit.Name(absorption_rate),
                            myokit.Name(dose_drug_amount))))

    return dose_drug_amount


