#
# This file is part of PKPDApp (https://github.com/pkpdapp-team/pkpdapp) which
# is released under the BSD 3-clause license. See accompanying LICENSE.md for
# copyright notice and full license details.
#

import myokit


def set_administration(model, drug_amount, direct=True):
    r"""
    Sets the route of administration of the compound.

    The compound is administered to the selected compartment either
    directly or indirectly. If it is administered directly, a dose rate
    variable is added to the drug amount's rate of change expression.
    """
    if not drug_amount.is_state():
        raise ValueError(
            "The variable <"
            + str(drug_amount)
            + "> is not a state variable, and can therefore not be dosed."
        )

    time_unit = _get_time_unit(model)
    if not direct:
        drug_amount = _add_dose_compartment(model, drug_amount, time_unit)

    _add_dose_rate(drug_amount, time_unit)


def get_protocol(events):
    """
    Parameters
    ----------
    events
        list of (level, start, duration)
    """
    myokit_protocol = myokit.Protocol()
    for event in events:
        myokit_protocol.schedule(event[0], event[1], event[2])

    return myokit_protocol


def _get_pacing_label(variable):
    return f"pace_{variable.qname().replace('.', '_')}"


def _add_dose_rate(drug_amount, time_unit):
    """
    Adds a dose rate variable to the state variable, which is bound to the
    dosing regimen.
    """
    compartment = drug_amount.parent()
    dose_rate = compartment.add_variable_allow_renaming(str("dose_rate"))
    dose_rate.set_binding(_get_pacing_label(drug_amount))

    dose_rate.set_rhs(0)
    drug_amount_unit = drug_amount.unit()
    if drug_amount_unit is not None and time_unit is not None:
        dose_rate.set_unit(drug_amount.unit() / time_unit)

    rhs = drug_amount.rhs()
    drug_amount.set_rhs(myokit.Plus(rhs, myokit.Name(dose_rate)))


def _get_time_unit(model):
    """
    Gets the model's time unit.
    """
    for variable in model.variables(bound=True):
        if variable._binding == "time":
            return variable.unit()


def _add_dose_compartment(model, drug_amount, time_unit):
    """
    Adds a dose compartment to the model with a linear absorption rate to
    the connected compartment.
    """
    dose_comp = model.add_component_allow_renaming("dose")

    dose_drug_amount = dose_comp.add_variable("drug_amount")
    dose_drug_amount.set_rhs(0)
    dose_drug_amount.set_unit(drug_amount.unit())
    dose_drug_amount.promote()

    absorption_rate = dose_comp.add_variable("absorption_rate")
    absorption_rate.set_rhs(1)
    absorption_rate.set_unit(1 / time_unit)

    dose_drug_amount.set_rhs(
        myokit.Multiply(
            myokit.PrefixMinus(myokit.Name(absorption_rate)),
            myokit.Name(dose_drug_amount),
        )
    )

    rhs = drug_amount.rhs()
    drug_amount.set_rhs(
        myokit.Plus(
            rhs,
            myokit.Multiply(
                myokit.Name(absorption_rate),
                myokit.Name(dose_drug_amount),
            ),
        )
    )

    return dose_drug_amount


def get_dosing_events(
    doses,
    amount_conversion_factor=1.0,
    time_conversion_factor=1.0,
    tlag_time=0.0,
    time_max=None,
):
    dosing_events = []
    for dose in doses.all():
        if dose.repeat_interval <= 0:
            continue
        for repeat_index in range(dose.repeats):
            start = dose.start_time + repeat_index * dose.repeat_interval
            converted_start = time_conversion_factor * start + tlag_time
            converted_duration = time_conversion_factor * dose.duration
            level = (
                amount_conversion_factor
                / time_conversion_factor
                * dose.amount
                / dose.duration
            )
            dosing_events.append((level, converted_start, converted_duration))

    if time_max is not None:
        for i, (level, start, duration) in enumerate(dosing_events):
            if abs(start - time_max) < 1e-6:
                dosing_events[i] = (level, time_max, duration)
            elif abs(start + duration - time_max) < 1e-6:
                dosing_events[i] = (level, start, time_max - start)
    return dosing_events
