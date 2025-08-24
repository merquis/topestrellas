@echo off
echo ========================================
echo Migracion de estructura de caracteristicas
echo ========================================
echo.
echo Este script actualizara la estructura de las caracteristicas
echo de los planes de suscripcion al nuevo formato con propiedades
echo 'name' e 'included'.
echo.
echo Presiona Ctrl+C para cancelar o...
pause

cd /d "%~dp0"
node scripts/migrate-features-structure.js

echo.
echo ========================================
echo Migracion completada
echo ========================================
pause
