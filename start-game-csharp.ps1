# Launch C# backend + Angular frontend in separate PowerShell windows.
# Run from the repository root: .\start-game-csharp.ps1

$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$backendDir  = Join-Path $root 'backend-csharp'
$frontendDir = Join-Path $root 'frontend'

# --- C# Backend ---
Write-Host "Starting C# backend in: $backendDir"
Start-Process powershell -ArgumentList @(
    '-NoExit', '-Command',
    "Set-Location '$backendDir'; dotnet run --project TheGameIsOn.API"
)

# --- Angular Frontend ---
Write-Host "Starting frontend in: $frontendDir"
Start-Process powershell -ArgumentList @(
    '-NoExit', '-Command',
    "Set-Location '$frontendDir'; npm install; npm start"
)

Write-Host ""
Write-Host "Both servers launched in separate windows:"
Write-Host "  Backend  (C#):  http://localhost:4000"
Write-Host "  Frontend (ng):  http://localhost:4200"
