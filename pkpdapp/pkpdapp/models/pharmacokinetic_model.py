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
)
import myokit
from .myokit_model_mixin import lock


class PharmacokineticModel(MechanisticModel, StoredModel):
    """
    this just creates a concrete table for PK models without dosing
    """
    __original_sbml = None

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.__original_sbml = self.sbml

    def get_project(self):
        return None

    def get_absolute_url(self):
        return reverse('pk_model-detail', kwargs={'pk': self.pk})

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
            'sbml': self.sbml,
            'time_max': self.time_max,
            'read_only': True,
        }
        stored_model = PharmacokineticModel.objects.create(
            **stored_model_kwargs)

        # no need to store variables as they will be stored with the dosed pk
        # model
        return stored_model


class DosedPharmacokineticModel(MyokitModelMixin, StoredModel):
    """
    PK model plus dosing and protocol information
    """
    DEFAULT_PK_MODEL = 1
    name = models.CharField(max_length=100, help_text='name of the model')
    project = models.ForeignKey(
        Project, on_delete=models.CASCADE,
        related_name='pk_models',
        blank=True, null=True,
        help_text='Project that "owns" this model'
    )
    pk_model = models.ForeignKey(
        PharmacokineticModel,
        default=DEFAULT_PK_MODEL,
        on_delete=models.PROTECT,
        blank=True, null=True,
        help_text='model'
    )
    pd_model = models.ForeignKey(
        PharmacodynamicModel, on_delete=models.PROTECT,
        related_name='pkpd_models',
        blank=True, null=True,
        help_text='PD part of model'
    )
    dose_compartment = models.CharField(
        max_length=100,
        default='central',
        blank=True, null=True,
        help_text='compartment name to be dosed'
    )
    protocol = models.ForeignKey(
        Protocol,
        on_delete=models.PROTECT,
        related_name='dosed_pk_models',
        blank=True, null=True,
        help_text='dosing protocol'
    )
    time_max = models.FloatField(
        default=30,
        help_text=(
            'suggested time to simulate after the last dose (in the time '
            'units specified by the sbml model)'
        )
    )
    __original_pk_model = None
    __original_protocol = None
    __original_dose_compartment = None
    __original_pd_model = None

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.__original_pk_model = self.pk_model
        self.__original_protocol = self.protocol
        self.__original_dose_compartment = self.dose_compartment
        self.__original_pd_model = self.pd_model

    def get_project(self):
        return self.project

    def get_time_max(self):
        time_max = self.time_max
        if self.pd_model:
            time_max = max(time_max, self.pd_model.time_max)
        return time_max

    def create_stored_model(self, new_pd_model=None):
        stored_model_kwargs = {
            'name': self.name,
            'project': self.project,
            'pk_model': self.pk_model,
            'pd_model': new_pd_model,
            'dose_compartment': self.dose_compartment,
            'protocol': (
                self.protocol.create_stored_protocol()
                if self.protocol is not None else None
            ),
            'time_max': self.time_max,
            'read_only': True,
        }
        stored_model = DosedPharmacokineticModel.objects.create(
            **stored_model_kwargs)

        new_variables = {}
        for variable in self.variables.all():
            new_variable = variable.create_stored_variable(stored_model)
            new_variables[new_variable.qname] = new_variable

        for mapping in self.mappings.all():
            mapping.create_stored_mapping(stored_model, new_variables)

        return stored_model

    def create_myokit_dosed_pk_model(self):
        pk_model = self.pk_model.create_myokit_model()
        if self.protocol:
            compartment = self.dose_compartment
            amount_var = None
            for v in pk_model.variables(state=True):
                if compartment + '.' in v.qname():
                    amount_var = v

            direct = self.protocol.dose_type == Protocol.DoseType.DIRECT

            if amount_var is not None:
                set_administration(
                    pk_model, compartment, direct=direct,
                    amount_var=amount_var.name()
                )

        return pk_model

    def create_myokit_model(self):
        if self.pk_model is None:
            pk_model = myokit.Model()
        else:
            pk_model = self.create_myokit_dosed_pk_model()
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
            pk_var = pkpd_model.get(
                mapping.pk_variable.qname
            )

            unit_conversion_multiplier = myokit.Unit.conversion_factor(
                pk_var.unit(), pd_var.unit()
            )
            pd_var.set_rhs(
                myokit.Multiply(
                    myokit.Number(unit_conversion_multiplier),
                    myokit.Name(pk_var)
                )
            )

        pkpd_model.validate()
        return pkpd_model

    def create_myokit_simulator(self):
        model = self.get_myokit_model()
        with lock:
            sim = myokit.Simulation(model)
        if self.protocol:
            compartment = self.dose_compartment
            amount_var = None
            for v in model.variables(state=True):
                if compartment + '.' in v.qname():
                    amount_var = v

            time_var = model.get('myokit.time')

            amount_conversion_factor = \
                myokit.Unit.conversion_factor(
                    self.protocol.amount_unit.get_myokit_unit(),
                    amount_var.unit(),
                ).value()

            time_conversion_factor = \
                myokit.Unit.conversion_factor(
                    self.protocol.time_unit.get_myokit_unit(),
                    time_var.unit(),
                ).value()

            dosing_events = [
                (
                    (amount_conversion_factor /
                     time_conversion_factor) *
                    (d.amount / d.duration),
                    time_conversion_factor * d.start_time,
                    time_conversion_factor * d.duration
                )
                for d in self.protocol.doses.all()
            ]

            set_dosing_events(sim, dosing_events)

        return sim

    def get_absolute_url(self):
        return reverse('dosed_pk_model-detail', kwargs={'pk': self.pk})

    def save(self, force_insert=False, force_update=False, *args, **kwargs):
        created = not self.pk

        super().save(force_insert, force_update, *args, **kwargs)

        # don't update a stored model
        if self.read_only:
            return

        print('saving model')
        if (
            created or
            self.protocol != self.__original_protocol or
            self.pk_model != self.__original_pk_model or
            self.pd_model != self.__original_pd_model or
            self.dose_compartment != self.__original_dose_compartment
        ):
            print('update model')
            self.update_model()

        self.__original_pd_model = self.pd_model
        self.__original_pk_model = self.pk_model
        self.__original_protocol = self.protocol
        self.__original_dose_compartment = self.dose_compartment


