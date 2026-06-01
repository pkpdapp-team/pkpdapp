#!/usr/bin/env bash
# start-server-dev.sh - Development server for worktree
# Starts both Django backend and Vite frontend in development mode

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Get the script directory (worktree root)
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$SCRIPT_DIR/pkpdapp"
FRONTEND_DIR="$SCRIPT_DIR/frontend-v2"

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Starting PKPD App Development Server${NC}"
echo -e "${BLUE}Worktree: $(basename $SCRIPT_DIR)${NC}"
echo -e "${BLUE}========================================${NC}"

# Function to cleanup background processes on exit
cleanup() {
    echo -e "\n${YELLOW}Shutting down servers...${NC}"
    kill $(jobs -p) 2>/dev/null || true
    wait 2>/dev/null || true
    echo -e "${GREEN}Cleanup complete${NC}"
}
trap cleanup EXIT INT TERM

# Check if virtual environment exists
if [ ! -d "$SCRIPT_DIR/venv" ]; then
    echo -e "${YELLOW}Virtual environment not found. Creating one...${NC}"
    python3 -m venv venv
    source venv/bin/activate
    pip install -r requirements.txt
else
    source venv/bin/activate
fi

# Backend setup
echo -e "\n${GREEN}[Backend]${NC} Setting up Django..."
cd "$BACKEND_DIR"

# Run migrations
echo -e "${GREEN}[Backend]${NC} Running migrations..."
python manage.py migrate --no-input

# Create test user
echo -e "${GREEN}[Backend]${NC} Creating test user (username: test, password: test)..."
python manage.py shell -c "
from django.contrib.auth import get_user_model;
User = get_user_model();
if not User.objects.filter(username='test').exists():
    User.objects.create_superuser('test', 'test@example.com', 'test');
    print('Test user created');
else:
    print('Test user already exists');
" 2>/dev/null || echo "Note: Could not create test user (may already exist)"

# Start Django development server in background
echo -e "${GREEN}[Backend]${NC} Starting Django dev server on http://127.0.0.1:8000..."
python manage.py runserver 0.0.0.0:8000 &
BACKEND_PID=$!

# Frontend setup
echo -e "\n${BLUE}[Frontend]${NC} Setting up Vite..."
cd "$FRONTEND_DIR"

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo -e "${YELLOW}[Frontend]${NC} node_modules not found. Installing dependencies..."
    yarn install
fi

# Start Vite dev server in background
echo -e "${BLUE}[Frontend]${NC} Starting Vite dev server on http://127.0.0.1:3000..."
yarn start &
FRONTEND_PID=$!

# Wait a bit for servers to start
sleep 3

echo -e "\n${GREEN}========================================${NC}"
echo -e "${GREEN}✓ Development servers started!${NC}"
echo -e "${GREEN}========================================${NC}"
echo -e "${BLUE}Frontend:${NC} http://127.0.0.1:3000"
echo -e "${GREEN}Backend:${NC}  http://127.0.0.1:8000"
echo -e "${GREEN}Admin:${NC}    http://127.0.0.1:8000/admin"
echo -e "\n${YELLOW}Test Login:${NC} username=test, password=test"
echo -e "\n${YELLOW}Press Ctrl+C to stop all servers${NC}"
echo -e "${GREEN}========================================${NC}\n"

# Wait for background processes
wait
