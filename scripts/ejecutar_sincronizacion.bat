@echo off
title Sincronizador Nube a Local - Clinica Nueva de Cali
echo Iniciando sincronizacion de solicitudes hacia PostgreSQL Local...
cd /d "%~dp0\.."
node scripts/sync_cloud_to_local.cjs
echo.
echo Presione cualquier tecla para cerrar...
pause >nul
