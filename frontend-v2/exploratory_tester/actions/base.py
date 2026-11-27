"""Abstract base class for all exploratory actions."""

from __future__ import annotations

from abc import ABC, abstractmethod
from enum import Enum, auto

from playwright.async_api import Page

from ..snapshot import SimulationModelSnapshot, SnapshotDiff


class ResultExpectation(Enum):
    """What the checker should expect for simulation results after this action."""

    SHOULD_NOT_CHANGE = auto()   # Results should be byte-identical to before
    SHOULD_CHANGE = auto()       # Results should differ for some outputs
    IRRELEVANT = auto()          # No simulation data to compare (e.g. pre-model)


class Action(ABC):
    """A semantic operation on the simulation model state.

    Subclasses define:
    - key: unique identifier string (populated dynamically in __init_subclass__)
    - CATEGORY: grouping label for reporting
    - RESULT_EXPECTATION: what to expect for simulation results
    - preconditions(snapshot) -> bool
    - execute(page, snapshot) -> None
    - expected_diff(before) -> SnapshotDiff
    """

    CATEGORY: str = "unknown"
    RESULT_EXPECTATION: ResultExpectation = ResultExpectation.IRRELEVANT

    def __init__(self) -> None:
        pass  # key set by __init_subclass__ or subclass

    @property
    @abstractmethod
    def key(self) -> str:
        """Unique action identifier used for coverage tracking."""
        ...

    @abstractmethod
    def preconditions(self, snapshot: SimulationModelSnapshot) -> bool:
        """Return True if this action can be performed in the current state."""
        ...

    @abstractmethod
    async def execute(self, page: Page, snapshot: SimulationModelSnapshot) -> None:
        """Perform the action in the browser via Playwright.

        Navigates to the correct page/subtab implicitly; the caller does not
        need to know the current tab.
        """
        ...

    @abstractmethod
    def expected_diff(self, before: SimulationModelSnapshot) -> SnapshotDiff:
        """Return the SnapshotDiff this action expects to cause."""
        ...

    def __repr__(self) -> str:
        return f"{self.__class__.__name__}(key={self.key})"
