#!/bin/bash

echo "🗄️  Setting up PostgreSQL database for HU Fellowship Library..."
echo ""

# Check if running as postgres user or need sudo
if [ "$USER" = "postgres" ]; then
    PSQL="psql"
else
    PSQL="sudo -u postgres psql"
fi

echo "Creating database role and database..."
echo ""

# Create role and database
$PSQL -c "CREATE ROLE salota WITH LOGIN PASSWORD 'salota' SUPERUSER CREATEDB CREATEROLE;" 2>/dev/null || echo "Role 'salota' already exists or using peer auth"
$PSQL -c "CREATE DATABASE hu_fellowship_library OWNER salota;" 2>/dev/null || echo "Database already exists or will create with user"

# Try creating database as current user if the above failed
if [ $? -ne 0 ]; then
    echo "Trying alternative approach..."
    createdb hu_fellowship_library 2>/dev/null || echo "Database might already exist"
fi

echo ""
echo "Setting DATABASE_URL environment variable..."
export DATABASE_URL="postgresql://salota:salota@localhost:5432/hu_fellowship_library"

echo "✅ Database setup complete!"
echo ""
echo "DATABASE_URL=$DATABASE_URL"
echo ""
echo "Now run the following commands to push the schema:"
echo "  cd /home/salota/Desktop/HU-Fellowship-Library/lib/db"
echo "  DATABASE_URL='$DATABASE_URL' pnpm push"
