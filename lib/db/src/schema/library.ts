import {
  boolean,
  integer,
  pgTable,
  serial,
  text,
  timestamp,
} from "drizzle-orm/pg-core";

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

export const libraryCategories = pgTable("library_categories", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
});

export const libraryBooks = pgTable("library_books", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  author: text("author").notNull(),
  type: text("type").$type<"hardcopy" | "softcopy">().notNull(),
  category: text("category").notNull(),
  description: text("description").notNull(),
  isbn: text("isbn"),
  publisher: text("publisher"),
  year: integer("year"),
  coverUrl: text("cover_url"),
  fileUrl: text("file_url"),
  available: integer("available").notNull().default(0),
  total: integer("total").notNull().default(0),
  featured: boolean("featured").notNull().default(false),
});

export const libraryStudyNotes = pgTable("library_study_notes", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  author: text("author").notNull(),
  authorUserId: integer("author_user_id").references(() => libraryUsers.id, {
    onDelete: "set null",
  }),
  type: text("type").$type<"summer" | "personal">().notNull(),
  status: text("status")
    .$type<"approved" | "pending" | "rejected">()
    .notNull()
    .default("pending"),
  description: text("description").notNull(),
  fileUrl: text("file_url"),
  submittedAt: timestamp("submitted_at", {
    withTimezone: true,
    mode: "date",
  })
    .notNull()
    .defaultNow(),
});

export const libraryQuestions = pgTable("library_questions", {
  id: serial("id").primaryKey(),
  memberId: integer("member_id").references(() => libraryUsers.id, {
    onDelete: "cascade",
  }),
  memberName: text("member_name").notNull(),
  memberEmail: text("member_email").notNull(),
  category: text("category").notNull().default("Bible Study"),
  question: text("question").notNull(),
  details: text("details"),
  answer: text("answer"),
  answeredBy: text("answered_by"),
  status: text("status")
    .$type<"pending" | "answered">()
    .notNull()
    .default("pending"),
  createdAt: timestamp("created_at", {
    withTimezone: true,
    mode: "date",
  })
    .notNull()
    .defaultNow(),
  answeredAt: timestamp("answered_at", {
    withTimezone: true,
    mode: "date",
  }),
});
