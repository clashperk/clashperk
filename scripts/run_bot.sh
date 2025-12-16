#!/bin/bash

if ! docker network inspect default_net >/dev/null 2>&1; then
  echo "Network 'default_net' does not exist. Creating it..."
  docker network create default_net
fi

if [ "$(docker ps -aq -f name=clashperk_bot)" ]; then
    echo "Stopping and removing existing 'clashperk_bot' container..."
    docker stop clashperk_bot
    docker rm clashperk_bot
fi

echo "Starting 'clashperk_bot'..."

docker run -d \
  --name clashperk_bot \
  --restart always \
  --env-file .env \
  --memory=10g \
  -p 8070:8070 \
  --network default_net \
  --health-cmd "wget -qO - localhost:8070 || exit 1" \
  --health-interval 15s \
  --health-timeout 10s \
  --health-retries 120 \
  432159388664.dkr.ecr.us-east-1.amazonaws.com/clashperk-bot:latest

echo "Container 'clashperk_bot' started."
