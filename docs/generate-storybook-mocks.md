# Generate Storybook Mocks

Django management command to automatically generate TypeScript mock files for Storybook tests from live Django API responses.

## Quick Start

```bash
cd pkpdapp
python manage.py generate_storybook_mocks
```

This creates **two sets** of TypeScript mock files:
- `frontend-v2/src/stories/generated-mocks/` - Base mocks without dataset data
- `frontend-v2/src/stories/generated-mocks-with-data/` - Mocks with CSV-imported dataset

## What It Does

The command:
1. Creates test data (project, compound, combined model with extravascular absorption, protocol, dose)
2. Calls all API endpoints to collect realistic responses
3. **Creates a dataset** by importing CSV data with subjects, groups, and biomarkers
4. **Generates two mock sets** to support different testing scenarios
5. Outputs TypeScript files with MSW handlers and type-safe exports

## Options

### `--output-dir <path>`
Specify base directory for mock files (default: `frontend-v2/src/stories`)

```bash
python manage.py generate_storybook_mocks --output-dir=custom/path
```

### `--clean`
Delete existing test data before generating

```bash
python manage.py generate_storybook_mocks --clean
```

### `--dry-run`
Preview what would be generated without writing files

```bash
python manage.py generate_storybook_mocks --dry-run
```