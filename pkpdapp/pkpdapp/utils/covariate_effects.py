#
# This file is part of PKPDApp (https://github.com/pkpdapp-team/pkpdapp) which
# is released under the BSD 3-clause license. See accompanying LICENSE.md for
# copyright notice and full license details.
#
"""
Inject covariate relationships into a myokit model.

A covariate :class:`DerivedVariable` makes a model parameter ``P`` depend on an
individual characteristic (weight, age, sex or a custom covariate). The
covariate value itself becomes a single input variable in a dedicated
``Covariates`` component (shared by every parameter that uses it), and new
editable parameters are injected:

* continuous covariate ``C``:  ``P_i = P * (C / mu_C) ** a_C_P``
  where ``a_C_P`` is a per-parameter exponent (default depends on P's units) and
  ``mu_C`` is the population median (set per subject group at simulate time).
* categorical covariate ``C`` with ``n`` categories (base = index 0):
  ``P_i = P * (1 + sum_k d_C_P_k * [C == k])`` for ``k in 1..n-1``.

Multiple covariates on the same ``P`` compose multiplicatively. The injected
constants are materialised as editable :class:`Variable` rows by
``MyokitModelMixin.update_model`` exactly like ordinary derived-variable
parameters.
"""

import re

import myokit

from pkpdapp.models import DerivedVariable

COVARIATES_COMPONENT = "Covariates"


def _sanitize(name: str) -> str:
    """Return a myokit-legal identifier derived from ``name``."""
    token = re.sub(r"[^A-Za-z0-9_]", "_", name)
    if not token or not re.match(r"[A-Za-z_]", token[0]):
        token = f"_{token}"
    return token


def covariate_input_name(derived_variable: DerivedVariable) -> str:
    """Return the shared myokit variable name for a covariate's value.

    Built-in covariates use fixed names. Custom covariates use their database ID
    so the same covariate is shared across every parameter it affects without
    colliding with a display name or a built-in input.
    """
    type_ = derived_variable.type
    if type_ == DerivedVariable.Type.WEIGHT_COVARIATE:
        return "WT"
    if type_ == DerivedVariable.Type.AGE_COVARIATE:
        return "AGE"
    if type_ == DerivedVariable.Type.SEX_COVARIATE:
        return "SEX"
    if derived_variable.covariate is not None:
        return f"COV_{derived_variable.covariate_id}"
    raise ValueError(
        f"custom covariate derived variable {derived_variable.id} has no covariate"
    )


def _is_continuous(derived_variable: DerivedVariable) -> bool:
    return derived_variable.type in (
        DerivedVariable.Type.WEIGHT_COVARIATE,
        DerivedVariable.Type.AGE_COVARIATE,
        DerivedVariable.Type.CUSTOM_CONT_COVARIATE,
    )


def _n_categories(derived_variable: DerivedVariable) -> int:
    if derived_variable.type == DerivedVariable.Type.SEX_COVARIATE:
        return 2
    if derived_variable.covariate is not None:
        return derived_variable.covariate.n_categories or 2
    return 2


def _default_exponent(myokit_var: myokit.Variable) -> float:
    """Default weight-style exponent from the parameter's SI unit exponents.

    volume ``[m^3]`` -> 1, clearance/flow ``[m^3 / s]`` -> 0.75,
    rate constant ``[1 / s]`` -> -0.25, otherwise 1.
    """
    unit = myokit_var.unit()
    if unit is None:
        return 1.0
    exponents = unit.exponents()
    m_exp = exponents[1]
    s_exp = exponents[2]
    if m_exp == 3 and s_exp == 0:
        return 1.0
    if m_exp == 3 and s_exp == -1:
        return 0.75
    if m_exp == 0 and s_exp == -1:
        return -0.25
    return 1.0


def _get_component(pkpd_model: myokit.Model) -> myokit.Component:
    if pkpd_model.has_component(COVARIATES_COMPONENT):
        return pkpd_model.get(COVARIATES_COMPONENT)
    return pkpd_model.add_component(COVARIATES_COMPONENT)


