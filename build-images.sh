#!/bin/bash

# Default values
REGISTRY="localhost"
TAG="latest"
PUSH=false

# Display help message
show_help() {
    echo "Usage: $0 [options]"
    echo "Options:"
    echo "  -r, --registry REGISTRY   Docker registry to push to (default: localhost)"
    echo "  -t, --tag TAG             Tag for the images (default: latest)"
    echo "  -p, --push                Push images to registry"
    echo "  -h, --help                Display this help message"
    echo
    echo "Example:"
    echo "  $0 --registry myregistry.com --tag v1.0.0 --push"
}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    key="$1"
    case $key in
        -r|--registry)
            REGISTRY="$2"
            shift
            shift
            ;;
        -t|--tag)
            TAG="$2"
            shift
            shift
            ;;
        -p|--push)
            PUSH=true
            shift
            ;;
        -h|--help)
            show_help
            exit 0
            ;;
        *)
            echo "Unknown option: $1"
            show_help
            exit 1
            ;;
    esac
done

# Display build information
echo "====================================="
echo "Building Docker Images"
echo "====================================="
echo "Registry: $REGISTRY"
echo "Tag: $TAG"
echo "Push: $PUSH"
echo "====================================="

# Build frontend image
echo "Building frontend image..."
docker build -t $REGISTRY/sqlchat-frontend:$TAG .

# Build R server image
echo "Building R server image..."
docker build -t $REGISTRY/sqlchat-r-server:$TAG ./r-server

# Note about n8n
echo "Note: n8n uses the official image from Docker Hub (n8nio/n8n)"

# Push images if requested
if [ "$PUSH" = true ]; then
    echo "Pushing images to registry..."
    docker push $REGISTRY/sqlchat-frontend:$TAG
    docker push $REGISTRY/sqlchat-r-server:$TAG
    echo "Note: n8n image is not pushed as we use the official image"
fi

echo "====================================="
echo "Build completed successfully!"
echo "====================================="

if [ "$PUSH" = true ]; then
    echo "Images pushed to registry: $REGISTRY"
else
    echo "To push images to registry, run with --push flag"
fi

echo "To use these images, run:"
echo "export DOCKER_REGISTRY=$REGISTRY"
echo "export TAG=$TAG"
echo "docker-compose -f docker-compose.prod.yml up -d" 