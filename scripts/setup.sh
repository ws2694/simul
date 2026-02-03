#!/bin/bash
set -e

echo "=== Cognitive State Protocol Setup ==="

# Check for required tools
command -v node >/dev/null 2>&1 || { echo "Node.js is required but not installed."; exit 1; }

# Find Python 3.11+
PYTHON_CMD=""
for cmd in python3.13 python3.12 python3.11; do
    if command -v $cmd >/dev/null 2>&1; then
        PYTHON_CMD=$cmd
        break
    fi
done

if [ -z "$PYTHON_CMD" ]; then
    echo "Error: Python 3.11+ is required but not found."
    echo "Please install Python 3.11 or later (e.g., 'brew install python@3.11')"
    exit 1
fi

echo "Using Python: $PYTHON_CMD ($($PYTHON_CMD --version))"

# Create virtual environment
echo "Creating Python virtual environment..."
$PYTHON_CMD -m venv .venv
source .venv/bin/activate

# Install Python dependencies
echo "Installing Python dependencies..."
pip install -e ".[dev]"

# Setup environment file
if [ ! -f .env ]; then
    echo "Creating .env file from template..."
    cp .env.example .env
    echo "Please edit .env and add your GEMINI_API_KEY"
fi

# Install frontend dependencies
echo "Installing frontend dependencies..."
cd frontend
npm install
cd ..

echo ""
echo "=== Setup Complete ==="
echo ""
echo "Next steps:"
echo "1. Edit .env and add your GEMINI_API_KEY"
echo "2. Start PostgreSQL with pgvector extension (or use docker-compose)"
echo "3. Run: ./scripts/dev.sh"
echo ""
