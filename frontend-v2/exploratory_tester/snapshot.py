"""Domain-level snapshot of the PK/PD simulation model state.

Extracted from the RTK Query cache via an injected JS script, then parsed into
these frozen dataclasses for diffing and verification.
"""

from __future__ import annotations

import json
from dataclasses import dataclass, field, fields
from pathlib import Path
from typing import Any

from playwright.async_api import Page


# ---------------------------------------------------------------------------
# Leaf dataclasses
# ---------------------------------------------------------------------------

@dataclass(frozen=True)
class ParameterState:
    """A constant model variable (parameter)."""
    id: int
    name: str
    qname: str
    default_value: float | None
    lower_bound: float | None
    upper_bound: float | None
    unit_symbol: str | None


@dataclass(frozen=True)
class DerivedVarState:
    """A derived variable (secondary parameter like AUC, RO, FUP)."""
    type: str
    pk_variable_id: int


@dataclass(frozen=True)
class DoseState:
    """A single dose definition."""
    start_time: float
    amount: float
    duration: float
    repeats: float
    repeat_interval: float


@dataclass(frozen=True)
class PlotYAxis:
    """One Y axis on a simulation plot."""
    variable_id: int


@dataclass(frozen=True)
class PlotState:
    """A simulation plot definition."""
    id: int
    index: int
    y_variables: list[int]  # variable IDs referenced on Y axes
    x_unit: int | None
    y_unit: int | None
    y_unit2: int | None
    y_scale: str | None
    min: float | None
    max: float | None
    min2: float | None
    max2: float | None


@dataclass(frozen=True)
class SliderState:
    """A parameter slider on the simulation page."""
    id: int
    variable_id: int
    current_value: float | None  # from DOM (may differ from default_value)


@dataclass(frozen=True)
class CompoundState:
    """Drug compound properties."""
    id: int
    name: str
    molecular_mass: float | None
    fraction_unbound_plasma: float | None
    blood_to_plasma_ratio: float | None
    target_concentration: float | None
    dissociation_constant: float | None


@dataclass(frozen=True)
class SimulationResults:
    """Time-series output from the /simulate endpoint."""
    time: list[float]
    outputs: dict[str, list[float]]
    group: int | None


# ---------------------------------------------------------------------------
# Top-level snapshot
# ---------------------------------------------------------------------------

@dataclass(frozen=True)
class SimulationModelSnapshot:
    """Complete domain state of the simulation model."""

    # --- Model identity ---
    model_id: int | None = None

    # --- Species ---
    species: str = "H"

    # --- Sub-models (by ID — resolved to names when available) ---
    pk_model_id: int | None = None
    pk_model_id2: int | None = None       # extravascular
    pk_effect_model_id: int | None = None
    pd_model_id: int | None = None
    pd_model_id2: int | None = None

    # --- Remaining flags ---
    number_of_effect_compartments: int = 0
    has_lag: bool = False
    has_anti_drug_antibodies: bool = False
    has_bioavailability: bool = False

    # --- Time ---
    time_max: float = 30.0

    # --- Parameters (constant=true variables, keyed by qname) ---
    parameters: dict[str, ParameterState] = field(default_factory=dict)

    # --- Outputs (non-constant variables available for plotting, keyed by qname) ---
    outputs: dict[str, ParameterState] = field(default_factory=dict)

    # --- PK→PD mappings: [(pk_variable_id, pd_variable_id), ...] ---
    pd_mappings: list[tuple[int, int]] = field(default_factory=list)

    # --- Dosing ---
    dosed_compartments: list[str] = field(default_factory=list)
    doses: list[DoseState] = field(default_factory=list)

    # --- Derived variables ---
    derived_variables: list[DerivedVarState] = field(default_factory=list)

    # --- Compound ---
    compound: CompoundState | None = None

    # --- Simulation configuration ---
    plots: list[PlotState] = field(default_factory=list)
    sliders: list[SliderState] = field(default_factory=list)

    # --- Simulation results ---
    sim_results: SimulationResults | None = None

    # --- Extra metadata ---
    has_project: bool = False
    has_model: bool = False
    has_simulation: bool = False
    _error: str | None = None

    @property
    def hash(self) -> int:
        """Content-based hash for state graph deduplication."""
        return hash(json.dumps(_snapshot_to_dict(self), sort_keys=True, default=str))


