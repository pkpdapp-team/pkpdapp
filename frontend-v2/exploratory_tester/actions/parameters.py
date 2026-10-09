"""Parameter editing actions."""

from __future__ import annotations

from playwright.async_api import Page

from ..snapshot import SimulationModelSnapshot, SnapshotDiff
from .base import Action, ResultExpectation
from .navigation import navigate_to_model_subtab


class SetParameterAction(Action):
    """Set a specific parameter (constant variable) to a discrete value.

    Value bucketing: default, default×0.5, default×1.5, lower_bound, upper_bound.
    """

    CATEGORY = "parameters"
    RESULT_EXPECTATION = ResultExpectation.SHOULD_CHANGE

    def __init__(self, qname: str, name: str, value: float) -> None:
        self._qname = qname
        self._name = name
        self._value = value
        self._key = f"set_parameter:{qname}:{value}"

    @property
    def key(self) -> str:
        return self._key

    def preconditions(self, snapshot: SimulationModelSnapshot) -> bool:
        if not snapshot.has_model:
            return False
        if not snapshot.pk_model_id:
            return False
        if not snapshot.has_dosing:
            return False
        if snapshot.pd_model_id and not snapshot.pd_mappings:
            return False
        param = snapshot.parameters.get(self._qname)
        if param is None:
            return False
        if param.default_value == self._value:
            return False
        return True

    async def execute(self, page: Page, snapshot: SimulationModelSnapshot) -> None:
        await navigate_to_model_subtab(page, "Parameters")

        # Locate the parameter row
        selector = f'[data-cy="parameter-{self._name}-value"] input'
        field = page.locator(selector)
        await field.click(force=True)
        await field.fill(str(self._value))
        await field.blur()

        # Wait for auto-save debounce
        await page.wait_for_timeout(800)

    def expected_diff(self, before: SimulationModelSnapshot) -> SnapshotDiff:
        d = SnapshotDiff()
        old_val = None
        if self._qname in before.parameters:
            old_val = before.parameters[self._qname].default_value
        d.changed_parameters[self._qname] = (old_val, self._value)
        return d
