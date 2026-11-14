# HU Fellowship Library - Local Setup Guide

## Prerequisites

- **Node.js** v18+ (v20 recommended)
- **pnpm** package manager
- **PostgreSQL** database (for full functionality)

## Quick Start (Frontend Only)

If you just want to see the UI without the backend:

```bash
cd /home/salota/Desktop/HU-Fellowship-Library/artifacts
chmod +x quick-start.sh
./quick-start.sh
```

Then open http://localhost:5173 in your browser.

**Note:** The frontend will show login/registration pages, but they won't work without the backend API running.

## Full Setup (Frontend + Backend)

### 1. Install Dependencies

From the project root:

```bash
pnpm install
```

### 2. Set Up PostgreSQL Database

```bash
# Create the database
createdb hu_fellowship_library

# Set the DATABASE_URL environment variable
export DATABASE_URL='postgresql://localhost:5432/hu_fellowship_library'
```

### 3. Initialize Database Schema

```bash
cd lib/db
pnpm push
cd ../..
```

### 4. Configure Environment Variables

Create a `.env` file in the root directory (optional):

```env
DATABASE_URL=postgresql://localhost:5432/hu_fellowship_library
PORT=5173
BASE_PATH=/
```

### 5. Start the Development Servers

**Terminal 1 - Backend API:**

```bash
cd artifacts/api-server
PORT=3000 DATABASE_URL=postgresql://localhost:5432/hu_fellowship_library pnpm dev
```

**Terminal 2 - Frontend:**

```bash
cd artifacts/hu-fellowship-library
PORT=5173 BASE_PATH=/ pnpm dev
```

### 6. Open in Browser

Navigate to: http://localhost:5173

## Project Structure

```
HU-Fellowship-Library/
├── artifacts/
│   ├── api-server/          # Express backend API
│   └── hu-fellowship-library/  # React + Vite frontend
├── lib/
│   ├── api-client-react/    # React hooks for API
│   ├── api-spec/            # API specifications
│   ├── api-zod/             # Zod schemas
│   └── db/                  # Database schema & connection
└── scripts/                 # Utility scripts
```

## Troubleshooting

### Database Connection Error

If you see: `DATABASE_URL must be set`

Make sure PostgreSQL is running and DATABASE_URL is set:

```bash
# Check PostgreSQL is running
psql -l

# Set DATABASE_URL
export DATABASE_URL='postgresql://localhost:5432/hu_fellowship_library'
```

### Port Already in Use

If port 5173 is already in use, change the PORT:

```bash
PORT=5174 BASE_PATH=/ pnpm dev
```

### Missing Dependencies

If you get module not found errors:

```bash
# Clean install
rm -rf node_modules pnpm-lock.yaml
pnpm install
```

## Features

- **Book Management**: Browse, search, and borrow books
- **Study Notes**: Create and share study notes
- **Borrowing System**: Request and track book loans
- **User Roles**: Member and Admin accounts
- **Multilingual**: English and Amharic support
- **File Uploads**: Cover images and book files (requires Google Cloud Storage)

## Environment Variables

### Required

- `PORT` - Frontend server port (default: 5173)
- `BASE_PATH` - Base URL path (default: /)
- `DATABASE_URL` - PostgreSQL connection string

### Optional

- `GOOGLE_CLOUD_PROJECT` - For Google Cloud Storage
- `GOOGLE_APPLICATION_CREDENTIALS` - Path to service account JSON

## Development

### Available Scripts

```bash
# Frontend (from artifacts/hu-fellowship-library)
pnpm dev          # Start dev server
pnpm build        # Build for production
pnpm typecheck    # Type checking

# Backend (from artifacts/api-server)
pnpm dev          # Start dev server with hot reload
pnpm build        # Build for production
pnpm start        # Start production server
```

### Database Management

```bash
# From lib/db
pnpm push         # Push schema changes to database
pnpm push-force   # Force push schema (destructive)
```

## Need Help?

- Check the browser console for errors
- Check the terminal output for server errors
- Ensure all dependencies are installed
- Verify database connection string