# ---------------------------------------------------------------------------
# Diffing
# ---------------------------------------------------------------------------

@dataclass
class SnapshotDiff:
    """Describes what changed between two snapshots."""

    added_parameters: list[str] = field(default_factory=list)
    removed_parameters: list[str] = field(default_factory=list)
    changed_parameters: dict[str, tuple[Any, Any]] = field(
        default_factory=dict
    )  # qname -> (old, new)

    changed_fields: dict[str, tuple[Any, Any]] = field(
        default_factory=dict
    )  # path -> (old, new)

    added_plots: int = 0
    removed_plots: int = 0
    added_sliders: int = 0
    removed_sliders: int = 0
    added_doses: int = 0
    removed_doses: int = 0
    mappings_changed: bool = False
    derived_variables_changed: bool = False

    sim_results_changed: bool = False
    sim_results_added: bool = False
    sim_results_removed: bool = False

    @property
    def is_empty(self) -> bool:
        return not any(
            [
                self.added_parameters,
                self.removed_parameters,
                self.changed_parameters,
                self.changed_fields,
                self.added_plots,
                self.removed_plots,
                self.added_sliders,
                self.removed_sliders,
                self.added_doses,
                self.removed_doses,
                self.mappings_changed,
                self.derived_variables_changed,
                self.sim_results_changed,
                self.sim_results_added,
                self.sim_results_removed,
            ]
        )

    def __str__(self) -> str:
        parts: list[str] = []
        for field_name, (old, new) in self.changed_fields.items():
            parts.append(f"  {field_name}: {old} -> {new}")
        for qname, (old, new) in self.changed_parameters.items():
            parts.append(f"  param[{qname}].default_value: {old} -> {new}")
        for qname in self.added_parameters:
            parts.append(f"  + param[{qname}]")
        for qname in self.removed_parameters:
            parts.append(f"  - param[{qname}]")
        if self.added_plots:
            parts.append(f"  +{self.added_plots} plot(s)")
        if self.removed_plots:
            parts.append(f"  -{self.removed_plots} plot(s)")
        if self.added_sliders:
            parts.append(f"  +{self.added_sliders} slider(s)")
        if self.removed_sliders:
            parts.append(f"  -{self.removed_sliders} slider(s)")
        if self.added_doses:
            parts.append(f"  +{self.added_doses} dose(s)")
        if self.removed_doses:
            parts.append(f"  -{self.removed_doses} dose(s)")
        if self.mappings_changed:
            parts.append("  mappings changed")
        if self.derived_variables_changed:
            parts.append("  derived variables changed")
        if self.sim_results_changed:
            parts.append("  simulation results changed")
        if self.sim_results_added:
            parts.append("  + simulation results")
        if self.sim_results_removed:
            parts.append("  - simulation results")
        return "\n".join(parts) if parts else "  (no changes)"


def diff_snapshots(
    before: SimulationModelSnapshot, after: SimulationModelSnapshot
) -> SnapshotDiff:
    """Compute a structured diff between two snapshots."""
    d = SnapshotDiff()

    _diff_scalar_fields(d, before, after)
    _diff_parameters(d, before, after)
    _diff_lists(d, before, after)
    _diff_sim_results(d, before, after)

    return d


