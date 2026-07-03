"""Shared navigation helpers for Playwright actions."""

from playwright.async_api import Page


async def navigate_to_page(page: Page, tab_name: str) -> None:
    """Click the sidebar navigation tab by text content.

    Uses JS click to bypass MUI's collapsed-sidebar visibility issues.
    """
    await page.evaluate(
        """(name) => {
            const items = document.querySelectorAll('.MuiListItemButton-root');
            for (const el of items) {
                if (el.textContent && el.textContent.trim() === name) {
                    el.click();
                    return true;
                }
            }
            for (const el of items) {
                if (el.textContent && el.textContent.includes(name)) {
                    el.click();
                    return true;
                }
            }
            return false;
        }""",
        tab_name,
    )
    await page.wait_for_timeout(800)
    # Wait for page to settle after navigation
    try:
        await page.wait_for_load_state("networkidle", timeout=5000)
    except Exception:
        pass


async def navigate_to_subtab(page: Page, subtab_name: str) -> None:
    """Click a sub-tab button (MUI Tab) by text content."""
    await page.get_by_role("tab", name=subtab_name).click(force=True)
    await page.wait_for_timeout(500)


async def navigate_to_model_subtab(page: Page, subtab_name: str) -> None:
    """Navigate to Model page, then a sub-tab."""
    await navigate_to_page(page, "Model")
    await navigate_to_subtab(page, subtab_name)


async def fill_text_field(page: Page, selector: str, value: str) -> None:
    """Fill a text input and trigger blur to activate auto-save."""
    field = page.locator(selector)
    await field.click(force=True)
    await field.fill(value)
    await field.blur()
    await page.wait_for_timeout(300)


async def toggle_checkbox(page: Page, data_cy: str) -> None:
    """Click a checkbox by data-cy attribute."""
    await page.locator(f'[data-cy="{data_cy}"]').click(force=True)
    await page.wait_for_timeout(500)


async def select_dropdown_option(page: Page, select_name: str, option_label: str) -> None:
    """Open a SelectField dropdown and pick an option by label."""
    await page.locator(f'[data-cy="select-{select_name}"]').click(force=True)
    await page.wait_for_timeout(300)
    # Try exact data-cy match first, fall back to partial text match
    exact = page.locator(f'[data-cy="select-option-{select_name}-{option_label}"]')
    if exact.count() > 0:
        await exact.click(force=True)
    else:
        await page.get_by_text(option_label, exact=False).first.click(
            force=True, timeout=5000
        )
    await page.wait_for_timeout(500)


async def click_data_cy(page: Page, data_cy: str) -> None:
    """Click an element by data-cy attribute."""
    await page.locator(f'[data-cy="{data_cy}"]').click(force=True)
    await page.wait_for_timeout(500)
