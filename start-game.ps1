# Launch both frontend and backend servers in separate PowerShell windows.
# Run this from the repository root: .\start-game.ps1

$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$backendDir = Join-Path $root 'backend'
$frontendDir = Join-Path $root 'frontend'

Write-Host "Starting backend in: $backendDir"
Start-Process powershell -ArgumentList @('-NoExit', '-Command', "Set-Location '$backendDir'; npm start")

Write-Host "Starting frontend in: $frontendDir"
Start-Process powershell -ArgumentList @('-NoExit', '-Command', "Set-Location '$frontendDir'; npm start")
