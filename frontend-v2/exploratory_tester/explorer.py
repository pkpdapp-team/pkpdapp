"""Coverage-guided action selector.

Maintains a set of visited (snapshot_hash, action_key) pairs and
prioritizes actions that explore new edges in the state graph.
"""

from __future__ import annotations

import logging
import random

from .actions.base import Action
from .snapshot import SimulationModelSnapshot
from .actions.registry import generate_all_actions

logger = logging.getLogger(__name__)


class CoverageGuidedExplorer:
    """Selects next actions based on coverage of (state, action) edges.

    - All available actions (preconditions pass) are candidates.
    - Unvisited (state, action) edges are preferred.
    - Ties broken randomly.
    """

    def __init__(self, seed: int | None = None) -> None:
        self._visited: set[tuple[str, str]] = set()  # (snapshot_hash, action_key)
        self._state_graph: dict[str, dict[str, str]] = (
            {}
        )  # hash -> {action_key -> next_hash}
        self._rng = random.Random(seed)

    @property
    def visited_count(self) -> int:
        return len(self._visited)

    def pick_next(
        self, snapshot: SimulationModelSnapshot
    ) -> Action | None:
        """Select the next action to explore.

        Returns None if no actions are available (nothing viable).
        """
        all_actions = generate_all_actions(snapshot)
        available = [a for a in all_actions if a.preconditions(snapshot)]

        if not available:
            return None

        snapshot_hash = snapshot.hash

        # Split into unvisited vs visited
        unvisited = [
            a
            for a in available
            if (snapshot_hash, a.key) not in self._visited
        ]
        visited = [
            a
            for a in available
            if (snapshot_hash, a.key) in self._visited
        ]

        if unvisited:
            chosen = self._rng.choice(unvisited)
            logger.debug(
                "Picked unvisited action %s (also %d visited, %d unvisited)",
                chosen.key,
                len(visited),
                len(unvisited),
            )
        else:
            logger.debug(
                "All %d actions visited from this state; picking random",
                len(available),
            )
            chosen = self._rng.choice(available)

        return chosen

    def record(
        self,
        before_hash: str,
        action_key: str,
        after_hash: str,
    ) -> None:
        """Record a state transition."""
        self._visited.add((str(before_hash), action_key))
        self._state_graph.setdefault(str(before_hash), {})[action_key] = str(
            after_hash
        )

    def coverage_report(self) -> dict:
        """Return coverage statistics."""
        unique_states = len(self._state_graph)
        total_edges = sum(len(edges) for edges in self._state_graph.values())
        return {
            "visited_edges": self.visited_count,
            "unique_states": unique_states,
            "total_edges_in_graph": total_edges,
        }
