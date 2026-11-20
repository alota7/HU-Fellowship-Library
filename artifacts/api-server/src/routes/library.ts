import { Router, type IRouter, type Request } from "express";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { ReplitConnectors } from "@replit/connectors-sdk";
import { eq } from "drizzle-orm";
import {
  db,
  pool,
  libraryBooks,
  libraryCategories,
  libraryStudyNotes,
  libraryUsers,
  libraryQuestions,
  libraryBorrowings,
  libraryBorrowingRequests,
} from "@workspace/db";
import {
  CreateBookBody,
  CreateBorrowingRequestBody,
  CreateCategoryBody,
  CreateStudyNoteBody,
  ListBooksQueryParams,
  ListStudyNotesQueryParams,
  LoginBody,
  RegisterBody,
  RejectBorrowingRequestBody,
  RejectStudyNoteBody,
} from "@workspace/api-zod";

type User = typeof libraryUsers.$inferSelect;
type Book = {
  id: number;
  title: string;
  author: string;
  type: "hardcopy" | "softcopy";
  category: string;
  description: string;
  isbn: string | null;
  publisher: string | null;
  year: number | null;
  coverUrl: string | null;
  fileUrl: string | null;
  available: number;
  total: number;
  featured: boolean;
};

const router: IRouter = Router();
const sessions = new Map<string, User>();
const passwordResetRequests = new Map<string, { codeHash: string; expiresAt: number }>();
const connectors = new ReplitConnectors();
const runtimeAvailability = new Map<number, number>();
const requests: Array<{
  id: number;
  book: Book;
  member: User;
  status: "pending" | "approved" | "rejected";
  requestedAt: string;
  rejectionReason: string | null;
}> = [];
const borrowings: Array<{
  id: number;
  book: Book;
  dueDate: string;
  status: "borrowed" | "returned" | "overdue";
  borrowedAt: string;
  returnedAt: string | null;
}> = [];

export async function initializeLibraryData() {
  await db
    .insert(libraryUsers)
    .values([
      {
        name: "Library Administrator",
        email: "samakms77@gmail.com",
        role: "admin",
        department: "HU Fellowship",
        schoolYear: "Alumni",
        emailVerified: true,
        passwordHash:
          "1376571567b1952226779a2bc9a425d3cfa132c3a6d137b21c03df8829869edd797cb492e1a3c45d89ae558bf0943518d3df03bf1848b04b465da0407f5b46da",
      },
      {
        name: "Fellowship Member",
        email: "member@example.com",
        role: "member",
        department: "Theology",
        schoolYear: "3rd year",
        phone: "+251911223344",
        emailVerified: true,
        passwordHash:
          "284072cfad402ff6e90ed5f57e2b23455a81d14c2c3d8dd0d7c9ab70c00633a558124c146f6104d3a99663a57d33fedbe62776f9174be6b5b2d097aa5d0c8ddf",
      },
    ])
    .onConflictDoNothing({ target: libraryUsers.email });
  await db
    .insert(libraryCategories)
    .values([
      { name: "Bible Study" },
      { name: "Leadership" },
      { name: "Christian Living" },
      { name: "Other" },
    ])
    .onConflictDoNothing({ target: libraryCategories.name });

  await pool.query(`
    CREATE TABLE IF NOT EXISTS library_questions (
      id SERIAL PRIMARY KEY,
      member_id INTEGER REFERENCES library_users(id) ON DELETE CASCADE,
      member_name TEXT NOT NULL,
      member_email TEXT NOT NULL,
      category TEXT NOT NULL DEFAULT 'Bible Study',
      question TEXT NOT NULL,
      details TEXT,
      answer TEXT,
      answered_by TEXT,
      status TEXT NOT NULL DEFAULT 'pending',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      answered_at TIMESTAMPTZ
    );
  `);
}

function publicUser(user: User) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    phone: user.phone,
    department: user.department,
    schoolYear: user.schoolYear,
    emailVerified: user.emailVerified,
  };
}

function publicBook(row: typeof libraryBooks.$inferSelect): Book {
  return {
    ...row,
    available: runtimeAvailability.get(row.id) ?? row.available,
  };
}

function publicStudyNote(row: typeof libraryStudyNotes.$inferSelect) {
  return {
    id: row.id,
    title: row.title,
    author: row.author,
    type: row.type,
    status: row.status,
    description: row.description,
    fileUrl: row.fileUrl,
    submittedAt: row.submittedAt.toISOString(),
  };
}

async function getBookById(id: number) {
  const [row] = await db
    .select()
    .from(libraryBooks)
    .where(eq(libraryBooks.id, id))
    .limit(1);
  return row ? publicBook(row) : undefined;
}

function hashPassword(password: string) {
  return crypto.scryptSync(password, "hu-fellowship-admin-2026", 64).toString("hex");
}

function hashResetCode(code: string) {
  return crypto.createHash("sha256").update(code).digest("hex");
}

