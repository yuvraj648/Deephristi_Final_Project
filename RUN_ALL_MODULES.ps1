# DeepDrishti Master Launcher (PowerShell)
Write-Host "======================================================================" -ForegroundColor Cyan
Write-Host "           DEEPDRISHTI UNIFIED MARINE INTELLIGENCE PLATFORM           " -ForegroundColor Cyan
Write-Host "======================================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Launching Services:" -ForegroundColor Yellow
Write-Host "  [1] eDNA AI Backend API (FastAPI)            -> Port 8000" -ForegroundColor Gray
Write-Host "  [2] DeepDrishti Main Hub & Researcher UI     -> Port 5173" -ForegroundColor Gray
Write-Host "  [3] Underwater Surveillance AI Model         -> Port 5001" -ForegroundColor Gray
Write-Host "  [4] Underwater Surveillance Backend API      -> Port 5003" -ForegroundColor Gray
Write-Host "  [5] Underwater Surveillance Naval Console    -> Port 5175" -ForegroundColor Gray
Write-Host ""

$root = $PSScriptRoot
$module1_backend = Join-Path $root "E-DNA\project files\MODELS"
$module1_ui = Join-Path $root "E-DNA\project files\UI"
$surveillance = Join-Path $root "SURVEILLANCE\DeepDrishti"

Write-Host "[1/3] Starting Module 01 Backend (Port 8000)..." -ForegroundColor Yellow
Start-Process cmd -ArgumentList "/k", "cd /d `"$module1_backend`" && python -m uvicorn api:app --host 0.0.0.0 --port 8000 --reload" -WindowStyle Normal

Write-Host "[2/3] Starting Module 01 Frontend (Port 5173)..." -ForegroundColor Yellow
Start-Process cmd -ArgumentList "/k", "cd /d `"$module1_ui`" && npm.cmd run dev" -WindowStyle Normal

Write-Host "[3/3] Starting Module 02 Surveillance System (Ports 5001, 5003, 5175)..." -ForegroundColor Yellow
Start-Process cmd -ArgumentList "/c", "cd /d `"$surveillance`" && run_all.bat" -WindowStyle Normal

Write-Host ""
Write-Host "======================================================================" -ForegroundColor Green
Write-Host " All services are launching in dedicated console windows!" -ForegroundColor Green
Write-Host "======================================================================" -ForegroundColor Green
Write-Host ""
Write-Host "  * Main Platform Hub:           http://localhost:5173" -ForegroundColor Cyan
Write-Host "  * Physical Surveillance Deck:  http://localhost:5175" -ForegroundColor Cyan
Write-Host "  * eDNA AI API (FastAPI):       http://localhost:8000/docs" -ForegroundColor Cyan
Write-Host "  * Surveillance API:            http://localhost:5003" -ForegroundColor Cyan
Write-Host "  * Computer Vision AI:          http://localhost:5001" -ForegroundColor Cyan
Write-Host ""
