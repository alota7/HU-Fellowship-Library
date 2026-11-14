#!/bin/bash

# Quick start script - Just runs the frontend without database
# Use this if you only want to see the UI

echo "🎨 Starting frontend only (no backend)..."
echo ""

cd artifacts/hu-fellowship-library

# Set required environment variables
export PORT=5173
export BASE_PATH=/

echo "📦 Installing frontend dependencies if needed..."
pnpm install

echo ""
echo "🚀 Starting development server..."
echo "   Opening http://localhost:5173"
echo ""

pnpm dev
