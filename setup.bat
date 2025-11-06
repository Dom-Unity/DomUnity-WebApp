@echo off
REM DomUnity Quick Start Script for Windows
REM This script helps you get the project running quickly

echo.
echo 🚀 DomUnity Project Setup
echo =========================
echo.

REM Check if Docker is running
docker info >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Docker is not running. Please start Docker Desktop and try again.
    exit /b 1
)

REM Check if Rust is installed
cargo --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Rust is not installed. Install from https://rustup.rs/
    exit /b 1
)

REM Check if Node.js is installed
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Node.js is not installed. Install from https://nodejs.org/
    exit /b 1
)

echo ✅ Prerequisites check passed!
echo.

REM Start database
echo 📦 Starting PostgreSQL database...
docker-compose up -d
timeout /t 3 /nobreak >nul

REM Setup backend
echo.
echo 🦀 Setting up Rust backend...
cd backend

if not exist .env (
    copy .env.example .env
    echo ✅ Created backend\.env
)

echo Building backend (this will take a few minutes first time)...
cargo build

echo Installing sqlx-cli...
cargo install sqlx-cli --no-default-features --features postgres

echo Running database migrations...
sqlx migrate run

cd ..

REM Setup frontend
echo.
echo ⚛️  Setting up React frontend...
cd frontend

if not exist .env (
    echo VITE_API_URL=http://localhost:50051 > .env
    echo ✅ Created frontend\.env
)

echo Installing npm dependencies...
call npm install

echo Installing buf CLI...
call npm install -g @bufbuild/buf

echo Generating TypeScript from proto files...
call npm run generate-proto

REM Copy images if they exist
cd ..
if exist images (
    if not exist frontend\public\images (
        echo Copying images to public folder...
        mkdir frontend\public 2>nul
        xcopy /E /I /Y images frontend\public\images
    )
)

echo.
echo ✅ Setup complete!
echo.
echo To start the application:
echo.
echo Terminal 1 - Backend:
echo   cd backend ^&^& cargo run
echo.
echo Terminal 2 - Frontend:
echo   cd frontend ^&^& npm run dev
echo.
echo Then open: http://localhost:5173
echo.
echo See NEXT_STEPS.md for detailed instructions!
echo.
pause
