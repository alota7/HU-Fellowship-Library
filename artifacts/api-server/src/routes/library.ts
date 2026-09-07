import { Router, type IRouter, type Request } from "express";
import crypto from "node:crypto";
import { ReplitConnectors } from "@replit/connectors-sdk";
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

type Role = "member" | "admin";
type User = {
  id: number;
  name: string;
  email: string;
  role: Role;
  phone: string;
  department: string;
  schoolYear: string;
  emailVerified: boolean;
  passwordHash: string;
};
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
const users: User[] = [
  {
    id: 1,
    name: "Library Administrator",
    email: "samakms77@gmail.com",
    role: "admin",
    phone: "",
    department: "HU Fellowship",
    schoolYear: "Alumni",
    emailVerified: true,
    passwordHash: "fb5b6b868171db4f262e1f46bb0fc6aa2a2384ed07f7dfd1a266e20d35ccecb5c559d6c6c13dbac90f65d3af6a4af65178b5f87e383f606704850f5a81f8ca18",
  },
];
const books: Book[] = [];
const categories = [
  { id: 1, name: "Bible Study", bookCount: 0 },
  { id: 2, name: "Leadership", bookCount: 0 },
  { id: 3, name: "Christian Living", bookCount: 0 },
];
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
const studyNotes: Array<{
  id: number;
  title: string;
  author: string;
  type: "summer" | "personal";
  status: "approved" | "pending" | "rejected";
  description: string;
  fileUrl: string | null;
  submittedAt: string;
}> = [];

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

