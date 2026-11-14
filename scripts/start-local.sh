#!/bin/bash

# HU Fellowship Library - Local Development Setup
# This script helps you run the application locally

echo "🚀 Setting up HU Fellowship Library for local development..."

# Check if pnpm is installed
if ! command -v pnpm &> /dev/null; then
    echo "❌ pnpm is not installed. Please install it first:"
    echo "   npm install -g pnpm"
    exit 1
fi

# Check if PostgreSQL is running
if ! command -v psql &> /dev/null; then
    echo "⚠️  PostgreSQL not found. You'll need PostgreSQL installed and running."
    echo "   On Ubuntu/Debian: sudo apt-get install postgresql postgresql-contrib"
    echo "   On macOS: brew install postgresql"
fi

# Set default environment variables if not provided
export PORT=${PORT:-5173}
export BASE_PATH=${BASE_PATH:-/}
export DATABASE_URL=${DATABASE_URL:-"postgresql://localhost:5432/hu_fellowship_library"}

# API server port (different from frontend)
export API_PORT=${API_PORT:-3000}

echo ""
echo "📋 Environment Configuration:"
echo "   Frontend Port: $PORT"
echo "   API Port: $API_PORT"
echo "   Database URL: $DATABASE_URL"
echo "   Base Path: $BASE_PATH"
echo ""

# Check if we're in the right directory
if [ ! -f "pnpm-workspace.yaml" ]; then
    echo "❌ Please run this script from the root directory of the project"
    exit 1
fi

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    pnpm install
fi

# Check database connection
echo ""
echo "🔍 Checking database connection..."
if psql "$DATABASE_URL" -c '\q' 2>/dev/null; then
    echo "✅ Database connection successful"
else
    echo "❌ Cannot connect to database. Please ensure PostgreSQL is running and DATABASE_URL is correct."
    echo ""
    echo "To create the database, run:"
    echo "   createdb hu_fellowship_library"
    echo ""
    echo "Then set DATABASE_URL:"
    echo "   export DATABASE_URL='postgresql://localhost:5432/hu_fellowship_library'"
    exit 1
fi

# Push database schema
echo ""
echo "📊 Pushing database schema..."
cd lib/db && pnpm push && cd ../..

echo ""
echo "✅ Setup complete!"
echo ""
echo "🌐 Starting development servers..."
echo ""
echo "To start the servers, open two terminals:"
echo ""
echo "Terminal 1 - Backend API:"
echo "   cd artifacts/api-server"
echo "   PORT=$API_PORT pnpm dev"
echo ""
echo "Terminal 2 - Frontend:"
echo "   cd artifacts/hu-fellowship-library"
echo "   PORT=$PORT BASE_PATH=/ pnpm dev"
echo ""
echo "Then open http://localhost:$PORT in your browser"
