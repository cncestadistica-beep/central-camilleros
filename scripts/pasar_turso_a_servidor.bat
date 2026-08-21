@echo off
title Sincronizar Turso SQLite a Servidor Local
echo ========================================================
echo   SINCRONIZAR TURSO SQLITE A POSTGRESQL LOCAL (172.21.21.37)
echo ========================================================
echo.
cd /d "%~dp0\.."
node scripts/sync_turso_to_postgres.cjs
echo.
echo Presione cualquier tecla para salir...
pause >nul
