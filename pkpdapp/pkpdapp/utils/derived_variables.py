#
# This file is part of PKPDApp (https://github.com/pkpdapp-team/pkpdapp) which
# is released under the BSD 3-clause license. See accompanying LICENSE.md for
# copyright notice and full license details.
#

import myokit
from pkpdapp.models import DerivedVariable
import logging

logger = logging.getLogger(__name__)


def add_pk_variable(
    derived_variable: DerivedVariable,
    pk_model: myokit.Model,
    project
) -> None:
    """
    Add a derived variable to the PK model.

    Parameters
    ----------
    derived_variable
        Derived variable to add.
    pk_model
        Myokit model to add the derived variable to.
    project
        Project containing compound information.

    Returns
    -------
    None
    """
    type = derived_variable.type
    if type in pd_model_var_types:
        return

    try:
        myokit_var = pk_model.get(derived_variable.pk_variable.qname)
    except KeyError:
        logger.warning(
            f"Derived variable handler: Variable {derived_variable.pk_variable.qname} not found in model"  # noqa: E501
        )
        return

    time_var = pk_model.binding("time")
    add_var = pk_model_var_types.get(type)
    if add_var is not None:
        add_var(
            myokit_var=myokit_var,
            time_var=time_var,
            project=project,
        )
    else:
        raise ValueError(
            f"Unknown derived variable type {type}"
        )


def add_pd_variable(
    derived_variable: DerivedVariable,
    pk_model: myokit.Model,
    pkpd_model: myokit.Model,
    project,
) -> None:
    """
    Add a derived variable to the PKPD combined model.

    Parameters
    ----------
    derived_variable
        Derived variable to add.
    pk_model
        Myokit model containing the PK variables.
    pkpd_model
        Myokit model to add the derived variable to.
    project
        Project containing compound information.

    Returns
    -------
    None
    """
    type = derived_variable.type
    if type in pk_model_var_types:
        return

    try:
        myokit_var: myokit.Variable = pkpd_model.get(derived_variable.pk_variable.qname)
    except KeyError:
        logger.warning(
            f"Derived variable handler (PKPD): Variable {derived_variable.pk_variable.qname} not found in model"  # noqa: E501
        )
        return

    second_var = derived_variable.secondary_variable

    if type in (
        DerivedVariable.Type.MICHAELIS_MENTEN,
        DerivedVariable.Type.EXTENDED_MICHAELIS_MENTEN,
    ):
        if second_var is None:
            return

    time_var = pkpd_model.binding("time")
    myokit_compartment = None

    if pkpd_model.has_component("PKNonlinearities"):
        myokit_compartment = pkpd_model.get("PKNonlinearities")
    else:
        myokit_compartment = pkpd_model.add_component("PKNonlinearities")

    add_var = pd_model_var_types.get(type)
    var = None
    if add_var is not None:
        var = add_var(
            myokit_var=myokit_var,
            myokit_compartment=myokit_compartment,
            second_var=second_var,
            pk_model=pk_model,
            project=project,
            time_var=time_var,
        )
    else:
        raise ValueError(
            f"Unknown derived variable type {type}"
        )
    if var is not None:
        replace_nonlinearities(myokit_var, var)


def add_area_under_curve(
    myokit_var: myokit.Variable,
    time_var: myokit.Variable,
    **kwargs,
) -> myokit.Variable:
    """
    Create an AUC variable for the given variable in the Myokit model.

    Parameters
    ----------
    myokit_var
        Variable to create AUC for.
    time_var
        Time variable.

    Returns
    -------
    myokit.Variable
        The created AUC variable.
    """
    var_name = myokit_var.name()
    myokit_compartment = myokit_var.parent()
    auc_var_name = f"calc_{var_name}_AUC"
    if myokit_compartment.has_variable(auc_var_name):
        return myokit_compartment.get(auc_var_name)

    auc_var = myokit_compartment.add_variable(
        auc_var_name,
        rhs=myokit.Name(myokit_var),
        initial_value=0,
        unit=myokit_var.unit() * time_var.unit(),
    )
    auc_var.meta["desc"] = (
        f'Area under curve for {myokit_var.meta["desc"]}'  # noqa: E501
    )
    return auc_var


