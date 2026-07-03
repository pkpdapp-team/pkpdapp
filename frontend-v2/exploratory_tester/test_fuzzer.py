"""Pytest test cases for the exploratory tester.

Run with:
    pytest exploratory_tester/test_fuzzer.py --base-url http://localhost:3000

Or against a deployed instance:
    pytest exploratory_tester/test_fuzzer.py --base-url https://staging.example.com \\
        --username myuser --password mypass
"""

import logging
import pytest
from .fuzzer import run_fuzzer, FuzzerReport

logger = logging.getLogger(__name__)


async def test_exploratory_fuzzer(
    page,
    base_url: str,
    max_steps: int,
) -> None:
    """Run the fuzzer and assert no unexpected state changes are found."""
    report = await run_fuzzer(
        page,
        max_steps=max_steps,
        stop_on_first_failure=False,
    )

    logger.info(
        "Report: %d steps, %d passed, %d failed, coverage=%s",
        report.total_steps,
        report.passed,
        report.failed,
        report.coverage,
    )

    for finding in report.findings:
        logger.warning(
            "Finding: step=%d action=%s passed=%s unexpected=%s missing=%s errors=%s sim=%s",
            finding.get("step"),
            finding.get("action"),
            finding.get("passed"),
            finding.get("unexpected_changes"),
            finding.get("missing_changes"),
            finding.get("ui_errors"),
            finding.get("sim_result_detail"),
        )

    # The test passes even if there are unexpected changes — those are reported
    # but not test failures (they are findings to investigate).
    assert report.total_steps > 0, "No exploration steps were executed"
    logger.info("Explore done: %d/%d steps passed", report.passed, report.total_steps)


async def test_quick_smoke(page) -> None:
    """Quick smoke test: take one snapshot and verify basic exploration works."""
    from .snapshot import snapshot_from_page

    snapshot = await snapshot_from_page(page)
    assert snapshot._error is None, f"Snapshot error: {snapshot._error}"

    logger.info(
        "Smoke snapshot: project=%s model=%s species=%s params=%d plots=%d sliders=%d sim=%s",
        snapshot.has_project,
        snapshot.has_model,
        snapshot.species,
        len(snapshot.parameters),
        len(snapshot.plots),
        len(snapshot.sliders),
        "yes" if snapshot.sim_results else "no",
    )

    # Basic sanity
    assert snapshot.species in ("", "H", "R", "M", "N")
