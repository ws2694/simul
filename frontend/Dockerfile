FROM node:20-alpine

WORKDIR /app

# Copy package files including lockfile
COPY package.json package-lock.json ./

# Install dependencies
RUN npm ci

# Copy application code
COPY . .

# NEXT_PUBLIC_* vars are inlined at build time.
# Default: browser hits localhost:8000 (API exposed on host).
ARG NEXT_PUBLIC_API_URL=http://localhost:8000
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL

# Build the application
RUN npm run build

# Expose port
EXPOSE 3000

# Run the application
CMD ["npm", "start"]
