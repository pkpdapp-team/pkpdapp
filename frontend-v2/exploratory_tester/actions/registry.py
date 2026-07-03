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

# Known model names from the backend API's `name` field.
# These match the option labels in the PK/PD Model tab dropdowns.
# Both naming conventions are included (legacy snake_case + v3 descriptive).

KNOWN_PK_MODELS = [
    # --- Classic disposition ---
    "1-compartmental model",
    "2-compartmental model",
    "3-compartmental model",
    "3-compartment catenary model",
    # --- Full TMDD ---
    "1-compartmental full TMDD model (1 binding site)",
    "1-compartmental full TMDD model (1 binding site) - constant target",
    "1-compartmental full TMDD model (1 binding site) "
    "- constant target concentration",
    "1-compartmental full TMDD model (1 binding site) - soluble target",
    "1-compartmental full TMDD model (1 binding site) "
    "- soluble target (catch and release)",
    "1-compartmental full TMDD model (2 binding sites)",
    "1-compartmental full TMDD model (2 binding sites) - constant target",
    "1-compartmental full TMDD model (2 binding sites) - soluble target",
    "2-compartmental full TMDD model (1 binding site)",
    "2-compartmental full TMDD model (1 binding site) - constant target",
    "2-compartmental full TMDD model (1 binding site) - soluble target",
    "2-compartmental full TMDD model (1 binding site) "
    "- soluble target (catch and release)",
    "2-compartmental full TMDD model (2 binding sites)",
    "2-compartmental full TMDD model (2 binding sites) - constant target",
    "2-compartmental full TMDD model (2 binding sites) - soluble target",
    # --- QSS TMDD ---
    "1-compartmental QSS TMDD model (1 binding site)",
    "1-compartmental QSS TMDD model (1 binding site) - constant target",
    "1-compartmental QSS TMDD model (1 binding site) - soluble target",
    "1-compartmental QSS TMDD model (1 binding site) "
    "- soluble target (catch and release)",
    "2-compartmental QSS TMDD model (1 binding site)",
    "2-compartmental QSS TMDD model (1 binding site) - constant target",
    "2-compartmental QSS TMDD model (1 binding site) - soluble target",
    "2-compartmental QSS TMDD model (1 binding site) "
    "- soluble target (catch and release)",
    # --- Bispecific TMDD ---
    "1-compartmental bispecific TMDD model",
    "1-compartmental bispecific TMDD model - soluble targets",
    "2-compartmental bispecific TMDD model",
    "2-compartmental bispecific TMDD model - soluble targets",
    # --- Michaelis-Menten TMDD ---
    "1-compartmental extended Michaelis-Menten TMDD model",
    "1-compartmental extended Michaelis-Menten TMDD model - constant target",
    "2-compartmental extended Michaelis-Menten TMDD model",
    "2-compartmental extended Michaelis-Menten TMDD model - constant target",
]

KNOWN_PD_MODELS = [
    # --- Direct effects ---
    "Direct effect model (inhibitory)",
    "Direct effect model (stimulatory)",
    # --- Indirect effects ---
    "Indirect effect model (inhibition of elimination)",
    "Indirect effect model (inhibition of production)",
    "Indirect effect model (stimulation of elimination)",
    "Indirect effect model (stimulation of production)",
    "Indirect effect model with precursor "
    "(inhibition of precursor elimination)",
    "Indirect effect model with precursor "
    "(stimulation of precursor elimination)",
    # --- Protein degradation ---
    "Protein degradation model",
    # --- DDI ---
    "Competitive inhibition (DDI)",
    "Time-dependent inhibition (DDI)",
    "Time-dependent induction (DDI)",
    "Time-dependent and competitive inhibition (DDI)",
    # --- Tumour growth ---
    "Tumor growth model (linear)",
    "Tumor growth model (exponential)",
    "Tumor growth model (Gompertz)",
    "Tumor growth model (Simeoni)",
    "Tumor growth model (Simeoni-logistic)",
]

KNOWN_PD2_MODELS = [
    # --- Tumour growth inhibition ---
    "TGI cell distribution model (conc prop kill)",
    "TGI cell distribution model (Emax kill)",
    "TGI cell distribution model (exp(conc) prop kill)",
    "TGI signal distribution model (conc prop kill)",
    "TGI signal distribution model (exp(conc) prop kill)",
    "TGI signal distribution model (Emax kill)",
]

KNOWN_EFFECT_MODELS = [
    "Effect compartment model",
    "Effect compartment model (ke0 & Kp)",
    "Effect compartment model (kin & kout)",
]

KNOWN_PK2_MODELS = [
    "First order absorption model",
    "First order absorption model (two absorption sites)",
    "Transit compartments absorption model",
    "Ocular PK model",
    "Ocular PKPD bispecific (two different targets) model",
    "Ocular PKPD VEGF (dimeric target) model",
]


def _add_submodel_actions(actions: list[Action]) -> None:
    """Add actions for selecting each PK, PD, and effect model."""

    # PK model (central compartment) — no prerequisites
    for pk in KNOWN_PK_MODELS:
        actions.append(SelectSubModelAction("pk_model", pk, pk))

    # PK model2 (extravascular) — requires PK first
    for pk2 in KNOWN_PK2_MODELS + [None]:
        if pk2 is None:
            actions.append(SelectSubModelAction(
                "pk_model2", "none", "None", requires_pk=True
            ))
        else:
            actions.append(SelectSubModelAction(
                "pk_model2", pk2, pk2, requires_pk=True
            ))

    # Effect model — requires PK first
    for em in KNOWN_EFFECT_MODELS:
        actions.append(SelectSubModelAction(
            "pk_effect_model", em, em, requires_pk=True
        ))

    # PD model — no prerequisites (but only interesting after PK)
    for pd in KNOWN_PD_MODELS + [None]:
        if pd is None:
            actions.append(SelectSubModelAction("pd_model", "none", "None"))
        else:
            actions.append(SelectSubModelAction("pd_model", pd, pd))

    # PD model2 (TGI)
    for pd2 in KNOWN_PD2_MODELS + [None]:
        if pd2 is None:
            actions.append(SelectSubModelAction("pd_model2", "none", "None"))
        else:
            actions.append(SelectSubModelAction("pd_model2", pd2, pd2))
