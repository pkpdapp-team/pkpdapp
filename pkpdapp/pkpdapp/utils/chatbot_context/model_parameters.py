#
# This file is part of PKPDApp (https://github.com/pkpdapp-team/pkpdapp) which
# is released under the BSD 3-clause license. See accompanying LICENSE.md for
# copyright notice and full license details.
#
import math
from typing import Literal

from pydantic import BaseModel, field_validator

from pkpdapp.models import (
    CombinedModel,
    DerivedVariable,
    Project,
    Unit,
    Variable,
)
from pkpdapp.utils.chatbot_context.shared import SelectionContext, locale_key, round_sig


# ---------------------------
# model page > parameters tab
# ---------------------------
# mirrors the filter in getConstVariables in frontend-v2/.../parameters/ to match the ui
def parameter_variables(variables: list[Variable], model: CombinedModel):
    const_variables = [v for v in variables if v.constant]
    # hide the covariate machinery but keep the coefficients
    const_variables = [
        v
        for v in const_variables
        if not v.qname.startswith("Covariates.")
        or "_a_" in v.name
        or "_d_" in v.name
    ]
    if model.is_library_model:
        const_variables = [v for v in const_variables if v.name != "C_Drug"]
        # the ui's `variable.protocols &&` is always true (a list): only names count
        aa_is_not_dosed = not any(
            v.name == "Avh" or v.name.startswith("Aa") or v.name.startswith("Atr")
            for v in variables
        )
        if aa_is_not_dosed:
            const_variables = [v for v in const_variables if v.name not in ("F", "ka")]
    return const_variables


# mirrors parameterDisplayName in frontend-v2/.../parameters/ to match the ui
def parameter_display_name(variable: Variable, model: CombinedModel):
    if model.number_of_effect_compartments > 1 and variable.qname.startswith(
        "Effect"
    ):
        return f"{variable.name}_Ce{variable.qname.split('.')[0][17:]}"
    return variable.name


LIBRARY_PARAMETER_ORDER = [
    "CL", "CLmax", "Km", "Kss", "KD", "V1", "V2", "V3", "Q1", "Q2", "CT1_0",
    "kdeg", "kint", "koff", "F", "ka", "tlag", "Kp", "ke0",
]


# mirrors paramPriority in frontend-v2/.../parameters/ to match the ui
def parameter_priority(variable: Variable):
    qname = variable.qname
    order = ["PKCompartment." + name for name in LIBRARY_PARAMETER_ORDER]
    if qname.endswith("_ud"):
        return len(order) + 2
    if qname.startswith("PKNonlinearities"):
        qname = qname.replace("PKNonlinearities", "PKCompartment")
        return order.index(qname) if qname in order else len(order)
    if qname.startswith("PKCompartment"):
        return order.index(qname) if qname in order else len(order)
    if qname.startswith("PD"):
        return len(order) + 1
    return 0


# mirrors the sort in getConstVariables: coefficients right after their parameter
def sort_parameters(variables: list[Variable]):
    names = sorted(
        (v.name for v in variables if not v.qname.startswith("Covariates.")),
        key=len,
        reverse=True,
    )
    by_name = {}
    for v in variables:
        # the ui's find keeps the first variable with a name
        by_name.setdefault(v.name, v)

    def parent_name(variable: Variable):
        if variable.qname.startswith("Covariates."):
            for name in names:
                if variable.name.startswith((f"{name}_a_", f"{name}_d_")):
                    return name
        return variable.name

    def key(variable: Variable):
        parent = parent_name(variable)
        is_coefficient = parent != variable.name
        priority = parameter_priority(by_name[parent] if is_coefficient else variable)
        return (priority, locale_key(parent), is_coefficient, locale_key(variable.name))

    return sorted(variables, key=key)


# mirrors the Type column in ParameterRow.tsx to match the ui
def parameter_type(variable: Variable):
    if variable.qname.endswith("_ud"):
        return "UD"
    if variable.qname.startswith("PD"):
        return "PD"
    return "PK"


# mirrors hasPerWeightOption in frontend-v2/src/shared/ to match the ui
def has_per_weight_option(unit: Unit | None, variable: Variable):
    if unit is None:
        return False
    is_pk = variable.qname.startswith("PK") or variable.qname.startswith("Extra")
    is_pk_and_vol = is_pk and unit.m == 3
    is_ref_d_or_d50 = variable.name.startswith("Ref_D") or variable.name.startswith(
        "D50"
    )
    is_vmax = variable.name.startswith("Vmax")
    return is_pk_and_vol or is_ref_d_or_d50 or is_vmax