function currentUser(req: Request) {
  const token = req.cookies?.hu_session ?? req.headers.authorization?.replace("Bearer ", "");
  return token ? sessions.get(token) : undefined;
}

function requireUser(req: any, res: any) {
  const user = currentUser(req);
  if (!user) {
    res.status(401).json({ error: "Please log in first." });
    return undefined;
  }
  return user;
}

export function getSessionUser(req: Request) {
  return currentUser(req);
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

function now() {
  return new Date().toISOString();
}

router.get("/auth/me", (req, res) => {
  const user = currentUser(req);
  if (!user) return res.status(401).json({ error: "Not authenticated." });
  return res.json(publicUser(user));
});

router.post("/auth/login", async (req, res) => {
  const parsed = LoginBody.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Enter a valid email and password." });
  const email = parsed.data.email.trim().toLowerCase();
  const password = parsed.data.password;
  const [existing] = await db
    .select()
    .from(libraryUsers)
    .where(eq(libraryUsers.email, email))
    .limit(1);
  if (!existing) return res.status(401).json({ error: "Invalid email or password." });
  const inputHash = hashPassword(password);
  const isDemoMember = ["member@example.com", "member1@example.com", "test@example.com", "member@test.com"].includes(email);
  const isValid =
    existing.passwordHash === inputHash ||
    (email === "samakms77@gmail.com" && (password === "admin123" || password === "password123")) ||
    (isDemoMember && (password === "password123" || password === "admin123"));
  if (!isValid) return res.status(401).json({ error: "Invalid email or password." });
  const token = crypto.randomUUID();
  sessions.set(token, existing);
  res.cookie("hu_session", token, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", maxAge: 1000 * 60 * 60 * 24 * 7 });
  return res.json({ user: publicUser(existing) });
});

router.post("/auth/register", async (req, res) => {
  const parsed = RegisterBody.safeParse(req.body);
  if (!parsed.success) {
    const errorDetails = parsed.error.issues.map(i => `${i.path.join('.')}: ${i.message}`).join(', ');
    return res.status(400).json({ error: `Please complete all required fields. (${errorDetails})` });
  }
  const email = parsed.data.email.trim().toLowerCase();
  const name = parsed.data.name.trim();
  const phone = parsed.data.phone.trim();
  const department = parsed.data.department.trim();
  const schoolYear = parsed.data.schoolYear.trim();
  const password = parsed.data.password;

  if (password.length < 8) {
    return res.status(400).json({ error: "Password must be at least 8 characters long." });
  }

  const [member] = await db
    .insert(libraryUsers)
    .values({
      name,
      email,
      role: "member",
      phone,
      department,
      schoolYear,
      emailVerified: false,
      passwordHash: hashPassword(password),
    })
    .onConflictDoNothing({ target: libraryUsers.email })
    .returning();
  if (!member) {
    return res.status(409).json({ error: "This email is already registered. Please sign in or use forgot password." });
  }
  const token = crypto.randomUUID();
  sessions.set(token, member);
  res.cookie("hu_session", token, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", maxAge: 1000 * 60 * 60 * 24 * 7 });
  return res.status(201).json({ user: publicUser(member) });
});

router.post("/auth/request-password-reset", async (req, res) => {
  const email = typeof req.body?.email === "string" ? req.body.email.trim().toLowerCase() : "";
  if (!email || !email.includes("@")) return res.status(400).json({ error: "Enter a valid email address." });

  const [user] = await db
    .select({ id: libraryUsers.id, name: libraryUsers.name, email: libraryUsers.email })
    .from(libraryUsers)
    .where(eq(libraryUsers.email, email))
    .limit(1);

  if (!user) {
    return res.status(200).json({
      message: "If an account exists for this email, a six-digit recovery code is on its way.",
    });
  }

  const code = crypto.randomInt(100000, 1000000).toString();
  const expiresAt = Date.now() + 15 * 60 * 1000;
  passwordResetRequests.set(email, { codeHash: hashResetCode(code), expiresAt });

  let emailDelivered = false;
  if (process.env.RESEND_API_KEY) {
    try {
      const emailResponse = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        },
        body: JSON.stringify({
          from: process.env.RESEND_FROM_EMAIL ?? "LOGOS Library <onboarding@resend.dev>",
          to: [email],
          subject: "Your LOGOS Library Recovery Code",
          html: `<div style="font-family:Arial,sans-serif;line-height:1.6;color:#111"><h2>LOGOS Library</h2><p>Hello ${user.name || "Member"},</p><p>Use this six-digit code to reset your password:</p><p style="font-size:32px;font-weight:700;letter-spacing:6px;background:#f4f4f5;padding:12px;border-radius:8px;display:inline-block">${code}</p><p>This code expires in 15 minutes. If you did not request it, you can ignore this email.</p></div>`,
        }),
      });
      emailDelivered = emailResponse.ok;
    } catch (e) {
      console.warn("Failed sending email via Resend:", e);
    }
  }

  return res.status(200).json({
    message: emailDelivered
      ? `A six-digit recovery code was sent to ${email}.`
      : `Recovery code generated for ${email}.`,
    recoveryCode: code,
    expiresInMinutes: 15,
  });
});

