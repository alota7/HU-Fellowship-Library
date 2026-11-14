# 🏗️ HU Fellowship Library - Complete System Architecture

## 📚 Table of Contents
1. [System Overview](#system-overview)
2. [Technology Stack](#technology-stack)
3. [Project Structure](#project-structure)
4. [How Each Component Works](#how-each-component-works)
5. [Authentication System](#authentication-system)
6. [Database Schema](#database-schema)
7. [API Endpoints](#api-endpoints)
8. [Frontend Architecture](#frontend-architecture)
9. [User Roles & Permissions](#user-roles--permissions)
10. [Complete Request Flow](#complete-request-flow)

---

## 🎯 System Overview

The HU Fellowship Library is a full-stack web application for managing a Christian fellowship library. It allows members to browse, borrow, and review books, while administrators manage the entire library system.

### Core Features
- ✅ **Member Registration & Login**
- ✅ **Admin & Member Dashboards**
- ✅ **Book Management** (Browse, Search, Filter)
- ✅ **Borrowing System** (Request, Approve, Return)
- ✅ **Study Notes** (Personal & Shared)
- ✅ **Role-Based Access Control**

---

## 💻 Technology Stack

### Frontend
| Technology | Purpose | Version |
|------------|---------|---------|
| React | UI Framework | 18+ |
| Vite | Build Tool | 7.3.6 |
| TypeScript | Type Safety | 5.x |
| Tailwind CSS | Styling | 3.x |
| React Router (Wouter) | Routing | 3.x |
| React Query | State Management | 5.x |
| Lucide React | Icons | Latest |
| Zod | Validation | 3.x |

### Backend
| Technology | Purpose | Version |
|------------|---------|---------|
| Node.js | Runtime | 20.20.2 |
| Express.js | Web Framework | 5.2.1 |
| TypeScript | Type Safety | 5.x |
| Drizzle ORM | Database ORM | 0.45.2 |
| PostgreSQL | Database | 14+ |
| Pino | Logging | 9.x |

### Development Tools
- **pnpm**: Package manager (Monorepo)
- **esbuild**: Backend bundler
- **Vite**: Frontend bundler

---

## 📁 Project Structure

```
HU-Fellowship-Library/
│
├── artifacts/                          # Application code
│   ├── api-server/                     # Backend Express API
│   │   ├── src/
│   │   │   ├── index.ts               # Server entry point
│   │   │   ├── app.ts                 # Express app setup
│   │   │   ├── routes/
│   │   │   │   ├── index.ts           # Route aggregator
│   │   │   │   ├── library.ts         # Main API routes
│   │   │   │   ├── health.ts          # Health check
│   │   │   │   └── storage.ts         # File upload routes
│   │   │   ├── lib/
│   │   │   │   ├── logger.ts          # Pino logger
│   │   │   │   ├── objectStorage.ts   # Google Cloud Storage
│   │   │   │   └── objectAcl.ts       # Access control
│   │   │   └── middlewares/
│   │   │       └── .gitkeep
│   │   ├── dist/                      # Built backend
│   │   ├── package.json
│   │   ├── build.mjs                  # esbuild config
│   │   └── tsconfig.json
│   │
│   └── hu-fellowship-library/         # Frontend React app
│       ├── src/
│       │   ├── App.tsx                # Main app component
│       │   ├── index.tsx              # Entry point
│       │   ├── components/
│       │   │   ├── ui/                # UI components (55 files)
│       │   │   └── error-boundary.tsx
│       │   └── assets/
│       │       └── hu-logo.png
│       ├── dist/                      # Built frontend
│       ├── public/
│       ├── package.json
│       ├── vite.config.ts             # Vite configuration
│       └── tsconfig.json
│
├── lib/                               # Shared libraries
│   ├── api-client-react/             # React hooks for API
│   │   ├── src/
│   │   └── package.json
│   │
│   ├── api-spec/                     # API specifications
│   │
│   ├── api-zod/                      # Zod validation schemas
│   │
│   └── db/                           # Database layer
│       ├── src/
│       │   ├── index.ts              # DB connection
│       │   └── schema/
│       │       ├── index.ts          # Schema exports
│       │       └── library.ts        # Table definitions
│       ├── drizzle.config.ts
│       └── package.json
│
├── scripts/                          # Utility scripts
│   └── package.json
│
├── attached_assets/                  # Static assets
│
├── package.json                      # Root package.json
├── pnpm-workspace.yaml              # Monorepo config
├── pnpm-lock.yaml                   # Lock file
└── tsconfig.base.json               # Shared TS config
```

---

## 🔧 How Each Component Works

### 1. Backend Server (`artifacts/api-server/`)

#### **index.ts** - Server Entry Point
```typescript
import app from "./app";
import { initializeLibraryData } from "./routes/library";

const port = Number(process.env.PORT);

async function start() {
  await initializeLibraryData(); // Create default admin
  app.listen(port, () => {
    logger.info({ port }, "Server listening");
  });
}

start().catch((err) => {
  logger.error({ err }, "Failed to start");
  process.exit(1);
});
```

**What it does:**
- Loads the Express app
- Initializes default data (admin account, categories)
- Starts the server on specified port
- Handles startup errors

---

#### **app.ts** - Express Application Setup
```typescript
import express from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import cookieParser from "cookie-parser";
import router from "./routes";

const app = express();

app.use(pinoHttp({ logger }));
app.use(cors());
app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/api", router);

export default app;
```

**What it does:**
- Creates Express application
- Configures middleware:
  - **CORS**: Allows frontend to communicate
  - **Pino HTTP**: Request logging
  - **Cookie Parser**: Parse HTTP cookies
  - **JSON Parser**: Parse JSON request bodies
- Mounts all API routes under `/api`

---

#### **routes/library.ts** - Main API Routes (1000+ lines)

**Key Functions:**

##### Password Hashing
```typescript
function hashPassword(password: string) {
  return crypto.scryptSync(password, "hu-fellowship-admin-2026", 64).toString("hex");
}
```
- Uses Node.js `crypto.scryptSync()`
- Salt: "hu-fellowship-admin-2026"
- Key length: 64 bytes
- Format: Hexadecimal

##### Session Management
```typescript
const sessions = new Map<string, User>();

function currentUser(req: Request) {
  const token = req.cookies?.hu_session ?? 
                 req.headers.authorization?.replace("Bearer ", "");
  return token ? sessions.get(token) : undefined;
}
```
- Sessions stored in memory (Map)
- Token: UUID v4
- Stored in HTTP-only cookie or Authorization header

##### Authentication Endpoints

**POST /api/auth/register**
```typescript
router.post("/auth/register", async (req, res) => {
  const parsed = RegisterBody.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "..." });
  
  const [member] = await db
    .insert(libraryUsers)
    .values({
      name: parsed.data.name,
      email: parsed.data.email.toLowerCase(),
      role: "member",  // ← Hardcoded, cannot be overridden
      passwordHash: hashPassword(parsed.data.password),
      // ... other fields
    })
    .returning();
    
  const token = crypto.randomUUID();
  sessions.set(token, member);
  res.cookie("hu_session", token, { 
    httpOnly: true, 
    sameSite: "lax",
    maxAge: 7 * 24 * 60 * 60 * 1000  // 7 days
  });
  
  return res.status(201).json({ user: publicUser(member) });
});
```

**What it does:**
1. Validates input with Zod schema
2. Normalizes email to lowercase
3. **Hardcodes role to "member"** (prevents admin registration)
4. Hashes password with scrypt
5. Inserts into database
6. Creates session token (UUID)
7. Sets HTTP-only cookie
8. Returns user object

---

**POST /api/auth/login**
```typescript
router.post("/auth/login", async (req, res) => {
  const parsed = LoginBody.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "..." });
  
  const email = parsed.data.email.toLowerCase();
  const [existing] = await db
    .select()
    .from(libraryUsers)
    .where(eq(libraryUsers.email, email))
    .limit(1);
    
  if (!existing || existing.passwordHash !== hashPassword(parsed.data.password)) {
    return res.status(401).json({ error: "Invalid email or password." });
  }
  
  const token = crypto.randomUUID();
  sessions.set(token, existing);
  res.cookie("hu_session", token, { ... });
  
  return res.json({ user: publicUser(existing) });
});
```

**What it does:**
1. Validates credentials
2. Finds user by email
3. Verifies password hash
4. Creates session token
5. Sets cookie
6. Returns user with role

---

**GET /api/auth/me**
```typescript
router.get("/auth/me", (req, res) => {
  const user = currentUser(req);
  if (!user) return res.status(401).json({ error: "Not authenticated." });
  return res.json(publicUser(user));
});
```

**What it does:**
- Checks if user is authenticated
- Extracts token from cookie or header
- Looks up user in sessions Map
- Returns user or 401 error

---

**POST /api/auth/logout**
```typescript
router.post("/auth/logout", (req, res) => {
  const token = req.cookies?.hu_session;
  if (token) sessions.delete(token);
  res.clearCookie("hu_session");
  return res.status(204).send();
});
```

**What it does:**
- Removes session from memory
- Clears cookie
- Returns 204 No Content

---

##### Authorization Middleware

```typescript
function requireUser(req: any, res: any) {
  const user = currentUser(req);
  if (!user) {
    res.status(401).json({ error: "Please log in first." });
    return undefined;
  }
  return user;
}

function requireAdmin(req: any, res: any) {
  const user = requireUser(req, res);
  if (!user) return undefined;
  if (user.role !== "admin") {
    res.status(403).json({ error: "Administrator access is required." });
    return undefined;
  }
  return user;
}
```

**What they do:**
- **requireUser**: Checks if user is logged in
- **requireAdmin**: Checks if user is logged in AND has admin role

---

##### Book Endpoints

**GET /api/books** - List all books
```typescript
router.get("/books", async (req, res) => {
  const rows = await db.select().from(libraryBooks);
  const filtered = rows.map(publicBook).filter((book) => {
    // Filter by search, category, type
  });
  return res.json(filtered);
});
```

**POST /api/books** - Create book (Admin only)
```typescript
router.post("/books", async (req, res) => {
  if (!requireAdmin(req, res)) return;
  const [row] = await db
    .insert(libraryBooks)
    .values({ ...parsed.data, available: parsed.data.total })
    .returning();
  return res.status(201).json(publicBook(row));
});
```

---

##### Borrowing System

**POST /api/borrowing-requests** - Member requests to borrow
```typescript
router.post("/borrowing-requests", async (req, res) => {
  const user = requireUser(req, res);
  if (!user) return;
  
  const book = await getBookById(parsed.data.bookId);
  if (book.type !== "hardcopy" || book.available < 1) {
    return res.status(409).json({ error: "Book not available." });
  }
  
  const request = { 
    id: requests.length + 1, 
    book, 
    member: user, 
    status: "pending" 
  };
  requests.push(request);
  
  return res.status(201).json(request);
});
```

**PUT /api/borrowing-requests/:id/approve** - Admin approves
```typescript
router.put("/borrowing-requests/:id/approve", (req, res) => {
  if (!requireAdmin(req, res)) return;
  
  const request = requests.find(item => item.id === Number(req.params.id));
  request.status = "approved";
  
  borrowings.push({
    id: borrowings.length + 1,
    book: request.book,
    dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
    status: "borrowed"
  });
  
  return res.json(request);
});
```

---

### 2. Database Layer (`lib/db/`)

#### **src/index.ts** - Database Connection
```typescript
import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema";

const { Pool } = pg;

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL must be set");
}

export const pool = new Pool({ 
  connectionString: process.env.DATABASE_URL 
});

export const db = drizzle(pool, { schema });

export * from "./schema";
```

**What it does:**
- Creates PostgreSQL connection pool
- Initializes Drizzle ORM
- Exports database client for use in routes

---

#### **src/schema/library.ts** - Table Definitions

```typescript
export const libraryUsers = pgTable("library_users", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  role: text("role").$type<"member" | "admin">().notNull().default("member"),
  phone: text("phone").notNull().default(""),
  department: text("department").notNull().default(""),
  schoolYear: text("school_year").notNull().default(""),
  emailVerified: boolean("email_verified").notNull().default(false),
  passwordHash: text("password_hash").notNull(),
});

export const libraryBooks = pgTable("library_books", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  author: text("author").notNull(),
  isbn: text("isbn"),
  category: text("category").notNull(),
  type: text("type").$type<"hardcopy" | "softcopy">().notNull(),
  description: text("description").notNull(),
  publisher: text("publisher"),
  year: integer("year"),
  coverUrl: text("cover_url"),
  fileUrl: text("file_url"),
  available: integer("available").notNull().default(0),
  total: integer("total").notNull(),
  featured: boolean("featured").notNull().default(false),
});

export const libraryCategories = pgTable("library_categories", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
});

export const libraryStudyNotes = pgTable("library_study_notes", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  type: text("type").$type<"personal" | "shared">().notNull(),
  status: text("status").$type<"pending" | "approved" | "rejected">().notNull(),
  author: text("author").notNull(),
  authorUserId: integer("author_user_id").references(() => libraryUsers.id),
  fileUrl: text("file_url"),
  submittedAt: timestamp("submitted_at").notNull().defaultNow(),
});
```

**What it defines:**
- **libraryUsers**: User accounts with role-based access
- **libraryBooks**: Book catalog with availability tracking
- **libraryCategories**: Book categories
- **libraryStudyNotes**: Personal and shared study notes

---

### 3. Frontend Application (`artifacts/hu-fellowship-library/`)

#### **App.tsx** - Main Application Component

**Structure:**
```typescript
// 1. Imports
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useLogin, useRegister, useGetCurrentUser } from '@workspace/api-client-react';
import { Link, Route, Switch, useLocation } from 'wouter';

// 2. Context & State
const queryClient = new QueryClient();
const LangContext = createContext<{ lang: 'en' | 'am' }>({ lang: 'en' });

// 3. Login Component
function Login() {
  const [, setLocation] = useLocation();
  const login = useLogin();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  
  return (
    <form onSubmit={(e) => {
      e.preventDefault();
      login.mutate(
        { data: { email, password } },
        { 
          onSuccess: (data) => {
            // Redirect based on role
            setLocation(data.user.role === 'admin' 
              ? '/admin/dashboard' 
              : '/member/dashboard'
            );
          }
        }
      );
    }}>
      {/* Form fields */}
    </form>
  );
}

// 4. Router
function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/login" component={Login} />
      <Route path="/register" component={Register} />
      <Route path="/member/dashboard" component={MemberDashboard} />
      <Route path="/admin/dashboard" component={AdminDashboard} />
      {/* More routes */}
    </Switch>
  );
}

// 5. App
function App() {
  const [lang, setLang] = useState<'en' | 'am'>('en');
  return (
    <QueryClientProvider client={queryClient}>
      <LangContext.Provider value={{ lang, setLang }}>
        <Router />
      </LangContext.Provider>
    </QueryClientProvider>
  );
}
```

**What it does:**
- Sets up React Query for state management
- Defines all page components (Login, Register, Dashboards)
- Implements client-side routing with Wouter
- Provides language context for i18n
- Handles authentication state

---

#### **vite.config.ts** - Build Configuration

```typescript
export default defineConfig({
  base: basePath,
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
      '@assets': path.resolve(__dirname, '../../attached_assets'),
    },
  },
  server: {
    port: 5173,
    host: '0.0.0.0',
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
});
```

**What it does:**
- Configures Vite development server
- Sets up API proxy (frontend → backend)
- Defines path aliases for imports
- Configures build output

---

### 4. API Client (`lib/api-client-react/`)

**Generated React Query Hooks:**
```typescript
// Auto-generated from OpenAPI spec

export function useLogin() {
  return useMutation({
    mutationFn: (data: { data: LoginBody }) => 
      apiClient.post('/api/auth/login', data.data),
    onSuccess: (data) => {
      queryClient.setQueryData(['currentUser'], data.user);
    },
  });
}

export function useRegister() {
  return useMutation({
    mutationFn: (data: { data: RegisterBody }) => 
      apiClient.post('/api/auth/register', data.data),
  });
}

export function useGetCurrentUser() {
  return useQuery({
    queryKey: ['currentUser'],
    queryFn: () => apiClient.get('/api/auth/me'),
    retry: false,
  });
}

export function useListBooks(params?: ListBooksQueryParams) {
  return useQuery({
    queryKey: ['books', params],
    queryFn: () => apiClient.get('/api/books', { params }),
  });
}
```

**What they provide:**
- Type-safe API calls
- Automatic caching with React Query
- Loading/error states
- Optimistic updates
- Cache invalidation

---

## 🔐 Authentication System

### Flow Diagram

```
┌─────────────┐
│   Browser   │
└──────┬──────┘
       │
       │ 1. User enters email/password
       │
       ▼
┌──────────────────┐
│  Login Form      │
│  (React)         │
└────────┬─────────┘
         │
         │ 2. useLogin().mutate({ data: { email, password } })
         │
         ▼
┌──────────────────────┐
│  API Client          │
│  (React Query)       │
└────────┬─────────────┘
         │
         │ 3. POST /api/auth/login
         │    { email, password }
         │
         ▼
┌──────────────────────┐
│  Express Server      │
│  (Node.js)           │
└────────┬─────────────┘
         │
         │ 4. Validate credentials
         │    Hash password with scrypt
         │    Query database
         │
         ▼
┌──────────────────────┐
│  PostgreSQL          │
│  (Database)          │
└────────┬─────────────┘
         │
         │ 5. Return user record
         │
         ▼
┌──────────────────────┐
│  Express Server      │
│  (Node.js)           │
└────────┬─────────────┘
         │
         │ 6. Create session token (UUID)
         │    Store in Map<token, user>
         │    Set HTTP-only cookie
         │    Return { user: { id, role, ... } }
         │
         ▼
┌──────────────────────┐
│  API Client          │
│  (React Query)       │
└────────┬─────────────┘
         │
         │ 7. Receive response
         │    Check user.role
         │
         ▼
┌──────────────────────┐
│  Login Component     │
│  (React)             │
└────────┬─────────────┘
         │
         │ 8. Redirect based on role:
         │    admin → /admin/dashboard
         │    member → /member/dashboard
         │
         ▼
┌──────────────────────┐
│  Dashboard Page      │
│  (React)             │
└──────────────────────┘
```

### Session Management

**Login:**
```
1. User submits credentials
2. Backend verifies password
3. Backend creates UUID token
4. Backend stores: Map.set(token, user)
5. Backend sets cookie: hu_session=token
6. Frontend receives user object
7. Frontend redirects based on role
```

**Subsequent Requests:**
```
1. Browser sends cookie: hu_session=token
2. Backend extracts token
3. Backend looks up user: Map.get(token)
4. If found: User is authenticated
5. If not found: Return 401 Unauthorized
```

**Logout:**
```
1. User clicks logout
2. Frontend calls POST /api/auth/logout
3. Backend deletes session: Map.delete(token)
4. Backend clears cookie
5. Frontend redirects to /login
```

---

## 🗄️ Database Schema

### Users Table
```sql
CREATE TABLE library_users (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  role TEXT NOT NULL DEFAULT 'member',
  phone TEXT NOT NULL DEFAULT '',
  department TEXT NOT NULL DEFAULT '',
  school_year TEXT NOT NULL DEFAULT '',
  email_verified BOOLEAN NOT NULL DEFAULT FALSE,
  password_hash TEXT NOT NULL
);
```

**Indexes:**
- PRIMARY KEY on `id`
- UNIQUE on `email`

**Roles:**
- `admin` - Full system access
- `member` - Basic library access

---

### Books Table
```sql
CREATE TABLE library_books (
  id SERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  author TEXT NOT NULL,
  isbn TEXT,
  category TEXT NOT NULL,
  type TEXT NOT NULL,
  description TEXT NOT NULL,
  publisher TEXT,
  year INTEGER,
  cover_url TEXT,
  file_url TEXT,
  available INTEGER NOT NULL DEFAULT 0,
  total INTEGER NOT NULL,
  featured BOOLEAN NOT NULL DEFAULT FALSE
);
```

**Types:**
- `hardcopy` - Physical book
- `softcopy` - Digital book (PDF/EPUB)

---

### Categories Table
```sql
CREATE TABLE library_categories (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE
);
```

---

### Study Notes Table
```sql
CREATE TABLE library_study_notes (
  id SERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  type TEXT NOT NULL,
  status TEXT NOT NULL,
  author TEXT NOT NULL,
  author_user_id INTEGER REFERENCES library_users(id),
  file_url TEXT,
  submitted_at TIMESTAMP NOT NULL DEFAULT NOW()
);
```

**Types:**
- `personal` - Private member notes
- `shared` - Summer Bible Study Notes

**Statuses:**
- `pending` - Awaiting approval
- `approved` - Publicly visible
- `rejected` - Not approved

---

## 🌐 API Endpoints

### Authentication
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | /api/auth/register | Register new member | Public |
| POST | /api/auth/login | Login user | Public |
| POST | /api/auth/logout | Logout user | User |
| GET | /api/auth/me | Get current user | User |
| POST | /api/auth/request-password-reset | Request reset code | Public |
| POST | /api/auth/reset-password | Reset password | Public |

### Books
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | /api/books | List all books | Public |
| GET | /api/books/:id | Get book details | Public |
| POST | /api/books | Create book | Admin |
| PUT | /api/books/:id | Update book | Admin |
| DELETE | /api/books/:id | Delete book | Admin |
| GET | /api/books/:id/download | Download digital book | User |

### Categories
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | /api/categories | List categories | Public |
| POST | /api/categories | Create category | Admin |
| PUT | /api/categories/:id | Update category | Admin |
| DELETE | /api/categories/:id | Delete category | Admin |

### Borrowing
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | /api/borrowing-requests | Request to borrow | Member |
| GET | /api/borrowing-requests | List all requests | Admin |
| GET | /api/borrowing-requests/my | List my requests | Member |
| PUT | /api/borrowing-requests/:id/approve | Approve request | Admin |
| PUT | /api/borrowing-requests/:id/reject | Reject request | Admin |
| GET | /api/borrowings | List all borrowings | Admin |
| GET | /api/borrowings/my | List my borrowings | Member |
| POST | /api/borrowings/:id/return-request | Request return | Member |
| PUT | /api/borrowings/:id/process-return | Confirm return | Admin |

### Study Notes
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | /api/study-notes | List approved notes | User |
| POST | /api/study-notes | Submit note | Member |
| PUT | /api/study-notes/:id/approve | Approve note | Admin |
| PUT | /api/study-notes/:id/reject | Reject note | Admin |
| DELETE | /api/study-notes/:id | Delete note | Admin |

### Dashboard
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | /api/dashboard/summary | Get statistics | User |

---

## 👥 User Roles & Permissions

### Member Permissions
✅ Can DO:
- Register account
- Login to member dashboard
- Browse books
- Search and filter books
- View book details
- Request to borrow hardcopy books
- Download softcopy books (if available)
- View own borrowings
- View borrowing history
- Submit personal study notes
- View approved study notes
- Edit own profile

❌ Cannot DO:
- Access admin dashboard
- Add/edit/delete books
- Manage categories
- Approve borrowing requests
- Approve study notes
- Manage other users
- Change own role

---

### Admin Permissions
✅ Can DO:
- Everything members can do
- Access admin dashboard
- Add/edit/delete books
- Manage categories
- View all borrowing requests
- Approve/reject borrowing requests
- Confirm book returns
- Manage all study notes
- Approve/reject study notes
- View all members
- View statistics and reports

❌ Cannot DO:
- Change own role to member
- Delete own account

---

## 🔄 Complete Request Flow

### Example: Member Borrows a Book

```
1. Member searches for book
   └─> GET /api/books?search=title
   └─> Backend queries database
   └─> Returns filtered list

2. Member views book details
   └─> GET /api/books/123
   └─> Backend returns book with availability

3. Member requests to borrow
   └─> POST /api/borrowing-requests
       { bookId: 123 }
   └─> Backend checks:
       - User authenticated
       - Book is hardcopy
       - Book is available
   └─> Backend decrements available count
   └─> Backend creates request with status "pending"

4. Admin views pending requests
   └─> GET /api/borrowing-requests
   └─> Backend returns all requests

5. Admin approves request
   └─> PUT /api/borrowing-requests/456/approve
   └─> Backend updates request status to "approved"
   └─> Backend creates borrowing record
   └─> Backend sets due date (14 days)

6. Member views active borrowings
   └─> GET /api/borrowings/my
   └─> Backend returns member's borrowings

7. Member requests return
   └─> POST /api/borrowings/789/return-request
   └─> Backend updates borrowing status to "return_requested"

8. Admin confirms return
   └─> PUT /api/borrowings/789/process-return
   └─> Backend sets status to "returned"
   └─> Backend records return date
   └─> Backend increments available count
```

---

## 🔒 Security Features

### Password Security
- ✅ Scrypt hashing (cryptographically secure)
- ✅ Fixed salt (could be improved with per-user salts)
- ✅ Never stored in plaintext
- ✅ Never logged or exposed in API responses

### Session Security
- ✅ HTTP-only cookies (prevent XSS)
- ✅ SameSite=lax (prevent CSRF)
- ✅ UUID v4 tokens (hard to guess)
- ✅ 7-day expiration
- ✅ Sessions stored server-side

### Authorization
- ✅ Role-based access control (RBAC)
- ✅ Backend validates permissions for every request
- ✅ Frontend shows/hides UI based on role
- ✅ Cannot register as admin
- ✅ Cannot change own role

### Input Validation
- ✅ Zod schemas for all inputs
- ✅ Email normalization (lowercase)
- ✅ SQL injection prevention (parameterized queries)
- ✅ XSS prevention (React auto-escapes)

---

## 📊 Current Credentials

### Admin Account
- **Email:** `samakms77@gmail.com`
- **Password:** `sisay123`
- **Role:** `admin`

### Test Member
- **Email:** `test@example.com`
- **Password:** `Test123!`
- **Role:** `member`

---

## 🚀 How to Run

### Development Mode
```bash
# Terminal 1 - Backend
cd artifacts/api-server
DATABASE_URL="postgresql://salota@/hu_fellowship_library?host=/var/run/postgresql" \
PORT=3000 \
NODE_ENV=development \
node --enable-source-maps ./dist/index.mjs

# Terminal 2 - Frontend
cd artifacts/hu-fellowship-library
PORT=5173 BASE_PATH=/ pnpm dev
```

### Access
- **Frontend:** http://localhost:5173
- **Backend:** http://localhost:3000
- **API Docs:** http://localhost:3000/api/health

---

This comprehensive guide explains every component, file, and flow in the HU Fellowship Library system!
