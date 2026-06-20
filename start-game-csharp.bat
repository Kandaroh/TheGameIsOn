@echo off
REM Launch C# backend + Angular frontend in separate terminal windows.
REM Run from the repository root: start-game-csharp.bat

set ROOT_DIR=%~dp0
set BACKEND_DIR=%ROOT_DIR%backend-csharp
set FRONTEND_DIR=%ROOT_DIR%frontend

echo Starting C# backend from: %BACKEND_DIR%
start "TheGameIsOn C# Backend" cmd /k "cd /d %BACKEND_DIR% && dotnet run --project TheGameIsOn.API"

echo Starting frontend from: %FRONTEND_DIR%
start "TheGameIsOn Frontend" cmd /k "cd /d %FRONTEND_DIR% && npm install && npm start"

echo.
echo Both servers launched in separate windows:
echo   Backend  (C#):  http://localhost:4000
echo   Frontend (ng):  http://localhost:4200
