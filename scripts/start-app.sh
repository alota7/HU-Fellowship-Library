#!/bin/bash

# Kill any existing processes
pkill -f "vite|node.*index.mjs|serve.*5173" 2>/dev/null

echo "Starting HU Fellowship Library..."

# Start backend
cd /home/salota/Desktop/HU-Fellowship-Library/artifacts/api-server
DATABASE_URL="postgresql://salota@/hu_fellowship_library?host=/var/run/postgresql" \
PORT=3000 \
NODE_ENV=development \
node --enable-source-maps ./dist/index.mjs &
BACKEND_PID=$!
echo "Backend started (PID: $BACKEND_PID)"

# Wait for backend
sleep 2

# Check backend
if curl -s http://localhost:3000/api/books > /dev/null 2>&1; then
    echo "✅ Backend is running on http://localhost:3000"
else
    echo "❌ Backend failed to start"
    exit 1
fi

# Start frontend with Python HTTP server (more reliable)
cd /home/salota/Desktop/HU-Fellowship-Library/artifacts/hu-fellowship-library/dist/public
python3 -m http.server 5173 &
FRONTEND_PID=$!
echo "Frontend started (PID: $FRONTEND_PID)"

# Wait for frontend
sleep 2

# Check frontend
if curl -s http://localhost:5173 > /dev/null 2>&1; then
    echo "✅ Frontend is running on http://localhost:5173"
else
    echo "❌ Frontend failed to start"
    exit 1
fi

echo ""
echo "🎉 Application is ready!"
echo ""
echo "Login credentials:"
echo "  Admin Email: samakms77@gmail.com"
echo "  Admin Password: Admin123!"
echo ""
echo "Open your browser to: http://localhost:5173"
echo ""
echo "Press Ctrl+C to stop the servers"

# Wait for processes
wait $BACKEND_PID $FRONTEND_PID
