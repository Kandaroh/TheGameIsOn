#!/usr/bin/env sh
# Launch frontend and backend servers from the repository root.
# Usage: sh ./start-game.sh  OR  bash start-game.sh

# Use current directory if script is sourced, otherwise use script directory
if [ "${BASH_SOURCE[0]}" = "${0}" ] 2>/dev/null; then
  # Script is being executed
  ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"
else
  # Script is being sourced or shell lacks BASH_SOURCE
  ROOT_DIR="${PWD}"
fi

BACKEND_DIR="$ROOT_DIR/backend"
FRONTEND_DIR="$ROOT_DIR/frontend"

# Install dependencies if node_modules is missing
echo "Checking dependencies..."
if [ ! -d "$BACKEND_DIR/node_modules" ]; then
  echo "Installing backend dependencies..."
  (cd "$BACKEND_DIR" && npm install) || exit 1
else
  echo "Updating backend dependencies..."
  (cd "$BACKEND_DIR" && npm install) || exit 1
fi

if [ ! -d "$FRONTEND_DIR/node_modules" ]; then
  echo "Installing frontend dependencies..."
  (cd "$FRONTEND_DIR" && npm install) || exit 1
else
  echo "Updating frontend dependencies..."
  (cd "$FRONTEND_DIR" && npm install) || exit 1
fi

echo "Starting backend from: $BACKEND_DIR"
(
  cd "$BACKEND_DIR" || exit 1
  npm start
) &
BACKEND_PID=$!

echo "Starting frontend from: $FRONTEND_DIR"
(
  cd "$FRONTEND_DIR" || exit 1
  npm start
) &
FRONTEND_PID=$!

echo "Backend PID: $BACKEND_PID"
echo "Frontend PID: $FRONTEND_PID"

echo "Waiting for both servers..."
wait $BACKEND_PID $FRONTEND_PID
