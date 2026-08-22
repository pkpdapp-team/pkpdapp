"""Model configuration actions: select PK/PD models, toggle flags."""

from __future__ import annotations

import logging
import random

from playwright.async_api import Page

from ..snapshot import SimulationModelSnapshot, SnapshotDiff
from .base import Action, ResultExpectation
from .navigation import (
    navigate_to_model_subtab,
    select_dropdown_option,
    toggle_checkbox,
)

logger = logging.getLogger(__name__)


class PickModelAction(Action):
    """Pick a model from a dropdown on the PK/PD Model tab.

    Discovers available options at execution time so the fuzzer always
    sees the current state (which depends on species, prior selections, etc.).
    """

    CATEGORY = "model_config"
    RESULT_EXPECTATION = ResultExpectation.SHOULD_CHANGE

    FIELD_TO_SELECT = {
        "pk_model": "pk_model",
        "pk_model2": "pk_model2",
        "pk_effect_model": "pk_effect_model",
        "pd_model": "pd_model",
        "pd_model2": "pd_model2",
    }

    FIELD_TO_SNAPSHOT = {
        "pk_model": "pk_model_id",
        "pk_model2": "pk_model_id2",
        "pk_effect_model": "pk_effect_model_id",
        "pd_model": "pd_model_id",
        "pd_model2": "pd_model_id2",
    }

    def __init__(
        self,
        field_name: str,
        requires_pk: bool = False,
        requires_pd: bool = False,
    ) -> None:
        self._field_name = field_name
        self._requires_pk = requires_pk
        self._requires_pd = requires_pd
        self._key = f"pick_{field_name}"

    @property
    def key(self) -> str:
        return self._key

    def preconditions(self, snapshot: SimulationModelSnapshot) -> bool:
        if not snapshot.has_model:
            return False
        if self._requires_pk and not snapshot.pk_model_id:
            return False
        if self._requires_pd and not snapshot.pd_model_id:
            return False
        return True

    async def execute(self, page: Page, snapshot: SimulationModelSnapshot) -> None:
        await navigate_to_model_subtab(page, "PK/PD Model")
        select_name = self.FIELD_TO_SELECT[self._field_name]
        # Open dropdown and pick a random option by index
        await page.locator(
            f'[data-cy="select-{select_name}"]'
        ).click(force=True)
        await page.wait_for_timeout(500)
        options = page.locator('li[role="option"]')
        count = await options.count()
        if count == 0:
            await page.keyboard.press("Escape")
            return
        # Pick a random non-"None" option
        indices = []
        for i in range(count):
            text = await options.nth(i).text_content()
            if text and text.strip() and text.strip() != "None":
                indices.append(i)
        if not indices:
            await page.keyboard.press("Escape")
            return
        chosen_idx = random.choice(indices)
        chosen_text = await options.nth(chosen_idx).text_content()
        logger.info("pick_%s: chose %s", self._field_name, chosen_text)
        await options.nth(chosen_idx).click(force=True)
        await page.wait_for_timeout(500)

    def expected_diff(self, before: SimulationModelSnapshot) -> SnapshotDiff:
        d = SnapshotDiff()
        field = self.FIELD_TO_SNAPSHOT[self._field_name]
        d.changed_fields[field] = ("changed", "changed")
        d.changed_fields["parameters"] = ("may_change", "may_change")
        # Model pick may cascade to these fields
        d.changed_fields["pk_effect_model_id"] = ("may_change", "may_change")
        d.changed_fields["number_of_effect_compartments"] = (
            "may_change", "may_change",
        )
        d.changed_fields["pd_model_id"] = ("may_change", "may_change")
        d.changed_fields["pd_model_id2"] = ("may_change", "may_change")
        d.changed_fields["pk_model_id2"] = ("may_change", "may_change")
        return d


