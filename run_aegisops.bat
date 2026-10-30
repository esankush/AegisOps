@echo off
setlocal
echo ========================================================
echo    AEGISOPS: Autonomous Multi-Agent Incident Crew
echo ========================================================
echo.

set "ROOT_DIR=%~dp0"
set "PYTHONPATH=%ROOT_DIR%backend;%PYTHONPATH%"

echo [1/2] Starting AegisOps Multi-Agent Backend on http://localhost:8000 ...
start "AegisOps Backend Engine" cmd /k "cd /d %ROOT_DIR%backend && set PYTHONPATH=%ROOT_DIR%backend && call venv\Scripts\activate.bat && python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload"

echo [2/2] Starting Interstellar War Room UI on http://localhost:3000 ...
start "AegisOps Interstellar UI" cmd /k "cd /d %ROOT_DIR%frontend && npm.cmd run dev -- --host --port 3000"

echo.
echo Waiting 3 seconds for services to initialize...
timeout /t 3 >nul

echo Launching browser...
start http://localhost:3000
echo AegisOps is running!
