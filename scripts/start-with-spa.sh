#!/bin/bash

# Kill existing processes
pkill -f "node.*index.mjs|python3.*http.server|serve.*5173" 2>/dev/null

echo "🚀 Starting HU Fellowship Library with SPA routing..."

# Start backend
cd /home/salota/Desktop/HU-Fellowship-Library/artifacts/api-server
DATABASE_URL="postgresql://salota@/hu_fellowship_library?host=/var/run/postgresql" \
PORT=3000 \
NODE_ENV=development \
node --enable-source-maps ./dist/index.mjs > /tmp/backend.log 2>&1 &
BACKEND_PID=$!

sleep 2

# Check backend
if curl -s http://localhost:3000/api/books > /dev/null 2>&1; then
    echo "✅ Backend running on http://localhost:3000"
else
    echo "❌ Backend failed"
    exit 1
fi

# Install serve if needed
if ! command -v npx serve &> /dev/null; then
    echo "Installing serve for SPA routing..."
    npm install -g serve 2>/dev/null || true
fi

# Start frontend with SPA routing
cd /home/salota/Desktop/HU-Fellowship-Library/artifacts/hu-fellowship-library/dist/public
npx serve -s -p 5173 > /tmp/frontend.log 2>&1 &
FRONTEND_PID=$!

sleep 2

# Check frontend
if curl -s http://localhost:5173 > /dev/null 2>&1; then
    echo "✅ Frontend running on http://localhost:5173"
else
    echo "❌ Frontend failed"
    exit 1
fi

echo ""
echo "🎉 Application ready!"
echo ""
echo "🔐 Login Credentials:"
echo "   Admin: samakms77@gmail.com / Admin123!"
echo "   Member: Register at http://localhost:5173/register"
echo ""
echo "🌐 Open: http://localhost:5173"
echo ""

wait $BACKEND_PID $FRONTEND_PID
