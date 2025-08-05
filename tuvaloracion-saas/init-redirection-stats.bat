@echo off
echo Inicializando redirectionStats para negocios existentes...
echo.

node scripts/init-redirection-stats.js

echo.
echo Presiona cualquier tecla para continuar...
pause >nul