class PkpdMapping(StoredModel):
    pkpd_model = models.ForeignKey(
        DosedPharmacokineticModel, on_delete=models.CASCADE,
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


def _add_dose_rate(compartment, drug_amount, time_unit):
    """
    Adds a dose rate variable to the state variable, which is bound to the
    dosing regimen.
    """
    # Register a dose rate variable to the compartment and bind it to
    # pace, i.e. tell myokit that its value is set by the dosing regimen/
    # myokit.Protocol
    compartment = drug_amount.parent()
    dose_rate = compartment.add_variable_allow_renaming(str('dose_rate'))
    dose_rate.set_binding('pace')

    # Set initial value to 0 and unit to unit of drug amount over unit of
    # time
    dose_rate.set_rhs(0)
    dose_rate.set_unit(drug_amount.unit() / time_unit)

    # Add the dose rate to the rhs of the drug amount variable
    rhs = drug_amount.rhs()
    drug_amount.set_rhs(myokit.Plus(rhs, myokit.Name(dose_rate)))


def _get_time_unit(model):
    """
    Gets the model's time unit.
    """
    # Get bound variables
    bound_variables = [var for var in model.variables(bound=True)]

    # Get the variable that is bound to time
    # (only one can exist in myokit.Model)
    for var in bound_variables:
        if var._binding == 'time':
            return var.unit()


def set_administration(model,
                       compartment,
                       amount_var='drug_amount',
                       direct=True):
    r"""
    Sets the route of administration of the compound.

    The compound is administered to the selected compartment either
    directly or indirectly. If it is administered directly, a dose rate
    variable is added to the drug amount's rate of change expression

    .. math ::

        \frac{\text{d}A}{\text{d}t} = \text{RHS} + r_d,

    where :math:`A` is the drug amount in the selected compartment, RHS is
    the rate of change of :math:`A` prior to adding the dose rate, and
    :math:`r_d` is the dose rate.

    The dose rate can be set by :meth:`set_dosing_regimen`.

    If the route of administration is indirect, a dosing compartment
    is added to the model, which is connected to the selected compartment.
    The dose rate variable is then added to the rate of change expression
    of the dose amount variable in the dosing compartment. The drug amount
    in the dosing compartment flows at a linear absorption rate into the
    selected compartment

    .. math ::

        \frac{\text{d}A_d}{\text{d}t} = -k_aA_d + r_d \\
        \frac{\text{d}A}{\text{d}t} = \text{RHS} + k_aA_d,

    where :math:`A_d` is the amount of drug in the dose compartment and
    :math:`k_a` is the absorption rate.

    Setting an indirect administration route changes the number of
    parameters of the model, and resets the parameter names to their
    defaults.

    Parameters
    ----------
    compartment
        Compartment to which doses are either directly or indirectly
        administered.
    amount_var
        Drug amount variable in the compartment. By default the drug amount
        variable is assumed to be 'drug_amount'.
    direct
        A boolean flag that indicates whether the dose is administered
        directly or indirectly to the compartment.
    """
    # Check inputs
    if not model.has_component(compartment):
        raise ValueError('The model does not have a compartment named <' +
                         str(compartment) + '>.')
    comp = model.get(compartment, class_filter=myokit.Component)

    if not comp.has_variable(amount_var):
        raise ValueError('The drug amount variable <' + str(amount_var) +
                         '> could not '
                         'be found in the compartment.')

    drug_amount = comp.get(amount_var)
    if not drug_amount.is_state():
        raise ValueError('The variable <' + str(drug_amount) +
                         '> is not a state '
                         'variable, and can therefore not be dosed.')

    # If administration is indirect, add a dosing compartment and update
    # the drug amount variable to the one in the dosing compartment
    time_unit = _get_time_unit(model)
    if not direct:
        drug_amount = _add_dose_compartment(model, drug_amount, time_unit)

    # Add dose rate variable to the right hand side of the drug amount
    _add_dose_rate(compartment, drug_amount, time_unit)


def set_dosing_events(simulator, events):
    """

    Parameters
    ----------
    events
        list of (level, start, duration)
    """
    myokit_protocol = myokit.Protocol()
    for e in events:
        myokit_protocol.schedule(
            e[0], e[1], e[2]
        )

    simulator.set_protocol(myokit_protocol)
