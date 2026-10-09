#
# This file is part of PKPDApp (https://github.com/pkpdapp-team/pkpdapp) which
# is released under the BSD 3-clause license. See accompanying LICENSE.md for
# copyright notice and full license details.
#
from typing import Literal

from pydantic import BaseModel

from pkpdapp.models import (
    Covariate,
    CovariatePopulation,
    Dose,
    Project,
    Protocol,
    SubjectGroup,
)
from pkpdapp.utils.lognormal import median_logvar_to_mean_std
from pkpdapp.utils.chatbot_context.shared import SelectionContext, locale_key, round_sig


# -----------------
# trial design page
# -----------------
# ---- dosing ----
class DoseContext(BaseModel):
    amount: float
    number_of_doses: int
    start_time: float
    duration: float
    repeat_interval: float

    @classmethod
    def from_dose(cls, dose: Dose):
        return cls(
            amount=dose.amount,
            number_of_doses=dose.repeats,
            start_time=dose.start_time,
            duration=dose.duration,
            repeat_interval=dose.repeat_interval,
        )


class ProtocolContext(BaseModel):
    heading: str
    variable_qname: str | None
    amount_unit_symbol: str | None
    time_unit_symbol: str | None
    per_body_weight: SelectionContext
    from_dataset: bool
    doses: list[DoseContext]

    @classmethod
    def from_protocol(cls, protocol: Protocol, *, can_edit: bool):
        variable = protocol.variable
        mapped_variable = variable.qname if variable else ""
        amount_unit = protocol.amount_unit
        time_unit = protocol.time_unit
        from_dataset = protocol.dataset_id is not None
        return cls(
            heading=f"{mapped_variable.split('.')[-1]} Administration",
            variable_qname=variable.qname if variable else None,
            amount_unit_symbol=amount_unit.symbol if amount_unit else None,
            time_unit_symbol=time_unit.symbol if time_unit else None,
            per_body_weight=SelectionContext(
                selected=protocol.amount_per_body_weight,
                # the api rejects edits to dataset protocols
                enabled=can_edit and not from_dataset,
            ),
            from_dataset=from_dataset,
            doses=[DoseContext.from_dose(dose) for dose in protocol.doses.all()],
        )


# ---- group population ----
class GroupPopulationContext(BaseModel):
    study_size: int
    age_min: float
    age_max: float
    male_fraction: float
    region: str

    @classmethod
    def from_group(cls, group: SubjectGroup):
        return cls(
            study_size=group.study_size,
            age_min=group.age_min,
            age_max=group.age_max,
            male_fraction=group.m2f_ratio,
            region=group.get_population_region_display(),
        )


# ---- custom covariates ----
class ContinuousCovariateContext(BaseModel):
    covariate_id: int
    name: str
    type: Literal[Covariate.Type.CONTINUOUS]
    mean: float
    standard_deviation: float
    reference_value: float

    @classmethod
    def from_population(cls, population: CovariatePopulation):
        covariate = population.covariate
        # stored as a log-normal median/variance, shown in the ui as mean/std
        mean, std = median_logvar_to_mean_std(population.median, population.variance)
        return cls(
            covariate_id=covariate.id,
            name=covariate.name,
            type=covariate.type,
            mean=round_sig(mean),
            standard_deviation=round_sig(std),
            reference_value=covariate.reference_value,
        )


class CategoricalCovariateContext(BaseModel):
    covariate_id: int
    name: str
    type: Literal[Covariate.Type.CATEGORICAL]
    n_categories: int
    category_probabilities: list[float]

    @classmethod
    def from_population(cls, population: CovariatePopulation):
        covariate = population.covariate
        return cls(
            covariate_id=covariate.id,
            name=covariate.name,
            type=covariate.type,
            n_categories=covariate.n_categories,
            category_probabilities=population.category_probabilities,
        )


def covariate_context(population: CovariatePopulation):
    if population.covariate.type == Covariate.Type.CATEGORICAL:
        return CategoricalCovariateContext.from_population(population)
    return ContinuousCovariateContext.from_population(population)


# ---- subject groups ----
class SubjectGroupContext(BaseModel):
    name: str
    from_dataset: bool
    subject_count: int | None
    protocols: list[ProtocolContext]
    population: GroupPopulationContext | None
    custom_covariates: list[
        ContinuousCovariateContext | CategoricalCovariateContext
    ]

    @classmethod
    def from_group(cls, group: SubjectGroup, *, can_edit: bool):
        from_dataset = group.dataset_id is not None
        return cls(
            name=group.name,
            from_dataset=from_dataset,
            # annotated in loaders.py
            subject_count=group.subject_count if from_dataset else None,
            # same order as the ui: by name, a plain string compare (Protocols.tsx)
            protocols=[
                ProtocolContext.from_protocol(protocol, can_edit=can_edit)
                for protocol in sorted(group.protocols.all(), key=lambda p: p.name)
            ],
            # dataset imports leave the population fields at their defaults
            population=(
                None if from_dataset else GroupPopulationContext.from_group(group)
            ),
            custom_covariates=[
                covariate_context(population)
                for population in group.covariate_populations.all()
            ],
        )


# ---- the page, with its groups ----
class TrialDesignContext(BaseModel):
    groups: list[SubjectGroupContext]

    @classmethod
    def from_project(cls, project: Project, *, can_edit: bool):
        # same order as the ui: "Sim" groups first, then by name
        groups = sorted(
            project.groups.all(),
            key=lambda group: (
                not group.name.startswith("Sim"),
                locale_key(group.name),
            ),
        )
        return cls(
            groups=[
                SubjectGroupContext.from_group(group, can_edit=can_edit)
                for group in groups
            ]
        )
