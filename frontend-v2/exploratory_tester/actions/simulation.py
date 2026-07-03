"""Simulation page actions: plots, sliders."""

from __future__ import annotations

from playwright.async_api import Page

from ..snapshot import SimulationModelSnapshot, SnapshotDiff
from .base import Action, ResultExpectation
from .navigation import navigate_to_page


class AddPlotAction(Action):
    """Add a simulation plot for a given output variable."""

    CATEGORY = "simulation"
    RESULT_EXPECTATION = ResultExpectation.SHOULD_NOT_CHANGE

    def __init__(self, variable_name: str) -> None:
        self._var_name = variable_name
        self._key = f"add_plot:{variable_name}"

    @property
    def key(self) -> str:
        return self._key

    def preconditions(self, snapshot: SimulationModelSnapshot) -> bool:
        return snapshot.has_model and snapshot.has_simulation

    async def execute(self, page: Page, snapshot: SimulationModelSnapshot) -> None:
        await navigate_to_page(page, "Simulations")
        await page.locator('[data-cy="add-plot"]').click(force=True)
        await page.wait_for_timeout(400)
        await page.locator(f'[data-cy^="add-plot-option-{self._var_name}"]').click(
            force=True
        )
        await page.wait_for_timeout(500)

    def expected_diff(self, before: SimulationModelSnapshot) -> SnapshotDiff:
        d = SnapshotDiff()
        d.added_plots = 1
        return d


class RemovePlotAction(Action):
    """Remove a simulation plot at the given index."""

    CATEGORY = "simulation"
    RESULT_EXPECTATION = ResultExpectation.SHOULD_NOT_CHANGE

    def __init__(self, index: int) -> None:
        self._index = index
        self._key = f"remove_plot:{index}"

    @property
    def key(self) -> str:
        return self._key

    def preconditions(self, snapshot: SimulationModelSnapshot) -> bool:
        return self._index < len(snapshot.plots)

    async def execute(self, page: Page, snapshot: SimulationModelSnapshot) -> None:
        await navigate_to_page(page, "Simulations")

        delete_btn = page.locator(
            f'[data-cy="plot-{self._index}"] [data-cy="delete-plot"], '
            f'[data-cy^="delete-plot-{self._index}"]'
        ).first
        # Fallback: find the MUI delete icon button in the plot card
        if not await delete_btn.is_visible():
            delete_btn = page.locator('[data-cy^="delete-plot"]').nth(self._index)
        else:
            delete_btn = page.locator('[data-cy^="delete-plot"]').nth(self._index)

        await delete_btn.click(force=True)
        await page.wait_for_timeout(500)

    def expected_diff(self, before: SimulationModelSnapshot) -> SnapshotDiff:
        d = SnapshotDiff()
        d.removed_plots = 1
        return d


class AddSliderAction(Action):
    """Add a parameter slider to the simulation page."""

    CATEGORY = "simulation"
    RESULT_EXPECTATION = ResultExpectation.SHOULD_NOT_CHANGE

    def __init__(self, variable_name: str) -> None:
        self._var_name = variable_name
        self._key = f"add_slider:{variable_name}"

    @property
    def key(self) -> str:
        return self._key

    def preconditions(self, snapshot: SimulationModelSnapshot) -> bool:
        return snapshot.has_model and snapshot.has_simulation

    async def execute(self, page: Page, snapshot: SimulationModelSnapshot) -> None:
        await navigate_to_page(page, "Simulations")

        add_btn = page.locator('[data-cy="add-parameter-slider"]')
        await add_btn.click(force=True)
        await page.wait_for_timeout(400)

        option = page.locator(
            f'[data-cy="add-parameter-slider-option-{self._var_name}"]'
        )
        await option.click(force=True)
        await page.wait_for_timeout(500)

    def expected_diff(self, before: SimulationModelSnapshot) -> SnapshotDiff:
        d = SnapshotDiff()
        d.added_sliders = 1
        return d


class RemoveSliderAction(Action):
    """Remove a slider at the given index."""

    CATEGORY = "simulation"
    RESULT_EXPECTATION = ResultExpectation.SHOULD_NOT_CHANGE

    def __init__(self, index: int) -> None:
        self._index = index
        self._key = f"remove_slider:{index}"

    @property
    def key(self) -> str:
        return self._key

    def preconditions(self, snapshot: SimulationModelSnapshot) -> bool:
        return self._index < len(snapshot.sliders)

    async def execute(self, page: Page, snapshot: SimulationModelSnapshot) -> None:
        await navigate_to_page(page, "Simulations")
        remove_btn = page.locator('[data-cy^="delete-slider"]').nth(self._index)
        await remove_btn.click(force=True)
        await page.wait_for_timeout(500)

    def expected_diff(self, before: SimulationModelSnapshot) -> SnapshotDiff:
        d = SnapshotDiff()
        d.removed_sliders = 1
        return d


class SetSliderValueAction(Action):
    """Move a slider to a new value.

    This operates on the MUI Slider component on the Simulations page.
    """

    CATEGORY = "simulation"
    RESULT_EXPECTATION = ResultExpectation.SHOULD_CHANGE

    def __init__(self, variable_name: str, value: float) -> None:
        self._var_name = variable_name
        self._value = value
        self._key = f"set_slider:{variable_name}:{value}"

    @property
    def key(self) -> str:
        return self._key

    def preconditions(self, snapshot: SimulationModelSnapshot) -> bool:
        if not snapshot.sliders:
            return False
        for sl in snapshot.sliders:
            for param in snapshot.parameters.values():
                if param.id == sl.variable_id and param.name == self._var_name:
                    return sl.current_value != self._value
        return False

    async def execute(self, page: Page, snapshot: SimulationModelSnapshot) -> None:
        await navigate_to_page(page, "Simulations")

        slider = page.locator(f'[data-cy="parameter-slider-{self._var_name}"] input')
        await slider.click(force=True)
        await slider.fill(str(self._value))
        await slider.blur()

        await page.wait_for_timeout(500)

    def expected_diff(self, before: SimulationModelSnapshot) -> SnapshotDiff:
        d = SnapshotDiff()
        for i, sl in enumerate(before.sliders):
            # Find the right slider and record its value change
            param = None
            for p in before.parameters.values():
                if p.id == sl.variable_id:
                    param = p
                    break
            if param and param.name == self._var_name:
                d.changed_fields[f"sliders[{i}].current_value"] = (
                    sl.current_value,
                    self._value,
                )
                break
        return d


class SetTimeMaxAction(Action):
    """Set the simulation time max."""

    CATEGORY = "simulation"
    RESULT_EXPECTATION = ResultExpectation.SHOULD_CHANGE

    def __init__(self, value: float) -> None:
        self._value = value
        self._key = f"set_time_max:{value}"

    @property
    def key(self) -> str:
        return self._key

    def preconditions(self, snapshot: SimulationModelSnapshot) -> bool:
        return snapshot.has_simulation and snapshot.time_max != self._value

    async def execute(self, page: Page, snapshot: SimulationModelSnapshot) -> None:
        await navigate_to_page(page, "Simulations")
        field = page.locator('[data-cy="time-max"] input')
        await field.click(force=True)
        await field.fill(str(self._value))
        await field.blur()
        await page.wait_for_timeout(800)

    def expected_diff(self, before: SimulationModelSnapshot) -> SnapshotDiff:
        d = SnapshotDiff()
        d.changed_fields["time_max"] = (before.time_max, self._value)
        return d
