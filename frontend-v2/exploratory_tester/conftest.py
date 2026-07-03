"""Pytest fixtures for the exploratory tester.

Usage:
    pytest exploratory_tester/ --base-url http://localhost:5173 \\
        --username demo --password 12345

Or with defaults from environment:
    PKPD_USERNAME=demo
    PKPD_PASSWORD=12345
"""

import os
from typing import AsyncIterator

import pytest
from playwright.async_api import Browser, BrowserContext, Page, async_playwright


def pytest_addoption(parser):
    parser.addoption(
        "--username",
        default=os.environ.get("PKPD_USERNAME", "fuzzer"),
        help="Login username",
    )
    parser.addoption(
        "--password",
        default=os.environ.get("PKPD_PASSWORD", "test1234"),
        help="Login password",
    )
    parser.addoption(
        "--max-steps",
        type=int,
        default=int(os.environ.get("PKPD_MAX_STEPS", "200")),
        help="Maximum exploration steps per test",
    )


@pytest.fixture(scope="function")
def credentials(request) -> tuple[str, str]:
    return (
        request.config.getoption("--username"),
        request.config.getoption("--password"),
    )


@pytest.fixture(scope="function")
def max_steps(request) -> int:
    return request.config.getoption("--max-steps")


@pytest.fixture(scope="function")
async def browser() -> AsyncIterator[Browser]:
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        yield browser
        await browser.close()


@pytest.fixture(scope="function")
async def context(browser: Browser) -> AsyncIterator[BrowserContext]:
    ctx = await browser.new_context(viewport={"width": 1440, "height": 900})
    yield ctx
    await ctx.close()


@pytest.fixture(scope="function")
async def page(
    context: BrowserContext,
    base_url: str,
    credentials: tuple[str, str],
) -> AsyncIterator[Page]:
    """Return a logged-in Playwright page."""
    username, password = credentials
    page = await context.new_page()

    # Clear persisted Redux state from prior sessions
    await page.goto(base_url, wait_until="domcontentloaded")
    await page.evaluate("() => { sessionStorage.clear(); localStorage.clear(); }")

    # Navigate fresh — the app renders a login form on / when not authenticated
    await page.goto(base_url, wait_until="domcontentloaded")
    await page.wait_for_timeout(1000)

    # Check if the login form is visible (username field present)
    try:
        login_visible = await page.locator("input[name='username']").is_visible()
    except Exception:
        login_visible = False

    if login_visible:
        await page.fill("input[name='username']", username)
        await page.fill("input[name='password']", password)
        # Submit via the "Login" button (the form button text is "Login")
        await page.get_by_role("button", name="Login").click()

        # Wait for the login form to disappear (successful login)
        await page.locator("input[name='username']").wait_for(
            state="hidden", timeout=15000
        )

    # Verify the store is available
    has_store = await page.evaluate("() => !!window.__pkpd_store__")
    if not has_store:
        raise RuntimeError(
            "window.__pkpd_store__ not found. "
            "Ensure the frontend is running in dev mode "
            "(import.meta.env.DEV === true)."
        )

    # Wait for initial API data to load
    await page.wait_for_timeout(2000)

    yield page
    await page.close()