class ToggleModelFlagAction(Action):
    """Toggle a boolean flag (has_lag, has_bioavailability, etc.)."""

    CATEGORY = "model_config"
    RESULT_EXPECTATION = ResultExpectation.SHOULD_CHANGE

    FLAG_SELECTORS = {
        "has_lag": "checkbox-has_lag",
        "has_anti_drug_antibodies": "checkbox-has_anti_drug_antibodies",
        "has_bioavailability": "checkbox-has_bioavailability",
    }

    def __init__(self, flag_name: str) -> None:
        self._flag_name = flag_name
        self._key = f"toggle:{flag_name}"

    @property
    def key(self) -> str:
        return self._key

    FLAG_REQUIRES_PK2 = {"has_lag", "has_bioavailability"}

    def preconditions(self, snapshot: SimulationModelSnapshot) -> bool:
        if not snapshot.has_model:
            return False
        if not snapshot.pk_model_id:
            return False
        if (
            self._flag_name in self.FLAG_REQUIRES_PK2
            and not snapshot.pk_model_id2
        ):
            return False
        return True

    async def execute(self, page: Page, snapshot: SimulationModelSnapshot) -> None:
        await navigate_to_model_subtab(page, "PK/PD Model")
        selector = self.FLAG_SELECTORS.get(
            self._flag_name, f"checkbox-{self._flag_name}"
        )
        await toggle_checkbox(page, selector)

    def expected_diff(self, before: SimulationModelSnapshot) -> SnapshotDiff:
        d = SnapshotDiff()
        old = getattr(before, self._flag_name, False)
        d.changed_fields[self._flag_name] = (old, not old)
        d.changed_fields["parameters"] = ("may_change", "may_change")
        return d


class SetEffectCompartmentsAction(Action):
    """Change number_of_effect_compartments on the PK/PD Model tab."""

    CATEGORY = "model_config"
    RESULT_EXPECTATION = ResultExpectation.SHOULD_CHANGE

    def __init__(self, value: int) -> None:
        self._value = value
        self._key = f"set_effect_compartments:{value}"

    @property
    def key(self) -> str:
        return self._key

    def preconditions(self, snapshot: SimulationModelSnapshot) -> bool:
        if not snapshot.has_model:
            return False
        if not snapshot.pk_model_id:
            return False
        return snapshot.number_of_effect_compartments != self._value

    async def execute(self, page: Page, snapshot: SimulationModelSnapshot) -> None:
        await navigate_to_model_subtab(page, "PK/PD Model")
        await select_dropdown_option(
            page, "number_of_effect_compartments", str(self._value)
        )

    def expected_diff(self, before: SimulationModelSnapshot) -> SnapshotDiff:
        d = SnapshotDiff()
        d.changed_fields["number_of_effect_compartments"] = (
            "may_change", "may_change",
        )
        d.changed_fields["parameters"] = ("may_change", "may_change")
        return d


class ResetToSpeciesDefaultsAction(Action):
    """Reset all parameters to species-specific defaults."""

    CATEGORY = "model_config"
    RESULT_EXPECTATION = ResultExpectation.SHOULD_CHANGE

    _key = "reset_to_species_defaults"

    @property
    def key(self) -> str:
        return self._key

    def preconditions(self, snapshot: SimulationModelSnapshot) -> bool:
        if not snapshot.has_model or not snapshot.pk_model_id:
            return False
        if not snapshot.has_dosing:
            return False
        if snapshot.pd_model_id and not snapshot.pd_mappings:
            return False
        return True

    async def execute(self, page: Page, snapshot: SimulationModelSnapshot) -> None:
        await navigate_to_model_subtab(page, "Parameters")
        button = page.get_by_role("button", name="Reset to Species Defaults")
        await button.click(force=True)
        await page.wait_for_timeout(1000)

    def expected_diff(self, before: SimulationModelSnapshot) -> SnapshotDiff:
        d = SnapshotDiff()
        d.changed_fields["parameters"] = ("reset_to_defaults", "reset_to_defaults")
        return d