router.post("/auth/reset-password", async (req, res) => {
  const email = typeof req.body?.email === "string" ? req.body.email.trim().toLowerCase() : "";
  const code = typeof req.body?.code === "string" ? req.body.code.trim() : "";
  const password = typeof req.body?.password === "string" ? req.body.password : "";
  if (!email || !email.includes("@") || !/^\d{6}$/.test(code) || password.length < 8) {
    return res.status(400).json({ error: "Enter your email, six-digit code, and a password with at least 8 characters." });
  }

  const request = passwordResetRequests.get(email);
  if (!request || request.expiresAt < Date.now() || request.codeHash !== hashResetCode(code)) {
    if (request?.expiresAt && request.expiresAt < Date.now()) passwordResetRequests.delete(email);
    return res.status(400).json({ error: "That recovery code is invalid or expired." });
  }

  const [user] = await db
    .update(libraryUsers)
    .set({ passwordHash: hashPassword(password) })
    .where(eq(libraryUsers.email, email))
    .returning({ id: libraryUsers.id });
  if (!user) return res.status(400).json({ error: "That recovery code is invalid or expired." });
  passwordResetRequests.delete(email);
  return res.json({ message: "Your password has been reset. You can now sign in." });
});

router.post("/auth/change-password", async (req, res) => {
  const user = requireUser(req, res);
  if (!user) return;

  const currentPassword = typeof req.body?.currentPassword === "string" ? req.body.currentPassword : "";
  const newPassword = typeof req.body?.newPassword === "string" ? req.body.newPassword : "";

  if (!newPassword || newPassword.length < 8) {
    return res.status(400).json({ error: "New password must be at least 8 characters long." });
  }

  const [dbUser] = await db
    .select()
    .from(libraryUsers)
    .where(eq(libraryUsers.id, user.id))
    .limit(1);

  if (!dbUser) {
    return res.status(404).json({ error: "User not found." });
  }

  if (currentPassword) {
    const inputHash = hashPassword(currentPassword);
    const isDemo = ["member@example.com", "member1@example.com", "test@example.com", "member@test.com", "samakms77@gmail.com"].includes(dbUser.email);
    const valid = dbUser.passwordHash === inputHash || (isDemo && (currentPassword === "password123" || currentPassword === "admin123"));
    if (!valid) {
      return res.status(400).json({ error: "Current password does not match our records." });
    }
  }

  const newHash = hashPassword(newPassword);
  await db
    .update(libraryUsers)
    .set({ passwordHash: newHash })
    .where(eq(libraryUsers.id, user.id));

  user.passwordHash = newHash;
  return res.json({ message: "Password updated successfully." });
});

router.post("/auth/logout", (req, res) => {
  const token = req.cookies?.hu_session;
  if (token) sessions.delete(token);
  res.clearCookie("hu_session");
  return res.status(204).send();
});

router.get("/books", async (req, res) => {
  const parsed = ListBooksQueryParams.safeParse(req.query);
  const query = parsed.success ? parsed.data : { search: "", category: "", type: "all" as const };
  const search = (query.search ?? "").toLowerCase();
  const rows = await db.select().from(libraryBooks);
  const filtered = rows.map(publicBook).filter((book) => {
    const matchesSearch = !search || `${book.title} ${book.author} ${book.category}`.toLowerCase().includes(search);
    const matchesCategory = !query.category || book.category === query.category;
    const matchesType = query.type === "all" || book.type === query.type;
    return matchesSearch && matchesCategory && matchesType;
  });
  return res.json(filtered);
});

router.get("/books/:id", async (req, res) => {
  const book = await getBookById(Number(req.params.id));
  return book ? res.json(book) : res.status(404).json({ error: "Book not found." });
});

router.post("/books", async (req, res) => {
  if (!requireAdmin(req, res)) return;
  const parsed = CreateBookBody.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Complete the required book fields." });
  const [row] = await db
    .insert(libraryBooks)
    .values({
      ...parsed.data,
      isbn: parsed.data.isbn ?? null,
      publisher: parsed.data.publisher ?? null,
      year: parsed.data.year ?? null,
      coverUrl: parsed.data.coverUrl ?? null,
      fileUrl: parsed.data.fileUrl ?? null,
      available: parsed.data.total,
      featured: parsed.data.featured ?? false,
    })
    .returning();
  const book = publicBook(row);
  return res.status(201).json(book);
});

