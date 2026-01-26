#!/bin/bash
set -e

echo "=== Starting with Docker Compose ==="

# Check if .env exists
if [ ! -f .env ]; then
    echo "Error: .env file not found."
    echo "Run: cp .env.example .env"
    echo "Then edit .env and add your GEMINI_API_KEY"
    exit 1
fi

# Check for GEMINI_API_KEY
if ! grep -q "GEMINI_API_KEY=." .env; then
    echo "Error: GEMINI_API_KEY not set in .env"
    exit 1
fi

# Build and start all services
docker-compose up --build

echo ""
echo "=== Services Starting ==="
echo ""
echo "API:      http://localhost:8000"
echo "API Docs: http://localhost:8000/docs"
echo "Frontend: http://localhost:3000"
echo ""
