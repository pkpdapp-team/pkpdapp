#
# This file is part of PKPDApp (https://github.com/pkpdapp-team/pkpdapp) which
# is released under the BSD 3-clause license. See accompanying LICENSE.md for
# copyright notice and full license details.
#
from pydantic import BaseModel

from pkpdapp.models import (
    CombinedModel,
    PharmacodynamicModel,
    PharmacokineticModel,
)
from pkpdapp.utils.chatbot_context.shared import SelectionContext


# ----------------------------
# model page > pk/pd model tab
# ----------------------------
class ModelComponentContext(BaseModel):
    name: str
    description: str
    tags: list[str]

    @classmethod
    def from_library_model(
        cls, library_model: PharmacokineticModel | PharmacodynamicModel
    ):
        return cls(
            name=library_model.name,
            description=library_model.description,
            tags=[tag.name for tag in library_model.tags.all()],
        )


def component_context(
    library_model: PharmacokineticModel | PharmacodynamicModel | None,
):
    if library_model is None:
        return None
    return ModelComponentContext.from_library_model(library_model)


class PKPDModelContext(BaseModel):
    species: str
    weight: float
    weight_unit: str

    pk_filter_tags: list[str]
    pk_model: ModelComponentContext | None

    effect_model: ModelComponentContext | None
    effect_compartments: int | None
    has_anti_drug_antibodies: SelectionContext | None

    extravascular_model: ModelComponentContext | None
    has_lag: SelectionContext | None
    has_bioavailability: SelectionContext | None

    pd_filter_tags: list[str]
    pd_model: ModelComponentContext | None
    secondary_pd_model: ModelComponentContext | None
    has_hill_coefficient: SelectionContext | None

    @classmethod
    def from_combined_model(cls, model: CombinedModel, *, can_edit: bool):
        project = model.project
        has_pk = model.pk_model is not None
        has_pk2 = model.pk_model2 is not None
        has_pd = model.pd_model is not None
        pd_mmts = [m.mmt for m in (model.pd_model, model.pd_model2) if m is not None]
        shows_hill = any("desc: Hill coefficient" in mmt for mmt in pd_mmts)
        return cls(
            species=project.get_species_display(),
            weight=project.species_weight,
            weight_unit=project.species_weight_unit.symbol,
            pk_filter_tags=[tag.name for tag in project.pk_tags.all()],
            pk_model=component_context(model.pk_model),
            # effect and ada controls only show once a pk model is picked
            effect_model=component_context(model.pk_effect_model) if has_pk else None,
            effect_compartments=(
                model.number_of_effect_compartments if has_pk else None
            ),
            has_anti_drug_antibodies=(
                SelectionContext(
                    selected=model.has_anti_drug_antibodies,
                    enabled=(
                        can_edit
                        and has_pk
                        and project.compound.compound_type == "LM"
                    ),
                )
                if has_pk
                else None
            ),
            extravascular_model=component_context(model.pk_model2),
            # lag and bioavailability only show with an extravascular model
            has_lag=(
                SelectionContext(selected=model.has_lag, enabled=can_edit and has_pk)
                if has_pk2
                else None
            ),
            has_bioavailability=(
                SelectionContext(
                    selected=model.has_bioavailability, enabled=can_edit and has_pk
                )
                if has_pk2
                else None
            ),
            pd_filter_tags=[tag.name for tag in project.pd_tags.all()],
            pd_model=component_context(model.pd_model),
            secondary_pd_model=component_context(model.pd_model2),
            has_hill_coefficient=(
                SelectionContext(
                    selected=model.has_hill_coefficient, enabled=can_edit and has_pd
                )
                if shows_hill
                else None
            ),
        )
