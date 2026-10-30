@echo off
echo ========================================================
echo        Pushing AegisOps to GitHub: esankush/AegisOps
echo ========================================================
echo.
cd /d %~dp0

echo Setting Git identity...
git config user.name "esankush"
git config user.email "ankushpron88@gmail.com"

echo Setting remote origin...
git remote set-url origin https://github.com/esankush/AegisOps.git

echo.
echo Pushing code to GitHub...
echo (If a browser window appears, click "Sign in with your browser" to authorize Git Credential Manager)
echo.

git push -u origin main --force

echo.
if %ERRORLEVEL% equ 0 (
    echo ========================================================
    echo  SUCCESS! Code pushed to https://github.com/esankush/AegisOps
    echo ========================================================
) else (
    echo.
    echo If authentication failed, you can also use a GitHub Personal Access Token (PAT).
    echo Generate one at: https://github.com/settings/tokens (select 'repo' scope)
    echo Then run:
    echo   git remote set-url origin https://<TOKEN>@github.com/esankush/AegisOps.git
    echo   git push -u origin main --force
)
echo.
pause