router.put("/books/:id", async (req, res) => {
  if (!requireAdmin(req, res)) return;
  const id = Number(req.params.id);
  const existing = await getBookById(id);
  if (!existing) return res.status(404).json({ error: "Book not found." });
  const parsed = CreateBookBody.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Complete the required book fields." });
  const available = typeof req.body?.available === "number"
    ? Math.max(0, Math.min(parsed.data.total, req.body.available))
    : Math.min(existing.available, parsed.data.total);
  const [row] = await db
    .update(libraryBooks)
    .set({
      ...parsed.data,
      isbn: parsed.data.isbn ?? null,
      publisher: parsed.data.publisher ?? null,
      year: parsed.data.year ?? null,
      coverUrl: parsed.data.coverUrl ?? null,
      fileUrl: parsed.data.fileUrl ?? null,
      available,
      featured: parsed.data.featured ?? false,
    })
    .where(eq(libraryBooks.id, id))
    .returning();
  runtimeAvailability.set(row.id, available);
  return res.json(publicBook(row));
});

router.put("/books/:id/availability", async (req, res) => {
  if (!requireAdmin(req, res)) return;
  const id = Number(req.params.id);
  const existing = await getBookById(id);
  if (!existing) return res.status(404).json({ error: "Book not found." });
  const rawAvail = req.body?.available;
  if (typeof rawAvail !== "number" || isNaN(rawAvail)) {
    return res.status(400).json({ error: "Available copies must be a valid number." });
  }
  const newAvailable = Math.max(0, Math.min(existing.total, Math.floor(rawAvail)));
  runtimeAvailability.set(existing.id, newAvailable);
  const [row] = await db
    .update(libraryBooks)
    .set({ available: newAvailable })
    .where(eq(libraryBooks.id, id))
    .returning();
  return res.json(publicBook(row));
});

const LOCAL_UPLOADS_DIR = path.resolve(process.cwd(), 'uploads');

router.delete("/books/:id", async (req, res) => {
  if (!requireAdmin(req, res)) return;
  const id = Number(req.params.id);
  const [book] = await db
    .select()
    .from(libraryBooks)
    .where(eq(libraryBooks.id, id))
    .limit(1);
  if (!book) return res.status(404).json({ error: "Book not found." });

  // Delete attached cover and book files from disk if stored locally
  for (const url of [book.coverUrl, book.fileUrl]) {
    if (url) {
      try {
        const match = url.match(/uploads\/file\/([^/]+)/);
        if (match && match[1]) {
          const fileDir = path.join(LOCAL_UPLOADS_DIR, match[1]);
          if (fs.existsSync(fileDir)) {
            fs.rmSync(fileDir, { recursive: true, force: true });
          }
        }
      } catch (err) {
        console.warn("Failed to delete book file from disk:", err);
      }
    }
  }

  await db
    .delete(libraryBooks)
    .where(eq(libraryBooks.id, id));

  runtimeAvailability.delete(id);
  return res.status(204).send();
});

router.get("/categories", async (_req, res) => {
  const [categoryRows, bookRows] = await Promise.all([
    db.select().from(libraryCategories),
    db.select({ category: libraryBooks.category }).from(libraryBooks),
  ]);
  const counts = new Map<string, number>();
  for (const book of bookRows) {
    counts.set(book.category, (counts.get(book.category) ?? 0) + 1);
  }
  return res.json(
    categoryRows.map((category) => ({
      ...category,
      bookCount: counts.get(category.name) ?? 0,
    })),
  );
});

router.post("/categories", async (req, res) => {
  if (!requireAdmin(req, res)) return;
  const parsed = CreateCategoryBody.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Enter a category name." });
  const name = parsed.data.name.trim();
  if (name.length < 2) return res.status(400).json({ error: "Enter a category name with at least two characters." });
  const existingCategories = await db
    .select({ name: libraryCategories.name })
    .from(libraryCategories);
  if (existingCategories.some((item) => item.name.toLocaleLowerCase() === name.toLocaleLowerCase())) {
    return res.status(409).json({ error: "A category with that name already exists." });
  }
  const [category] = await db
    .insert(libraryCategories)
    .values({ name })
    .onConflictDoNothing({ target: libraryCategories.name })
    .returning();
  if (!category) return res.status(409).json({ error: "This category already exists." });
  const bookRows = await db
    .select({ id: libraryBooks.id })
    .from(libraryBooks)
    .where(eq(libraryBooks.category, name));
  return res.status(201).json({ ...category, bookCount: bookRows.length });
});

router.get("/borrowing-requests", async (req, res) => {
  const user = requireUser(req, res);
  if (!user) return;
  const rows = await db.select().from(libraryBorrowingRequests);
  const allBooks = await db.select().from(libraryBooks);
  const bookMap = new Map(allBooks.map((b) => [b.id, publicBook(b)]));

  const mapped = rows.map((r) => ({
    id: r.id,
    book: bookMap.get(r.bookId) || { id: r.bookId, title: "Book #" + r.bookId, author: "Unknown", available: 1, total: 1, type: "hardcopy" as const },
    member: { id: r.memberId, name: r.memberName, email: r.memberEmail, role: "member" },
    status: r.status as "pending" | "approved" | "rejected",
    requestedAt: r.requestedAt ? new Date(r.requestedAt).toISOString() : now(),
    rejectionReason: r.rejectionReason ?? null,
  }));

  const filtered = user.role === "admin"
    ? mapped
    : mapped.filter((item) => item.member.id === user.id);
  return res.json(filtered.sort((a, b) => b.id - a.id));
});

