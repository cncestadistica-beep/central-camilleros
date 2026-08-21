@echo off
title Pasar SQLite a Servidor PostgreSQL - Clinica Nueva de Cali
echo ========================================================
echo   PASAR DATOS DE SQLITE AL SERVIDOR POSTGRESQL LOCAL
echo ========================================================
echo.
cd /d "%~dp0\.."
node scripts/sync_sqlite_to_postgres.cjs
echo.
echo Presione cualquier tecla para salir...
pause >nul