def add_receptor_occupancy(
    myokit_var: myokit.Variable,
    project,
    **kwargs,
) -> myokit.Variable:
    """Create a Receptor Occupancy variable for the given variable in the Myokit model.

    Parameters
    ----------
    myokit_var
        Variable to create Receptor Occupancy for.
    project
        Project containing the compound information.

    Returns
    -------
    myokit.Variable
        The created Receptor Occupancy variable.
    """
    var_name = myokit_var.name()
    myokit_compartment = myokit_var.parent()
    compound = project.compound
    ro_var_name = f"calc_{var_name}_RO"
    if myokit_compartment.has_variable(ro_var_name):
        return myokit_compartment.get(ro_var_name)

    ro_var = myokit_compartment.add_variable(ro_var_name)
    ro_var.meta["desc"] = (
        f'Receptor Occupancy for {myokit_var.meta["desc"]}'  # noqa: E501
    )
    kd_name = "KD_ud"
    if myokit_compartment.has_variable(kd_name):
        kd_var = myokit_compartment.get(kd_name)
    else:
        kd_var = myokit_compartment.add_variable(kd_name)
        kd_var.meta["desc"] = (
            "User-defined Dissociation Constant used to calculate Receptor occupancy"  # noqa: E501
        )
    target_conc_name = "CT1_0_ud"
    if myokit_compartment.has_variable(target_conc_name):
        target_conc = myokit_compartment.get(target_conc_name)
    else:
        target_conc = myokit_compartment.add_variable(target_conc_name)
        target_conc.meta["desc"] = (
            "User-defined Target Concentration used to calculate Receptor occupancy"  # noqa: E501
        )
    ro_var.set_unit(myokit.Unit())
    kd_unit = myokit_var.unit()
    kd_unit_conversion_factor = compound.dissociation_unit.convert_to(
        kd_unit, compound=compound
    )
    kd_var.set_rhs(compound.dissociation_constant * kd_unit_conversion_factor)
    kd_var.set_unit(kd_unit)
    target_conc_unit = myokit_var.unit()
    target_conc_unit_conversion_factor = (
        compound.target_concentration_unit.convert_to(
            target_conc_unit, compound=compound, target=1
        )
    )
    target_conc.set_rhs(
        compound.target_concentration * target_conc_unit_conversion_factor
    )
    target_conc.set_unit(target_conc_unit)

    b = ro_var.add_variable("b")
    b.set_rhs(
        myokit.Plus(
            myokit.Plus(myokit.Name(kd_var), myokit.Name(target_conc)),
            myokit.Name(myokit_var),
        )
    )
    c = ro_var.add_variable("c")
    c.set_rhs(
        myokit.Multiply(
            myokit.Multiply(myokit.Number(4), myokit.Name(target_conc)),
            myokit.Name(myokit_var)
        )
    )

    ro_var.set_rhs(
        myokit.Multiply(
            myokit.Number(100),
            myokit.Divide(
                myokit.Minus(
                    myokit.Name(b),
                    myokit.Sqrt(
                        myokit.Minus(
                            myokit.Power(myokit.Name(b), myokit.Number(2)),
                            myokit.Name(c)
                        )
                    ),
                ),
                myokit.Multiply(myokit.Number(2), myokit.Name(target_conc)),
            ),
        )
    )
    return ro_var


