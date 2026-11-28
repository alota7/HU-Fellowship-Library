import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";

const WORKSPACE_ROOT = path.resolve(import.meta.dirname, "..");
const UPLOADS_DIR = path.resolve(WORKSPACE_ROOT, "artifacts/api-server/uploads");

const requireApi = createRequire(path.resolve(WORKSPACE_ROOT, "artifacts/api-server/package.json"));
const requireDb = createRequire(path.resolve(WORKSPACE_ROOT, "lib/db/package.json"));

const { S3Client, PutObjectCommand, HeadObjectCommand } = requireApi("@aws-sdk/client-s3");
const { Client } = requireDb("pg");

const B2_KEY_ID = (process.env.B2_KEY_ID || "").trim();
const B2_APPLICATION_KEY = (process.env.B2_APPLICATION_KEY || "").trim();
const B2_BUCKET_NAME = (process.env.B2_BUCKET_NAME || "").trim();
const B2_ENDPOINT = (process.env.B2_ENDPOINT || "").trim();
const B2_REGION = (process.env.B2_REGION || "").trim();
const DATABASE_URL = (process.env.DATABASE_URL || "").trim();

const missing = [
  ["DATABASE_URL", DATABASE_URL],
  ["B2_KEY_ID", B2_KEY_ID],
  ["B2_APPLICATION_KEY", B2_APPLICATION_KEY],
  ["B2_BUCKET_NAME", B2_BUCKET_NAME],
  ["B2_ENDPOINT", B2_ENDPOINT],
  ["B2_REGION", B2_REGION],
]
  .filter(([, val]) => !val)
  .map(([name]) => name);

if (missing.length > 0) {
  console.error(`Missing required environment variables: ${missing.join(", ")}`);
  process.exit(1);
}

function inferMime(filename) {
  const ext = filename.toLowerCase().split(".").pop() ?? "";
  switch (ext) {
    case "pdf":
      return "application/pdf";
    case "epub":
      return "application/epub+zip";
    case "doc":
      return "application/msword";
    case "docx":
      return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
    case "txt":
      return "text/plain; charset=utf-8";
    case "png":
      return "image/png";
    case "jpg":
    case "jpeg":
      return "image/jpeg";
    case "webp":
      return "image/webp";
    default:
      return "application/octet-stream";
  }
}

function parseLegacyPath(fileRef) {
  if (!fileRef || typeof fileRef !== "string") return null;
  const match = fileRef.match(/uploads\/file\/([^/]+)\/([^/?]+)/);
  if (!match) return null;
  const fileId = match[1].replace(/[^a-zA-Z0-9_-]/g, "");
  const decodedFilename = path.basename(decodeURIComponent(match[2]));
  const diskPath = path.join(UPLOADS_DIR, fileId, decodedFilename);
  return { fileId, filename: decodedFilename, diskPath };
}

const s3 = new S3Client({
  endpoint: B2_ENDPOINT,
  region: B2_REGION,
  credentials: {
    accessKeyId: B2_KEY_ID,
    secretAccessKey: B2_APPLICATION_KEY,
  },
  forcePathStyle: true,
  requestChecksumCalculation: "WHEN_REQUIRED",
  responseChecksumValidation: "WHEN_REQUIRED",
});

async function uploadIfNeeded(folder, legacyRef) {
  const parsed = parseLegacyPath(legacyRef);
  if (!parsed) return null;
  if (!fs.existsSync(parsed.diskPath)) {
    console.warn(`[SKIP] Missing on disk: ${parsed.diskPath}`);
    return null;
  }

  const b2Key = `${folder}/${parsed.fileId}/${parsed.filename}`;
  let alreadyExists = false;
  try {
    await s3.send(new HeadObjectCommand({ Bucket: B2_BUCKET_NAME, Key: b2Key }));
    alreadyExists = true;
  } catch {
    alreadyExists = false;
  }

  if (!alreadyExists) {
    const buffer = fs.readFileSync(parsed.diskPath);
    await s3.send(
      new PutObjectCommand({
        Bucket: B2_BUCKET_NAME,
        Key: b2Key,
        Body: buffer,
        ContentType: inferMime(parsed.filename),
        ContentLength: buffer.byteLength,
      }),
    );
    console.log(`[UPLOADED] ${b2Key} (${buffer.byteLength} bytes)`);
  } else {
    console.log(`[EXISTS]   ${b2Key}`);
  }
  return b2Key;
}

const pgClient = new Client({ connectionString: DATABASE_URL });
await pgClient.connect();

try {
  const { rows: books } = await pgClient.query(
    "SELECT id, title, cover_url, file_url FROM library_books ORDER BY id",
  );
  for (const book of books) {
    const newCoverKey = await uploadIfNeeded("covers", book.cover_url);
    const newFileKey = await uploadIfNeeded("books", book.file_url);
    if (newCoverKey || newFileKey) {
      await pgClient.query(
        "UPDATE library_books SET cover_url = COALESCE($1, cover_url), file_url = COALESCE($2, file_url) WHERE id = $3",
        [newCoverKey, newFileKey, book.id],
      );
      console.log(`[DB BOOK #${book.id}] "${book.title}" updated -> cover=${newCoverKey ?? "(kept)"} file=${newFileKey ?? "(kept)"}`);
    }
  }

  const { rows: notes } = await pgClient.query(
    "SELECT id, title, file_url FROM library_study_notes ORDER BY id",
  );
  for (const note of notes) {
    const newNoteKey = await uploadIfNeeded("study-notes", note.file_url);
    if (newNoteKey) {
      await pgClient.query(
        "UPDATE library_study_notes SET file_url = $1 WHERE id = $2",
        [newNoteKey, note.id],
      );
      console.log(`[DB NOTE #${note.id}] "${note.title}" updated -> file=${newNoteKey}`);
    }
  }

  console.log("\nMigration complete.");
} finally {
  await pgClient.end();
}
