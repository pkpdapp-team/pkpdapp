#
# This file is part of PKPDApp (https://github.com/pkpdapp-team/pkpdapp) which
# is released under the BSD 3-clause license. See accompanying LICENSE.md for
# copyright notice and full license details.
#
from typing import Literal

from pydantic import BaseModel


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


class DosingVariableContext(BaseModel):
    name: str
    unit_symbol: str | None
    model_type: Literal["PK", "PD"]
    is_dosing_compartment: bool
    has_lag_time: bool
    description: str | None
    qname: str


class SelectionContext(BaseModel):
    selected: bool
    enabled: bool


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


class ModelContext(BaseModel):
    pkpd_model: PKPDModelContext
    map_variables: MapVariablesContext


class ProjectContext(BaseModel):
    name: str
    description: str
    model: ModelContext | None


class ChatContext(BaseModel):
    page: str | None
    sub_page: str | None
    project: ProjectContext | None
