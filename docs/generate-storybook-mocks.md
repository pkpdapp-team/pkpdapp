# Generate Storybook Mocks

Django management command to automatically generate TypeScript mock files for Storybook tests.

## Quick Start

```bash
cd pkpdapp
DEBUG=1 python manage.py generate_storybook_mocks
```

This creates TypeScript mock files in `frontend-v2/src/stories/generated-mocks/` with realistic test data from the Django API.

## What It Does

The command:
1. Creates test data in the database (project, compound, combined model, protocol, dose)
2. Calls all API endpoints used by Storybook tests
3. Serializes API responses to TypeScript files with MSW handlers
4. Generates type-safe mocks ready for import

## Generated Test Data

- **User**: `storybook_test_user`
- **Compound**: Small molecule (500 g/mol)
- **Project**: Rat species (0.25 kg)
- **Combined Model**: 1-compartmental PK + Direct effect (inhibitory) PD
- **Protocol**: Single IV dose (100 mg at t=0)

## Generated Files

All files are created in `frontend-v2/src/stories/generated-mocks/`:

- `project.mock.ts` - Project, compound, user data
- `model.mock.ts` - Combined models, PK/PD models, tags
- `protocol.mock.ts` - Protocols and doses
- `units.mock.ts` - Unit system
- `variables.mock.ts` - Model variables
- `index.ts` - Exports all mocks

## Options

### `--output-dir <path>`
Specify where to write mock files (default: `frontend-v2/src/stories/generated-mocks`)

```bash
DEBUG=1 python manage.py generate_storybook_mocks --output-dir=custom/path
```

### `--clean`
Delete existing test data before generating

```bash
DEBUG=1 python manage.py generate_storybook_mocks --clean
```

### `--dry-run`
Preview what would be generated without writing files

```bash
DEBUG=1 python manage.py generate_storybook_mocks --dry-run
```

## When to Regenerate

Regenerate mocks when:
- Backend API changes (new endpoints, modified serializers)
- Test data requirements change
- TypeScript types are updated

After regenerating, commit the updated files:

```bash
git add frontend-v2/src/stories/generated-mocks/
git commit -m "chore: update generated Storybook mocks"
```

## Usage in Storybook

Import the generated mocks in your stories:

```typescript
import {
  project,
  compound,
  projectHandlers,
  pkModels,
  pdModels,
  modelHandlers
} from "./generated-mocks";

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

## Implementation Details

**Location**: `pkpdapp/pkpdapp/management/commands/generate_storybook_mocks.py`

The command uses:
- Django's test `APIClient` to call endpoints
- REST framework serializers for consistent JSON output
- Python-to-TypeScript conversion for proper type formatting
- Type assertions (`as unknown as Type`) to handle schema differences

## See Also

- [Storybook Mock Generation Guide](storybook-mock-generation.md) - Comprehensive documentation
- [Generated Mocks README](../frontend-v2/src/stories/generated-mocks/README.md) - Usage instructions
