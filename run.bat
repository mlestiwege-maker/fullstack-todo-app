@echo off
REM Run both backend and frontend servers on Windows

setlocal enabledelayedexpansion

REM Get the project root directory
for %%I in ("%~dp0.") do set "PROJECT_DIR=%%~fI"
set "BACKEND_DIR=%PROJECT_DIR%\backend"
set "FRONTEND_DIR=%PROJECT_DIR%\frontend"
set "VENV_DIR=%PROJECT_DIR%\.venv"

REM Check if virtual environment exists, if not create it
if not exist "%VENV_DIR%" (
    echo Creating virtual environment...
    python -m venv "%VENV_DIR%"
)

REM Setup backend
echo Setting up backend...
call "%VENV_DIR%\Scripts\activate.bat"
pip install -r "%BACKEND_DIR%\requirements.txt" -q

REM Setup frontend
echo Setting up frontend...
cd /d "%FRONTEND_DIR%"
call npm install -q 2>nul || call npm install

REM Start backend in a new window
echo Starting backend on http://localhost:8000
cd /d "%BACKEND_DIR%"
call "%VENV_DIR%\Scripts\activate.bat"
start "Todo App - Backend" cmd /k python -m uvicorn main:app --reload --port 8000

REM Give backend time to start
timeout /t 2 /nobreak

REM Start frontend in a new window
echo Starting frontend on http://localhost:3000
cd /d "%FRONTEND_DIR%"
start "Todo App - Frontend" cmd /k npm run dev

REM Display information
echo.
echo ========================================
echo Todo App is running!
echo Backend: http://localhost:8000
echo Frontend: http://localhost:3000
echo API Docs: http://localhost:8000/docs
echo ========================================
echo.
pause
