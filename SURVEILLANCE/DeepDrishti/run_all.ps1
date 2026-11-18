# DeepDrishti System Launcher (PowerShell)
Write-Host "========================================================" -ForegroundColor Cyan
Write-Host "  Launching DeepDrishti Marine Surveillance System" -ForegroundColor Cyan
Write-Host "========================================================" -ForegroundColor Cyan
Write-Host ""

$root = $PSScriptRoot

Write-Host "[1/3] Starting Python AI Model Microservice (Port 5001)..." -ForegroundColor Yellow
$pyPath = if (Test-Path "$root\model\venv\Scripts\python.exe") { "$root\model\venv\Scripts\python.exe" } else { "python" }
Start-Process cmd -ArgumentList "/k", "cd /d `"$root\model`" && `"$pyPath`" app.py" -WindowStyle Normal

Write-Host "[2/3] Starting Express Backend API (Port 5003)..." -ForegroundColor Yellow
Start-Process cmd -ArgumentList "/k", "cd /d `"$root\backend`" && node server/server.js" -WindowStyle Normal

Write-Host "[3/3] Starting React / Vite Frontend (Port 5175)..." -ForegroundColor Yellow
Start-Process cmd -ArgumentList "/k", "cd /d `"$root\frontend`" && npm.cmd run dev" -WindowStyle Normal

Write-Host ""
Write-Host "All 3 services are launching in separate windows!" -ForegroundColor Green
Write-Host "  - Web Dashboard: http://localhost:5175" -ForegroundColor Green
Write-Host "  - Backend API:   http://localhost:5003" -ForegroundColor Green
Write-Host "  - AI Service:    http://localhost:5001" -ForegroundColor Green
Write-Host ""
