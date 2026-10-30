@echo off
echo ========================================================
echo    AEGISOPS: Autonomous Multi-Agent Incident Crew
echo ========================================================
echo.

echo [1/2] Starting AegisOps Multi-Agent Backend on port 8000...
start "AegisOps Backend Engine" cmd /k "cd /d %~dp0backend && call venv\Scripts\activate && uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload"

echo [2/2] Starting Interstellar Frontend on port 3000...
start "AegisOps Interstellar Cockpit" cmd /k "cd /d %~dp0frontend && npm.cmd run dev -- --host --port 3000"

echo.
echo Both services are spinning up!
echo Backend API & WebSockets: http://localhost:8000/docs
echo War Room Dashboard:       http://localhost:3000
echo.
timeout /t 3 >nul
start http://localhost:3000