def _diff_scalar_fields(d: SnapshotDiff, before: SimulationModelSnapshot, after: SimulationModelSnapshot) -> None:
    scalar_field_names = [
        "model_id", "species",
        "pk_model_id", "pk_model_id2", "pk_effect_model_id",
        "pd_model_id", "pd_model_id2",
        "number_of_effect_compartments",
        "has_lag", "has_anti_drug_antibodies", "has_bioavailability",
        "time_max", "has_project", "has_model", "has_simulation",
    ]
    for name in scalar_field_names:
        old_val = getattr(before, name)
        new_val = getattr(after, name)
        if old_val != new_val:
            d.changed_fields[name] = (old_val, new_val)

    # Compound
    if before.compound != after.compound:
        if before.compound is None:
            d.changed_fields["compound"] = (None, f"{after.compound}")
        elif after.compound is None:
            d.changed_fields["compound"] = (f"{before.compound}", None)
        else:
            for fc in fields(CompoundState):
                ov = getattr(before.compound, fc.name)
                nv = getattr(after.compound, fc.name)
                if ov != nv:
                    d.changed_fields[f"compound.{fc.name}"] = (ov, nv)


def _diff_parameters(d: SnapshotDiff, before: SimulationModelSnapshot, after: SimulationModelSnapshot) -> None:
    old_keys = set(before.parameters.keys())
    new_keys = set(after.parameters.keys())

    d.added_parameters = list(new_keys - old_keys)
    d.removed_parameters = list(old_keys - new_keys)

    for qname in old_keys & new_keys:
        old_p = before.parameters[qname]
        new_p = after.parameters[qname]
        if old_p.default_value != new_p.default_value:
            d.changed_parameters[qname] = (old_p.default_value, new_p.default_value)


def _diff_lists(d: SnapshotDiff, before: SimulationModelSnapshot, after: SimulationModelSnapshot) -> None:
    # Plots
    d.added_plots = max(0, len(after.plots) - len(before.plots))
    d.removed_plots = max(0, len(before.plots) - len(after.plots))
    if len(after.plots) == len(before.plots):
        for i, (bp, ap) in enumerate(zip(before.plots, after.plots)):
            if bp != ap:
                d.changed_fields[f"plots[{i}]"] = ("changed", "changed")

    # Sliders
    d.added_sliders = max(0, len(after.sliders) - len(before.sliders))
    d.removed_sliders = max(0, len(before.sliders) - len(after.sliders))
    if len(after.sliders) == len(before.sliders):
        for i, (bs, as_) in enumerate(zip(before.sliders, after.sliders)):
            if bs.current_value != as_.current_value:
                d.changed_fields[f"sliders[{i}].current_value"] = (
                    bs.current_value,
                    as_.current_value,
                )

    # Doses
    d.added_doses = max(0, len(after.doses) - len(before.doses))
    d.removed_doses = max(0, len(before.doses) - len(after.doses))
    if len(after.doses) == len(before.doses):
        for i, (bd, ad) in enumerate(zip(before.doses, after.doses)):
            if bd != ad:
                d.changed_fields[f"doses[{i}]"] = ("changed", "changed")

    # Mappings
    if sorted(before.pd_mappings) != sorted(after.pd_mappings):
        d.mappings_changed = True

    # Derived variables
    if sorted(before.derived_variables) != sorted(after.derived_variables):
        d.derived_variables_changed = True


def _diff_sim_results(d: SnapshotDiff, before: SimulationModelSnapshot, after: SimulationModelSnapshot) -> None:
    if before.sim_results is None and after.sim_results is not None:
        d.sim_results_added = True
    elif before.sim_results is not None and after.sim_results is None:
        d.sim_results_removed = True
    elif before.sim_results is not None and after.sim_results is not None:
        if not _sim_results_equal(before.sim_results, after.sim_results):
            d.sim_results_changed = True


def _sim_results_equal(a: SimulationResults, b: SimulationResults) -> bool:
    """Check if two simulation results are numerically equal."""
    if a.time != b.time:
        return False
    if sorted(a.outputs.keys()) != sorted(b.outputs.keys()):
        return False
    for key in a.outputs:
        if key not in b.outputs:
            return False
        if len(a.outputs[key]) != len(b.outputs[key]):
            return False
        for va, vb in zip(a.outputs[key], b.outputs[key]):
            if va != vb:  # strict float equality — these come from JSON
                return False
    return True


