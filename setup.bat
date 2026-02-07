@echo off
REM SAVR Setup Script (Windows)
REM This script installs all dependencies for the SAVR monorepo

echo Setting up SAVR monorepo...
echo.

REM Check if we're in the right directory
if not exist package.json (
    echo Error: Please run this script from the SAVR root directory
    exit /b 1
)
if not exist functions (
    echo Error: Please run this script from the SAVR root directory
    exit /b 1
)
if not exist web (
    echo Error: Please run this script from the SAVR root directory
    exit /b 1
)

REM Install web dependencies
echo Installing web dependencies...
cd web
call npm install
if errorlevel 1 (
    echo Error installing web dependencies
    exit /b 1
)
cd ..
echo Web dependencies installed successfully
echo.

REM Install functions dependencies
echo Installing functions dependencies...
cd functions
call npm install
if errorlevel 1 (
    echo Error installing functions dependencies
    exit /b 1
)
cd ..
echo Functions dependencies installed successfully
echo.

REM Build functions
echo Building functions...
cd functions
call npm run build
if errorlevel 1 (
    echo Error building functions
    exit /b 1
)
cd ..
echo Functions built successfully
echo.

echo Setup complete! You can now run:
echo    npm run deploy           - Deploy to Firebase
echo    cd web ^&^& npm run dev      - Start web development server
echo    cd functions ^&^& npm run serve  - Start Firebase emulator
