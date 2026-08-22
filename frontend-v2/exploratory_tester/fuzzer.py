"""Main fuzzing loop: explore → execute → check → repeat."""

from __future__ import annotations

import json
import logging
from dataclasses import dataclass, field as dc_field, asdict
from pathlib import Path
from typing import Callable

from playwright.async_api import Page

from .snapshot import snapshot_from_page, diff_snapshots
from .explorer import CoverageGuidedExplorer
from .checker import check_action, CheckResult

logger = logging.getLogger(__name__)


@dataclass
class FuzzerReport:
    """Aggregate results from a fuzzing run."""

    total_steps: int = 0
    passed: int = 0
    failed: int = 0
    findings: list[dict] = dc_field(default_factory=list)
    coverage: dict = dc_field(default_factory=dict)
    elapsed_seconds: float = 0.0

    @property
    def success_rate(self) -> float:
        if self.total_steps == 0:
            return 0.0
        return self.passed / self.total_steps


async def run_fuzzer(
    page: Page,
    max_steps: int = 200,
    stop_on_first_failure: bool = False,
    on_step: Callable[[int, CheckResult | None], None] | None = None,
) -> FuzzerReport:
    """Run the exploratory fuzzer.

    Args:
        page: Logged-in Playwright page.
        max_steps: Maximum number of exploration steps.
        stop_on_first_failure: Stop after the first anomaly.
        on_step: Optional callback invoked after each step, receives
                 (step_number, check_result_or_none).

    Returns:
        FuzzerReport with findings and coverage stats.
    """
    import time

    start_time = time.time()
    report = FuzzerReport()

    snapshot = await snapshot_from_page(page)
    if snapshot._error:
        logger.error("Initial snapshot failed: %s", snapshot._error)
        return report

    explorer = CoverageGuidedExplorer()

    # Auto-accept any native confirm/alert dialogs (e.g. "Delete linked
    # protocols and dosing variables?")
    page.on("dialog", lambda dialog: dialog.accept())
    logger.info(
        "Starting fuzzer: model=%s, params=%d, plots=%d, sliders=%d, sim=%s",
        snapshot.model_id,
        len(snapshot.parameters),
        len(snapshot.plots),
        len(snapshot.sliders),
        "yes" if snapshot.sim_results else "no",
    )

    for step in range(max_steps):
        action = explorer.pick_next(snapshot)
        if action is None:
            logger.info("No available actions at step %d; stopping.", step)
            break

        logger.info("Step %d: %s", step, action.key)

        try:
            await action.execute(page, snapshot)
        except Exception as exc:
            logger.error(
                "Execution error at step %d (%s): %s", step, action.key, exc
            )
            # Capture partial state changes even on failure
            try:
                new_snapshot = await snapshot_from_page(page)
            except Exception:
                new_snapshot = snapshot
            result = CheckResult(
                action_key=action.key,
                step=step,
                before=snapshot,
                after=new_snapshot,
                expected=action.expected_diff(snapshot),
                actual=diff_snapshots(snapshot, new_snapshot),
                passed=False,
            )
            result.ui_errors.append(f"Execution error: {exc}")
            report.findings.append(_check_result_to_dict(result))
            report.total_steps += 1
            report.failed += 1
            explorer.record(
                snapshot.hash, action.key, new_snapshot.hash,
            )
            if stop_on_first_failure:
                break
            snapshot = new_snapshot
            continue

        # Wait for network to settle (ignore timeout)
        try:
            await page.wait_for_load_state("networkidle", timeout=10000)
        except Exception:
            pass
        # Extra wait for Redux cache invalidation + re-fetch to complete
        await page.wait_for_timeout(1500)

        new_snapshot = await snapshot_from_page(page)

        result = await check_action(page, action, snapshot, new_snapshot, step)
        report.total_steps += 1

        if result.passed:
            report.passed += 1
        else:
            report.failed += 1
            report.findings.append(_check_result_to_dict(result))

        if on_step:
            on_step(step, result)

        explorer.record(snapshot.hash, action.key, new_snapshot.hash)
        snapshot = new_snapshot

        if not result.passed and stop_on_first_failure:
            break

    report.elapsed_seconds = time.time() - start_time
    report.coverage = explorer.coverage_report()

    logger.info(
        "Fuzzer complete: %d steps, %d passed, %d failed, %.1fs",
        report.total_steps,
        report.passed,
        report.failed,
        report.elapsed_seconds,
    )
    return report


def _check_result_to_dict(result: CheckResult) -> dict:
    """Convert a CheckResult to a JSON-serializable dict."""
    d = {
        "step": result.step,
        "action": result.action_key,
        "passed": result.passed,
        "unexpected_changes": result.unexpected_changes,
        "missing_changes": result.missing_changes,
        "ui_errors": result.ui_errors,
        "sim_result_ok": result.sim_result_ok,
        "sim_result_detail": result.sim_result_detail,
    }
    return d


def save_report(report: FuzzerReport, path: str | Path) -> None:
    """Write the fuzzer report as JSON."""
    data = asdict(report)
    data["findings"] = report.findings
    Path(path).write_text(json.dumps(data, indent=2, default=str))