def add_fraction_unbound_plasma(
    myokit_var: myokit.Variable,
    project,
    **kwargs,
) -> myokit.Variable:
    """
    Create a Fraction Unbound Plasma variable for the given variable
    in the Myokit model.
    Parameters
    ----------
    myokit_var
        Variable to create Fraction Unbound Plasma for.
    project
        Project containing the compound information.

    Returns
    -------
    myokit.Variable
        The created Fraction Unbound Plasma variable.
    """
    var_name = myokit_var.name()
    myokit_compartment = myokit_var.parent()
    compound = project.compound
    f_var_name = f"calc_{var_name}_f"
    fup_var_name = "FUP_ud"
    new_names = [f_var_name, fup_var_name]
    has_name = any(
        [
            myokit_compartment.has_variable(new_name)
            for new_name in new_names
        ]
    )  # noqa: E501
    if has_name:
        # return existing derived variable if already present
        return myokit_compartment.get(f_var_name)
    f_var = myokit_compartment.add_variable(f_var_name)
    f_var.meta["desc"] = (
        f'Unbound Concentration for {myokit_var.meta["desc"]}'  # noqa: E501
    )
    fup = myokit_compartment.add_variable(fup_var_name)
    fup.meta["desc"] = "User-defined Fraction Unbound Plasma"  # noqa: E501
    f_var.set_unit(myokit_var.unit())
    fup.set_rhs(compound.fraction_unbound_plasma)
    fup.set_unit(myokit.units.dimensionless)
    f_var.set_rhs(myokit.Multiply(myokit.Name(fup), myokit.Name(myokit_var)))
    return f_var


def add_blood_plasma_ratio(
    myokit_var: myokit.Variable,
    project,
    **kwargs,
) -> myokit.Variable:
    """Create a Blood Plasma Ratio variable for the given variable in the Myokit model.
    Parameters
    ----------
    myokit_var
        Variable to create Blood Plasma Ratio for.
    project
        Project containing the compound information.

    Returns
    -------
    myokit.Variable
        The created Blood Plasma Ratio variable.
    """
    var_name = myokit_var.name()
    myokit_compartment = myokit_var.parent()
    compound = project.compound
    bl_var_name = f"calc_{var_name}_bl"
    bpr_var_name = "BP_ud"
    new_names = [bl_var_name, bpr_var_name]
    has_name = any(
        [
            myokit_compartment.has_variable(new_name)
            for new_name in new_names
        ]
    )  # noqa: E501
    if has_name:
        # return existing derived variable if already present
        return myokit_compartment.get(bl_var_name)
    bl_var = myokit_compartment.add_variable(bl_var_name)
    bl_var.meta["desc"] = (
        f'Blood Concentration for {myokit_var.meta["desc"]}'  # noqa: E501
    )
    bpr = myokit_compartment.add_variable(bpr_var_name)
    bpr.meta["desc"] = "User-defined Blood to Plasma Ratio"  # noqa: E501
    bl_var.set_unit(myokit_var.unit())
    bpr.set_rhs(compound.blood_to_plasma_ratio)
    bpr.set_unit(myokit.units.dimensionless)
    bl_var.set_rhs(myokit.Multiply(myokit.Name(bpr), myokit.Name(myokit_var)))
    return bl_var


def add_tlag(
    myokit_var: myokit.Variable,
    time_var: myokit.Variable,
    **kwargs,
) -> myokit.Variable:
    """Create a TLAG variable for the given variable in the Myokit model.
    Parameters
    ----------
    myokit_var
        Variable to create TLAG for.
    time_var
        Time variable.

    Returns
    -------
    myokit.Variable
        The created TLAG variable.
    """
    var_name = myokit_var.name()
    myokit_compartment = myokit_var.parent()
    tlag_var_name = f"{var_name}_tlag_ud"
    if myokit_compartment.has_variable(tlag_var_name):
        return myokit_compartment.get(tlag_var_name)
    tlag_var = myokit_compartment.add_variable(tlag_var_name)
    tlag_var.meta["desc"] = (
        "User-defined absorption lag time from specified compartment"
    )
    tlag_var.set_unit(time_var.unit())
    tlag_var.set_rhs(myokit.Number(0))
    return tlag_var


