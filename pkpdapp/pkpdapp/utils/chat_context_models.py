#
# This file is part of PKPDApp (https://github.com/pkpdapp-team/pkpdapp) which
# is released under the BSD 3-clause license. See accompanying LICENSE.md for
# copyright notice and full license details.
#
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


class ModelContext(BaseModel):
    pkpd_model: PKPDModelContext
