@echo off
setlocal enabledelayedexpansion
cd /d "%~dp0"

echo ==============================
echo  Starting Twerp (LOCAL Docker stack)
echo ==============================
echo.
echo NOTE: the app reads its backend from .env.local, which now points at the
echo cloud Supabase project and hosted n8n. To actually use this local stack,
echo swap in the LOCAL_* values there first.
echo.

REM --- Make sure Docker Desktop's engine is running ---
docker info >nul 2>&1
if errorlevel 1 (
    echo Docker engine not running - starting Docker Desktop...
    start "" "C:\Program Files\Docker\Docker\Docker Desktop.exe"

    :waitdocker
    "%SystemRoot%\System32\timeout.exe" /t 3 /nobreak >nul
    docker info >nul 2>&1
    if errorlevel 1 (
        echo   still waiting for Docker...
        goto waitdocker
    )
)
echo Docker engine is ready.
echo.

echo Starting Supabase stack...
pushd "%~dp0supabase"
docker compose up -d
popd
echo.

echo Starting n8n stack...
pushd "%~dp0n8n"
docker compose up -d
popd
echo.

call "%~dp0start-twerp.bat"
endlocal
