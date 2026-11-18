@echo off
title DeepDrishti Master Launcher
echo ======================================================================
echo             DEEPDRISHTI UNIFIED MARINE INTELLIGENCE PLATFORM
echo ======================================================================
echo.
echo Launching:
echo   [1] eDNA AI Backend API (FastAPI)            -^> Port 8000
echo   [2] DeepDrishti Main Hub & Researcher UI     -^> Port 5173
echo   [3] Underwater Surveillance AI Model         -^> Port 5001
echo   [4] Underwater Surveillance Backend API      -^> Port 5003
echo   [5] Underwater Surveillance Naval Console    -^> Port 5175
echo.
echo ======================================================================

set "ROOT=%~dp0"
set "MODULE1_BACKEND=%ROOT%E-DNA\project files\MODELS"
set "MODULE1_UI=%ROOT%E-DNA\project files\UI"
set "SURVEILLANCE=%ROOT%SURVEILLANCE\DeepDrishti"

echo [1/3] Starting Module 01 Backend (Port 8000)...
start "DeepDrishti [1/5] - eDNA Backend (Port 8000)" cmd /k "cd /d "%MODULE1_BACKEND%" && python -m uvicorn api:app --host 0.0.0.0 --port 8000 --reload"

echo [2/3] Starting Module 01 Frontend (Port 5173)...
start "DeepDrishti [2/5] - Main UI (Port 5173)" cmd /k "cd /d "%MODULE1_UI%" && npm.cmd run dev"

echo [3/3] Starting Module 02 Surveillance System (Ports 5001, 5003, 5175)...
start "DeepDrishti [3,4,5] - Surveillance Stack" cmd /c "cd /d "%SURVEILLANCE%" && run_all.bat"

echo.
echo ======================================================================
echo  All services are launching in dedicated console windows!
echo ======================================================================
echo.
echo  * Main Platform Hub:           http://localhost:5173
echo  * Physical Surveillance Deck:  http://localhost:5175
echo  * eDNA AI API (FastAPI):       http://localhost:8000/docs
echo  * Surveillance API:            http://localhost:5003
echo  * Computer Vision AI:          http://localhost:5001
echo.
echo Press any key to close this launcher window (services keep running).
pause >nul
