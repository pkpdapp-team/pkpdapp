"""Variable mapping actions: dosing compartment toggles, PK→PD mapping toggles.

Each action discovers available options at execution time rather than using
pre-generated concrete instances, so the fuzzer always sees the current state.
"""

from __future__ import annotations

import logging
import random

from playwright.async_api import Page

from ..snapshot import SimulationModelSnapshot, SnapshotDiff
from .base import Action, ResultExpectation
from .navigation import (
    get_checkbox_labels,
    navigate_to_model_subtab,
    toggle_checkbox,
)

logger = logging.getLogger(__name__)


class PickDosingAction(Action):
    """Toggle a random dosing compartment checkbox on the Map Variables tab.

    Discovers available dosing variables at execution time.
    """

    CATEGORY = "mappings"
    RESULT_EXPECTATION = ResultExpectation.SHOULD_CHANGE

    _key = "pick_dosing"

    @property
    def key(self) -> str:
        return self._key

    def preconditions(self, snapshot: SimulationModelSnapshot) -> bool:
        return snapshot.has_model and bool(snapshot.pk_model_id)

    async def execute(self, page: Page, snapshot: SimulationModelSnapshot) -> None:
        await navigate_to_model_subtab(page, "Map Variables")
        names = await get_checkbox_labels(page, "checkbox-dosing-")
        if not names:
            return
        chosen = random.choice(names)
        logger.info("pick_dosing: chose %s", chosen)
        await toggle_checkbox(page, f"checkbox-dosing-{chosen}")

    def expected_diff(self, before: SimulationModelSnapshot) -> SnapshotDiff:
        d = SnapshotDiff()
        d.changed_fields["dosed"] = ("may_change", "may_change")
        d.changed_fields["has_dosing"] = ("may_change", "may_change")
        d.added_doses = -1  # Sentinel: unknown how many doses added
        return d


class PickPdMappingAction(Action):
    """Toggle a random PK→PD variable mapping radio on the Map Variables tab.

    Discovers available PD mapping variables at execution time.
    """

    CATEGORY = "mappings"
    RESULT_EXPECTATION = ResultExpectation.SHOULD_CHANGE

    _key = "pick_pd_mapping"

    @property
    def key(self) -> str:
        return self._key

    def preconditions(self, snapshot: SimulationModelSnapshot) -> bool:
        return (
            snapshot.has_model
            and bool(snapshot.pk_model_id)
            and bool(snapshot.pd_model_id)
        )

    async def execute(self, page: Page, snapshot: SimulationModelSnapshot) -> None:
        await navigate_to_model_subtab(page, "Map Variables")
        names = await get_checkbox_labels(page, "checkbox-map-to-pd-")
        if not names:
            return
        chosen = random.choice(names)
        logger.info("pick_pd_mapping: chose %s", chosen)
        await toggle_checkbox(page, f"checkbox-map-to-pd-{chosen}")

    def expected_diff(self, before: SimulationModelSnapshot) -> SnapshotDiff:
        d = SnapshotDiff()
        d.mappings_changed = True
        return d
