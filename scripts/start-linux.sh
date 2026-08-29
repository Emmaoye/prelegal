#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "${BASH_SOURCE[0]}")/.."

IMAGE_NAME="prelegal"
CONTAINER_NAME="prelegal"
PORT="${PORT:-8000}"

echo "Building Docker image..."
docker build -t "$IMAGE_NAME" .

if docker ps -a --format '{{.Names}}' | grep -qx "$CONTAINER_NAME"; then
  echo "Removing existing container..."
  docker rm -f "$CONTAINER_NAME" >/dev/null
fi

ENV_ARGS=()
if [ -f .env ]; then
  ENV_ARGS=(--env-file .env)
fi

echo "Starting container..."
docker run -d --name "$CONTAINER_NAME" -p "$PORT:8000" "${ENV_ARGS[@]}" "$IMAGE_NAME" >/dev/null

echo "Waiting for backend to become healthy..."
for _ in $(seq 1 30); do
  if curl -sf "http://localhost:$PORT/api/health" >/dev/null 2>&1; then
    echo "Prelegal is running at http://localhost:$PORT"
    exit 0
  fi
  sleep 1
done

echo "Prelegal did not become healthy in time. Check logs with: docker logs $CONTAINER_NAME" >&2
exit 1
