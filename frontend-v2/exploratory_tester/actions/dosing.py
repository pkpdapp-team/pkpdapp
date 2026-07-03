"""Dose configuration actions."""

from __future__ import annotations

from playwright.async_api import Page

from ..snapshot import SimulationModelSnapshot, DoseState, SnapshotDiff
from .base import Action, ResultExpectation
from .navigation import navigate_to_page


class SetDoseFieldAction(Action):
    """Set a single field on a dose (amount, duration, repeats, etc.).

    Value bucketing: default, default×0.5, default×1.5, bounds.
    For discrete fields (repeats), use sensible integers.
    """

    CATEGORY = "dosing"
    RESULT_EXPECTATION = ResultExpectation.SHOULD_CHANGE

    DOSE_FIELDS = ["start_time", "amount", "duration", "repeats", "repeat_interval"]

    def __init__(self, dose_index: int, field_name: str, value: float) -> None:
        self._dose_index = dose_index
        self._field_name = field_name
        self._value = value
        self._key = f"set_dose:{dose_index}:{field_name}:{value}"

    @property
    def key(self) -> str:
        return self._key

    def preconditions(self, snapshot: SimulationModelSnapshot) -> bool:
        if self._dose_index >= len(snapshot.doses):
            return False
        dose = snapshot.doses[self._dose_index]
        current = getattr(dose, self._field_name, None)
        if current is None:
            return False
        return float(current) != float(self._value)

    async def execute(self, page: Page, snapshot: SimulationModelSnapshot) -> None:
        await navigate_to_page(page, "Trial Design")

        name_attr = f"doses.{self._dose_index}.{self._field_name}"
        field = page.locator(f'input[name="{name_attr}"]')
        await field.click(force=True)
        await field.fill(str(self._value))
        await field.blur()

        await page.wait_for_timeout(800)

    def expected_diff(self, before: SimulationModelSnapshot) -> SnapshotDiff:
        d = SnapshotDiff()
        old_val = None
        if self._dose_index < len(before.doses):
            old_val = getattr(before.doses[self._dose_index], self._field_name, None)
        d.changed_fields[f"doses[{self._dose_index}].{self._field_name}"] = (
            old_val,
            self._value,
        )
        return d
