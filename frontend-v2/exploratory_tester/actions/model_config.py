"""Model configuration actions: select PK/PD models, toggle flags."""

from __future__ import annotations

from playwright.async_api import Page

from ..snapshot import SimulationModelSnapshot, SnapshotDiff
from .base import Action, ResultExpectation
from .navigation import (
    navigate_to_model_subtab,
    select_dropdown_option,
    toggle_checkbox,
)


class SelectSubModelAction(Action):
    """Select a PK or PD sub-model from a dropdown on the PK/PD Model tab."""

    CATEGORY = "model_config"
    RESULT_EXPECTATION = ResultExpectation.SHOULD_CHANGE

    def __init__(self, field_name: str, model_name: str, label: str,
                 requires_pk: bool = False) -> None:
        self._field_name = field_name
        self._model_name = model_name
        self._label = label
        self._requires_pk = requires_pk
        self._key = f"select_{field_name}:{model_name}"

    @property
    def key(self) -> str:
        return self._key

    def preconditions(self, snapshot: SimulationModelSnapshot) -> bool:
        if not snapshot.has_model:
            return False
        if self._requires_pk and not snapshot.pk_model_id:
            return False
        return True

    async def execute(self, page: Page, snapshot: SimulationModelSnapshot) -> None:
        await navigate_to_model_subtab(page, "PK/PD Model")
        await select_dropdown_option(page, self._field_name, self._label)

    def expected_diff(self, before: SimulationModelSnapshot) -> SnapshotDiff:
        d = SnapshotDiff()
        d.changed_fields[self._field_name] = ("changed", "changed")
        d.changed_fields["parameters"] = ("may_change", "may_change")
        return d


class ToggleModelFlagAction(Action):
    """Toggle a boolean flag (has_lag, has_bioavailability, etc.)."""

    CATEGORY = "model_config"
    RESULT_EXPECTATION = ResultExpectation.SHOULD_CHANGE

    FLAG_SELECTORS = {
        "has_lag": "checkbox-has_lag",
        "has_anti_drug_antibodies": "checkbox-has_ada",
        "has_bioavailability": "checkbox-has_bioavailability",
    }

    def __init__(self, flag_name: str) -> None:
        self._flag_name = flag_name
        self._key = f"toggle:{flag_name}"

    @property
    def key(self) -> str:
        return self._key

    def preconditions(self, snapshot: SimulationModelSnapshot) -> bool:
        if not snapshot.has_model:
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
        return snapshot.number_of_effect_compartments != self._value

    async def execute(self, page: Page, snapshot: SimulationModelSnapshot) -> None:
        await navigate_to_model_subtab(page, "PK/PD Model")
        await select_dropdown_option(
            page, "number_of_effect_compartments", str(self._value)
        )

    def expected_diff(self, before: SimulationModelSnapshot) -> SnapshotDiff:
        d = SnapshotDiff()
        d.changed_fields["number_of_effect_compartments"] = (
            before.number_of_effect_compartments,
            self._value,
        )
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
        return snapshot.has_model

    async def execute(self, page: Page, snapshot: SimulationModelSnapshot) -> None:
        await navigate_to_model_subtab(page, "Parameters")
        button = page.get_by_role("button", name="Reset to Species Defaults")
        await button.click(force=True)
        await page.wait_for_timeout(1000)

    def expected_diff(self, before: SimulationModelSnapshot) -> SnapshotDiff:
        d = SnapshotDiff()
        d.changed_fields["parameters"] = ("reset_to_defaults", "reset_to_defaults")
        return d