router.post("/auth/login", (req, res) => {
  const parsed = LoginBody.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Enter a valid email and password." });
  const email = parsed.data.email.toLowerCase();
  const existing = users.find((item) => item.email.toLowerCase() === email);
  if (!existing || existing.passwordHash !== hashPassword(parsed.data.password)) return res.status(401).json({ error: "Invalid email or password." });
  const token = crypto.randomUUID();
  sessions.set(token, existing);
  res.cookie("hu_session", token, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", maxAge: 1000 * 60 * 60 * 24 * 7 });
  return res.json({ user: publicUser(existing) });
});

router.post("/auth/register", (req, res) => {
  const parsed = RegisterBody.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Please complete all required fields." });
  if (users.some((item) => item.email.toLowerCase() === parsed.data.email.toLowerCase())) {
    return res.status(409).json({ error: "This email is already registered." });
  }
  const member: User = {
    id: users.length + 1,
    name: parsed.data.name,
    email: parsed.data.email.toLowerCase(),
    role: "member",
    phone: parsed.data.phone,
    department: parsed.data.department,
    schoolYear: parsed.data.schoolYear,
    emailVerified: false,
    passwordHash: hashPassword(parsed.data.password),
  };
  users.push(member);
  const token = crypto.randomUUID();
  sessions.set(token, member);
  res.cookie("hu_session", token, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", maxAge: 1000 * 60 * 60 * 24 * 7 });
  return res.status(201).json({ user: publicUser(member) });
});

router.post("/auth/request-password-reset", async (req, res) => {
  const email = typeof req.body?.email === "string" ? req.body.email.trim().toLowerCase() : "";
  if (!email || !email.includes("@")) return res.status(400).json({ error: "Enter a valid email address." });

  const genericMessage = "If an account exists for this email, a six-digit recovery code is on its way.";
  const user = users.find((item) => item.email.toLowerCase() === email);
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

router.post("/auth/reset-password", (req, res) => {
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

  const user = users.find((item) => item.email.toLowerCase() === email);
  if (!user) return res.status(400).json({ error: "That recovery code is invalid or expired." });
  user.passwordHash = hashPassword(password);
  passwordResetRequests.delete(email);
  return res.json({ message: "Your password has been reset. You can now sign in." });
});

router.post("/auth/logout", (req, res) => {
  const token = req.cookies?.hu_session;
  if (token) sessions.delete(token);
  res.clearCookie("hu_session");
  return res.status(204).send();
});

router.get("/books", (req, res) => {
  const parsed = ListBooksQueryParams.safeParse(req.query);
  const query = parsed.success ? parsed.data : { search: "", category: "", type: "all" as const };
  const search = (query.search ?? "").toLowerCase();
  const filtered = books.filter((book) => {
    const matchesSearch = !search || `${book.title} ${book.author} ${book.category}`.toLowerCase().includes(search);
    const matchesCategory = !query.category || book.category === query.category;
    const matchesType = query.type === "all" || book.type === query.type;
    return matchesSearch && matchesCategory && matchesType;
  });
  return res.json(filtered);
});

router.get("/books/:id", (req, res) => {
  const book = books.find((item) => item.id === Number(req.params.id));
  return book ? res.json(book) : res.status(404).json({ error: "Book not found." });
});

router.post("/books", (req, res) => {
  if (!requireAdmin(req, res)) return;
  const parsed = CreateBookBody.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Complete the required book fields." });
  const book: Book = {
    id: books.length + 1,
    ...parsed.data,
    isbn: parsed.data.isbn ?? null,
    publisher: parsed.data.publisher ?? null,
    year: parsed.data.year ?? null,
    coverUrl: parsed.data.coverUrl ?? null,
    fileUrl: parsed.data.fileUrl ?? null,
    available: parsed.data.total,
    featured: parsed.data.featured ?? false,
  };
  books.push(book);
  const category = categories.find((item) => item.name === book.category);
  if (category) category.bookCount += 1;
  return res.status(201).json(book);
});

router.put("/books/:id", (req, res) => {
  if (!requireAdmin(req, res)) return;
  const index = books.findIndex((item) => item.id === Number(req.params.id));
  if (index < 0) return res.status(404).json({ error: "Book not found." });
  const parsed = CreateBookBody.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Complete the required book fields." });
  const existing = books[index];
  books[index] = {
    ...existing,
    ...parsed.data,
    isbn: parsed.data.isbn ?? null,
    publisher: parsed.data.publisher ?? null,
    year: parsed.data.year ?? null,
    coverUrl: parsed.data.coverUrl ?? null,
    fileUrl: parsed.data.fileUrl ?? null,
    available: Math.min(existing.available, parsed.data.total),
  };
  return res.json(books[index]);
});

router.delete("/books/:id", (req, res) => {
  if (!requireAdmin(req, res)) return;
  const index = books.findIndex((item) => item.id === Number(req.params.id));
  if (index < 0) return res.status(404).json({ error: "Book not found." });
  books.splice(index, 1);
  return res.status(204).send();
});

router.get("/categories", (_req, res) => res.json(categories));

router.post("/categories", (req, res) => {
  if (!requireAdmin(req, res)) return;
  const parsed = CreateCategoryBody.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Enter a category name." });
  const category = { id: categories.length + 1, name: parsed.data.name, bookCount: 0 };
  categories.push(category);
  return res.status(201).json(category);
});

router.get("/borrowing-requests", (req, res) => {
  const user = requireUser(req, res);
  if (!user) return;
  return res.json(user.role === "admin" ? requests : requests.filter((item) => item.member.id === user.id));
});

router.post("/borrowing-requests", (req, res) => {
  const user = requireUser(req, res);
  if (!user) return;
  const parsed = CreateBorrowingRequestBody.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Select a book to borrow." });
  const book = books.find((item) => item.id === parsed.data.bookId);
  if (!book) return res.status(404).json({ error: "Book not found." });
  if (book.type !== "hardcopy" || book.available < 1) return res.status(409).json({ error: "This book is not currently available." });
  book.available -= 1;
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
  request.book.available += 1;
  return res.json(request);
});

router.get("/borrowings", (req, res) => {
  const user = requireUser(req, res);
  if (!user) return;
  return res.json(borrowings);
});

router.get("/study-notes", (req, res) => {
  const parsed = ListStudyNotesQueryParams.safeParse(req.query);
  const search = parsed.success ? (parsed.data.search ?? "").toLowerCase() : "";
  const user = currentUser(req);
  return res.json(studyNotes.filter((note) => (user?.role === "admin" || note.status === "approved") && (!search || `${note.title} ${note.author}`.toLowerCase().includes(search))));
});

router.post("/study-notes", (req, res) => {
  const user = requireUser(req, res);
  if (!user) return;
  const parsed = CreateStudyNoteBody.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Complete the note title and description." });
  const note = { id: studyNotes.length + 1, ...parsed.data, author: user.name, status: user.role === "admin" ? "approved" as const : "pending" as const, fileUrl: parsed.data.fileUrl ?? null, submittedAt: now() };
  studyNotes.push(note);
  return res.status(201).json(note);
});

router.put("/study-notes/:id/approve", (req, res) => {
  if (!requireAdmin(req, res)) return;
  const note = studyNotes.find((item) => item.id === Number(req.params.id));
  if (!note) return res.status(404).json({ error: "Study note not found." });
  note.status = "approved";
  return res.json(note);
});

router.put("/study-notes/:id/reject", (req, res) => {
  if (!requireAdmin(req, res)) return;
  const note = studyNotes.find((item) => item.id === Number(req.params.id));
  if (!note) return res.status(404).json({ error: "Study note not found." });
  const parsed = RejectStudyNoteBody.safeParse(req.body ?? {});
  note.status = "rejected";
  note.description = parsed.success && parsed.data.reason ? `${note.description}\n\nRejection reason: ${parsed.data.reason}` : note.description;
  return res.json(note);
});

router.delete("/study-notes/:id", (req, res) => {
  if (!requireAdmin(req, res)) return;
  const index = studyNotes.findIndex((item) => item.id === Number(req.params.id));
  if (index < 0) return res.status(404).json({ error: "Study note not found." });
  studyNotes.splice(index, 1);
  return res.status(204).send();
});

router.get("/dashboard/summary", (req, res) => {
  const user = currentUser(req);
  return res.json({
    books: books.length,
    studyNotes: studyNotes.filter((note) => note.status === "approved").length,
    activeBorrowings: user?.role === "admin" ? borrowings.length : borrowings.length,
    pendingRequests: requests.filter((request) => request.status === "pending").length,
  });
});

export default router;