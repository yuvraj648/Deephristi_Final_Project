@echo off
title DeepDrishti System Launcher
echo ========================================================
echo   Launching DeepDrishti Marine Surveillance System
echo ========================================================
echo.

echo [1/3] Starting Python AI Model Microservice (Port 5001)...
if exist "%~dp0model\.venv\Scripts\python.exe" (
    start "DeepDrishti - AI Model (Port 5001)" cmd /k "cd /d %~dp0model && .\.venv\Scripts\python.exe app.py"
) else if exist "%~dp0model\venv\Scripts\python.exe" (
    start "DeepDrishti - AI Model (Port 5001)" cmd /k "cd /d %~dp0model && .\venv\Scripts\python.exe app.py"
) else (
    start "DeepDrishti - AI Model (Port 5001)" cmd /k "cd /d %~dp0model && python app.py"
)

echo [2/3] Starting Express Backend API (Port 5003)...
start "DeepDrishti - Backend API (Port 5003)" cmd /k "cd /d %~dp0backend && node server/server.js"

echo [3/3] Starting React / Vite Frontend (Port 5175)...
start "DeepDrishti - Frontend UI (Port 5175)" cmd /k "cd /d %~dp0frontend && npm.cmd run dev"

echo.
echo All 3 services are launching in separate windows!
echo - Web Dashboard: http://localhost:5175
echo - Backend API:   http://localhost:5003
echo - AI Service:    http://localhost:5001
echo.
pause