def add_michaelis_menten(
    myokit_var: myokit.Variable,
    myokit_compartment: myokit.Component,
    second_var: myokit.Variable,
    pk_model: myokit.Model,
    **kwargs,
) -> myokit.Variable:
    """Create a Michaelis Menten variable for the given variable in the Myokit model.
    Parameters
    ----------
    myokit_var
        Variable to create Michaelis Menten for.
    second_var
        Secondary variable for Michaelis Menten calculation.
    pk_model
        PK model containing the secondary variable.
    myokit_compartment
        Myokit compartment to add the Michaelis Menten variable to.

    Returns
    -------
    myokit.Variable
        The created Michaelis Menten variable.
    """
    var_name = myokit_var.name()
    #  base_variable_secondary_variable_MM = [base_variable * 1/(1+[secondary_variable/Km_X])]  # noqa: E501
    second_var_name = second_var.name
    myokit_second_var = pk_model.get(second_var.qname)
    mm_var_name = f"{var_name}_{second_var_name}_MM"
    km_var_name = f"Km_{var_name}"
    new_names = [mm_var_name, km_var_name]
    has_name = any(
        [
            myokit_compartment.has_variable(new_name)
            for new_name in new_names
        ]
    )  # noqa: E501
    if has_name:
        return myokit_compartment.get(mm_var_name)
    km_var = myokit_compartment.add_variable(km_var_name)
    km_var.meta["desc"] = (
        f"Michaelis Menten constant for {var_name} and {second_var_name}"
    )
    km_var.set_unit(myokit_second_var.unit())
    km_var.set_rhs(myokit.Number(1))

    mm_var = myokit_compartment.add_variable(mm_var_name)
    mm_var.meta["desc"] = (
        f"Michaelis Menten for {var_name} and {second_var_name}"
    )
    mm_var.set_unit(myokit_var.unit())

    mm_var.set_rhs(
        myokit.Multiply(
            myokit.Name(myokit_var),
            myokit.Divide(
                myokit.Number(1),
                myokit.Plus(
                    myokit.Number(1),
                    myokit.Divide(
                        myokit.Name(myokit_second_var),
                        myokit.Name(km_var),
                    ),
                ),
            ),
        )
    )
    return mm_var


def add_extended_michaelis_menten(
    myokit_var: myokit.Variable,
    second_var: myokit.Variable,
    pk_model: myokit.Model,
    myokit_compartment: myokit.Component,
    **kwargs,
) -> myokit.Variable:
    """
    Create an Extended Michaelis Menten variable for the given variable
    in the Myokit model.
    Parameters
    ----------
    myokit_var
        Variable to create Extended Michaelis Menten for.
    second_var
        Secondary variable for Extended Michaelis Menten calculation.
    pk_model
        PK model containing the secondary variable.
    myokit_compartment
        Myokit compartment to add the Extended Michaelis Menten variable to.

    Returns
    -------
    myokit.Variable
        The created Extended Michaelis Menten variable.
    """
    var_name = myokit_var.name()
    # base_variable_secondary_variable_eMM = [base_variable * 1/(1+[secondary_variable/Km_X]**h_X) + Xlin]  # noqa: E501
    second_var_name = second_var.name
    myokit_second_var = pk_model.get(second_var.qname)
    emm_var_name = f"{var_name}_{second_var_name}_eMM"
    km_var_name = f"Km_{var_name}"
    hll_var_name = f"hll_{var_name}"
    lin_var_name = f"{var_name}_min"
    new_names = [
        emm_var_name,
        km_var_name,
        hll_var_name,
        lin_var_name,
    ]
    has_name = any(
        [
            myokit_compartment.has_variable(new_name)
            for new_name in new_names
        ]
    )  # noqa: E501
    if has_name:
        return myokit_compartment.get(emm_var_name)
    km_var = myokit_compartment.add_variable(km_var_name)
    km_var.meta["desc"] = (
        f"Michaelis Menten constant for {var_name} and {second_var_name}"
    )
    km_var.set_unit(myokit_second_var.unit())
    km_var.set_rhs(myokit.Number(1))

    hll_var = myokit_compartment.add_variable(hll_var_name)
    hll_var.meta["desc"] = (
        f"Hill coefficient for {var_name} and {second_var_name}"
    )
    hll_var.set_unit(myokit.units.dimensionless)
    hll_var.set_rhs(myokit.Number(1))

    lin_var = myokit_compartment.add_variable(lin_var_name)
    lin_var.meta["desc"] = (
        f"Linear term for {var_name} and {second_var_name}"
    )
    lin_var.set_unit(myokit_var.unit())
    lin_var.set_rhs(myokit.Number(0))

    emm_var = myokit_compartment.add_variable(emm_var_name)
    emm_var.meta["desc"] = (
        f"Michaelis Menten for {var_name} and {second_var_name}"
    )
    emm_var.set_unit(myokit_var.unit())
    emm_var.set_rhs(
        myokit.Plus(
            myokit.Multiply(
                myokit.Minus(
                    myokit.Name(myokit_var),
                    myokit.Name(lin_var),
                ),
                myokit.Divide(
                    myokit.Number(1),
                    myokit.Plus(
                        myokit.Number(1),
                        myokit.Power(
                            myokit.Divide(
                                myokit.If(
                                    myokit.MoreEqual(
                                        myokit.Name(myokit_second_var),
                                        myokit.Number(0),
                                    ),
                                    myokit.Name(myokit_second_var),
                                    myokit.Number(0),
                                ),
                                myokit.Name(km_var),
                            ),
                            myokit.Name(hll_var),
                        ),
                    ),
                ),
            ),
            myokit.Name(lin_var),
        )
    )
    return emm_var


