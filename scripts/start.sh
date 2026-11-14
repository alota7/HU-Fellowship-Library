#!/bin/bash

echo "🚀 Starting HU Fellowship Library..."
echo ""

# Check if PostgreSQL is running
if ! pg_isready -q; then
    echo "❌ PostgreSQL is not running. Please start it first:"
    echo "   sudo systemctl start postgresql"
    exit 1
fi

# Check if database exists
if ! psql -lqt 2>/dev/null | cut -d \| -f 1 | grep -qw hu_fellowship_library; then
    echo "📊 Creating database..."
    createdb hu_fellowship_library
fi

echo "✅ Database ready"
echo ""

# Start backend in background
echo "🔧 Starting backend API server on port 3000..."
cd /home/salota/Desktop/HU-Fellowship-Library/artifacts/api-server
DATABASE_URL="postgresql://salota@/hu_fellowship_library?host=/var/run/postgresql" \
PORT=3000 \
NODE_ENV=development \
node --enable-source-maps ./dist/index.mjs &
BACKEND_PID=$!

# Wait for backend to start
sleep 2

# Start frontend
echo "🎨 Starting frontend on port 5173..."
cd /home/salota/Desktop/HU-Fellowship-Library/artifacts/hu-fellowship-library
PORT=5173 BASE_PATH=/ pnpm dev &
FRONTEND_PID=$!

echo ""
echo "✅ Servers started successfully!"
echo ""
echo "📝 Login Credentials:"
echo "   Admin Email: samakms77@gmail.com"
echo "   Admin Password: Admin123!"
echo ""
echo "🌐 Open your browser to: http://localhost:5173"
echo ""
echo "Press Ctrl+C to stop both servers"

# Wait for either process to exit
wait $BACKEND_PID $FRONTEND_PID
