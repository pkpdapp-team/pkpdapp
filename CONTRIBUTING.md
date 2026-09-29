# Contributing to the PKPDApp

The PKPDApp is built with the Django framework on the backend and a React (Vite + TypeScript) frontend. The backend is organised as a single, self-contained Django app whose internal modules each handle a focused concern (model building, simulation, the REST API, and so on).

For development setup see the [Developer Installation Guide](docs/installation-dev.md), and for a technical overview see the [Architecture Overview](docs/architecture.md).

## Repository Structure

The repository is organised in two layers:

1. **`pkpdapp/`** (repository root) — top-level folder containing administrative files (`README.md`, this `CONTRIBUTING.md`, `LICENSE.md`, `requirements.txt`), the Docker/deployment files (`Dockerfile`, `docker-compose*.yml`, `build.sh`, `nginx.default.template`), the helper scripts (`start-server-dev.sh`, `start-server.sh`, `run-tests.py`), and the main subdirectories:
   - `docs/` — project documentation
   - `frontend-v2/` — the React frontend
   - `pkpdapp/` — the Django project (see below)
2. **`pkpdapp/pkpdapp/`** — the Django project folder, containing the executable `manage.py` and the single `pkpdapp` Django application.

## The Django Application

All backend functionality lives in the single `pkpdapp` app at `pkpdapp/pkpdapp/`. It is organised into modules by concern:

- `models/` — the data models (e.g. `CombinedModel`, `Variable`, `Unit`, `Protocol`, `Dose`, `Project`, `Compound`, `Simulation`).
- `api/` — Django REST Framework serializers and views exposing CRUD operations and simulation execution.
- `migrations/` — database migrations, including the Myokit `.mmt` model definitions under `migrations/models-v3/`.
- `management/` — custom `manage.py` commands (e.g. `generate_storybook_mocks`, `test_snapshots`).
- `signals/` — Django signal handlers.
- `utils/` — shared helper utilities.
- `tests/` — the backend test suite.

See the [Architecture Overview](docs/architecture.md) for how these pieces fit together.

## Development Workflow

- Create feature branches from the `develop` branch and open pull requests against `develop` (not `master`).
- Use conventional commits for commit messages.
- Run the backend tests, style checks, and frontend tests before opening a PR — see the [Developer Installation Guide](docs/installation-dev.md#testing).