def add_emax(
    myokit_var: myokit.Variable,
    myokit_compartment: myokit.Component,
    project,
    **kwargs,
) -> myokit.Variable:
    """Create an Emax variable for the given variable in the Myokit model.
    Parameters
    ----------
    myokit_var
        Variable to create Emax for.
    myokit_compartment
        Myokit compartment to add the Emax variable to.
    project
        Project instance containing protocol information.

    Returns
    -------
    myokit.Variable
        The created Emax variable.
    """
    var_name = myokit_var.name()
    # base_variable_Emax = base_variable * C_Drug**h_CL/(C_Drug**h_CL+D50**h_CL) + Xmin  # noqa: E501
    first_dose_value = None
    first_dose_unit = None
    protocol = project.protocols.first()
    if protocol:
        dose = protocol.doses.first()
        if dose:
            first_dose_value = dose.amount
            first_dose_unit = protocol.amount_unit.get_myokit_unit()
    if first_dose_value is None:
        return
    emax_var_name = f"{var_name}_Emax"
    d50_var_name = f"D50_{var_name}"
    hll_var_name = f"hll_{var_name}"
    min_var_name = f"{var_name}_min"
    new_names = [
        emax_var_name,
        d50_var_name,
        hll_var_name,
        min_var_name,
    ]
    has_name = any(
        [
            myokit_compartment.has_variable(new_name)
            for new_name in new_names
        ]
    )  # noqa: E501
    if has_name:
        return myokit_compartment.get(emax_var_name)
    d50_var = myokit_compartment.add_variable(d50_var_name)
    d50_var.meta["desc"] = f"Emax D50 for {var_name}"
    d50_var.set_unit(first_dose_unit)
    d50_var.set_rhs(myokit.Number(1))

    hll_var = myokit_compartment.add_variable(hll_var_name)
    hll_var.meta["desc"] = f"Emax Hill coefficient for {var_name}"
    hll_var.set_unit(myokit.units.dimensionless)
    hll_var.set_rhs(myokit.Number(1))

    min_var = myokit_compartment.add_variable(min_var_name)
    min_var.meta["desc"] = f"Emax min for {var_name}"
    min_var.set_unit(myokit_var.unit())
    min_var.set_rhs(myokit.Number(0))

    try:
        dose_var = myokit_compartment.get("C_Drug")
    except KeyError:
        dose_var = myokit_compartment.add_variable("C_Drug")
        dose_var.meta["desc"] = "concentration of first dose"
        dose_var.set_unit(first_dose_unit)
        dose_var.set_rhs(myokit.Number(first_dose_value))

    emax_var = myokit_compartment.add_variable(emax_var_name)
    emax_var.meta["desc"] = f"Emax for {var_name}"
    emax_var.set_unit(myokit_var.unit())
    emax_var.set_rhs(
        myokit.Plus(
            myokit.Multiply(
                myokit.Minus(
                    myokit.Name(myokit_var),
                    myokit.Name(min_var),
                ),
                myokit.Divide(
                    myokit.Power(
                        myokit.Name(dose_var),
                        myokit.Name(hll_var),
                    ),
                    myokit.Plus(
                        myokit.Power(
                            myokit.Name(dose_var),
                            myokit.Name(hll_var),
                        ),
                        myokit.Power(
                            myokit.Name(d50_var),
                            myokit.Name(hll_var),
                        ),
                    ),
                ),
            ),
            myokit.Name(min_var),
        )
    )
    return emax_var


