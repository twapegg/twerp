@echo off
setlocal
cd /d "%~dp0"

echo ==============================
echo  Starting Twerp
echo ==============================
echo.
echo Backend: cloud Supabase + hosted n8n (see .env.local). No Docker needed.
echo To use the old local Docker stack instead, run start-twerp-local.bat.
echo.

REM --- Frontend dev server: only start it if it isn't already running,   ---
REM --- so we never end up with two orphaned vite processes fighting over ---
REM --- port 5173 (bitten by that exact bug once already - it serves      ---
REM --- stale CSS/JS when that happens).                                 ---
netstat -ano | findstr ":5173" | findstr "LISTENING" >nul
if errorlevel 1 (
    echo Starting dev server...
    start "Twerp dev server" cmd /k "cd /d "%~dp0" && npm run dev"
    echo Waiting for it to come up...
    :waitvite
    "%SystemRoot%\System32\timeout.exe" /t 2 /nobreak >nul
    "%SystemRoot%\System32\curl.exe" -s -o nul http://localhost:5173 2>nul
    if errorlevel 1 goto waitvite
) else (
    echo Dev server already running on port 5173.
)
echo.

REM --- Open the web UI ---
start "" "http://localhost:5173"

echo ==============================
echo  Twerp is up:
echo    App:   http://localhost:5173
echo    n8n:   https://twapegg.awesomate.io
echo ==============================
echo.
pause
endlocal
