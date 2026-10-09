"""Shared navigation helpers for Playwright actions."""

from playwright.async_api import Page


async def navigate_to_page(page: Page, tab_name: str) -> None:
    """Click the sidebar navigation tab by text content.

    Uses JS click to bypass MUI's collapsed-sidebar visibility issues.
    Retries up to 3 times in case the sidebar hasn't rendered yet.
    """
    for _attempt in range(3):
        clicked = await page.evaluate(
            """(name) => {
                const items = document.querySelectorAll(
                    '.MuiListItemButton-root'
                );
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
        if clicked:
            break
        await page.wait_for_timeout(500)
    await page.wait_for_timeout(800)
    # Wait for page to settle after navigation
    try:
        await page.wait_for_load_state("networkidle", timeout=5000)
    except Exception:
        pass


async def navigate_to_subtab(page: Page, subtab_name: str) -> None:
    """Click a sub-tab button (MUI Tab) by text content."""
    tab = page.get_by_role("tab", name=subtab_name).first
    await tab.wait_for(state="visible", timeout=10000)
    await tab.click(force=True)
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


async def select_dropdown_option(
    page: Page, select_name: str, option_label: str
) -> None:
    """Open a SelectField dropdown and pick an option by label."""
    await page.locator(f'[data-cy="select-{select_name}"]').click(force=True)
    await page.wait_for_timeout(400)
    # Try exact data-cy match first
    exact = page.locator(f'[data-cy="select-option-{select_name}-{option_label}"]')
    if await exact.count() > 0:
        await exact.click(force=True)
        await page.wait_for_timeout(800)
        return
    # MUI renders MenuItems as <li role="option"> in a portal popover.
    # Wait for the menu to appear (MUI has entry animations).
    option = page.locator(
        f'li[role="option"]:has-text("{option_label}")'
    ).first
    await option.wait_for(state="visible", timeout=5000)
    await option.click(force=True)
    await page.wait_for_timeout(800)


async def click_data_cy(page: Page, data_cy: str) -> None:
    """Click an element by data-cy attribute."""
    await page.locator(f'[data-cy="{data_cy}"]').click(force=True)
    await page.wait_for_timeout(500)


async def get_dropdown_option_labels(
    page: Page, select_name: str
) -> list[str]:
    """Open a dropdown, read all option labels, then close it.

    Returns the list of option labels (excluding "None" entry).
    """
    await page.locator(f'[data-cy="select-{select_name}"]').click(force=True)
    await page.wait_for_timeout(500)
    options = page.locator('li[role="option"]')
    count = await options.count()
    labels: list[str] = []
    for i in range(count):
        text = await options.nth(i).text_content()
        if text and text.strip() and text.strip() != "None":
            labels.append(text.strip())
    # Close the dropdown by pressing Escape
    await page.keyboard.press("Escape")
    await page.wait_for_timeout(300)
    return labels


async def get_checkbox_labels(
    page: Page, data_cy_prefix: str,
) -> list[str]:
    """Find all checkboxes with a given data-cy prefix and return the suffix.

    For example, data_cy_prefix="checkbox-dosing-" returns ["Aa", "A1", ...].
    """
    elements = page.locator(f'[data-cy^="{data_cy_prefix}"]')
    count = await elements.count()
    labels: list[str] = []
    for i in range(count):
        cy = await elements.nth(i).get_attribute("data-cy")
        if cy and cy.startswith(data_cy_prefix):
            labels.append(cy[len(data_cy_prefix):])
    return labels
