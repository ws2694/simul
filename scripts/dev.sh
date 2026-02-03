#!/bin/bash
set -e

echo "=== Starting Development Environment ==="

# Check if .env exists
if [ ! -f .env ]; then
    echo "Error: .env file not found. Run ./scripts/setup.sh first."
    exit 1
fi

# Load environment variables
export $(grep -v '^#' .env | xargs)

# Create logs directory
LOGS_DIR="./logs"
mkdir -p "$LOGS_DIR"

# Log files with timestamp
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKEND_LOG="$LOGS_DIR/backend.log"
FRONTEND_LOG="$LOGS_DIR/frontend.log"

# Clear previous logs
> "$BACKEND_LOG"
> "$FRONTEND_LOG"

# Start databases with Docker
echo "Starting PostgreSQL and Redis..."
docker compose up -d db redis

# Wait for PostgreSQL to be ready
echo "Waiting for PostgreSQL..."
until docker compose exec -T db pg_isready -U postgres > /dev/null 2>&1; do
    sleep 1
done
echo "PostgreSQL is ready!"

# Activate virtual environment
source .venv/bin/activate

# Start API in background with logging
echo "Starting API server..."
uvicorn src.main:app --reload --host 0.0.0.0 --port 8000 2>&1 | tee "$BACKEND_LOG" &
API_PID=$!

# Start frontend with logging
echo "Starting frontend..."
cd frontend
npm run dev 2>&1 | tee "$FRONTEND_LOG" &
FRONTEND_PID=$!
cd ..

# Cleanup function
cleanup() {
    echo ""
    echo "Shutting down..."
    kill $API_PID 2>/dev/null
    kill $FRONTEND_PID 2>/dev/null
    echo "Logs saved to:"
    echo "  Backend:  $BACKEND_LOG"
    echo "  Frontend: $FRONTEND_LOG"
    exit 0
}

trap cleanup SIGINT SIGTERM

echo ""
echo "=== Development Environment Running ==="
echo ""
echo "API:      http://localhost:8000"
echo "API Docs: http://localhost:8000/docs"
echo "Frontend: http://localhost:3000"
echo ""
echo "Logs:"
echo "  Backend:  $BACKEND_LOG"
echo "  Frontend: $FRONTEND_LOG"
echo ""
echo "Tip: Use 'tail -f $BACKEND_LOG' in another terminal to follow logs"
echo ""
echo "Press Ctrl+C to stop all services"
echo ""

# Wait for any process to exit
wait