def _ensure_input(component: myokit.Component, name: str) -> myokit.Variable:
    """Get/create the (shared) covariate-value input constant."""
    if component.has_variable(name):
        return component.get(name)
    var = component.add_variable(name)
    var.meta["desc"] = f"sampled covariate value for {name}"
    var.set_unit(myokit.units.dimensionless)
    # default so a run without a virtual population leaves P unchanged
    var.set_rhs(myokit.Number(1))
    return var


def _ensure_median(component: myokit.Component, cov_name: str) -> myokit.Variable:
    """Get/create the (shared) population-median centring constant for ``cov``."""
    name = f"mu_{cov_name}"
    if component.has_variable(name):
        return component.get(name)
    var = component.add_variable(name)
    var.meta["desc"] = f"population median of {cov_name}"
    var.set_unit(myokit.units.dimensionless)
    var.set_rhs(myokit.Number(1))
    return var


def add_covariate_effect(
    derived_variable: DerivedVariable,
    pkpd_model: myokit.Model,
    project,
) -> None:
    """Inject one covariate relationship into ``pkpd_model``.

    Idempotent w.r.t. the shared covariate-value/median inputs, and composes
    multiplicatively with any covariate already applied to the same parameter.
    """
    try:
        base_var = pkpd_model.get(derived_variable.pk_variable.qname)
    except KeyError:
        return

    component = _get_component(pkpd_model)
    cov_name = covariate_input_name(derived_variable)
    cov_input = _ensure_input(component, cov_name)
    p_token = _sanitize(base_var.qname())

    if _is_continuous(derived_variable):
        median = _ensure_median(component, cov_name)
        a_name = f"a_{cov_name}_{p_token}"
        if component.has_variable(a_name):
            return  # this covariate already applied to this parameter
        a_var = component.add_variable(a_name)
        a_var.meta["desc"] = (
            f"exponent of {derived_variable.pk_variable.name} on {cov_name}"
        )
        a_var.set_unit(myokit.units.dimensionless)
        a_var.set_rhs(myokit.Number(_default_exponent(base_var)))
        factor = myokit.Power(
            myokit.Divide(myokit.Name(cov_input), myokit.Name(median)),
            myokit.Name(a_var),
        )
    else:
        first_d_name = f"d_{cov_name}_{p_token}_1"
        if component.has_variable(first_d_name):
            return  # this covariate already applied to this parameter
        factor = myokit.Number(1)
        for k in range(1, _n_categories(derived_variable)):
            d_var = component.add_variable(f"d_{cov_name}_{p_token}_{k}")
            d_var.meta["desc"] = (
                f"delta of {derived_variable.pk_variable.name} for "
                f"{cov_name} category {k}"
            )
            d_var.set_unit(myokit.units.dimensionless)
            d_var.set_rhs(myokit.Number(0))
            indicator = myokit.If(
                myokit.Equal(myokit.Name(cov_input), myokit.Number(k)),
                myokit.Number(1),
                myokit.Number(0),
            )
            factor = myokit.Plus(
                factor, myokit.Multiply(myokit.Name(d_var), indicator)
            )

    adj_name = f"{p_token}_cov"
    if component.has_variable(adj_name):
        # compose with covariate(s) already applied to this parameter
        adj_var = component.get(adj_name)
        adj_var.set_rhs(myokit.Multiply(adj_var.rhs(), factor))
    else:
        adj_var = component.add_variable(adj_name)
        adj_var.meta["desc"] = (
            f"covariate-adjusted value of {derived_variable.pk_variable.name}"
        )
        adj_var.set_unit(base_var.unit())
        adj_var.set_rhs(myokit.Multiply(myokit.Name(base_var), factor))
        # splice the adjusted value into downstream equations that use P
        _replace_references(base_var, adj_var)


def _replace_references(base_var: myokit.Variable, adj_var: myokit.Variable) -> None:
    """Replace ``base_var`` with ``adj_var`` in its sibling equations.

    Mirrors ``utils.derived_variables.replace_nonlinearities``: ``adj_var`` lives
    in the ``Covariates`` component (not iterated here), so its own reference to
    ``base_var`` is preserved.
    """
    for comp_var in base_var.parent().variables():
        if comp_var == base_var:
            continue
        comp_var.set_rhs(
            comp_var.rhs().clone({myokit.Name(base_var): myokit.Name(adj_var)})
        )
