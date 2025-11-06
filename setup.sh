#!/bin/bash

# DomUnity Quick Start Script
# This script helps you get the project running quickly

set -e  # Exit on error

echo "🚀 DomUnity Project Setup"
echo "========================="
echo ""

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker and try again."
    exit 1
fi

# Check if Rust is installed
if ! command -v cargo &> /dev/null; then
    echo "❌ Rust is not installed. Install from https://rustup.rs/"
    exit 1
fi

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Install from https://nodejs.org/"
    exit 1
fi

echo "✅ Prerequisites check passed!"
echo ""

# Start database
echo "📦 Starting PostgreSQL database..."
docker-compose up -d
sleep 3

# Setup backend
echo ""
echo "🦀 Setting up Rust backend..."
cd backend

if [ ! -f .env ]; then
    cp .env.example .env
    echo "✅ Created backend/.env"
fi

echo "Building backend (this will take a few minutes first time)..."
cargo build

echo "Installing sqlx-cli..."
if ! command -v sqlx &> /dev/null; then
    cargo install sqlx-cli --no-default-features --features postgres
fi

echo "Running database migrations..."
sqlx migrate run

cd ..

# Setup frontend
echo ""
echo "⚛️  Setting up React frontend..."
cd frontend

if [ ! -f .env ]; then
    echo "VITE_API_URL=http://localhost:50051" > .env
    echo "✅ Created frontend/.env"
fi

echo "Installing npm dependencies..."
npm install

echo "Installing buf CLI..."
npm install -g @bufbuild/buf 2>/dev/null || true

echo "Generating TypeScript from proto files..."
npm run generate-proto

# Copy images if they exist
cd ..
if [ -d "images" ] && [ ! -d "frontend/public/images" ]; then
    echo "Copying images to public folder..."
    mkdir -p frontend/public
    cp -r images frontend/public/
fi

echo ""
echo "✅ Setup complete!"
echo ""
echo "To start the application:"
echo ""
echo "Terminal 1 - Backend:"
echo "  cd backend && cargo run"
echo ""
echo "Terminal 2 - Frontend:"
echo "  cd frontend && npm run dev"
echo ""
echo "Then open: http://localhost:5173"
echo ""
echo "See NEXT_STEPS.md for detailed instructions!"