# ---------------------------------------------------------------------------
# Extraction from Playwright page
# ---------------------------------------------------------------------------

# Load the JS extractor
_JS_EXTRACTOR_PATH = Path(__file__).parent / "js_extractors" / "redux_snapshot.js"
with open(_JS_EXTRACTOR_PATH, "r") as _f:
    _EXTRACTOR_JS = _f.read()


async def snapshot_from_page(page: Page) -> SimulationModelSnapshot:
    """Inject JS into the page, extract Redux + DOM state, parse into snapshot."""
    raw = await page.evaluate(_EXTRACTOR_JS)
    data = json.loads(raw) if isinstance(raw, str) else raw

    if isinstance(data, dict) and data.get("error"):
        return SimulationModelSnapshot(_error=data["error"])

    return _parse_snapshot_data(data)


def _resolve_model_ids(model: dict | None, variables: list[dict]) -> dict[int, str]:
    """Build a mapping from variable id -> variable name (for slider lookups)."""
    result: dict[int, str] = {}
    for v in variables:
        vid = v.get("id")
        if vid is not None:
            result[vid] = v.get("name", str(vid))
    return result


def _parse_snapshot_data(data: dict) -> SimulationModelSnapshot:
    model = data.get("model") or {}
    variables = data.get("variables") or []
    compound = data.get("compound") or {}
    project = data.get("project") or {}
    simulation = data.get("simulation") or {}
    sim_result = data.get("simulationResult") or {}
    doses_raw = data.get("doses") or []
    slider_values = data.get("sliderValues") or {}
    var_id_to_name = _resolve_model_ids(model, variables)

    # --- Parameters (constant) and Outputs (non-constant) ---
    parameters: dict[str, ParameterState] = {}
    outputs: dict[str, ParameterState] = {}
    for v in variables:
        qname = v.get("qname", str(v.get("id")))
        ps = ParameterState(
            id=v.get("id", 0),
            name=v.get("name", ""),
            qname=qname,
            default_value=v.get("default_value"),
            lower_bound=v.get("lower_bound"),
            upper_bound=v.get("upper_bound"),
            unit_symbol=v.get("unit_symbol"),
        )
        if v.get("constant"):
            parameters[qname] = ps
        else:
            outputs[qname] = ps

    # --- Derived variables ---
    derived_variables = [
        DerivedVarState(type=dv.get("type", ""), pk_variable_id=dv.get("pk_variable", 0))
        for dv in (model.get("derived_variables") or [])
    ]

    # --- PK→PD mappings ---
    pd_mappings: list[tuple[int, int]] = [
        (m.get("pk_variable", 0), m.get("pd_variable", 0))
        for m in (model.get("mappings") or [])
    ]

    # --- Doses ---
    doses = [
        DoseState(
            start_time=d.get("start_time", 0),
            amount=d.get("amount", 0),
            duration=d.get("duration", 0),
            repeats=d.get("repeats", 1),
            repeat_interval=d.get("repeat_interval", 24),
        )
        for d in doses_raw
    ]

    # --- Compound ---
    compound_state = None
    if compound:
        compound_state = CompoundState(
            id=compound.get("id", 0),
            name=compound.get("name", ""),
            molecular_mass=compound.get("molecular_mass"),
            fraction_unbound_plasma=compound.get("fraction_unbound_plasma"),
            blood_to_plasma_ratio=compound.get("blood_to_plasma_ratio"),
            target_concentration=compound.get("target_concentration"),
            dissociation_constant=compound.get("dissociation_constant"),
        )

    # --- Simulation plots ---
    plots: list[PlotState] = []
    for p in simulation.get("plots") or []:
        plots.append(
            PlotState(
                id=p.get("id", 0),
                index=p.get("index", 0),
                y_variables=[ax.get("variable", 0) for ax in (p.get("y_axes") or [])],
                x_unit=p.get("x_unit"),
                y_unit=p.get("y_unit"),
                y_unit2=p.get("y_unit2"),
                y_scale=p.get("y_scale"),
                min=p.get("min"),
                max=p.get("max"),
                min2=p.get("min2"),
                max2=p.get("max2"),
            )
        )

    # --- Sliders ---
    sliders: list[SliderState] = []
    for sl in simulation.get("sliders") or []:
        var_id = sl.get("variable", 0)
        var_name = var_id_to_name.get(var_id, "")
        # Use DOM value if available, otherwise fall back to parameter default
        dom_value = slider_values.get(var_name)
        if dom_value is None and var_id in var_id_to_name:
            dom_value = slider_values.get(var_id_to_name[var_id])
        sliders.append(
            SliderState(
                id=sl.get("id", 0),
                variable_id=var_id,
                current_value=dom_value,
            )
        )

    # --- Simulation results ---
    sim_results = None
    if sim_result and sim_result.get("time"):
        sim_results = SimulationResults(
            time=sim_result.get("time", []),
            outputs=sim_result.get("outputs", {}),
            group=sim_result.get("group"),
        )

    return SimulationModelSnapshot(
        model_id=model.get("id"),
        species=model.get("species", project.get("species", "H")),
        pk_model_id=model.get("pk_model"),
        pk_model_id2=model.get("pk_model2"),
        pk_effect_model_id=model.get("pk_effect_model"),
        pd_model_id=model.get("pd_model"),
        pd_model_id2=model.get("pd_model2"),
        number_of_effect_compartments=model.get("number_of_effect_compartments", 0),
        has_lag=model.get("has_lag", False),
        has_anti_drug_antibodies=model.get("has_anti_drug_antibodies", False),
        has_bioavailability=model.get("has_bioavailability", False),
        time_max=model.get("time_max", 30.0),
        parameters=parameters,
        outputs=outputs,
        pd_mappings=pd_mappings,
        doses=doses,
        derived_variables=derived_variables,
        compound=compound_state,
        plots=plots,
        sliders=sliders,
        sim_results=sim_results,
        has_project=bool(data.get("selectedProject")),
        has_model=bool(model),
        has_simulation=bool(simulation),
    )


