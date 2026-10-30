@echo off
setlocal
echo ========================================================
echo    Starting AegisOps Multi-Agent Backend Engine...
echo ========================================================
cd /d %~dp0
set "PYTHONPATH=%~dp0;%PYTHONPATH%"

if exist "venv\Scripts\activate.bat" (
    call venv\Scripts\activate.bat
    python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
) else (
    echo [ERROR] Virtual environment not found in %~dp0venv!
    pause
)
