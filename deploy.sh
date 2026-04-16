#!/usr/bin/env bash
set -euo pipefail

# PerfecTemp deploy script
# Builds the Vite app locally and deploys to a Docker host

HOST="${DEPLOY_HOST:?Set DEPLOY_HOST}"
STACK_DIR="/opt/stacks/perfectemp"
APP_DIR="$(dirname "$0")/app"

echo "=== Building production bundle ==="
cd "$APP_DIR"
npm run build

echo ""
echo "=== Uploading to $HOST:$STACK_DIR ==="
scp -r dist/ Dockerfile nginx.conf "$HOST:$STACK_DIR/"

echo ""
echo "=== Building Docker image ==="
ssh "$HOST" "cd $STACK_DIR && sudo docker build -t perfectemp ."

echo ""
echo "=== Restarting container ==="
ssh "$HOST" "cd $STACK_DIR && sudo docker compose down && sudo docker compose up -d"
# Note: docker-compose.yml on server includes security_opt: apparmor:unconfined
# (required for Proxmox — socketpair() blocked by default AppArmor profile)

echo ""
echo "=== Verifying ==="
ssh "$HOST" "sudo docker ps --filter name=perfectemp --format 'table {{.Names}}\t{{.Status}}'"

echo ""
echo "Deployed to the configured host"
