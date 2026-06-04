#!/bin/bash
set -e

echo "Building and starting production containers..."

docker compose build
docker compose up -d

echo "Application started!"
echo "Frontend: http://localhost:3000"
echo "Backend API: http://localhost:8000"