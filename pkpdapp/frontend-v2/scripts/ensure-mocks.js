#!/usr/bin/env node
/**
 * Ensure Storybook mocks are generated before running tests
 *
 * This script checks if the generated-mocks directory exists and has files.
 * If not, it provides helpful instructions to the user.
 */

import { existsSync, readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const mocksDir = join(__dirname, '..', 'src', 'stories', 'generated-mocks');

function checkMocks() {
  // Check if directory exists
  if (!existsSync(mocksDir)) {
    console.error('\x1b[31m%s\x1b[0m', '❌ Error: Generated mocks directory not found');
    console.log('\nTo generate the mocks, run:');
    console.log('\x1b[36m%s\x1b[0m', '  cd ../pkpdapp && ./scripts/generate-mocks.sh');
    console.log('\nOr from the frontend-v2 directory:');
    console.log('\x1b[36m%s\x1b[0m', '  yarn generate-mocks');
    process.exit(1);
  }

  // Check if directory has TypeScript files
  const files = readdirSync(mocksDir);
  const tsFiles = files.filter(f => f.endsWith('.mock.ts'));

  if (tsFiles.length === 0) {
    console.error('\x1b[31m%s\x1b[0m', '❌ Error: No mock files found in generated-mocks directory');
    console.log('\nTo generate the mocks, run:');
    console.log('\x1b[36m%s\x1b[0m', '  cd ../pkpdapp && ./scripts/generate-mocks.sh');
    console.log('\nOr from the frontend-v2 directory:');
    console.log('\x1b[36m%s\x1b[0m', '  yarn generate-mocks');
    process.exit(1);
  }

  console.log('\x1b[32m%s\x1b[0m', '✓ Generated mocks found');
  console.log(`  Found ${tsFiles.length} mock files in ${mocksDir}`);
}

checkMocks();
