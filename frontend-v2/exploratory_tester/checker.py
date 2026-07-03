"""State verification — checks that actions produce expected diffs."""

from __future__ import annotations

import logging
from dataclasses import dataclass, field

from .snapshot import (
    SimulationModelSnapshot,
    SnapshotDiff,
    _sim_results_equal,
    diff_snapshots,
)
from .actions.base import Action, ResultExpectation

logger = logging.getLogger(__name__)


@dataclass
class CheckResult:
    """Outcome of checking an action's effect on state."""

    action_key: str
    step: int

    before: SimulationModelSnapshot
    after: SimulationModelSnapshot
    expected: SnapshotDiff
    actual: SnapshotDiff

    unexpected_changes: list[str] = field(default_factory=list)
    missing_changes: list[str] = field(default_factory=list)
    ui_errors: list[str] = field(default_factory=list)

    sim_result_ok: bool = True
    sim_result_detail: str = ""

    passed: bool = True

    @property
    def summary(self) -> str:
        if self.passed:
            return f"[PASS] {self.action_key}"
        lines = [f"[FAIL] {self.action_key}"]
        for c in self.unexpected_changes:
            lines.append(f"  UNEXPECTED: {c}")
        for c in self.missing_changes:
            lines.append(f"  MISSING: {c}")
        for e in self.ui_errors:
            lines.append(f"  ERROR: {e}")
        if not self.sim_result_ok:
            lines.append(f"  SIM_RESULT: {self.sim_result_detail}")
        return "\n".join(lines)


async def check_action(
    page,
    action: Action,
    before: SimulationModelSnapshot,
    after: SimulationModelSnapshot,
    step: int,
) -> CheckResult:
    """Compare snapshots and check simulation results.

    Returns a CheckResult with pass/fail status and details.
    """
    expected = action.expected_diff(before)
    actual = diff_snapshots(before, after)

    result = CheckResult(
        action_key=action.key,
        step=step,
        before=before,
        after=after,
        expected=expected,
        actual=actual,
    )

    # --- UI errors ---
    await _check_ui_errors(page, result)

    # --- Unexpected changes (things that changed but shouldn't have) ---
    _find_unexpected_changes(expected, actual, result)

    # --- Missing changes (things that should have changed but didn't) ---
    _find_missing_changes(expected, actual, result)

    # --- Simulation result validation ---
    await _check_sim_results(action, before, after, result)

    # --- Final pass/fail ---
    result.passed = (
        len(result.unexpected_changes) == 0
        and len(result.missing_changes) == 0
        and len(result.ui_errors) == 0
        and result.sim_result_ok
    )

    return result


async def _check_ui_errors(page, result: CheckResult) -> None:
    """Check for visible error snackbars."""
    try:
        errors = page.locator(".MuiAlert-standardError")
        count = await errors.count()
        for i in range(count):
            text = await errors.nth(i).text_content()
            if text:
                result.ui_errors.append(f"Snackbar error: {text.strip()}")
    except Exception:
        pass


