#!/bin/bash
# SAVR Setup Script
# This script installs all dependencies for the SAVR monorepo

set -e

echo "🚀 Setting up SAVR monorepo..."
echo ""

# Check if we're in the right directory
if [ ! -f "package.json" ] || [ ! -d "functions" ] || [ ! -d "web" ]; then
    echo "❌ Error: Please run this script from the SAVR root directory"
    exit 1
fi

# Install web dependencies
echo "📦 Installing web dependencies..."
cd web
npm install
cd ..
echo "✅ Web dependencies installed"
echo ""

# Install functions dependencies
echo "📦 Installing functions dependencies..."
cd functions
npm install
cd ..
echo "✅ Functions dependencies installed"
echo ""

# Build functions
echo "🔨 Building functions..."
cd functions
npm run build
cd ..
echo "✅ Functions built successfully"
echo ""

echo "✨ Setup complete! You can now run:"
echo "   npm run deploy    - Deploy to Firebase"
echo "   cd web && npm run dev    - Start web development server"
echo "   cd functions && npm run serve    - Start Firebase emulator"