def _snapshot_to_dict(s: SimulationModelSnapshot) -> dict:
    """Convert snapshot to a JSON-serializable dictionary for hashing."""
    return {
        "model_id": s.model_id,
        "species": s.species,
        "pk_model_id": s.pk_model_id,
        "pk_model_id2": s.pk_model_id2,
        "pk_effect_model_id": s.pk_effect_model_id,
        "pd_model_id": s.pd_model_id,
        "pd_model_id2": s.pd_model_id2,
        "number_of_effect_compartments": s.number_of_effect_compartments,
        "has_lag": s.has_lag,
        "has_anti_drug_antibodies": s.has_anti_drug_antibodies,
        "has_bioavailability": s.has_bioavailability,
        "time_max": s.time_max,
        "parameters": {k: v.default_value for k, v in sorted(s.parameters.items())},
        "outputs": sorted(s.outputs.keys()),
        "pd_mappings": sorted(s.pd_mappings),
        "doses": sorted(
            [(d.start_time, d.amount, d.duration, d.repeats, d.repeat_interval) for d in s.doses]
        ),
        "derived_variables": sorted((dv.type, dv.pk_variable_id) for dv in s.derived_variables),
        "compound": s.compound.id if s.compound else None,
        "plots": sorted((p.id, p.y_variables) for p in s.plots),
        "sliders": sorted((sl.variable_id, sl.current_value) for sl in s.sliders),
        "has_sim_results": s.sim_results is not None,
        "has_project": s.has_project,
        "has_model": s.has_model,
        "has_simulation": s.has_simulation,
    }
