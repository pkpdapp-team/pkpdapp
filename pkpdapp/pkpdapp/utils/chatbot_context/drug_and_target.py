#
# This file is part of PKPDApp (https://github.com/pkpdapp-team/pkpdapp) which
# is released under the BSD 3-clause license. See accompanying LICENSE.md for
# copyright notice and full license details.
#
from pydantic import BaseModel

from pkpdapp.models import Compound, EfficacyExperiment, Unit
from pkpdapp.utils.chatbot_context.shared import SelectionContext


# --------------------
# drug and target page
# --------------------
# ---- efficacy-safety data ----
class EfficacySafetyContext(BaseModel):
    selection: SelectionContext
    name: str
    c50: float
    c50_unit_symbol: str
    hill_coefficient: float

    @classmethod
    def from_experiment(
        cls, experiment: EfficacyExperiment, *, selected: bool, can_edit: bool
    ):
        return cls(
            selection=SelectionContext(selected=selected, enabled=can_edit),
            name=experiment.name,
            c50=experiment.c50,
            c50_unit_symbol=experiment.c50_unit.symbol,
            hill_coefficient=experiment.hill_coefficient,
        )


# ---- the page ----
def molar_mass_unit_label(unit: Unit) -> str:
    # the ui adds (Da) and (kDa) for clarity
    if unit.symbol == "g/mol":
        return f"{unit.symbol} (Da)"
    if unit.symbol == "kg/mol":
        return f"{unit.symbol} (kDa)"
    return unit.symbol


class DrugTargetContext(BaseModel):
    molecular_mass: float
    molecular_mass_unit: str
    target_molecular_mass: float
    target_molecular_mass_unit: str
    target2_molecular_mass: float
    target2_molecular_mass_unit: str
    efficacy_safety_data: list[EfficacySafetyContext]

    @classmethod
    def from_compound(cls, compound: Compound, *, can_edit: bool):
        return cls(
            molecular_mass=compound.molecular_mass,
            molecular_mass_unit=molar_mass_unit_label(compound.molecular_mass_unit),
            target_molecular_mass=compound.target_molecular_mass,
            target_molecular_mass_unit=molar_mass_unit_label(
                compound.target_molecular_mass_unit
            ),
            target2_molecular_mass=compound.target2_molecular_mass,
            target2_molecular_mass_unit=molar_mass_unit_label(
                compound.target2_molecular_mass_unit
            ),
            efficacy_safety_data=[
                EfficacySafetyContext.from_experiment(
                    experiment,
                    selected=experiment.id == compound.use_efficacy_id,
                    can_edit=can_edit,
                )
                for experiment in compound.efficacy_experiments.all()
            ],
        )
