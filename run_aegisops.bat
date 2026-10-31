@echo off
setlocal
echo ============================================================
echo    AEGISOPS: Autonomous Multi-Agent Incident Response Crew
echo    Setup + Launch Script (Windows)
echo ============================================================
echo.

set "ROOT_DIR=%~dp0"

:: ---- CHECK PYTHON ----
where python >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo [ERROR] Python is not installed or not in PATH.
    echo Please install Python 3.10+ from https://python.org
    pause
    exit /b 1
)

:: ---- CHECK NODE ----
where npm >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo [ERROR] Node.js / npm is not installed or not in PATH.
    echo Please install Node.js 18+ from https://nodejs.org
    pause
    exit /b 1
)

:: ---- BACKEND SETUP ----
echo [1/4] Setting up Python Backend...
cd /d "%ROOT_DIR%backend"

if not exist "venv" (
    echo       Creating Python virtual environment...
    python -m venv venv
)

call venv\Scripts\activate.bat
echo       Installing Python dependencies...
pip install -r requirements.txt --quiet

:: ---- CREATE .env IF MISSING ----
if not exist ".env" (
    echo       Creating default .env file...
    echo GROQ_API_KEY=your_groq_api_key_here > .env
    echo       [NOTE] Edit backend\.env to add your Groq API key for the AI chatbot.
)

:: ---- FRONTEND SETUP ----
echo [2/4] Setting up React Frontend...
cd /d "%ROOT_DIR%frontend"

if not exist "node_modules" (
    echo       Installing npm dependencies...
    call npm.cmd install --silent
) else (
    echo       node_modules found, skipping install.
)

:: ---- START BACKEND ----
echo [3/4] Starting Backend Engine on http://localhost:8000 ...
cd /d "%ROOT_DIR%backend"
start "AegisOps Backend" cmd /k "call venv\Scripts\activate.bat && set PYTHONPATH=%ROOT_DIR%backend && python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload"

:: ---- START FRONTEND ----
echo [4/4] Starting War Room UI on http://localhost:3000 ...
cd /d "%ROOT_DIR%frontend"
start "AegisOps Frontend" cmd /k "npm.cmd run dev -- --host --port 3000"

echo.
echo ============================================================
echo   Waiting for services to boot (5 seconds)...
echo ============================================================
timeout /t 5 >nul

echo.
echo   Opening browser at http://localhost:3000 ...
start http://localhost:3000

echo.
echo ============================================================
echo   AegisOps is LIVE!
echo.
echo   War Room UI:    http://localhost:3000
echo   Backend API:    http://localhost:8000
echo   Swagger Docs:   http://localhost:8000/docs
echo ============================================================
echo.
echo   Press any key to close this window (services keep running).
pause >nul
