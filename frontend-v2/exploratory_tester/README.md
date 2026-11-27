# PKPDApp Exploratory Tester

Stateful Playwright-based fuzz tester that detects unexplained semantic UI state changes in the PKPDApp frontend.

Takes snapshots of the simulation model's domain state (Redux cache + DOM), generates actions with expected state diffs, executes them via Playwright, then verifies exactly the expected changes occurred and no others.

## Quick Start

```bash
# Install dependencies
cd exploratory_tester
pip install -r requirements.txt
playwright install chromium

# Run against local dev server
pytest . --base-url http://localhost:5173 --username demo --password 12345

# Quick smoke test only
pytest . -k smoke

# Limit exploration steps
pytest . --max-steps 50

# Run against a deployed instance
pytest . --base-url https://staging.example.com --username myuser --password mypass
```

The `--base-url` flag is provided by `pytest-base-url` (dependency of `pytest-playwright`). A default can be set in `pytest.ini`.

## Prerequisites

- Python 3.10+
- A running PKPDApp instance (Django backend + Vite frontend)
- The frontend must run in **dev mode** (`import.meta.env.DEV === true`) so the Redux store is exposed on `window.__pkpd_store__`
- A user account that can create projects

## Architecture

```
snapshot_from_page(page)   # Inject JS → parse Redux cache → SimulationModelSnapshot
         │
         ▼
explorer.pick_next(snap)   # Coverage-guided: pick unvisited (state, action) edge
         │
         ▼
action.execute(page, snap) # Playwright: navigate, click, fill, submit
         │
         ▼
snapshot_from_page(page)   # Re-extract state after action
         │
         ▼
check_action(action, │, │) # Diff before/after, validate sim results, flag UI errors
         │
         ▼
explorer.record(before, action, after)  # Update coverage
         │
         ◄─────── repeat ───────────────►
```

### Components

| File | Role |
|---|---|
| `snapshot.py` | `SimulationModelSnapshot` frozen dataclass, diff engine, JS-injection extractor |
| `js_extractors/redux_snapshot.js` | Injected JS — reads RTK Query cache + DOM slider positions |
| `actions/base.py` | Abstract `Action` class: `preconditions(snap)`, `execute(page, snap)`, `expected_diff(snap)` |
| `actions/navigation.py` | Shared Playwright helpers (click sidebar, select dropdowns, fill fields) |
| `actions/project.py` | `CreateProjectAction`, `SetSpeciesAction` |
| `actions/model_config.py` | `SelectSubModelAction`, `ToggleModelFlagAction`, `ResetToSpeciesDefaultsAction` |
| `actions/parameters.py` | `SetParameterAction` — 5 discrete values per parameter |
| `actions/mappings.py` | `ToggleDosingAction`, `TogglePdMappingAction` |
| `actions/dosing.py` | `SetDoseFieldAction` |
| `actions/simulation.py` | Add/remove plots & sliders, set slider values, set time max |
| `actions/registry.py` | `generate_all_actions(snap)` — builds the full action catalog |
| `explorer.py` | `CoverageGuidedExplorer` — tracks `(state_hash, action_key)` edges |
| `checker.py` | `check_action()` — diff snapshots, validate sim results, detect UI errors |
| `fuzzer.py` | `run_fuzzer()` — main loop returning `FuzzerReport` |
| `conftest.py` | Pytest fixtures: browser, page (with login), CLI options |

### Snapshot

The `SimulationModelSnapshot` captures the domain state of the simulation model — no UI/navigation fields:

```
model_id, species, pk_model_id, pk_model_id2, pk_effect_model_id,
pd_model_id, pd_model_id2, number_of_effect_compartments, has_lag,
has_anti_drug_antibodies, has_bioavailability, time_max,
parameters (qname → value+bounds), outputs (available plot vars),
pd_mappings, dosed_compartments, doses, derived_variables,
compound, plots, sliders, sim_results (time series)
```

Extraction reads `window.__pkpd_store__.getState()` — one JS injection gathers the RTK Query cache (model, variables, compound, doses, simulations) plus DOM slider thumb values (react-hook-form local state not in Redux).

### Actions

Each action declares:
- **`preconditions(snap)`** — can this action be performed in the current state?
- **`execute(page, snap)`** — perform it via Playwright (handles navigation implicitly)
- **`expected_diff(snap)`** — what `SnapshotDiff` should result?
- **`RESULT_EXPECTATION`** — `SHOULD_CHANGE`, `SHOULD_NOT_CHANGE`, or `IRRELEVANT`

Parameter values are discretized into 5 values: default, default×0.5, default×1.5, lower_bound, upper_bound.

### Checker

Three layers of validation per step:

1. **Diff check** — Every field/parameter change in the snapshot must match an expected change in the action's declared diff. Unexpected changes are flagged as anomalies.
2. **Simulation result check** — For `SHOULD_NOT_CHANGE` actions: results must be byte-identical. For `SHOULD_CHANGE` actions: results must differ.
3. **UI error check** — Scrapes `.MuiAlert-standardError` snackbars for error messages.

### Explorer

`CoverageGuidedExplorer` tracks visited `(snapshot_hash, action_key)` edges and prioritizes unexplored transitions. If all edges from the current state are visited, falls back to random selection. Reports coverage stats per run.

## Configuration

| CLI flag | Env var | Default | Description |
|---|---|---|---|
| `--base-url` | — | `http://localhost:5173` | Frontend URL |
| `--username` | `PKPD_USERNAME` | `fuzzer` | Login username |
| `--password` | `PKPD_PASSWORD` | `test1234` | Login password |
| `--max-steps` | `PKPD_MAX_STEPS` | `200` | Steps per run |

Also in `pytest.ini`:

```ini
base_url = http://localhost:5173
asyncio_mode = auto
log_cli_level = INFO
```

## Frontend Requirement

The app must expose the Redux store in dev mode. The one-line change in `src/app/store.ts`:

```typescript
if (import.meta.env.DEV) {
  (window as any).__pkpd_store__ = store;
}
```

## Findings

The `FuzzerReport` contains a list of `CheckResult` objects:

```
[FAIL] set_parameter:PKCompartment.CL:0.25
  UNEXPECTED: field 'species' changed: R -> H
  MISSING: expected field 'has_model' to change, but it didn't
  ERROR: Snackbar error: Validation failed
  SIM_RESULT: Simulation results changed when they should not have
```

Each finding includes the step number, action key, before/after snapshots, and categorized failure details.
