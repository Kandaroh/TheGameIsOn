#!/usr/bin/env sh
# Launch C# backend + Angular frontend from the repository root.
# Usage: sh ./start-game-csharp.sh

# Resolve repo root
if [ "${BASH_SOURCE[0]}" = "${0}" ] 2>/dev/null; then
  ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"
else
  ROOT_DIR="${PWD}"
fi

BACKEND_DIR="$ROOT_DIR/backend-csharp"
FRONTEND_DIR="$ROOT_DIR/frontend"

# --- Frontend deps ---
echo "Checking frontend dependencies..."
if [ ! -d "$FRONTEND_DIR/node_modules" ]; then
  echo "Installing frontend dependencies..."
  (cd "$FRONTEND_DIR" && npm install) || exit 1
else
  echo "Updating frontend dependencies..."
  (cd "$FRONTEND_DIR" && npm install) || exit 1
fi

# --- C# Backend ---
echo "Starting C# backend from: $BACKEND_DIR"
(
  cd "$BACKEND_DIR" || exit 1
  dotnet run --project TheGameIsOn.API
) &
BACKEND_PID=$!

# --- Angular Frontend ---
echo "Starting frontend from: $FRONTEND_DIR"
(
  cd "$FRONTEND_DIR" || exit 1
  npm start
) &
FRONTEND_PID=$!

echo ""
echo "Backend  PID: $BACKEND_PID  ->  http://localhost:4000"
echo "Frontend PID: $FRONTEND_PID  ->  http://localhost:4200"
echo ""
echo "Waiting for both servers..."
wait $BACKEND_PID $FRONTEND_PID
