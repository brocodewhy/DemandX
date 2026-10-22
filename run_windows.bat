@echo off
setlocal
if not exist "backend\.env" (
  echo Missing backend\.env. Copy backend\.env.example to backend\.env and configure Google OAuth first.
  pause
  exit /b 1
)
if not exist "frontend\.env" (
  echo Missing frontend\.env. Copy frontend\.env.example to frontend\.env and configure Google OAuth first.
  pause
  exit /b 1
)
start "DemandX API" cmd /k "cd /d %~dp0backend && if not exist .venv python -m venv .venv && call .venv\Scripts\activate && pip install -r requirements.txt && uvicorn app.main:app --reload --port 8000"
start "DemandX Web" cmd /k "cd /d %~dp0frontend && npm install && npm run dev"
echo DemandX is starting in two terminal windows.
