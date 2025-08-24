@echo off
echo ============================================================
echo SINCRONIZACION DE PLANES CON STRIPE
echo ============================================================
echo.

cd /d "%~dp0"

echo Ejecutando script de sincronizacion...
echo.

node scripts/sync-all-plans-to-stripe.js

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo ERROR: La sincronizacion fallo. Codigo de error: %ERRORLEVEL%
    pause
    exit /b %ERRORLEVEL%
)

echo.
echo ============================================================
echo SINCRONIZACION COMPLETADA
echo ============================================================
pause