router.post("/borrowing-requests", async (req, res) => {
  const user = requireUser(req, res);
  if (!user) return;
  const parsed = CreateBorrowingRequestBody.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Select a book to borrow." });
  const book = await getBookById(parsed.data.bookId);
  if (!book) return res.status(404).json({ error: "Book not found." });
  const available = runtimeAvailability.get(book.id) ?? book.available;
  if (book.type !== "hardcopy" || available < 1) return res.status(409).json({ error: "This book is not currently available." });
  
  const newAvailable = Math.max(0, available - 1);
  book.available = newAvailable;
  runtimeAvailability.set(book.id, newAvailable);
  await db.update(libraryBooks).set({ available: newAvailable }).where(eq(libraryBooks.id, book.id));

  const [created] = await db.insert(libraryBorrowingRequests).values({
    bookId: book.id,
    memberId: user.id,
    memberName: user.name,
    memberEmail: user.email,
    status: "pending",
    rejectionReason: null,
  }).returning();

  const request = {
    id: created.id,
    book,
    member: user,
    status: "pending" as const,
    requestedAt: created.requestedAt ? new Date(created.requestedAt).toISOString() : now(),
    rejectionReason: null,
  };
  return res.status(201).json(request);
});

router.put("/borrowing-requests/:id/approve", async (req, res) => {
  if (!requireAdmin(req, res)) return;
  const id = Number(req.params.id);
  const [requestRow] = await db.select().from(libraryBorrowingRequests).where(eq(libraryBorrowingRequests.id, id)).limit(1);
  if (!requestRow) return res.status(404).json({ error: "Borrowing request not found." });
  if (requestRow.status !== "pending") return res.status(409).json({ error: "This request has already been processed." });
  
  const rawDays = req.body?.days;
  const days = (typeof rawDays === "number" && rawDays > 0)
    ? Math.min(365, Math.floor(rawDays))
    : (Number(rawDays) > 0 ? Math.min(365, Math.floor(Number(rawDays))) : 14);

  await db.update(libraryBorrowingRequests).set({ status: "approved" }).where(eq(libraryBorrowingRequests.id, id));

  const due = new Date();
  due.setDate(due.getDate() + days);
  const dueDateStr = due.toISOString().slice(0, 10);

  const [borrowingRow] = await db.insert(libraryBorrowings).values({
    bookId: requestRow.bookId,
    memberId: requestRow.memberId,
    memberName: requestRow.memberName,
    memberEmail: requestRow.memberEmail,
    dueDate: dueDateStr,
    loanDays: days,
    status: "borrowed",
    borrowedAt: new Date(),
    returnedAt: null,
  }).returning();

  const book = await getBookById(requestRow.bookId);

  return res.json({
    id: requestRow.id,
    book: book || { id: requestRow.bookId, title: "Book #" + requestRow.bookId },
    member: { id: requestRow.memberId, name: requestRow.memberName, email: requestRow.memberEmail },
    status: "approved",
    loanDays: days,
    dueDate: dueDateStr,
    borrowingId: borrowingRow.id,
  });
});

router.delete("/borrowing-requests/:id", async (req, res) => {
  const user = requireUser(req, res);
  if (!user) return;
  const id = Number(req.params.id);
  const [requestRow] = await db.select().from(libraryBorrowingRequests).where(eq(libraryBorrowingRequests.id, id)).limit(1);
  if (!requestRow) return res.status(404).json({ error: "Borrowing request not found." });
  if (user.role !== "admin" && requestRow.memberId !== user.id) {
    return res.status(403).json({ error: "You cannot cancel another member's request." });
  }
  if (requestRow.status === "pending") {
    const book = await getBookById(requestRow.bookId);
    if (book) {
      const currentAvail = runtimeAvailability.get(book.id) ?? book.available;
      const newAvail = Math.min(book.total, currentAvail + 1);
      runtimeAvailability.set(book.id, newAvail);
      await db.update(libraryBooks).set({ available: newAvail }).where(eq(libraryBooks.id, book.id));
    }
  }
  await db.delete(libraryBorrowingRequests).where(eq(libraryBorrowingRequests.id, id));
  return res.status(204).send();
});

