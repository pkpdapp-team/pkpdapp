#
# This file is part of PKPDApp (https://github.com/pkpdapp-team/pkpdapp) which
# is released under the BSD 3-clause license. See accompanying LICENSE.md for
# copyright notice and full license details.
#
from typing import Literal

from pydantic import BaseModel, field_validator

from pkpdapp.models import Covariate, DerivedVariable


# shared controls
class SelectionContext(BaseModel):
    selected: bool
    enabled: bool


# model page
## pk/pd model tab
class ModelComponentContext(BaseModel):
    name: str
    description: str
    tags: list[str]


class PKPDModelContext(BaseModel):
    species: str
    weight: float
    weight_unit: str

    pk_filter_tags: list[str]
    pk_model: ModelComponentContext | None

    effect_model: ModelComponentContext
    effect_compartments: int
    has_anti_drug_antibodies: bool

    extravascular_model: ModelComponentContext | None
    has_lag: bool
    has_bioavailability: bool

    pd_filter_tags: list[str]
    pd_model: ModelComponentContext | None
    secondary_pd_model: ModelComponentContext | None
    has_hill_coefficient: bool


## map variables tab
class DosingVariableContext(BaseModel):
    name: str
    unit_symbol: str | None
    model_type: Literal["PK", "PD"]
    is_dosing_compartment: bool
    has_lag_time: bool
    description: str | None
    qname: str


class VariableMappingContext(BaseModel):
    name: str
    qname: str
    description: str | None

    link_to_pd: SelectionContext | None
    secondary_parameters: SelectionContext | None
    static_receptor_occupancy: SelectionContext | None
    unbound_concentration: SelectionContext | None
    blood_concentration: SelectionContext | None


class MapVariablesContext(BaseModel):
    dosing_variables: list[DosingVariableContext]
    variable_mappings: list[VariableMappingContext]


## parameters tab
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


class ParameterCovariatesContext(BaseModel):
    selected: list[ParameterCovariateContext]
    enabled: bool
    disabled_reason: str | None


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
    nonlinearity: NonlinearityContext | None
    covariates: ParameterCovariatesContext | None


class ParametersContext(BaseModel):
    rows: list[ParameterContext]


## secondary parameters tab
class TimeIntervalContext(BaseModel):
    start_time: float
    end_time: float
    unit_symbol: str


class VariableThresholdContext(BaseModel):
    name: str
    qname: str
    description: str | None
    lower_threshold: float
    upper_threshold: float | None
    unit_symbol: str | None


class SecondaryParametersContext(BaseModel):
    time_intervals: list[TimeIntervalContext]
    variable_thresholds: list[VariableThresholdContext]


# drug & target page
class EfficacySafetyContext(BaseModel):
    selection: SelectionContext
    name: str
    c50: float
    c50_unit_symbol: str
    hill_coefficient: float


class DrugTargetContext(BaseModel):
    molecular_mass: float
    molecular_mass_unit_symbol: str
    target_molecular_mass: float
    target_molecular_mass_unit_symbol: str
    target2_molecular_mass: float
    target2_molecular_mass_unit_symbol: str
    efficacy_safety_data: list[EfficacySafetyContext]


# trial design page
## dosing
class DoseContext(BaseModel):
    amount: float
    number_of_doses: int
    start_time: float
    duration: float
    repeat_interval: float


class ProtocolContext(BaseModel):
    name: str
    variable_qname: str | None
    amount_unit_symbol: str | None
    time_unit_symbol: str | None
    per_body_weight: SelectionContext
    from_dataset: bool
    doses: list[DoseContext] | None


## population
class GroupPopulationContext(BaseModel):
    study_size: int
    age_min: float
    age_max: float
    male_fraction: float
    region: str


## custom covariates
class ContinuousCovariateContext(BaseModel):
    covariate_id: int
    name: str
    type: Literal[Covariate.Type.CONTINUOUS]
    mean: float
    standard_deviation: float
    reference_value: float


class CategoricalCovariateContext(BaseModel):
    covariate_id: int
    name: str
    type: Literal[Covariate.Type.CATEGORICAL]
    n_categories: int
    category_probabilities: list[float]


## groups
class SubjectGroupContext(BaseModel):
    name: str
    from_dataset: bool
    subject_count: int | None
    protocols: list[ProtocolContext]
    population: GroupPopulationContext | None
    custom_covariates: list[
        ContinuousCovariateContext | CategoricalCovariateContext
    ]


class TrialDesignContext(BaseModel):
    groups: list[SubjectGroupContext]


# context containers
class ModelContext(BaseModel):
    # corresponds to tabs under the Model page
    pkpd_model: PKPDModelContext
    map_variables: MapVariablesContext
    parameters: ParametersContext
    secondary_parameters: SecondaryParametersContext


class CompoundContext(BaseModel):
    name: str
    modality: str


class ProjectContext(BaseModel):
    name: str
    description: str
    compound: CompoundContext
    drug_target: DrugTargetContext
    model: ModelContext | None
    trial_design: TrialDesignContext


class ChatContext(BaseModel):
    page: str | None
    sub_page: str | None
    project: ProjectContext | None
