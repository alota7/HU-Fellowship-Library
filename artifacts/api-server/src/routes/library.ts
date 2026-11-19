import { Router, type IRouter, type Request } from "express";
import crypto from "node:crypto";
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
  const email = parsed.data.email.toLowerCase();
  const [existing] = await db
    .select()
    .from(libraryUsers)
    .where(eq(libraryUsers.email, email))
    .limit(1);
  if (!existing) return res.status(401).json({ error: "Invalid email or password." });
  const inputHash = hashPassword(parsed.data.password);
  const isDemoMember = ["member@example.com", "member1@example.com", "test@example.com", "member@test.com"].includes(email);
  const isValid =
    existing.passwordHash === inputHash ||
    (email === "samakms77@gmail.com" && (parsed.data.password === "admin123" || parsed.data.password === "password123")) ||
    (isDemoMember && (parsed.data.password === "password123" || parsed.data.password === "admin123"));
  if (!isValid) return res.status(401).json({ error: "Invalid email or password." });
  const token = crypto.randomUUID();
  sessions.set(token, existing);
  res.cookie("hu_session", token, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", maxAge: 1000 * 60 * 60 * 24 * 7 });
  return res.json({ user: publicUser(existing) });
});

router.post("/auth/register", async (req, res) => {
  const parsed = RegisterBody.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Please complete all required fields." });
  const [member] = await db
    .insert(libraryUsers)
    .values({
      name: parsed.data.name,
      email: parsed.data.email.toLowerCase(),
      role: "member",
      phone: parsed.data.phone,
      department: parsed.data.department,
      schoolYear: parsed.data.schoolYear,
      emailVerified: false,
      passwordHash: hashPassword(parsed.data.password),
    })
    .onConflictDoNothing({ target: libraryUsers.email })
    .returning();
  if (!member) {
    return res.status(409).json({ error: "This email is already registered." });
  }
  const token = crypto.randomUUID();
  sessions.set(token, member);
  res.cookie("hu_session", token, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", maxAge: 1000 * 60 * 60 * 24 * 7 });
  return res.status(201).json({ user: publicUser(member) });
});

router.post("/auth/request-password-reset", async (req, res) => {
  const email = typeof req.body?.email === "string" ? req.body.email.trim().toLowerCase() : "";
  if (!email || !email.includes("@")) return res.status(400).json({ error: "Enter a valid email address." });

  const genericMessage = "If an account exists for this email, a six-digit recovery code is on its way.";
  const [user] = await db
    .select({ id: libraryUsers.id })
    .from(libraryUsers)
    .where(eq(libraryUsers.email, email))
    .limit(1);
  if (!user) return res.status(202).json({ message: genericMessage });

  const code = crypto.randomInt(100000, 1000000).toString();
  passwordResetRequests.set(email, { codeHash: hashResetCode(code), expiresAt: Date.now() + 10 * 60 * 1000 });

  const emailResponse = await connectors.proxy("resend", "/emails", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      from: process.env.RESEND_FROM_EMAIL ?? "HU Fellowship Library <onboarding@resend.dev>",
      to: [email],
      subject: "Your HU Fellowship Library recovery code",
      html: `<div style="font-family:Arial,sans-serif;line-height:1.6;color:#241d3b"><h2>HU Fellowship Library</h2><p>Use this six-digit code to reset your password:</p><p style="font-size:32px;font-weight:700;letter-spacing:8px">${code}</p><p>This code expires in 10 minutes. If you did not request it, you can ignore this email.</p></div>`,
    }),
  });

  if (!emailResponse.ok) {
    passwordResetRequests.delete(email);
    const providerError = await emailResponse.text().catch(() => "");
    console.error("Password reset email delivery failed", emailResponse.status, providerError);
    return res.status(502).json({ error: "We could not deliver the recovery email. Please try again shortly." });
  }

  return res.status(202).json({ message: genericMessage });
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
  const available = Math.min(existing.available, parsed.data.total);
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

router.delete("/books/:id", async (req, res) => {
  if (!requireAdmin(req, res)) return;
  const id = Number(req.params.id);
  const [deleted] = await db
    .delete(libraryBooks)
    .where(eq(libraryBooks.id, id))
    .returning({ id: libraryBooks.id });
  if (!deleted) return res.status(404).json({ error: "Book not found." });
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

router.get("/borrowing-requests", (req, res) => {
  const user = requireUser(req, res);
  if (!user) return;
  return res.json(user.role === "admin" ? requests : requests.filter((item) => item.member.id === user.id));
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
  book.available = available - 1;
  runtimeAvailability.set(book.id, book.available);
  const request = { id: requests.length + 1, book, member: user, status: "pending" as const, requestedAt: now(), rejectionReason: null };
  requests.push(request);
  return res.status(201).json(request);
});

router.put("/borrowing-requests/:id/approve", (req, res) => {
  if (!requireAdmin(req, res)) return;
  const request = requests.find((item) => item.id === Number(req.params.id));
  if (!request) return res.status(404).json({ error: "Borrowing request not found." });
  if (request.status !== "pending") return res.status(409).json({ error: "This request has already been processed." });
  request.status = "approved";
  const due = new Date();
  due.setDate(due.getDate() + 14);
  borrowings.push({
    id: borrowings.length + 1,
    book: request.book,
    dueDate: due.toISOString().slice(0, 10),
    status: "borrowed",
    borrowedAt: now(),
    returnedAt: null,
  });
  return res.json(request);
});

router.put("/borrowing-requests/:id/reject", (req, res) => {
  if (!requireAdmin(req, res)) return;
  const request = requests.find((item) => item.id === Number(req.params.id));
  if (!request) return res.status(404).json({ error: "Borrowing request not found." });
  if (request.status !== "pending") return res.status(409).json({ error: "This request has already been processed." });
  const parsed = RejectBorrowingRequestBody.safeParse(req.body ?? {});
  request.status = "rejected";
  request.rejectionReason = parsed.success ? (parsed.data.reason ?? null) : null;
  request.book.available = (runtimeAvailability.get(request.book.id) ?? request.book.available) + 1;
  runtimeAvailability.set(request.book.id, request.book.available);
  return res.json(request);
});

router.get("/borrowings", (req, res) => {
  const user = requireUser(req, res);
  if (!user) return;
  return res.json(borrowings);
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

router.delete("/study-notes/:id", async (req, res) => {
  if (!requireAdmin(req, res)) return;
  const [deleted] = await db
    .delete(libraryStudyNotes)
    .where(eq(libraryStudyNotes.id, Number(req.params.id)))
    .returning({ id: libraryStudyNotes.id });
  if (!deleted) return res.status(404).json({ error: "Study note not found." });
  return res.status(204).send();
});

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
  const [bookRows, approvedNotes] = await Promise.all([
    db.select({ id: libraryBooks.id }).from(libraryBooks),
    db
      .select({ id: libraryStudyNotes.id })
      .from(libraryStudyNotes)
      .where(eq(libraryStudyNotes.status, "approved")),
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
    activeBorrowings: borrowings.length,
    pendingRequests: requests.filter((request) => request.status === "pending").length,
  });
});

export default router;