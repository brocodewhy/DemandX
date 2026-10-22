#!/usr/bin/env bash
set -e
if [ ! -f backend/.env ] || [ ! -f frontend/.env ]; then
  echo "Copy backend/.env.example to backend/.env and frontend/.env.example to frontend/.env, then configure Google OAuth."
  exit 1
fi
(
  cd backend
  python3 -m venv .venv
  source .venv/bin/activate
  pip install -r requirements.txt
  uvicorn app.main:app --reload --port 8000
) &
BACKEND_PID=$!
(
  cd frontend
  npm install
  npm run dev
) &
FRONTEND_PID=$!
trap 'kill "$BACKEND_PID" "$FRONTEND_PID" 2>/dev/null || true' EXIT INT TERM
wait
