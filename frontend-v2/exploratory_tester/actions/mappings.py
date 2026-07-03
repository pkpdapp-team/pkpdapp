"""Variable mapping actions: dosing compartment toggles, PK→PD mapping toggles."""

from __future__ import annotations

from playwright.async_api import Page

from ..snapshot import SimulationModelSnapshot, SnapshotDiff
from .base import Action, ResultExpectation
from .navigation import navigate_to_model_subtab, toggle_checkbox


class ToggleDosingAction(Action):
    """Toggle whether a compartment is a dosing compartment."""

    CATEGORY = "mappings"
    RESULT_EXPECTATION = ResultExpectation.SHOULD_CHANGE

    def __init__(self, variable_name: str) -> None:
        self._var_name = variable_name
        self._key = f"toggle_dosing:{variable_name}"

    @property
    def key(self) -> str:
        return self._key

    def preconditions(self, snapshot: SimulationModelSnapshot) -> bool:
        return snapshot.has_model

    async def execute(self, page: Page, snapshot: SimulationModelSnapshot) -> None:
        await navigate_to_model_subtab(page, "Map Variables")
        await toggle_checkbox(page, f"dosing-{self._var_name}")

    def expected_diff(self, before: SimulationModelSnapshot) -> SnapshotDiff:
        d = SnapshotDiff()
        prev = self._var_name in before.dosed_compartments
        d.changed_fields[f"dosed.{self._var_name}"] = (prev, not prev)
        return d


class TogglePdMappingAction(Action):
    """Toggle a PK→PD variable mapping."""

    CATEGORY = "mappings"
    RESULT_EXPECTATION = ResultExpectation.SHOULD_CHANGE

    def __init__(self, variable_name: str) -> None:
        self._var_name = variable_name
        self._key = f"toggle_pd_mapping:{variable_name}"

    @property
    def key(self) -> str:
        return self._key

    def preconditions(self, snapshot: SimulationModelSnapshot) -> bool:
        return snapshot.has_model

    async def execute(self, page: Page, snapshot: SimulationModelSnapshot) -> None:
        await navigate_to_model_subtab(page, "Map Variables")
        await toggle_checkbox(page, f"map-to-pd-{self._var_name}")

    def expected_diff(self, before: SimulationModelSnapshot) -> SnapshotDiff:
        d = SnapshotDiff()
        d.mappings_changed = True
        return d