def add_imax(
    myokit_var: myokit.Variable,
    myokit_compartment: myokit.Component,
    project,
    **kwargs,
) -> myokit.Variable:
    """Create an Imax variable for the given variable in the Myokit model.
    Parameters
    ----------
    myokit_var
        Variable to create Imax for.
    myokit_compartment
        Myokit compartment to add the Imax variable to.
    project
        Project instance containing protocol information.

    Returns
    -------
    myokit.Variable
        The created Imax variable.
    """
    var_name = myokit_var.name()
    # base_variable_Imax = base_variable * [1-C_Drug**h_CL/(C_Drug**h_CL+D50**h_CL)] + Xmin  # noqa: E501
    first_dose_value = None
    first_dose_unit = None
    protocol = project.protocols.first()
    if protocol:
        dose = protocol.doses.first()
        if dose:
            first_dose_value = dose.amount
            first_dose_unit = protocol.amount_unit.get_myokit_unit()
    if first_dose_value is None:
        return
    imax_var_name = f"{var_name}_Imax"
    d50_var_name = f"D50_{var_name}"
    hll_var_name = f"hll_{var_name}"
    min_var_name = f"{var_name}_min"
    new_names = [
        imax_var_name,
        d50_var_name,
        hll_var_name,
        min_var_name,
    ]
    has_name = any(
        [
            myokit_compartment.has_variable(new_name)
            for new_name in new_names
        ]
    )  # noqa: E501
    if has_name:
        return myokit_compartment.get(imax_var_name)
    d50_var = myokit_compartment.add_variable(d50_var_name)
    d50_var.meta["desc"] = f"Imax D50 for {var_name}"
    d50_var.set_unit(first_dose_unit)
    d50_var.set_rhs(myokit.Number(1))

    hll_var = myokit_compartment.add_variable(hll_var_name)
    hll_var.meta["desc"] = f"Imax Hill coefficient for {var_name}"
    hll_var.set_unit(myokit.units.dimensionless)
    hll_var.set_rhs(myokit.Number(1))

    min_var = myokit_compartment.add_variable(min_var_name)
    min_var.meta["desc"] = f"Imax min for {var_name}"
    min_var.set_unit(myokit_var.unit())
    min_var.set_rhs(myokit.Number(0))

    try:
        dose_var = myokit_compartment.get("C_Drug")
    except KeyError:
        dose_var = myokit_compartment.add_variable("C_Drug")
        dose_var.meta["desc"] = "concentration of first dose"
        dose_var.set_unit(first_dose_unit)
        dose_var.set_rhs(myokit.Number(first_dose_value))

    imax_var = myokit_compartment.add_variable(imax_var_name)
    imax_var.meta["desc"] = f"Imax for {var_name}"
    imax_var.set_unit(myokit_var.unit())
    imax_var.set_rhs(
        myokit.Plus(
            myokit.Multiply(
                myokit.Minus(
                    myokit.Name(myokit_var),
                    myokit.Name(min_var),
                ),
                myokit.Minus(
                    myokit.Number(1),
                    myokit.Divide(
                        myokit.Power(
                            myokit.Name(dose_var),
                            myokit.Name(hll_var),
                        ),
                        myokit.Plus(
                            myokit.Power(
                                myokit.Name(dose_var),
                                myokit.Name(hll_var),
                            ),
                            myokit.Power(
                                myokit.Name(d50_var),
                                myokit.Name(hll_var),
                            ),
                        ),
                    ),
                ),
            ),
            myokit.Name(min_var),
        )
    )
    return imax_var


