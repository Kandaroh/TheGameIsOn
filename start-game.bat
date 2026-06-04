@echo off
REM Launch both frontend and backend servers in separate terminal windows
REM Run this from the repository root: start-game.bat

set ROOT_DIR=%~dp0
set BACKEND_DIR=%ROOT_DIR%backend
set FRONTEND_DIR=%ROOT_DIR%frontend

echo Starting backend from: %BACKEND_DIR%
start "TheGameIsOn Backend" cmd /k "cd /d %BACKEND_DIR% && npm install && npm start"

echo Starting frontend from: %FRONTEND_DIR%
start "TheGameIsOn Frontend" cmd /k "cd /d %FRONTEND_DIR% && npm install && npm start"

echo.
echo Both servers launched in separate windows:
echo Backend: http://localhost:4000
echo Frontend: http://localhost:4200
