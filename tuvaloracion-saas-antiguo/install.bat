@echo off
echo ====================================
echo Instalador de Tu Valoracion SaaS
echo ====================================
echo.

echo Verificando Node.js...
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Node.js no esta instalado!
    echo Por favor, instala Node.js desde: https://nodejs.org/
    pause
    exit /b 1
)

echo Node.js detectado!
echo.

echo Instalando dependencias...
npm install

if %errorlevel% neq 0 (
    echo [ERROR] Error al instalar dependencias
    pause
    exit /b 1
)

echo.
echo ====================================
echo Instalacion completada!
echo ====================================
echo.
echo Proximos pasos:
echo 1. Copia .env.example a .env.local
echo 2. Configura las variables de entorno
echo 3. Ejecuta: npm run init-db
echo 4. Ejecuta: npm run dev
echo.
pause
