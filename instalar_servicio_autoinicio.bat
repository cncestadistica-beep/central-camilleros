@echo off
title Instalar Auto-Inicio 24/7 - Central de Camilleros
color 0A
echo =======================================================================
echo    CONFIGURANDO SERVICIO 24/7 PERMANENTE - CENTRAL DE CAMILLEROS
echo =======================================================================
echo.

set "TARGET_SCRIPT=%~dp0iniciar_servicio_segundo_plano.vbs"
set "STARTUP_FOLDER=%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup"
set "SHORTCUT=%STARTUP_FOLDER%\CentralCamilleros24-7.vbs"

echo Copiando acceso al inicio automatico de Windows...
copy /Y "%TARGET_SCRIPT%" "%SHORTCUT%" >nul

if exist "%SHORTCUT%" (
    echo.
    echo [OK] Servicio configurado exitosamente!
    echo El servidor se iniciara solo cada vez que se encienda o reinicie el equipo.
    echo.
    echo Iniciando servicio ahora mismo en segundo plano...
    wscript "%TARGET_SCRIPT%"
    echo.
    echo [LISTO] La Central de Camilleros ya esta funcionando 24/7 en:
    echo   - Web App:       http://localhost:1337 / http://172.21.21.37:1337
    echo   - API:           http://localhost:1337/parse
    echo   - Dashboard:     http://localhost:1337/dashboard
) else (
    echo [ERROR] No se pudo copiar el archivo al inicio automatico.
)

echo.
echo =======================================================================
pause