def add_power(
    myokit_var: myokit.Variable,
    myokit_compartment: myokit.Component,
    project,
    is_negative: bool = False,
    **kwargs,
) -> myokit.Variable:
    """Create a Power variable for the given variable in the Myokit model.
    Parameters
    ----------
    myokit_var
        Variable to create Power for.
    myokit_compartment
        Myokit compartment to add the Power variable to.
    project
        Project instance containing protocol information.
    is_negative
        Indicates if the power law is negative.

    Returns
    -------
    myokit.Variable
        The created Power variable.
    """
    var_name = myokit_var.name()
    # base_variable_Power = base_variable * (C_Drug/Ref_D)**a_D
    first_dose_value = None
    first_dose_unit = None
    protocol = project.protocols.first()
    if protocol:
        dose = protocol.doses.first()
        if dose:
            first_dose_value = dose.amount
            first_dose_unit = protocol.amount_unit.get_myokit_unit()
    if first_dose_value is None:
        return

    power_var_name = f"{var_name}_Power"
    ref_d_var_name = f"Ref_D_{var_name}"
    a_d_var_name = f"a_D_{var_name}"
    new_names = [
        power_var_name,
        ref_d_var_name,
        a_d_var_name,
    ]
    has_name = any(
        [
            myokit_compartment.has_variable(new_name)
            for new_name in new_names
        ]
    )  # noqa: E501
    if has_name:
        return myokit_compartment.get(power_var_name)
    ref_d_var = myokit_compartment.add_variable(ref_d_var_name)
    ref_d_var.meta["desc"] = f"Power Reference for {var_name}"
    ref_d_var.set_unit(first_dose_unit)
    ref_d_var.set_rhs(myokit.Number(1))

    a_d_var = myokit_compartment.add_variable(a_d_var_name)
    a_d_var.meta["desc"] = f"Power Exponent for {var_name}"
    a_d_var.set_unit(myokit.units.dimensionless)
    a_d_var.set_rhs(myokit.Number(1))
    if is_negative:
        a = myokit.Multiply(myokit.Number(-1), myokit.Name(a_d_var))
    else:
        a = myokit.Name(a_d_var)

    try:
        dose_var = myokit_compartment.get("C_Drug")
    except KeyError:
        dose_var = myokit_compartment.add_variable("C_Drug")
        dose_var.meta["desc"] = "concentration of first dose"
        dose_var.set_unit(first_dose_unit)
        dose_var.set_rhs(myokit.Number(first_dose_value))

    power_var = myokit_compartment.add_variable(power_var_name)
    power_var.meta["desc"] = f"Power for {var_name}"
    power_var.set_unit(myokit_var.unit())
    power_var.set_rhs(
        myokit.Multiply(
            myokit.Name(myokit_var),
            myokit.Power(
                myokit.Divide(
                    myokit.Name(dose_var),
                    myokit.Name(ref_d_var),
                ),
                a,
            ),
        )
    )
    return power_var


def add_negative_power(
    myokit_var: myokit.Variable,
    myokit_compartment: myokit.Component,
    project,
    **kwargs,
) -> myokit.Variable:
    return add_power(
        myokit_var=myokit_var,
        myokit_compartment=myokit_compartment,
        project=project,
        is_negative=True,
    )


def add_exp_decay(
        myokit_var: myokit.Variable,
        myokit_compartment: myokit.Component,
        time_var: myokit.Variable,
        **kwargs,
) -> myokit.Variable:
    var_name = myokit_var.name()
    # base_variable_TDI = base_variable * exp(-k_X*time) +Xmin
    tdi_var_name = f"{var_name}_TDI"
    k_var_name = f"k_{var_name}"
    min_var_name = f"{var_name}_min"
    new_names = [tdi_var_name, k_var_name, min_var_name]
    has_name = any(
        [
            myokit_compartment.has_variable(new_name)
            for new_name in new_names
        ]
    )  # noqa: E501
    if has_name:
        return myokit_compartment.get(tdi_var_name)

    k_var = myokit_compartment.add_variable(k_var_name)
    k_var.meta["desc"] = f"Exponential Decay Rate for {var_name}"
    k_var.set_unit(1 / myokit.units.hour)
    k_var.set_rhs(myokit.Number(1))

    min_var = myokit_compartment.add_variable(min_var_name)
    min_var.meta["desc"] = f"Exponential Decay min for {var_name}"
    min_var.set_unit(myokit_var.unit())
    min_var.set_rhs(myokit.Number(0))

    tdi_var = myokit_compartment.add_variable(tdi_var_name)
    tdi_var.meta["desc"] = f"Exponential Decay for {var_name}"
    tdi_var.set_unit(myokit_var.unit())
    tdi_var.set_rhs(
        myokit.Plus(
            myokit.Multiply(
                myokit.Minus(
                    myokit.Name(myokit_var),
                    myokit.Name(min_var),
                ),
                myokit.Exp(
                    myokit.PrefixMinus(
                        myokit.Multiply(
                            myokit.Name(k_var), myokit.Name(time_var)
                        )
                    )
                ),
            ),
            myokit.Name(min_var),
        )
    )
    return tdi_var


