# Storybook Mock Generation

This document explains how to generate and manage TypeScript mock files for Storybook tests.

## Overview

The PKPDApp project uses Mock Service Worker (MSW) to mock API responses in Storybook tests. Instead of manually creating and maintaining these mocks, we have an automated Django management command that:

1. Creates test data in the database
2. Calls API endpoints to get real responses
3. Serializes responses to TypeScript files with MSW handlers

## Quick Start

### Generate Mocks

From the `pkpdapp` directory:

```bash
./scripts/generate-mocks.sh
```

Or directly:

```bash
DEBUG=1 python manage.py generate_storybook_mocks
```

### Check Mocks Before Tests

From the `frontend-v2` directory:

```bash
node scripts/ensure-mocks.js
```

## Generated Test Data

The command creates a complete test scenario:

- **User**: `storybook_test_user`
- **Compound**: Small molecule, 500 g/mol
- **Project**: "Storybook Test Project"
  - Species: Rat
  - Weight: 0.25 kg
- **Combined Model**: "1-compartmental + Direct effect"
  - PK Model: 1-compartmental model
  - PD Model: Direct effect model (inhibitory)
  - PK-PD Mapping: C1 → C_Drug
- **Protocol**: "Single IV dose"
  - Dose: 100 mg at t=0
  - Duration: 0.001 h (bolus)

## Generated Files

Located in `frontend-v2/src/stories/generated-mocks/`:

- `project.mock.ts` - Project, compound, and user data
- `model.mock.ts` - Combined model, PK models, PD models, tags
- `protocol.mock.ts` - Protocols and doses
- `units.mock.ts` - Unit system
- `variables.mock.ts` - Model variables
- `index.ts` - Exports all mocks

**Note**: These files are `.gitignore`d and should not be committed.

## Command Options

### `--output-dir <path>`

Specify where to write mock files (default: `frontend-v2/src/stories/generated-mocks`)

```bash
DEBUG=1 python manage.py generate_storybook_mocks --output-dir=frontend-v2/src/stories/my-mocks
```

### `--clean`

Delete existing test data before generating new mocks

```bash
DEBUG=1 python manage.py generate_storybook_mocks --clean
```

### `--dry-run`

Preview what would be generated without writing files

```bash
DEBUG=1 python manage.py generate_storybook_mocks --dry-run
```

## Integration with Frontend Tests

### Option 1: Pre-test Hook (Recommended)

Add to `frontend-v2/package.json`:

```json
{
  "scripts": {
    "pretest": "node scripts/ensure-mocks.js",
    "prestorybook": "node scripts/ensure-mocks.js",
    "generate-mocks": "cd ../pkpdapp && ./scripts/generate-mocks.sh"
  }
}
```

This will:
- Check if mocks exist before running tests
- Show helpful error if they don't
- Not slow down every test run

### Option 2: Combined Commands

```json
{
  "scripts": {
    "test:with-mocks": "yarn generate-mocks && yarn test",
    "storybook:with-mocks": "yarn generate-mocks && yarn storybook"
  }
}
```

Use when you want fresh mocks every time:

```bash
yarn test:with-mocks
```

### Option 3: Manual

Always generate mocks manually before running tests:

```bash
cd pkpdapp
./scripts/generate-mocks.sh

cd ../frontend-v2
yarn test
```

## CI/CD Integration

### GitHub Actions

```yaml
name: Frontend Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Set up Python
        uses: actions/setup-python@v4
        with:
          python-version: '3.10'

      - name: Install Python dependencies
        run: |
          cd pkpdapp
          pip install -r requirements.txt

      - name: Run migrations
        run: |
          cd pkpdapp
          DEBUG=1 python manage.py migrate

      - name: Generate Storybook mocks
        run: |
          cd pkpdapp
          DEBUG=1 python manage.py generate_storybook_mocks

      - name: Set up Node
        uses: actions/setup-node@v3
        with:
          node-version: '18'

      - name: Install frontend dependencies
        run: |
          cd frontend-v2
          yarn install

      - name: Run frontend tests
        run: |
          cd frontend-v2
          yarn test
```

### GitLab CI

```yaml
frontend-tests:
  stage: test
  script:
    # Backend setup
    - cd pkpdapp
    - pip install -r requirements.txt
    - DEBUG=1 python manage.py migrate
    - DEBUG=1 python manage.py generate_storybook_mocks

    # Frontend tests
    - cd ../frontend-v2
    - yarn install
    - yarn test
```

## Using Generated Mocks in Storybook

### Import the mocks

```typescript
import {
  project,
  compound,
  projectHandlers
} from "./generated-mocks";

import {
  pkModels,
  pdModels,
  modelHandlers
} from "./generated-mocks";
```

### Use in story configuration

```typescript
export default {
  title: "My Component",
  component: MyComponent,
  parameters: {
    msw: {
      handlers: {
        project: projectHandlers,
        model: modelHandlers,
      },
    },
  },
};
```

## Customizing Generated Data

If you need different test data, you have two options:

### 1. Create a separate mock file

Create `frontend-v2/src/stories/custom.mock.ts` for specific scenarios:

```typescript
import { ProjectRead } from "../app/backendApi";
import { project } from "./generated-mocks";

// Extend the generated project
export const customProject: ProjectRead = {
  ...project,
  name: "Custom Test Project",
  species: "H", // Human instead of Rat
};
```

### 2. Modify the management command

Edit `pkpdapp/pkpdapp/management/commands/generate_storybook_mocks.py`:

```python
def _create_test_data(self):
    # ... existing code ...

    # Create additional test data
    project2 = Project.objects.create(
        name="Second Test Project",
        compound=compound,
        species="H",  # Human
        # ...
    )
```

## Troubleshooting

### "No such table" error

Run migrations first:

```bash
cd pkpdapp
DEBUG=1 python manage.py migrate
```

### "Model not found" error

Ensure all migrations have been applied, especially the initial model migrations:

```bash
cd pkpdapp
DEBUG=1 python manage.py migrate pkpdapp 0027_version_3_models
```

### Mocks not found in tests

1. Check the mocks directory exists:
   ```bash
   ls -la frontend-v2/src/stories/generated-mocks/
   ```

2. Generate mocks:
   ```bash
   cd pkpdapp
   ./scripts/generate-mocks.sh
   ```

3. Run the check script:
   ```bash
   cd frontend-v2
   node scripts/ensure-mocks.js
   ```

### Import errors in TypeScript

Make sure the backend API types are up to date:

```bash
cd frontend-v2
yarn codegen
```

## Best Practices

1. **Don't commit generated mocks** - They're in `.gitignore` for a reason
2. **Generate fresh mocks after backend changes** - Schema or data changes require regeneration
3. **Use pre-test hooks** - Automate the check to avoid forgetting
4. **Keep custom mocks separate** - Don't edit generated files
5. **Document custom data needs** - If you modify the generation command, document why

## Related Files

- Management command: `pkpdapp/pkpdapp/management/commands/generate_storybook_mocks.py`
- Generation script: `pkpdapp/scripts/generate-mocks.sh`
- Check script: `frontend-v2/scripts/ensure-mocks.js`
- Output directory: `frontend-v2/src/stories/generated-mocks/`
- Package.json updates: `frontend-v2/PACKAGE_JSON_UPDATES.md`