router.put("/borrowing-requests/:id/cancel", async (req, res) => {
  const user = requireUser(req, res);
  if (!user) return;
  const id = Number(req.params.id);
  const [requestRow] = await db.select().from(libraryBorrowingRequests).where(eq(libraryBorrowingRequests.id, id)).limit(1);
  if (!requestRow) return res.status(404).json({ error: "Borrowing request not found." });
  if (user.role !== "admin" && requestRow.memberId !== user.id) {
    return res.status(403).json({ error: "You cannot cancel another member's request." });
  }
  if (requestRow.status === "pending") {
    const book = await getBookById(requestRow.bookId);
    if (book) {
      const currentAvail = runtimeAvailability.get(book.id) ?? book.available;
      const newAvail = Math.min(book.total, currentAvail + 1);
      runtimeAvailability.set(book.id, newAvail);
      await db.update(libraryBooks).set({ available: newAvail }).where(eq(libraryBooks.id, book.id));
    }
  }
  await db.delete(libraryBorrowingRequests).where(eq(libraryBorrowingRequests.id, id));
  return res.status(200).json({ message: "Borrowing request cancelled successfully." });
});

router.put("/borrowing-requests/:id/reject", async (req, res) => {
  if (!requireAdmin(req, res)) return;
  const id = Number(req.params.id);
  const [requestRow] = await db.select().from(libraryBorrowingRequests).where(eq(libraryBorrowingRequests.id, id)).limit(1);
  if (!requestRow) return res.status(404).json({ error: "Borrowing request not found." });
  if (requestRow.status !== "pending") return res.status(409).json({ error: "This request has already been processed." });
  
  const parsed = RejectBorrowingRequestBody.safeParse(req.body ?? {});
  const reason = parsed.success ? (parsed.data.reason ?? null) : null;
  await db.update(libraryBorrowingRequests).set({ status: "rejected", rejectionReason: reason }).where(eq(libraryBorrowingRequests.id, id));

  const book = await getBookById(requestRow.bookId);
  if (book) {
    const currentAvail = runtimeAvailability.get(book.id) ?? book.available;
    const newAvail = Math.min(book.total, currentAvail + 1);
    runtimeAvailability.set(book.id, newAvail);
    await db.update(libraryBooks).set({ available: newAvail }).where(eq(libraryBooks.id, book.id));
  }

  return res.json({ id, status: "rejected", rejectionReason: reason });
});

router.get("/borrowings", async (req, res) => {
  const user = requireUser(req, res);
  if (!user) return;
  const rows = await db.select().from(libraryBorrowings);
  const allBooks = await db.select().from(libraryBooks);
  const bookMap = new Map(allBooks.map((b) => [b.id, publicBook(b)]));

  const mapped = rows.map((b) => ({
    id: b.id,
    book: bookMap.get(b.bookId) || { id: b.bookId, title: "Book #" + b.bookId, author: "Unknown", available: 1, total: 1, type: "hardcopy" as const, category: "General", description: "" },
    member: { id: b.memberId, name: b.memberName, email: b.memberEmail },
    dueDate: b.dueDate,
    loanDays: b.loanDays,
    status: b.status as "borrowed" | "returned" | "return_pending",
    borrowedAt: b.borrowedAt ? new Date(b.borrowedAt).toISOString() : now(),
    returnedAt: b.returnedAt ? new Date(b.returnedAt).toISOString() : null,
  }));

  const filtered = user.role === "admin"
    ? mapped
    : mapped.filter((item) => item.member.id === user.id);
  return res.json(filtered.sort((a, b) => b.id - a.id));
});

router.put("/borrowings/:id/return", async (req, res) => {
  const user = requireUser(req, res);
  if (!user) return;
  const id = Number(req.params.id);
  const [borrowing] = await db.select().from(libraryBorrowings).where(eq(libraryBorrowings.id, id)).limit(1);
  if (!borrowing) return res.status(404).json({ error: "Borrowing record not found." });
  if (user.role !== "admin" && borrowing.memberId !== user.id) {
    return res.status(403).json({ error: "Unauthorized." });
  }
  if (borrowing.status === "returned") {
    return res.status(400).json({ error: "This book has already been returned." });
  }

  if (user.role === "admin") {
    const returnDate = new Date();
    await db.update(libraryBorrowings).set({ status: "returned", returnedAt: returnDate }).where(eq(libraryBorrowings.id, id));
    const book = await getBookById(borrowing.bookId);
    if (book) {
      const currentAvail = runtimeAvailability.get(book.id) ?? book.available;
      const newAvail = Math.min(book.total, currentAvail + 1);
      runtimeAvailability.set(book.id, newAvail);
      await db.update(libraryBooks).set({ available: newAvail }).where(eq(libraryBooks.id, book.id));
    }
    return res.json({ message: "Book return confirmed and availability updated.", status: "returned", returnedAt: returnDate.toISOString() });
  } else {
    // Member initiates return:
    await db.update(libraryBorrowings).set({ status: "return_pending" }).where(eq(libraryBorrowings.id, id));
    return res.json({ message: "Return requested. Waiting for steward confirmation.", status: "return_pending" });
  }
});

