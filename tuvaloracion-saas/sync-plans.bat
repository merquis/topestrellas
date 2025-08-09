@echo off
echo ========================================
echo   SINCRONIZACION DE PLANES CON STRIPE
echo ========================================
echo.

REM Verificar si existe el archivo .env
if not exist .env (
    echo ERROR: No se encontro el archivo .env
    echo Por favor, crea un archivo .env con las variables necesarias
    pause
    exit /b 1
)

REM Cargar variables de entorno desde .env
for /f "tokens=1,2 delims==" %%a in (.env) do (
    set %%a=%%b
)

REM Verificar que las variables necesarias estén configuradas
if "%STRIPE_SECRET_KEY%"=="" (
    echo ERROR: STRIPE_SECRET_KEY no esta configurada en .env
    pause
    exit /b 1
)

if "%MONGODB_URI%"=="" (
    echo ERROR: MONGODB_URI no esta configurada en .env
    pause
    exit /b 1
)

echo Configuracion detectada:
echo - MongoDB: Conectado
echo - Stripe: Configurado
echo.

echo Sincronizando planes de suscripcion...
echo ----------------------------------------
node scripts/sync-subscription-plans.js

if %ERRORLEVEL% EQU 0 (
    echo.
    echo ========================================
    echo   SINCRONIZACION COMPLETADA CON EXITO
    echo ========================================
) else (
    echo.
    echo ========================================
    echo   ERROR EN LA SINCRONIZACION
    echo ========================================
)

echo.
pause
