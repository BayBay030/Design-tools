@echo off
title Design Tools - Dev Server
cd /d "%~dp0"

where npm >nul 2>nul
if errorlevel 1 (
  echo.
  echo  [X] Node.js / npm not found.
  echo      Install Node.js 18+ from https://nodejs.org then run this again.
  echo.
  pause
  exit /b 1
)

if not exist "node_modules\" (
  echo.
  echo  [1/2] First run - installing packages, this takes a few minutes...
  echo.
  call npm install
  if errorlevel 1 (
    echo.
    echo  [X] npm install failed - see messages above.
    pause
    exit /b 1
  )
)

echo.
echo  [2/2] Starting dev server  ^> http://localhost:3000
echo        Browser opens by itself. Close this window to stop.
echo.
call npm run dev

echo.
echo  Dev server stopped.
pause
