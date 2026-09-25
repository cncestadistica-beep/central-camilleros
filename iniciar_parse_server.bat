@echo off
title Parse Server y Parse Dashboard - Clinica Nueva de Cali
color 0A
echo =====================================================================
echo    INICIANDO PARSE SERVER Y PARSE DASHBOARD (CLINICA NUEVA DE CALI)
echo =====================================================================
echo.
echo  Base de datos: PostgreSQL (Servidor 172.21.21.37)
echo  Endpoint API:  http://localhost:1337/parse
echo  Dashboard Web: http://localhost:1337/dashboard
echo  Usuario:       admin
echo  Contrasena:    CNC2026
echo.
echo =====================================================================
echo.
cd /d "%~dp0"
node server/parse_server.cjs
pause
