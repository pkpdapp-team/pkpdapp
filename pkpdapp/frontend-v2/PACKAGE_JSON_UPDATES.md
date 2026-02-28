# Recommended package.json Updates

To ensure mocks are generated before running tests, add these scripts to your `package.json`:

## Add to "scripts" section:

```json
{
  "scripts": {
    // ... existing scripts ...

    // Generate mocks from Django backend
    "generate-mocks": "cd ../pkpdapp && ./scripts/generate-mocks.sh",

    // Pre-test hook to check mocks exist
    "pretest": "node scripts/ensure-mocks.js",

    // Pre-storybook hook to check mocks exist
    "prestorybook": "node scripts/ensure-mocks.js",

    // Convenience: generate mocks then run tests
    "test:with-mocks": "yarn generate-mocks && yarn test",

    // Convenience: generate mocks then run storybook
    "storybook:with-mocks": "yarn generate-mocks && yarn storybook"
  }
}
```

## How it works:

1. **`generate-mocks`**: Runs the Django management command to create TypeScript mocks
   - Usage: `yarn generate-mocks`

2. **`pretest`** and **`prestorybook`**: Automatically run before `test` and `storybook`
   - Checks if mocks exist
   - Provides helpful error message if they don't
   - Does NOT auto-generate (to avoid slowing down every test run)

3. **`test:with-mocks`** and **`storybook:with-mocks`**: Convenience commands
   - Regenerate fresh mocks then run tests/storybook
   - Useful for CI/CD or when you want to ensure latest data

## Usage Examples:

```bash
# First time setup or after backend changes:
yarn generate-mocks

# Run tests (will check mocks exist first):
yarn test

# Run Storybook (will check mocks exist first):
yarn storybook

# Generate fresh mocks AND run tests:
yarn test:with-mocks

# Generate fresh mocks AND run Storybook:
yarn storybook:with-mocks
```

## CI/CD Integration:

In your CI pipeline (e.g., GitHub Actions), add a step before frontend tests:

```yaml
- name: Generate Storybook Mocks
  run: |
    cd pkpdapp
    DEBUG=1 python manage.py generate_storybook_mocks

- name: Run Frontend Tests
  run: |
    cd frontend-v2
    yarn test
```

Or use the convenience script:

```yaml
- name: Setup and Test Frontend
  run: |
    cd frontend-v2
    yarn test:with-mocks
```
