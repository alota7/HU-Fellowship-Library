# HU Fellowship Library

Bilingual digital library and Bible-study resource platform for fellowship members and stewards, built with **React**, **Express**, **TypeScript**, and **PostgreSQL**.

---

## Features

- **📚 Book Catalog & Circulation**:
  - Hardcopy book borrowing requests and steward approvals.
  - Softcopy eBook/document downloads.
  - **Mandatory file upload** when adding softcopy books (PDF, EPUB, Word).
- **📝 Study Notes & Summer Studies**:
  - Community reflections and group Bible study guides.
  - **Mandatory document upload** for member study note submissions, with dedicated handling for Summer Bible Studies.
  - Steward moderation queue (approve / reject submissions).
- **🔒 Authentication & Role-Based Access**:
  - Single sign-in flow directing to Member or Admin Steward desk based on role.
  - Session cookie authentication.
- **🌐 Bilingual Interface**:
  - Seamless English / Amharic navigation toggle for fellowship members.
  - English-first steward administrative desk.

---

## Tech Stack

| Layer | Technologies |
|---|---|
| **Frontend** | React 19, Vite, Tailwind CSS v4, Radix UI, TanStack Query, Wouter, Lucide Icons |
| **Backend API** | Express 5, TypeScript, Node.js 24, Pino Logger |
| **Database** | PostgreSQL, Drizzle ORM, `drizzle-zod` |
| **Contracts** | OpenAPI 3.1 specification, Orval code generator |
| **Monorepo** | pnpm workspaces |

---

## Project Structure

```
├── artifacts/
│   ├── hu-fellowship-library/   # React / Vite frontend application
│   └── api-server/              # Express API server (routes, auth, storage)
├── lib/
│   ├── db/                      # Drizzle ORM schema & migrations
│   ├── api-spec/                # OpenAPI 3.1 contract (openapi.yaml)
│   ├── api-zod/                 # Generated Zod validation schemas
│   └── api-client-react/        # Generated TanStack Query API hooks
├── docs/                        # Architecture, setup & testing guides
└── scripts/                     # Helper startup and migration scripts
```

---

## Getting Started

### 1. Prerequisites
- **Node.js** v20+ (v24 recommended)
- **pnpm** (`npm install -g pnpm`)
- **PostgreSQL** running locally

### 2. Environment Setup
Create a `.env` file in the root directory:

```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/hu_fellowship_library"
SESSION_SECRET="your-session-secret"
PORT=5000
NODE_ENV="development"
```

### 3. Install Dependencies & Prepare Database
```bash
pnpm install
pnpm --filter @workspace/db run push
```

### 4. Run the API Server
```bash
cd artifacts/api-server
PORT=5000 node --env-file=../../.env ./dist/index.mjs
```

### 5. Run the Frontend
```bash
cd artifacts/hu-fellowship-library
PORT=5173 BASE_PATH=/ pnpm run dev
```

Open **http://localhost:5173** in your browser.

---

## Default Credentials

| Role | Email | Password |
|---|---|---|
| **Admin (Steward)** | `samakms77@gmail.com` | `admin123` |
| **Member** | `member1@example.com` | `password123` |

*(New members can also register directly via the `/register` page).*

---

## Documentation

More detailed guides are available in the [`docs/`](./docs) directory:
- [System Architecture](./docs/SYSTEM_ARCHITECTURE.md)
- [Local Setup Guide](./docs/SETUP.md)
- [Testing Guide](./docs/TESTING_GUIDE.md)
