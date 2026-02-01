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

# Start databases with Docker
echo "Starting PostgreSQL and Redis..."
docker-compose up -d db redis

# Wait for PostgreSQL to be ready
echo "Waiting for PostgreSQL..."
until docker-compose exec -T db pg_isready -U postgres > /dev/null 2>&1; do
    sleep 1
done
echo "PostgreSQL is ready!"

# Activate virtual environment
source .venv/bin/activate

# Start API in background
echo "Starting API server..."
uvicorn src.main:app --reload --host 0.0.0.0 --port 8000 &
API_PID=$!

# Start frontend
echo "Starting frontend..."
cd frontend
npm run dev &
FRONTEND_PID=$!
cd ..

# Cleanup function
cleanup() {
    echo ""
    echo "Shutting down..."
    kill $API_PID 2>/dev/null
    kill $FRONTEND_PID 2>/dev/null
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
echo "Press Ctrl+C to stop all services"
echo ""

# Wait for any process to exit
wait