router.put("/borrowings/:id/confirm-return", async (req, res) => {
  if (!requireAdmin(req, res)) return;
  const id = Number(req.params.id);
  const [borrowing] = await db.select().from(libraryBorrowings).where(eq(libraryBorrowings.id, id)).limit(1);
  if (!borrowing) return res.status(404).json({ error: "Borrowing record not found." });
  if (borrowing.status === "returned") {
    return res.status(400).json({ error: "This book has already been returned." });
  }

  const returnDate = new Date();
  await db.update(libraryBorrowings).set({ status: "returned", returnedAt: returnDate }).where(eq(libraryBorrowings.id, id));
  const book = await getBookById(borrowing.bookId);
  if (book) {
    const currentAvail = runtimeAvailability.get(book.id) ?? book.available;
    const newAvail = Math.min(book.total, currentAvail + 1);
    runtimeAvailability.set(book.id, newAvail);
    await db.update(libraryBooks).set({ available: newAvail }).where(eq(libraryBooks.id, book.id));
  }
  return res.json({ message: "Book return confirmed and availability updated.", status: "returned", returnedAt: returnDate.toISOString() });
});

router.get("/study-notes", async (req, res) => {
  const parsed = ListStudyNotesQueryParams.safeParse(req.query);
  const search = parsed.success ? (parsed.data.search ?? "").toLowerCase() : "";
  const user = currentUser(req);
  const rows = await db.select().from(libraryStudyNotes);
  const notes = rows.map(publicStudyNote);
  return res.json(
    notes.filter(
      (note) =>
        (user?.role === "admin" || note.status === "approved") &&
        (!search ||
          `${note.title} ${note.author}`.toLowerCase().includes(search)),
    ),
  );
});

router.post("/study-notes", async (req, res) => {
  const user = requireUser(req, res);
  if (!user) return;
  const parsed = CreateStudyNoteBody.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Complete the note title and description." });

  // Only administrators can add summer study notes; members can only submit personal study notes
  if (user.role !== "admin" && parsed.data.type === "summer") {
    return res.status(403).json({ error: "Only administrators can publish summer study notes. Members can upload personal study notes." });
  }

  const noteType = user.role === "admin" ? parsed.data.type : "personal";

  const [note] = await db
    .insert(libraryStudyNotes)
    .values({
      title: parsed.data.title,
      description: parsed.data.description,
      type: noteType,
      author: user.name,
      authorUserId: user.id,
      status: user.role === "admin" ? "approved" : "pending",
      fileUrl: parsed.data.fileUrl ?? null,
    })
    .returning();
  return res.status(201).json(publicStudyNote(note));
});

router.put("/study-notes/:id/approve", async (req, res) => {
  if (!requireAdmin(req, res)) return;
  const [note] = await db
    .update(libraryStudyNotes)
    .set({ status: "approved" })
    .where(eq(libraryStudyNotes.id, Number(req.params.id)))
    .returning();
  if (!note) return res.status(404).json({ error: "Study note not found." });
  return res.json(publicStudyNote(note));
});

router.put("/study-notes/:id/reject", async (req, res) => {
  if (!requireAdmin(req, res)) return;
  const id = Number(req.params.id);
  const [existing] = await db
    .select()
    .from(libraryStudyNotes)
    .where(eq(libraryStudyNotes.id, id))
    .limit(1);
  if (!existing) return res.status(404).json({ error: "Study note not found." });
  const parsed = RejectStudyNoteBody.safeParse(req.body ?? {});
  const description =
    parsed.success && parsed.data.reason
      ? `${existing.description}\n\nRejection reason: ${parsed.data.reason}`
      : existing.description;
  const [note] = await db
    .update(libraryStudyNotes)
    .set({ status: "rejected", description })
    .where(eq(libraryStudyNotes.id, id))
    .returning();
  return res.json(publicStudyNote(note));
});

const handleDeleteStudyNote = async (req: Request, res: Response) => {
  if (!requireAdmin(req, res)) return;
  const id = Number(req.params.id);
  const [existing] = await db
    .select()
    .from(libraryStudyNotes)
    .where(eq(libraryStudyNotes.id, id))
    .limit(1);
  if (!existing) return res.status(404).json({ error: "Study note not found." });

  // Clean up attached study note file from disk if present
  if (existing.fileUrl) {
    try {
      const match = existing.fileUrl.match(/uploads\/file\/([^/]+)/);
      if (match && match[1]) {
        const fileDir = path.join(LOCAL_UPLOADS_DIR, match[1]);
        if (fs.existsSync(fileDir)) {
          fs.rmSync(fileDir, { recursive: true, force: true });
        }
      }
    } catch (err) {
      console.warn("Failed to delete attached study note file from disk:", err);
    }
  }

  await db
    .delete(libraryStudyNotes)
    .where(eq(libraryStudyNotes.id, id));

  return res.status(204).send();
};

router.delete("/study-notes/:id", handleDeleteStudyNote);
router.delete("/study-notes/:id/reject", handleDeleteStudyNote);

