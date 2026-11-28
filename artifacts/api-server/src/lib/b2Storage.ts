import { Readable } from "node:stream";
import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { Upload } from "@aws-sdk/lib-storage";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

export type StoragePurpose = "book" | "cover" | "study-note";

export interface B2Config {
  keyId: string;
  applicationKey: string;
  bucketName: string;
  endpoint: string;
  region: string;
}

const FOLDER_BY_PURPOSE: Record<StoragePurpose, string> = {
  book: "books",
  cover: "covers",
  "study-note": "study-notes",
};

const B2_KEY_PATTERN = /^(books|covers|study-notes)\/[^/\\]+\/[^/\\]+$/;

let cachedClient: S3Client | null = null;
let cachedConfigSignature = "";

/**
 * Resolves endpoint and region from explicit environment variables without guessing defaults.
 */
function resolveEndpointAndRegion(rawEndpoint: string, rawRegion: string): { endpoint: string; region: string } {
  let endpoint = rawEndpoint.trim().replace(/\/+$/, "");
  let region = rawRegion.trim();

  if (endpoint && !/^https?:\/\//i.test(endpoint)) {
    endpoint = `https://${endpoint}`;
  }

  if (endpoint && !region) {
    const match = endpoint.match(/s3\.([a-z0-9-]+)\.backblazeb2\.com/i);
    if (match?.[1]) {
      region = match[1];
    }
  } else if (!endpoint && region) {
    endpoint = `https://s3.${region}.backblazeb2.com`;
  }

  return { endpoint, region };
}

/**
 * Returns normalized Backblaze B2 configuration from process.env.
 */
export function getB2Config(): B2Config {
  const keyId = (process.env.B2_KEY_ID || "").trim();
  const applicationKey = (process.env.B2_APPLICATION_KEY || "").trim();
  const bucketName = (process.env.B2_BUCKET_NAME || "").trim();
  const { endpoint, region } = resolveEndpointAndRegion(
    process.env.B2_ENDPOINT || "",
    process.env.B2_REGION || "",
  );

  return { keyId, applicationKey, bucketName, endpoint, region };
}

/**
 * Lists any required Backblaze B2 environment variables that are not configured yet.
 */
export function getMissingB2EnvVars(): string[] {
  const cfg = getB2Config();
  const missing: string[] = [];
  if (!cfg.keyId) missing.push("B2_KEY_ID");
  if (!cfg.applicationKey) missing.push("B2_APPLICATION_KEY");
  if (!cfg.bucketName) missing.push("B2_BUCKET_NAME");
  if (!cfg.endpoint) missing.push("B2_ENDPOINT");
  if (!cfg.region) missing.push("B2_REGION");
  return missing;
}

export function isB2Configured(): boolean {
  return getMissingB2EnvVars().length === 0;
}

export function requireB2Config(): B2Config {
  const missing = getMissingB2EnvVars();
  if (missing.length > 0) {
    throw new Error(
      `Backblaze B2 storage is not configured. Missing environment variable(s): ${missing.join(", ")}`,
    );
  }
  return getB2Config();
}

/**
 * Creates or reuses an S3Client configured for Backblaze B2's S3-compatible API.
 */
export function getB2S3Client(): { client: S3Client; config: B2Config } {
  const config = requireB2Config();
  const signature = `${config.keyId}|${config.applicationKey}|${config.bucketName}|${config.endpoint}|${config.region}`;

  if (!cachedClient || cachedConfigSignature !== signature) {
    cachedClient = new S3Client({
      endpoint: config.endpoint,
      region: config.region,
      credentials: {
        accessKeyId: config.keyId,
        secretAccessKey: config.applicationKey,
      },
      forcePathStyle: true,
      requestChecksumCalculation: "WHEN_REQUIRED",
      responseChecksumValidation: "WHEN_REQUIRED",
    });
    cachedConfigSignature = signature;
  }

  return { client: cachedClient, config };
}

/**
 * Sanitizes a user-supplied filename into a safe single-segment object filename.
 */
