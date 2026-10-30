# Start the local development stack: PostgreSQL (port 5434), FastAPI (8010), Next.js (3000).
# Usage (from the project folder):  powershell -ExecutionPolicy Bypass -File scripts\start-dev.ps1
$root = Split-Path -Parent $PSScriptRoot
$pgBin = "C:\Program Files\PostgreSQL\16\bin"
$pgData = Join-Path $root ".pgdata"

& "$pgBin\pg_ctl.exe" status -D $pgData *> $null
if ($LASTEXITCODE -ne 0) {
  Write-Host "Starting PostgreSQL on port 5434..."
  Start-Process -FilePath "$pgBin\pg_ctl.exe" -ArgumentList @("start", "-D", "`"$pgData`"", "-l", "`"$pgData\server.log`"", "-w") -WindowStyle Hidden -Wait
} else {
  Write-Host "PostgreSQL already running."
}

Write-Host "Starting backend (http://127.0.0.1:8010) and frontend (http://localhost:3000) in new windows..."
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$root\backend'; .\.venv\Scripts\alembic upgrade head; .\.venv\Scripts\uvicorn app.main:app --host 127.0.0.1 --port 8010"
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$root\frontend'; npm run dev -- -p 3000"
Write-Host "Website: http://localhost:3000    Admin: http://localhost:3000/admin"
