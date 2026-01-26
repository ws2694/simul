FROM python:3.11-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Copy project files needed for install
COPY pyproject.toml .
COPY src/ src/

# Install Python dependencies (non-editable for Docker)
RUN pip install --no-cache-dir .

# Create media directory
RUN mkdir -p /app/media

# Expose port
EXPOSE 8000

# Run the application
CMD ["uvicorn", "src.main:app", "--host", "0.0.0.0", "--port", "8000"]
