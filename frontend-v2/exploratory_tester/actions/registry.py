"""Generates the full catalog of exploratory actions based on the current snapshot.

Generates one action per semantic operation type. Actions that need to
choose from a set of options (model dropdown, dosing variable, PD mapping)
discover those options at execution time rather than pre-generating
concrete instances.
"""

from __future__ import annotations

import math

from .base import Action
from .project import CreateProjectAction, SetSpeciesAction
from .model_config import (
    PickModelAction,
    ToggleModelFlagAction,
    SetEffectCompartmentsAction,
    ResetToSpeciesDefaultsAction,
)
from .parameters import SetParameterAction
from .mappings import PickDosingAction, PickPdMappingAction
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


def generate_all_actions(
    snapshot: SimulationModelSnapshot,
) -> list[Action]:
    """Generate every possible action for the given snapshot.

    Does NOT filter by preconditions — that's the explorer's job.
    """
    actions: list[Action] = []

    # --- Project actions ---
    actions.append(CreateProjectAction("Small Molecule"))
    actions.append(CreateProjectAction("Large Molecule"))
    for species in ["H", "R", "M", "K"]:
        actions.append(SetSpeciesAction(species))

    # --- Model config actions (one per dropdown) ---
    actions.append(PickModelAction("pk_model"))
    actions.append(PickModelAction("pk_model2", requires_pk=True))
    actions.append(PickModelAction("pk_effect_model", requires_pk=True))
    actions.append(PickModelAction("pd_model", requires_pk=True))
    actions.append(PickModelAction("pd_model2", requires_pk=True, requires_pd=True))

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

    # --- Mapping actions (one per type, discovers options at execution) ---
    actions.append(PickDosingAction())
    actions.append(PickPdMappingAction())

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
    actions.append(AddPlotAction())
    actions.append(AddSliderAction())

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
