@echo off
cd /d "%~dp0\.."
"C:\Program Files\nodejs\node.exe" server\parse_server.cjs >> server\server.log 2>&1
