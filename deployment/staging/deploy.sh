#!/bin/bash

set -e

# Configuration
REGISTRY="ghcr.io"
IMAGE_NAME="flight-search-saas"
IMAGE_TAG="${GITHUB_SHA:-latest}"
COMPOSE_FILE="docker-compose.staging.yml"

echo "Starting staging deployment..."

# Load environment variables
if [ -f .env.staging ]; then
    export $(cat .env.staging | xargs)
fi

# Pull latest images
echo "Pulling latest images..."
docker-compose -f $COMPOSE_FILE pull

# Stop existing services
echo "Stopping existing services..."
docker-compose -f $COMPOSE_FILE down

# Start services
echo "Starting services..."
docker-compose -f $COMPOSE_FILE up -d

# Wait for services to be healthy
echo "Waiting for services to be healthy..."
sleep 30

# Run health checks
echo "Running health checks..."
max_attempts=30
attempt=1

while [ $attempt -le $max_attempts ]; do
    if curl -f http://localhost:3000/api/health > /dev/null 2>&1; then
        echo "Health check passed!"
        break
    fi
    
    if [ $attempt -eq $max_attempts ]; then
        echo "Health check failed after $max_attempts attempts"
        docker-compose -f $COMPOSE_FILE logs app
        exit 1
    fi
    
    echo "Health check attempt $attempt/$max_attempts failed, retrying in 10 seconds..."
    sleep 10
    ((attempt++))
done

# Run smoke tests
echo "Running smoke tests..."
npm run test:smoke

echo "Staging deployment completed successfully!"

# Show service status
docker-compose -f $COMPOSE_FILE ps