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
    Protocol, Variable
)
import myokit


class PharmacokineticModel(MechanisticModel):
    """
    this just creates a concrete table for PK models without dosing
    """

    def get_absolute_url(self):
        return reverse('pk_model-detail', kwargs={'pk': self.pk})

class PkVariable(Variable):
    """
    variables for pk models
    """
    pk_model = models.ForeignKey(
        PharmacokineticModel,
        on_delete=models.CASCADE,
        help_text='pharmacokinetic model'
    )

class DosedPharmacokineticModel(models.Model, MyokitModelMixin):
    """
    PK model plus dosing and protocol information
    """
    DEFAULT_PK_MODEL = 1
    name = models.CharField(max_length=100, help_text='name of the model')
    pharmacokinetic_model = models.ForeignKey(
        PharmacokineticModel,
        default=DEFAULT_PK_MODEL,
        on_delete=models.CASCADE,
        help_text='pharmacokinetic model'
    )
    dose_compartment = models.CharField(
        max_length=100,
        default='central',
        blank=True, null=True,
        help_text='compartment name to be dosed'
    )
    protocol = models.ForeignKey(
        Protocol,
        on_delete=models.CASCADE,
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

    def create_myokit_model(self):
        pk_model = self.pharmacokinetic_model.create_myokit_model()
        compartment = self.dose_compartment
        amount_var = 'central.drug_amount'
        for v in pk_model.variables(state=True):
            if compartment + '.' in v.qname():
                amount_var = v

        direct = self.protocol.dose_type == Protocol.DoseType.DIRECT

        set_administration(
            pk_model, compartment, direct=direct,
            amount_var=amount_var.name()
        )

        return pk_model

    def create_myokit_simulator(self):
        sim = myokit.Simulation(self.get_myokit_model())

        dosing_events = [(d.amount, d.start_time, d.duration)
                         for d in self.protocol.doses.all()]

        set_dosing_events(sim, dosing_events)

        return sim

    def get_absolute_url(self):
        return reverse('dosed_pk_model-detail', kwargs={'pk': self.pk})

class DosedPkVariable(Variable):
    """
    variables for pk models
    """
    dosed_pk_model = models.ForeignKey(
        DosedPharmacokineticModel,
        on_delete=models.CASCADE,
        help_text='dosed pharmacokinetic model'
    )


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
        myokit_protocol.schedule(e[0], e[1], e[2])

    simulator.set_protocol(myokit_protocol)