# mirrors the dropdown labels and tooltips in ParameterRow.tsx to match the ui
NONLINEARITY_LABELS = {
    "MM": "Michaelis-Menten (2 parameters)",
    "EMM": "Michaelis-Menten (4 parameters)",
    "EMX": "Dose Emax",
    "IMX": "Dose Imax",
    "POW": "Dose Power Increase",
    "NPW": "Dose Power Decrease",
    "TEM": "Time Emax",
    "TIM": "Time Imax",
    "TDI": "Time Decrease",
    "IND": "Time Increase",
}
COVARIATE_LABELS = {"WTC": "Weight", "AGC": "Age", "SXC": "Sex"}
NONLINEARITY_DISABLED_REASON = (
    "A parameter cannot have both a nonlinearity and a covariate. "
    "Remove the selected covariate(s) to choose a nonlinearity."
)
COVARIATES_DISABLED_REASON = (
    "A parameter cannot have both a nonlinearity and a covariate. "
    "Set the nonlinearity to None to choose covariates."
)


class NonlinearityInputContext(BaseModel):
    name: str
    qname: str
    enabled: bool


class NonlinearityContext(BaseModel):
    type: DerivedVariable.Type | None
    label: str
    enabled: bool
    disabled_reason: str | None
    secondary_variable: NonlinearityInputContext | None

    @field_validator("type")
    @classmethod
    def validate_nonlinearity_type(cls, value: DerivedVariable.Type | None):
        if value is not None and value not in DerivedVariable.NONLINEARITY_TYPES:
            raise ValueError("expected a nonlinearity type")
        return value

    @classmethod
    def from_derived_variable(
        cls, derived_variable: DerivedVariable, *, has_covariates: bool, can_edit: bool
    ):
        concentration = None
        if derived_variable is not None and derived_variable.type in ("MM", "EMM"):
            concentration = derived_variable.secondary_variable
        return cls(
            type=derived_variable.type if derived_variable else None,
            label=(
                NONLINEARITY_LABELS[derived_variable.type]
                if derived_variable
                else "None"
            ),
            enabled=can_edit and not has_covariates,
            disabled_reason=NONLINEARITY_DISABLED_REASON if has_covariates else None,
            secondary_variable=(
                NonlinearityInputContext(
                    name=concentration.name,
                    qname=concentration.qname,
                    enabled=can_edit,
                )
                if concentration is not None
                else None
            ),
        )


class ParameterCovariateContext(BaseModel):
    type: DerivedVariable.Type
    label: str
    covariate_id: int | None

    @field_validator("type")
    @classmethod
    def validate_covariate_type(cls, value: DerivedVariable.Type):
        if value not in DerivedVariable.COVARIATE_TYPES:
            raise ValueError("expected a covariate type")
        return value

    @classmethod
    def from_derived_variable(cls, derived_variable: DerivedVariable):
        covariate = derived_variable.covariate
        return cls(
            type=derived_variable.type,
            label=(
                covariate.name
                if covariate is not None
                else COVARIATE_LABELS[derived_variable.type]
            ),
            covariate_id=derived_variable.covariate_id,
        )


# mirrors covariateOptions in ParameterRow.tsx: weight, age, sex, then custom
# covariates in list order (the api doesn't order them, so by pk)
def covariate_sort_key(derived_variable: DerivedVariable):
    builtins = ["WTC", "AGC", "SXC"]
    if derived_variable.type in builtins:
        return (builtins.index(derived_variable.type), 0)
    return (len(builtins), derived_variable.covariate_id)


class ParameterCovariatesContext(BaseModel):
    selected: list[ParameterCovariateContext]
    enabled: bool
    disabled_reason: str | None

    @classmethod
    def from_derived_variables(
        cls,
        derived_variables: list[DerivedVariable],
        project: Project,
        *,
        has_nonlinearity: bool,
        can_edit: bool,
    ):
        if project.species != "H":
            # the ui only offers weight for human projects, so it isn't shown
            derived_variables = [dv for dv in derived_variables if dv.type != "WTC"]
        return cls(
            selected=[
                ParameterCovariateContext.from_derived_variable(dv)
                for dv in sorted(derived_variables, key=covariate_sort_key)
            ],
            enabled=can_edit and not has_nonlinearity,
            disabled_reason=COVARIATES_DISABLED_REASON if has_nonlinearity else None,
        )


