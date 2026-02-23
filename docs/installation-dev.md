# Developer Installation Guide

This guide covers setting up a local development environment for PKPDApp, including both the Django backend and React frontend.

## Prerequisites

- Python 3.x
- Node.js (install via `snap` on Ubuntu 20.04 LTS: `sudo snap install node --classic`)
- Yarn package manager: `npm install --global yarn`
- Docker and docker-compose (optional, for production deployments)
- System dependencies (Ubuntu):
```bash
sudo apt-get install build-essential libsasl2-dev python3-dev libldap2-dev libssl-dev libsundials-dev memcached
```

## Getting started

1. Clone the repo, make sure you have the prerequisites installed, and navigate to the project directory
2. Run the `start-server-dev.sh` script to set up and run the backend and frontend. This will show you the URLs for both servers and any errors that occur during setup.

For a more detailed manual setup, follow the instructions below.

## Environment Setup

### Virtual Environment

Create a Python virtual environment in the `env` folder:

```bash
python3 -m venv env
source env/bin/activate
```

Always use this virtual environment when working with the backend.

### Environment Variables

Edit the `.env.prod` file in the root of the repository to configure environment variables. The most important variables to alter are those corresponding to secret keys and passwords.

## Backend Installation (Django)

### 1. Install System Dependencies

**Ubuntu:**
```bash
apt-get install build-essential libsasl2-dev python3-dev libldap2-dev libssl-dev libsundials-dev memcached
```

### 2. Install Python Requirements

With your virtual environment activated:

```bash
pip install -r requirements.txt
```

### 3. Create Database

```bash
cd pkpdapp
python manage.py migrate
```

### 4. Run the Development Server

```bash
python manage.py runserver
```

The backend API will be available at [http://127.0.0.1:8000](http://127.0.0.1:8000).

### 5. (Optional) Create Admin User

```bash
python manage.py createsuperuser
```

## Frontend Installation (React)

### 1. Install Dependencies

Navigate to the frontend directory and install Node.js dependencies:

```bash
cd frontend-v2
yarn install
```

### 2. Run the Development Server

```bash
yarn start
```

The frontend will be available at [http://127.0.0.1:3000](http://127.0.0.1:3000).

## Testing

### Backend Tests

Run Django tests:

```bash
cd pkpdapp
python manage.py test
```

Run a specific test file:

```bash
python manage.py test pkpdapp.tests.test_models
```

Run code style checks:

```bash
flake8
```

Run copyright tests:

```bash
python run-tests.py --copyright
```

### Frontend Tests

The frontend uses Storybook and Vitest for component testing.

Open a development Storybook (including a GUI for running tests) in your browser:

```bash
cd frontend-v2
yarn storybook
```

Run tests from the command line:

```bash
yarn test
```

Run the linter:

```bash
yarn lint
```

## OpenAPI Specification & API Client Generation

### Generate OpenAPI Spec (Backend)

From the backend directory:

```bash
cd pkpdapp
python manage.py spectacular --color --file schema.yml
```

### Generate RTK Query API Client (Frontend)

The frontend uses Redux Toolkit RTK Query to automatically generate an API client from the OpenAPI spec.

From the frontend directory:

```bash
cd frontend-v2
npx @rtk-query/codegen-openapi openapi-config.json
```

This creates the `frontend-v2/src/app/backendApi.ts` file with the generated client.

## Cache Setup

Memcached is installed as part of the system dependencies. Run memcached:

```bash
memcached -p 11211
```

## Git Workflow for Development

- Create feature branches from the `develop` branch
- Use conventional commits for commit messages
- Create pull requests against the `develop` branch (not `master`)
- Use git worktrees for working on multiple features simultaneously

## Snapshot Testing (Myokit Models)

The Django app has a custom management command for snapshot testing all models in the database:

```sh
cd pkpdapp
git checkout master
python manage.py test_snapshots
git checkout develop
python manage.py test_snapshots
git clean -df
```

The custom command is located in `pkpdapp/pkpdapp/management/commands/test_snapshots.py`.
