#!/bin/bash
#
# Generate TypeScript mock files for Storybook tests
# This script should be run from the pkpdapp root directory
#

set -e

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}Generating Storybook mocks...${NC}"

# Check if we're in the right directory
if [ ! -f "manage.py" ]; then
    echo -e "${YELLOW}Error: Must be run from pkpdapp directory${NC}"
    exit 1
fi

# Check if database exists and has migrations
if [ ! -f "db.sqlite3" ]; then
    echo -e "${YELLOW}Database not found. Running migrations first...${NC}"
    DEBUG=1 python manage.py migrate
fi

# Generate the mocks
DEBUG=1 python manage.py generate_storybook_mocks "$@"

echo -e "${GREEN}✓ Mocks generated successfully${NC}"
