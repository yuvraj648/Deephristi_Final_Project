@echo off
title DeepDrishti Project Launcher
color 0A

echo =====================================================
echo   DEEPDRISHTI - Ocean Biodiversity AI Platform
echo   Starting all services...
echo =====================================================
echo.

echo [1/2] Starting Python Backend (FastAPI on port 8000)...
set "PY_CMD=python"
if exist "C:\Python314\python.exe" set "PY_CMD=C:\Python314\python.exe"
start "DeepDrishti Backend" cmd /k "cd /d "%~dp0MODELS" && %PY_CMD% -m uvicorn api:app --host 0.0.0.0 --port 8000 --reload"

echo     Waiting 10 seconds for backend to initialize...
timeout /t 10 /nobreak >nul

echo [2/2] Starting React Frontend (Vite on port 5173)...
start "DeepDrishti Frontend" cmd /k "cd /d "%~dp0UI" && npm run dev"

echo     Waiting 5 seconds for frontend to start...
timeout /t 5 /nobreak >nul

echo.
echo =====================================================
echo   Both services are starting!
echo   Wait for all 3 ML models to load (~60 seconds)
echo   then open: http://localhost:5173
echo =====================================================

start "" "http://localhost:5173"
pause
