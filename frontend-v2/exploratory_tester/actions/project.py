"""Project-level actions: create project, set species."""

from __future__ import annotations

import json
from playwright.async_api import Page

from ..snapshot import SimulationModelSnapshot, SnapshotDiff
from .base import Action, ResultExpectation
from .navigation import navigate_to_page, select_dropdown_option


class CreateProjectAction(Action):
    CATEGORY = "project"
    RESULT_EXPECTATION = ResultExpectation.IRRELEVANT

    def __init__(self, compound_type: str = "Small Molecule") -> None:
        self._compound_type = compound_type
        self._key = f"create_project:{compound_type.replace(' ', '')}"

    @property
    def key(self) -> str:
        return self._key

    def preconditions(self, snapshot: SimulationModelSnapshot) -> bool:
        return not snapshot.has_project

    async def execute(self, page: Page, snapshot: SimulationModelSnapshot) -> None:
        await navigate_to_page(page, "Projects")
        await page.wait_for_timeout(500)

        # JS click to bypass MUI visibility issues
        await page.evaluate(
            """() => {
                const btn = document.querySelector('[data-cy="create-project"]');
                if (btn) btn.click();
            }"""
        )
        await page.wait_for_timeout(800)

        option_selector = f'[data-cy="create-project-option-{self._compound_type}"]'
        await page.evaluate(
            f"""(sel) => {{
                const opt = document.querySelector(sel);
                if (opt) {{
                    opt.click();
                    return 'clicked';
                }}
                const text = {json.dumps(self._compound_type)};
                const opts = document.querySelectorAll(
                    '[data-cy^="create-project-option"]'
                );
                for (const o of opts) {{
                    if (o.textContent && o.textContent.includes(text)) {{
                        o.click();
                        return 'clicked-fallback';
                    }}
                }}
                return 'no-option';
            }}""",
            option_selector,
        )
        # Wait for project creation API call and list refresh
        await page.wait_for_timeout(2000)

        # Select the newly created project (click the first project radio)
        await page.evaluate(
            """() => {
                const radios = document.querySelectorAll(
                    '[data-cy^="project-"] [type="radio"]'
                );
                if (radios.length > 0) {
                    radios[0].click();
                    return 'selected';
                }
                const projects = document.querySelectorAll('[data-cy^="project-"]');
                if (projects.length > 0) {
                    projects[0].click();
                    return 'clicked-project-card';
                }
                return 'no-project-found';
            }"""
        )
        await page.wait_for_timeout(1000)

    def expected_diff(self, before: SimulationModelSnapshot) -> SnapshotDiff:
        d = SnapshotDiff()
        d.changed_fields["has_project"] = (False, True)
        return d


class SetSpeciesAction(Action):
    CATEGORY = "project"
    RESULT_EXPECTATION = ResultExpectation.SHOULD_CHANGE

    SPECIES_LABELS = {"H": "Human", "R": "Rat", "M": "Mouse", "N": "Monkey"}

    def __init__(self, species: str) -> None:
        self._species = species
        self._label = self.SPECIES_LABELS.get(species, species)
        self._key = f"set_species:{species}"

    @property
    def key(self) -> str:
        return self._key

    def preconditions(self, snapshot: SimulationModelSnapshot) -> bool:
        return snapshot.has_project and snapshot.species != self._species

    async def execute(self, page: Page, snapshot: SimulationModelSnapshot) -> None:
        await navigate_to_page(page, "Projects")
        await select_dropdown_option(page, "project.species", self._label)

    def expected_diff(self, before: SimulationModelSnapshot) -> SnapshotDiff:
        d = SnapshotDiff()
        d.changed_fields["species"] = (before.species, self._species)
        return d
