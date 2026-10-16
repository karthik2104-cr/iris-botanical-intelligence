$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $PSScriptRoot
Set-Location $Root
$port = if ($env:BACKEND_PORT) { $env:BACKEND_PORT } else { "8002" }
& (Join-Path $Root ".venv\Scripts\python.exe") -m uvicorn backend.app.main:app --host 127.0.0.1 --port $port --reload