export function sanitizeObjectFilename(rawName: string): string {
  const base = rawName.split(/[\\/]/).pop() || "file";
  const cleaned = base
    .replace(/\.\.+/g, ".")
    .replace(/[\x00-\x1f\x7f"<>|:*?]/g, "_")
    .trim();
  return cleaned || "file";
}

/**
 * Builds a structured B2 object key such as `books/<uuid>/<filename>.pdf`.
 */
export function buildB2ObjectKey(purpose: StoragePurpose, fileId: string, filename: string): string {
  const folder = FOLDER_BY_PURPOSE[purpose];
  const safeId = fileId.replace(/[^a-zA-Z0-9_-]/g, "");
  if (!safeId) {
    throw new Error("Invalid file identifier.");
  }
  const safeFilename = sanitizeObjectFilename(filename);
  return `${folder}/${safeId}/${safeFilename}`;
}

/**
 * Checks whether a stored PostgreSQL reference is a Backblaze B2 object key.
 */
export function isB2ObjectKey(value?: string | null): value is string {
  if (!value || typeof value !== "string") return false;
  if (value.startsWith("/") || /^https?:\/\//i.test(value) || value.includes("..")) {
    return false;
  }
  return B2_KEY_PATTERN.test(value);
}

/**
 * Infers standard MIME type from filename extension when Content-Type is omitted.
 */
export function inferContentTypeFromKey(key: string): string {
  const ext = key.toLowerCase().split(".").pop() ?? "";
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

/**
 * Uploads a Buffer or Readable stream directly to the private Backblaze B2 bucket.
 */
export async function uploadObjectToB2(params: {
  key: string;
  body: Buffer | Readable;
  contentType: string;
  contentLength?: number;
}): Promise<{ key: string; etag?: string }> {
  if (!isB2ObjectKey(params.key)) {
    throw new Error(`Invalid B2 object key: ${params.key}`);
  }

  const { client, config } = getB2S3Client();

  // Direct PutObject for small known-length buffers avoids unnecessary multipart overhead
  if (Buffer.isBuffer(params.body) && params.body.byteLength <= 10 * 1024 * 1024) {
    const out = await client.send(
      new PutObjectCommand({
        Bucket: config.bucketName,
        Key: params.key,
        Body: params.body,
        ContentType: params.contentType,
        ContentLength: params.body.byteLength,
      }),
    );
    return { key: params.key, etag: out.ETag };
  }

  const upload = new Upload({
    client,
    params: {
      Bucket: config.bucketName,
      Key: params.key,
      Body: params.body,
      ContentType: params.contentType,
    },
    queueSize: 4,
    partSize: 10 * 1024 * 1024,
    leavePartsOnError: false,
  });

  const result = await upload.done();
  return { key: params.key, etag: result.ETag };
}

/**
 * Generates a short-lived temporary S3 presigned URL to read or download an object from private B2 storage.
 */
export async function createPresignedDownloadUrl(
  key: string,
  options?: {
    expiresInSeconds?: number;
    download?: boolean;
    filename?: string;
    contentType?: string;
  },
): Promise<{ url: string; expiresIn: number; objectKey: string; filename: string }> {
  if (!isB2ObjectKey(key)) {
    throw new Error(`Invalid B2 object key: ${key}`);
  }

  const { client, config } = getB2S3Client();
  const expiresIn = Math.max(60, Math.min(3600, options?.expiresInSeconds ?? 300));
  const rawFilename = options?.filename || key.split("/").pop() || "document";
  const filename = sanitizeObjectFilename(rawFilename);
  const dispositionType = options?.download ? "attachment" : "inline";
  const asciiFallback = filename.replace(/[^\x20-\x7e]/g, "_").replace(/"/g, "");
  const contentDisposition = `${dispositionType}; filename="${asciiFallback}"; filename*=UTF-8''${encodeURIComponent(filename)}`;
  const contentType = options?.contentType || inferContentTypeFromKey(key);

  const command = new GetObjectCommand({
    Bucket: config.bucketName,
    Key: key,
    ResponseContentDisposition: contentDisposition,
    ResponseContentType: contentType,
  });

  const url = await getSignedUrl(client, command, { expiresIn });
  return { url, expiresIn, objectKey: key, filename };
}

/**
 * Deletes an object key from the private Backblaze B2 bucket.
 */
export async function deleteObjectFromB2(key: string): Promise<void> {
  if (!isB2ObjectKey(key) || !isB2Configured()) return;

  try {
    const { client, config } = getB2S3Client();
    await client.send(
      new DeleteObjectCommand({
        Bucket: config.bucketName,
        Key: key,
      }),
    );
  } catch (err) {
    console.warn(`[B2-STORAGE] Failed deleting object "${key}":`, err);
  }
}

/**
 * Checks whether an object exists in the configured Backblaze B2 bucket.
 */
export async function headObjectInB2(key: string): Promise<{ exists: boolean; contentLength?: number; contentType?: string }> {
  if (!isB2ObjectKey(key)) return { exists: false };
  const { client, config } = getB2S3Client();
  try {
    const res = await client.send(
      new HeadObjectCommand({
        Bucket: config.bucketName,
        Key: key,
      }),
    );
    return {
      exists: true,
      contentLength: res.ContentLength,
      contentType: res.ContentType,
    };
  } catch {
    return { exists: false };
  }
}