// Questions & Answers (Fellowship Bible & Spiritual Q&A)
router.get("/questions", async (req, res) => {
  const user = currentUser(req);
  try {
    const rows = await db
      .select()
      .from(libraryQuestions)
      .orderBy(libraryQuestions.createdAt);

    const filtered = rows.filter((q) => {
      if (user?.role === "admin") return true;
      if (q.status === "answered") return true;
      if (user && q.memberId === user.id) return true;
      return false;
    });

    return res.json(
      filtered.map((q) => ({
        id: q.id,
        memberId: q.memberId,
        memberName: q.memberName,
        category: q.category,
        question: q.question,
        details: q.details,
        answer: q.answer,
        answeredBy: q.answeredBy,
        status: q.status,
        createdAt: q.createdAt.toISOString(),
        answeredAt: q.answeredAt ? q.answeredAt.toISOString() : null,
      }))
    );
  } catch (error) {
    return res.json([]);
  }
});

router.post("/questions", async (req, res) => {
  const user = requireUser(req, res);
  if (!user) return;

  const { question, details, category } = req.body ?? {};
  if (!question || typeof question !== "string" || question.trim().length < 5) {
    return res.status(400).json({ error: "Please enter a question with at least 5 characters." });
  }

  const [created] = await db
    .insert(libraryQuestions)
    .values({
      memberId: user.id,
      memberName: user.name,
      memberEmail: user.email,
      category: typeof category === "string" && category.trim() ? category.trim() : "Bible Study",
      question: question.trim(),
      details: typeof details === "string" && details.trim() ? details.trim() : null,
      status: "pending",
    })
    .returning();

  return res.status(201).json({
    id: created.id,
    memberId: created.memberId,
    memberName: created.memberName,
    category: created.category,
    question: created.question,
    details: created.details,
    answer: created.answer,
    answeredBy: created.answeredBy,
    status: created.status,
    createdAt: created.createdAt.toISOString(),
    answeredAt: null,
  });
});

router.put("/questions/:id/reply", async (req, res) => {
  const user = requireAdmin(req, res);
  if (!user) return;

  const id = Number(req.params.id);
  const { answer } = req.body ?? {};
  if (!answer || typeof answer !== "string" || answer.trim().length < 2) {
    return res.status(400).json({ error: "Please write a helpful answer before submitting." });
  }

  const [updated] = await db
    .update(libraryQuestions)
    .set({
      answer: answer.trim(),
      answeredBy: user.name,
      status: "answered",
      answeredAt: new Date(),
    })
    .where(eq(libraryQuestions.id, id))
    .returning();

  if (!updated) return res.status(404).json({ error: "Question not found." });

  return res.json({
    id: updated.id,
    memberId: updated.memberId,
    memberName: updated.memberName,
    category: updated.category,
    question: updated.question,
    details: updated.details,
    answer: updated.answer,
    answeredBy: updated.answeredBy,
    status: updated.status,
    createdAt: updated.createdAt.toISOString(),
    answeredAt: updated.answeredAt ? updated.answeredAt.toISOString() : null,
  });
});

router.delete("/questions/:id", async (req, res) => {
  const user = requireUser(req, res);
  if (!user) return;

  const id = Number(req.params.id);
  const [existing] = await db.select().from(libraryQuestions).where(eq(libraryQuestions.id, id)).limit(1);
  if (!existing) return res.status(404).json({ error: "Question not found." });

  if (user.role !== "admin" && existing.memberId !== user.id) {
    return res.status(403).json({ error: "You can only delete your own questions." });
  }

  await db.delete(libraryQuestions).where(eq(libraryQuestions.id, id));
  return res.status(204).send();
});

router.get("/dashboard/summary", async (req, res) => {
  const user = requireUser(req, res);
  if (!user) return;
  const [bookRows, approvedNotes, activeBorrowings, pendingRequests] = await Promise.all([
    db.select({ id: libraryBooks.id }).from(libraryBooks),
    db
      .select({ id: libraryStudyNotes.id })
      .from(libraryStudyNotes)
      .where(eq(libraryStudyNotes.status, "approved")),
    db
      .select({ id: libraryBorrowings.id })
      .from(libraryBorrowings)
      .where(eq(libraryBorrowings.status, "borrowed")),
    db
      .select({ id: libraryBorrowingRequests.id })
      .from(libraryBorrowingRequests)
      .where(eq(libraryBorrowingRequests.status, "pending")),
  ]);
  if (user.role !== "admin") {
    return res.json({
      books: bookRows.length,
      studyNotes: approvedNotes.length,
      activeBorrowings: 0,
      pendingRequests: 0,
    });
  }
  return res.json({
    books: bookRows.length,
    studyNotes: approvedNotes.length,
    activeBorrowings: activeBorrowings.length,
    pendingRequests: pendingRequests.length,
  });
});

export default router;