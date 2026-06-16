@echo off
setlocal

set "REPO_ROOT=%~dp0"
set "FRONTEND_DIR=%REPO_ROOT%frontend"

start "Talk2Campus Backend" powershell -NoExit -Command "Set-Location '%REPO_ROOT%'; python -m uvicorn backend.main:app --reload --port 8000"
timeout /t 1 /nobreak >nul
start "Talk2Campus Frontend" powershell -NoExit -Command "Set-Location '%FRONTEND_DIR%'; npm.cmd run dev -- --host 0.0.0.0 --port 5173"

echo Started Talk2Campus dev servers.
echo Frontend: http://localhost:5173
echo Backend:  http://127.0.0.1:8000

endlocal