def _find_unexpected_changes(
    expected: SnapshotDiff, actual: SnapshotDiff, result: CheckResult
) -> None:
    """Identify changes in `actual` that were not expected."""

    # Scalar fields
    for field_name, (old, new) in actual.changed_fields.items():
        if field_name not in expected.changed_fields:
            result.unexpected_changes.append(
                f"field '{field_name}' changed: {old} -> {new}"
            )

    # Parameters
    expected_param_changes = set(expected.changed_parameters.keys())
    expected_param_adds = set(expected.added_parameters)
    expected_param_rems = set(expected.removed_parameters)

    for qname, (old, new) in actual.changed_parameters.items():
        if qname not in expected_param_changes:
            result.unexpected_changes.append(
                f"parameter '{qname}' changed: {old} -> {new}"
            )

    for qname in actual.added_parameters:
        if qname not in expected_param_adds:
            result.unexpected_changes.append(f"parameter '{qname}' was added")

    for qname in actual.removed_parameters:
        if qname not in expected_param_rems:
            result.unexpected_changes.append(f"parameter '{qname}' was removed")

    # Plots, sliders, doses
    if actual.added_plots > expected.added_plots:
        result.unexpected_changes.append(
            f"added {actual.added_plots - expected.added_plots} unexpected plots"
        )
    if actual.removed_plots > expected.removed_plots:
        result.unexpected_changes.append(
            f"removed {actual.removed_plots - expected.removed_plots} unexpected plots"
        )
    if actual.added_sliders > expected.added_sliders:
        n = actual.added_sliders - expected.added_sliders
        result.unexpected_changes.append(
            f"added {n} unexpected sliders"
        )
    if actual.removed_sliders > expected.removed_sliders:
        n = actual.removed_sliders - expected.removed_sliders
        result.unexpected_changes.append(
            f"removed {n} unexpected sliders"
        )
    if actual.added_doses > expected.added_doses:
        result.unexpected_changes.append(
            f"added {actual.added_doses - expected.added_doses} unexpected doses"
        )
    if actual.removed_doses > expected.removed_doses:
        result.unexpected_changes.append(
            f"removed {actual.removed_doses - expected.removed_doses} unexpected doses"
        )

    if actual.mappings_changed and not expected.mappings_changed:
        result.unexpected_changes.append("mappings changed unexpectedly")
    if actual.derived_variables_changed and not expected.derived_variables_changed:
        result.unexpected_changes.append("derived variables changed unexpectedly")

    if actual.sim_results_changed and not expected.sim_results_changed:
        result.unexpected_changes.append("simulation results changed unexpectedly")
    if actual.sim_results_added and not expected.sim_results_added:
        result.unexpected_changes.append("simulation results appeared unexpectedly")
    if actual.sim_results_removed and not expected.sim_results_removed:
        result.unexpected_changes.append("simulation results disappeared unexpectedly")


def _find_missing_changes(
    expected: SnapshotDiff, actual: SnapshotDiff, result: CheckResult
) -> None:
    """Identify changes that were expected but didn't occur."""
    # Skip missing-checks for coarse-grained expected diffs
    # (e.g., "parameters: reset_to_defaults" is too broad to verify exactly)
    coarse_keys = {"parameters", "dosed", "reset_to_defaults"}
    for field_name in expected.changed_fields:
        if field_name in coarse_keys:
            continue
        if field_name not in actual.changed_fields:
            result.missing_changes.append(
                f"expected field '{field_name}' to change, but it didn't"
            )

    for qname in expected.added_parameters:
        if qname not in actual.added_parameters:
            result.missing_changes.append(
                f"expected parameter '{qname}' to be added, but it wasn't"
            )

    for qname in expected.removed_parameters:
        if qname not in actual.removed_parameters:
            result.missing_changes.append(
                f"expected parameter '{qname}' to be removed, but it wasn't"
            )


async def _check_sim_results(
    action: Action,
    before: SimulationModelSnapshot,
    after: SimulationModelSnapshot,
    result: CheckResult,
) -> None:
    """Validate simulation results against the action's expectation."""
    if action.RESULT_EXPECTATION == ResultExpectation.IRRELEVANT:
        return

    if action.RESULT_EXPECTATION == ResultExpectation.SHOULD_NOT_CHANGE:
        if before.sim_results is None and after.sim_results is None:
            return
        if before.sim_results is None:
            result.sim_result_detail = (
                "Expected no change but results appeared"
            )
            result.sim_result_ok = False
            return
        if after.sim_results is None:
            # Acceptable — results may not be available yet
            return

        # Strict equality check
        if not _results_identical(before.sim_results, after.sim_results):
            result.sim_result_detail = (
                "Simulation results changed when they should not have"
            )
            result.sim_result_ok = False

    elif action.RESULT_EXPECTATION == ResultExpectation.SHOULD_CHANGE:
        if before.sim_results is None or after.sim_results is None:
            return  # Can't compare

        if _results_identical(before.sim_results, after.sim_results):
            result.sim_result_detail = (
                "Simulation results did NOT change when they should have"
            )
            result.sim_result_ok = False


def _results_identical(a, b) -> bool:
    """Check if two SimulationResults are byte-identical."""
    return _sim_results_equal(a, b)