class ParameterPopulationContext(BaseModel):
    distribution: str
    # the ui shows sqrt(variance)
    std_deviation: float


class ParameterContext(BaseModel):
    name: str
    qname: str
    description: str | None
    model_type: Literal["PK", "PD", "UD"]

    lower_bound: float | None
    displayed_value: float
    upper_bound: float | None
    unit_symbol: str | None
    unit_per_body_weight: SelectionContext | None
    is_log: bool
    population: SelectionContext
    population_distribution: ParameterPopulationContext | None
    nonlinearity: NonlinearityContext | None
    covariates: ParameterCovariatesContext | None

    @classmethod
    def from_variable(
        cls,
        variable: Variable,
        model: CombinedModel,
        project: Project,
        *,
        can_edit: bool,
    ):
        unit = variable.unit
        # None if the variable has no distribution
        distribution = getattr(variable, "distribution", None)

        qname = variable.qname
        is_pd = qname.startswith("PD")
        is_pk = qname.startswith(("PK", "Extra", "Effect"))
        is_nonlin = qname.startswith("PKNonlin")
        derived_variables = variable.derived_variables.all()
        covariate_dvs = [dv for dv in derived_variables if dv.is_covariate()]
        other_dvs = [dv for dv in derived_variables if not dv.is_covariate()]
        # the ui's loop keeps the last one
        nonlinearity_dv = other_dvs[-1] if other_dvs else None
        has_covariates = len(covariate_dvs) > 0
        has_nonlinearity = nonlinearity_dv is not None
        show_covariates = (
            (is_pk or is_pd) and not is_nonlin and not qname.startswith("Covariates.")
        )

        return cls(
            name=parameter_display_name(variable, model),
            qname=variable.qname,
            description=variable.description,
            model_type=parameter_type(variable),
            lower_bound=variable.lower_bound,
            # the ui shows the stored value as is
            displayed_value=variable.default_value,
            upper_bound=variable.upper_bound,
            unit_symbol=unit.symbol if unit else None,
            unit_per_body_weight=(
                SelectionContext(
                    selected=variable.unit_per_body_weight, enabled=can_edit
                )
                if has_per_weight_option(unit, variable)
                else None
            ),
            is_log=variable.is_log,
            population=SelectionContext(
                selected=distribution is not None, enabled=can_edit
            ),
            population_distribution=(
                ParameterPopulationContext(
                    distribution=distribution.get_pdf_display(),
                    std_deviation=round_sig(math.sqrt(max(0, distribution.variance))),
                )
                if distribution is not None
                else None
            ),
            nonlinearity=(
                NonlinearityContext.from_derived_variable(
                    nonlinearity_dv, has_covariates=has_covariates, can_edit=can_edit
                )
                if is_pk and not is_nonlin
                else None
            ),
            covariates=(
                ParameterCovariatesContext.from_derived_variables(
                    covariate_dvs,
                    project,
                    has_nonlinearity=has_nonlinearity,
                    can_edit=can_edit,
                )
                if show_covariates
                else None
            ),
        )


class ParameterCorrelationContext(BaseModel):
    parameter_1: str
    parameter_2: str
    coefficient: float


class ParametersContext(BaseModel):
    rows: list[ParameterContext]
    # None when the ui hides the matrix (fewer than 2 population parameters)
    correlations: list[ParameterCorrelationContext] | None

    @classmethod
    def from_combined_model(cls, model: CombinedModel, *, can_edit: bool):
        project = model.project
        variables = sort_parameters(parameter_variables(model.variables.all(), model))
        # mirrors CorrelationMatrix.tsx: constants with a distribution, in its order,
        # shown when 2+
        population_variables = sorted(
            (
                v
                for v in model.variables.all()
                # None if the variable has no distribution
                if v.constant and getattr(v, "distribution", None) is not None
            ),
            key=lambda v: (parameter_priority(v), locale_key(v.name)),
        )
        correlations = [
            ParameterCorrelationContext(
                parameter_1=parameter_display_name(variable, model),
                parameter_2=parameter_display_name(
                    correlation.distribution_2.variable, model
                ),
                coefficient=correlation.coefficient,
            )
            for variable in population_variables
            for correlation in variable.distribution.correlations_as_1.all()
        ]
        return cls(
            rows=[
                ParameterContext.from_variable(v, model, project, can_edit=can_edit)
                for v in variables
            ],
            correlations=correlations if len(population_variables) >= 2 else None,
        )