def add_exp_increase(
    myokit_var: myokit.Variable,
    myokit_compartment: myokit.Component,
    time_var: myokit.Variable,
    **kwargs,
) -> myokit.Variable:
    var_name = myokit_var.name()
    # base_variable_IND = base_variable * [1-exp(-k_X*time)] +Xmin
    ind_var_name = f"{var_name}_IND"
    k_var_name = f"k_{var_name}"
    min_var_name = f"{var_name}_min"
    new_names = [ind_var_name, k_var_name, min_var_name]
    has_name = any(
        [
            myokit_compartment.has_variable(new_name)
            for new_name in new_names
        ]
    )
    if has_name:
        return myokit_compartment.get(ind_var_name)

    k_var = myokit_compartment.add_variable(k_var_name)
    k_var.meta["desc"] = f"Exponential Increase Rate for {var_name}"
    k_var.set_unit(1 / myokit.units.hour)
    k_var.set_rhs(myokit.Number(1))

    min_var = myokit_compartment.add_variable(min_var_name)
    min_var.meta["desc"] = f"Exponential Increase min for {var_name}"
    min_var.set_unit(myokit_var.unit())
    min_var.set_rhs(myokit.Number(0))

    ind_var = myokit_compartment.add_variable(ind_var_name)
    ind_var.meta["desc"] = f"Exponential Increase for {var_name}"
    ind_var.set_unit(myokit_var.unit())
    ind_var.set_rhs(
        myokit.Plus(
            myokit.Multiply(
                myokit.Minus(
                    myokit.Name(myokit_var),
                    myokit.Name(min_var),
                ),
                myokit.Minus(
                    myokit.Number(1),
                    myokit.Exp(
                        myokit.PrefixMinus(
                            myokit.Multiply(
                                myokit.Name(k_var), myokit.Name(time_var)
                            )
                        ),
                    ),
                ),
            ),
            myokit.Name(min_var),
        )
    )
    return ind_var


def replace_nonlinearities(
    myokit_var: myokit.Variable,
    var: myokit.Variable,
):
    # replace the original variable with the new one in the model
    for comp_var in myokit_var.parent().variables():
        if var is None or comp_var == var:
            continue
        new_expr = comp_var.rhs().clone(
            {myokit.Name(myokit_var): myokit.Name(var)}
        )
        comp_var.set_rhs(new_expr)


pk_model_var_types = {
    DerivedVariable.Type.AREA_UNDER_CURVE: add_area_under_curve,
    DerivedVariable.Type.RECEPTOR_OCCUPANCY: add_receptor_occupancy,
    DerivedVariable.Type.FRACTION_UNBOUND_PLASMA: add_fraction_unbound_plasma,
    DerivedVariable.Type.BLOOD_PLASMA_RATIO: add_blood_plasma_ratio,
    DerivedVariable.Type.TLAG: add_tlag,
}


pd_model_var_types = {
    DerivedVariable.Type.MICHAELIS_MENTEN: add_michaelis_menten,
    DerivedVariable.Type.EXTENDED_MICHAELIS_MENTEN: add_extended_michaelis_menten,
    DerivedVariable.Type.EMAX: add_emax,
    DerivedVariable.Type.IMAX: add_imax,
    DerivedVariable.Type.POWER: add_power,
    DerivedVariable.Type.NEGATIVE_POWER: add_negative_power,
    DerivedVariable.Type.EXP_DECAY: add_exp_decay,
    DerivedVariable.Type.EXP_INCREASE: add_exp_increase,
}
