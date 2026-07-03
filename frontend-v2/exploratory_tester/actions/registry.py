"""Generates the full catalog of exploratory actions based on the current snapshot.

This module inspects the snapshot to produce concrete action instances:
  - Each parameter → 5 SetParameterActions (default ± 50%, bounds)
  - Each dose field → 5 SetDoseFieldActions
  - Each available submodel → SelectSubModelAction
  - etc.
"""

from __future__ import annotations

import math

from .base import Action
from .project import CreateProjectAction, SetSpeciesAction
from .model_config import (
    SelectSubModelAction,
    ToggleModelFlagAction,
    SetEffectCompartmentsAction,
    ResetToSpeciesDefaultsAction,
)
from .parameters import SetParameterAction
from .mappings import ToggleDosingAction, TogglePdMappingAction
from .dosing import SetDoseFieldAction
from .simulation import (
    AddPlotAction,
    RemovePlotAction,
    AddSliderAction,
    RemoveSliderAction,
    SetSliderValueAction,
    SetTimeMaxAction,
)
from ..snapshot import SimulationModelSnapshot


def _bucket_values(
    default: float, lower: float | None, upper: float | None
) -> list[float]:
    """Generate 5 discrete values: default, default*0.5, default*1.5, lower, upper."""
    values: list[float] = []
    if default is not None:
        values.append(default)
        if default != 0:
            values.append(round(default * 0.5, 6))
            values.append(round(default * 1.5, 6))
    if lower is not None:
        values.append(lower)
    if upper is not None:
        values.append(upper)
    # Deduplicate and keep values in a reasonable range
    values = [v for v in values if v is not None and math.isfinite(v)]
    values = sorted(set(round(v, 6) for v in values))
    # Fallback: ensure at least one value
    if not values:
        values = [0.0]
    # Clamp to 5 max
    return values[:5]


def generate_all_actions(snapshot: SimulationModelSnapshot) -> list[Action]:
    """Generate every possible action for the given snapshot.

    Does NOT filter by preconditions — that's the explorer's job.
    Returns the full action catalog.
    """
    actions: list[Action] = []

    # --- Project actions ---
    actions.append(CreateProjectAction("Small Molecule"))
    actions.append(CreateProjectAction("Large Molecule"))
    for species in ["H", "R", "M", "N"]:
        actions.append(SetSpeciesAction(species))

    # --- Model config actions (sub-model selections) ---
    _add_submodel_actions(actions)

    # --- Model flag actions ---
    for flag in ["has_lag", "has_anti_drug_antibodies", "has_bioavailability"]:
        actions.append(ToggleModelFlagAction(flag))
    for n in range(6):  # 0–5 effect compartments
        actions.append(SetEffectCompartmentsAction(n))

    actions.append(ResetToSpeciesDefaultsAction())

    # --- Parameter actions (generated from snapshot) ---
    for qname, param in snapshot.parameters.items():
        for value in _bucket_values(
            param.default_value or 0, param.lower_bound, param.upper_bound
        ):
            actions.append(SetParameterAction(qname, param.name, value))

    # --- Mapping actions ---
    for param in snapshot.parameters.values():
        actions.append(ToggleDosingAction(param.name))
        actions.append(TogglePdMappingAction(param.name))

    # --- Dose actions ---
    for dose_idx in range(max(1, len(snapshot.doses))):
        for field_name in SetDoseFieldAction.DOSE_FIELDS:
            if dose_idx < len(snapshot.doses):
                current = getattr(snapshot.doses[dose_idx], field_name, 1)
                defaults = {
                    "start_time": 0.0,
                    "amount": 1.0,
                    "duration": 0.1,
                    "repeats": 1,
                    "repeat_interval": 24.0,
                }
                base = current or defaults.get(field_name, 1)
                for value in _bucket_values(float(base), None, None):
                    if field_name == "repeats":
                        value = max(1, int(round(value)))
                    actions.append(SetDoseFieldAction(dose_idx, field_name, value))

    # --- Simulation actions ---
    for qname, out in snapshot.outputs.items():
        actions.append(AddPlotAction(out.name))

    for qname, param in snapshot.parameters.items():
        actions.append(AddSliderAction(param.name))

    for i in range(max(1, len(snapshot.plots))):
        actions.append(RemovePlotAction(i))
    for i in range(max(1, len(snapshot.sliders))):
        actions.append(RemoveSliderAction(i))

    for qname, param in snapshot.parameters.items():
        for value in _bucket_values(
            param.default_value or 0, param.lower_bound, param.upper_bound
        ):
            actions.append(SetSliderValueAction(param.name, value))

    for tmax in [10.0, 30.0, 48.0, 72.0, 168.0]:
        actions.append(SetTimeMaxAction(tmax))

    return actions


# ---------------------------------------------------------------------------
# Sub-model action generators
# ---------------------------------------------------------------------------

# Known PK model names from the backend
# (from storybook mock data and existing cypress tests)
KNOWN_PK_MODELS = [
    "one_compartment_preclinical",
    "one_compartment_clinical",
    "two_compartment_preclinical",
    "two_compartment_clinical",
    "three_compartment_preclinical",
    "three_compartment_clinical",
]

KNOWN_PD_MODELS = [
    "direct_effect_inhibitory",
    "direct_effect_stimulatory",
    "indirect_effects_stimulation_elimination",
    "indirect_effects_stimulation_production",
    "indirect_effects_inhibition_elimination",
    "indirect_effects_inhibition_production",
]

EFFECT_MODELS = [
    "effect_compartment_ke0",
    "effect_compartment_ke0_kp",
]


def _add_submodel_actions(actions: list[Action]) -> None:
    """Add actions for selecting each PK, PD, and effect model."""

    # PK model (central compartment) — no prerequisites
    for pk in KNOWN_PK_MODELS:
        actions.append(SelectSubModelAction("pk_model", pk, pk))

    # PK model2 (extravascular), effect model — require PK first
    for pk in KNOWN_PK_MODELS + [None]:
        if pk is None:
            actions.append(SelectSubModelAction(
                "pk_model2", "none", "None", requires_pk=True
            ))
        else:
            actions.append(SelectSubModelAction(
                "pk_model2", pk, pk, requires_pk=True
            ))

    # Effect model — requires PK first
    for em in EFFECT_MODELS:
        actions.append(SelectSubModelAction(
            "pk_effect_model", em, em, requires_pk=True
        ))

    # PD model — no prerequisites (but only interesting after PK)
    for pd in KNOWN_PD_MODELS + [None]:
        if pd is None:
            actions.append(SelectSubModelAction("pd_model", "none", "None"))
        else:
            actions.append(SelectSubModelAction("pd_model", pd, pd))

    # PD model2
    for pd in KNOWN_PD_MODELS + [None]:
        if pd is None:
            actions.append(SelectSubModelAction("pd_model2", "none", "None"))
        else:
            actions.append(SelectSubModelAction("pd_model2", pd, pd))
