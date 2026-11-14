#!/bin/bash

echo "🚀 Complete Setup for HU Fellowship Library"
echo "=============================================="
echo ""

# Database URL
export DATABASE_URL="postgresql://salota:salota@localhost:5432/hu_fellowship_library"

echo "Step 1: Pushing database schema..."
cd /home/salota/Desktop/HU-Fellowship-Library/lib/db
DATABASE_URL="$DATABASE_URL" pnpm push

echo ""
echo "Step 2: Starting backend API server..."
cd /home/salota/Desktop/HU-Fellowship-Library/artifacts/api-server

# Start backend in background
PORT=3000 DATABASE_URL="$DATABASE_URL" NODE_ENV=development pnpm dev &
BACKEND_PID=$!

echo "Backend started (PID: $BACKEND_PID)"
echo ""
echo "Step 3: Waiting for backend to initialize..."
sleep 5

echo ""
echo "✅ Setup complete!"
echo ""
echo "=============================================="
echo "🔐 LOGIN CREDENTIALS"
echo "=============================================="
echo ""
echo "ADMIN ACCOUNT:"
echo "  Email: samakms77@gmail.com"
echo "  Password: admin123"
echo ""
echo "MEMBER ACCOUNT:"
echo "  You can create a member account by clicking"
echo "  'Create a member account' on the login page"
echo ""
echo "=============================================="
echo ""
echo "🌐 The application is now running at:"
echo "  Frontend: http://localhost:5173"
echo "  Backend API: http://localhost:3000"
echo ""
echo "To stop the backend server:"
echo "  kill $BACKEND_PID"
echo ""
