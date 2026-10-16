$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $PSScriptRoot
Set-Location $Root
& (Join-Path $Root ".venv\Scripts\python.exe") -m pytest
