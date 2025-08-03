@echo off
echo ========================================
echo  ACTUALIZACION MULTIIDIOMA DE NEGOCIOS
echo ========================================
echo.
echo Este script actualizara todos los negocios existentes
echo para que soporten los 4 idiomas: ES, EN, DE, FR
echo.
pause

cd /d "%~dp0"

echo Ejecutando script de actualizacion...
node scripts/update-business-multilang.js

echo.
echo ========================================
echo  ACTUALIZACION COMPLETADA
echo ========================================
pause
