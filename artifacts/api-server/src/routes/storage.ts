import { Readable } from 'node:stream';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { Router, type IRouter, type Request, type Response } from 'express';

import {
  buildB2ObjectKey,
  createPresignedDownloadUrl,
  getMissingB2EnvVars,
  inferContentTypeFromKey,
  isB2Configured,
  isB2ObjectKey,
  uploadObjectToB2,
  type StoragePurpose,
} from '../lib/b2Storage';
import {
  ObjectNotFoundError,
  ObjectStorageService,
} from '../lib/objectStorage';
import { RequestUploadUrlBody, RequestUploadUrlResponse } from '@workspace/api-zod';
import { getSessionUser } from './library';

const router: IRouter = Router();
const objectStorageService = new ObjectStorageService();

const LOCAL_UPLOADS_DIR = path.resolve(process.cwd(), 'uploads');
const MAX_COVER_BYTES = 50 * 1024 * 1024; // 50 MB for cover images
const MAX_DOCUMENT_BYTES = 2 * 1024 * 1024 * 1024; // 2 GB for books and study notes

const ALLOWED_EXTENSIONS: Record<StoragePurpose, string[]> = {
  cover: ['png', 'jpg', 'jpeg', 'webp'],
  book: ['pdf', 'epub', 'doc', 'docx'],
  'study-note': ['pdf', 'epub', 'doc', 'docx', 'txt'],
};

const VALID_PURPOSES = new Set<StoragePurpose>(['cover', 'book', 'study-note']);

function validateUploadMetadata(purpose: StoragePurpose, filename: string, size?: number): string | null {
  const extension = filename.toLowerCase().split('.').pop() ?? '';
  if (!ALLOWED_EXTENSIONS[purpose].includes(extension)) {
    return purpose === 'cover'
      ? 'Cover images must be PNG, JPG, or WebP.'
      : 'Unsupported file type. Choose a PDF, EPUB, Word document, or text file where allowed.';
  }

  const maxSize = purpose === 'cover' ? MAX_COVER_BYTES : MAX_DOCUMENT_BYTES;
  if (typeof size === 'number' && size > maxSize) {
    return purpose === 'cover'
      ? 'Cover images must be 50 MB or smaller.'
      : 'File exceeds maximum supported size (2 GB).';
  }
  return null;
}

function getRequestOrigin(req: Request): string {
  const forwardedProto = req.get('x-forwarded-proto')?.split(',')[0]?.trim();
  const forwardedHost = req.get('x-forwarded-host')?.split(',')[0]?.trim();
  const protocol = forwardedProto || req.protocol || 'http';
  const host = forwardedHost || req.get('host') || 'localhost:5173';
  return `${protocol}://${host}`;
}

/**
 * POST /storage/uploads/request-url
 *
 * Prepares an authenticated upload target backed by private Backblaze B2 storage.
 * Returns a backend streaming upload URL (avoiding browser-to-B2 CORS issues) and
 * the clean B2 object key (`books/...`, `covers/...`, or `study-notes/...`) to store in PostgreSQL.
 */
router.post(
  '/storage/uploads/request-url',
  async (req: Request, res: Response): Promise<void> => {
    const user = getSessionUser(req);
    if (!user) {
      res.status(401).json({ error: 'Please log in first.' });
      return;
    }

    const parsed = RequestUploadUrlBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.message });
      return;
    }

    const { name, size, contentType, purpose } = parsed.data;
    if (purpose !== 'study-note' && user.role !== 'admin') {
      res.status(403).json({ error: 'Administrator access is required.' });
      return;
    }

    const validationError = validateUploadMetadata(purpose, name, size);
    if (validationError) {
      res.status(validationError.includes('50 MB') || validationError.includes('2 GB') ? 413 : 400).json({
        error: validationError,
      });
      return;
    }

    if (!isB2Configured()) {
      const missing = getMissingB2EnvVars();
      res.status(503).json({
        error: `Backblaze B2 storage is not configured. Missing environment variable(s): ${missing.join(', ')}.`,
      });
      return;
    }

    try {
      const fileId = crypto.randomUUID();
      const objectKey = buildB2ObjectKey(purpose, fileId, name);
      const safeFilename = objectKey.split('/').pop() || 'file';
      const origin = getRequestOrigin(req);
      const uploadURL = `${origin}/api/storage/uploads/b2/${purpose}/${fileId}/${encodeURIComponent(safeFilename)}`;

      res.json(
        RequestUploadUrlResponse.parse({
          uploadURL,
          objectPath: objectKey,
          metadata: { name, size, contentType, purpose },
        }),
      );
    } catch (error) {
      req.log.error({ err: error }, 'Error preparing Backblaze B2 upload URL');
      res.status(500).json({ error: 'Failed to prepare Backblaze B2 upload.' });
    }
  },
);

/**
 * PUT /storage/uploads/b2/:purpose/:fileId/:filename
 *
 * Authenticates the caller and streams the uploaded PDF/document/cover
 * directly to the private Backblaze B2 bucket using AWS S3 SDK.
 */
router.put(
  '/storage/uploads/b2/:purpose/:fileId/:filename',
  async (req: Request, res: Response): Promise<void> => {
    const user = getSessionUser(req);
    if (!user) {
      res.status(401).json({ error: 'Please log in first.' });
      return;
    }

    const rawPurpose = String(req.params.purpose || '') as StoragePurpose;
    if (!VALID_PURPOSES.has(rawPurpose)) {
      res.status(400).json({ error: 'Invalid upload purpose.' });
      return;
    }
    if (rawPurpose !== 'study-note' && user.role !== 'admin') {
      res.status(403).json({ error: 'Administrator access is required.' });
      return;
    }

    if (!isB2Configured()) {
      const missing = getMissingB2EnvVars();
      res.status(503).json({
        error: `Backblaze B2 storage is not configured. Missing environment variable(s): ${missing.join(', ')}.`,
      });
      return;
    }

    const fileId = String(req.params.fileId || '');
    const decodedFilename = decodeURIComponent(String(req.params.filename || 'file'));
    const rawLength = req.headers['content-length'];
    const contentLength = rawLength ? Number(rawLength) : undefined;
    const validationError = validateUploadMetadata(rawPurpose, decodedFilename, contentLength);
    if (validationError) {
      res.status(validationError.includes('50 MB') || validationError.includes('2 GB') ? 413 : 400).json({
        error: validationError,
      });
      return;
    }

    try {
      const objectKey = buildB2ObjectKey(rawPurpose, fileId, decodedFilename);
      const contentType = req.get('content-type') || inferContentTypeFromKey(objectKey);
      const result = await uploadObjectToB2({
        key: objectKey,
        body: req,
        contentType,
        contentLength,
      });

      res.status(200).json({ ok: true, key: result.key, etag: result.etag });
    } catch (error) {
      req.log.error({ err: error }, 'Error uploading file to Backblaze B2');
      res.status(500).json({ error: 'Failed to upload file to Backblaze B2 storage.' });
    }
  },
);

/**
 * GET /storage/b2/cover?key=covers/...
 *
 * Generates a short-lived presigned B2 URL strictly for cover image previews (`covers/`).
 * Private books (`books/`) and study notes (`study-notes/`) are never accessible here.
 */
router.get('/storage/b2/cover', async (req: Request, res: Response): Promise<void> => {
  const key = typeof req.query.key === 'string' ? req.query.key.trim() : '';
  if (!isB2ObjectKey(key) || !key.startsWith('covers/')) {
    res.status(400).json({ error: 'Invalid cover image key.' });
    return;
  }

  if (!isB2Configured()) {
    res.status(503).json({ error: 'Backblaze B2 storage is not configured.' });
    return;
  }

  try {
    const signed = await createPresignedDownloadUrl(key, {
      expiresInSeconds: 300,
      download: false,
    });
    res.setHeader('Cache-Control', 'private, no-store, max-age=0');
    res.redirect(302, signed.url);
  } catch (error) {
    req.log.error({ err: error }, 'Error signing B2 cover URL');
    res.status(500).json({ error: 'Failed to generate cover image URL.' });
  }
});

/**
 * Legacy local upload read route (kept only for backward compatibility with pre-B2 files).
 * Enforces authentication for non-image files (PDF/EPUB/DOC/DOCX/TXT).
 */
const handleLegacyFileServing = (req: Request, res: Response): void => {
  const fileId = String(req.params.fileId || '').replace(/[^a-zA-Z0-9_-]/g, '');
  const decoded = path.basename(decodeURIComponent(String(req.params.filename || '')));
  const ext = decoded.toLowerCase().split('.').pop() ?? '';
  const isImage = ['png', 'jpg', 'jpeg', 'webp'].includes(ext);

  if (!isImage && !getSessionUser(req)) {
    res.status(401).json({ error: 'Please log in first to access library files.' });
    return;
  }

  const targetPath = path.join(LOCAL_UPLOADS_DIR, fileId, decoded);
  if (!fileId || !decoded || !fs.existsSync(targetPath)) {
    res.status(404).json({ error: 'File not found' });
    return;
  }

  const isDownload = req.query.download === '1' || req.query.download === 'true';
  if (isDownload) {
    res.download(targetPath, decoded);
    return;
  }

  res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(decoded)}"`);
  res.sendFile(targetPath);
};

router.get('/storage/uploads/file/:fileId/:filename', handleLegacyFileServing);
router.get('/storage/api/storage/uploads/file/:fileId/:filename', handleLegacyFileServing);

/**
 * GET /storage/public-objects/*
 */
router.get(
  '/storage/public-objects/*filePath',
  async (req: Request, res: Response) => {
    try {
      const raw = req.params.filePath;
      const filePath = Array.isArray(raw) ? raw.join('/') : raw;
      const file = await objectStorageService.searchPublicObject(filePath);
      if (!file) {
        res.status(404).json({ error: 'File not found' });
        return;
      }

      const response = await objectStorageService.downloadObject(file);
      res.status(response.status);
      response.headers.forEach((value, key) => res.setHeader(key, value));

      if (response.body) {
        const nodeStream = Readable.fromWeb(response.body as ReadableStream<Uint8Array>);
        nodeStream.pipe(res);
      } else {
        res.end();
      }
    } catch (error) {
      req.log.error({ err: error }, 'Error serving public object');
      res.status(500).json({ error: 'Failed to serve public object' });
    }
  },
);

/**
 * GET /storage/objects/*
 */
router.get('/storage/objects/*path', async (req: Request, res: Response) => {
  if (!getSessionUser(req)) {
    res.status(401).json({ error: 'Please log in first.' });
    return;
  }

  try {
    const raw = req.params.path;
    const wildcardPath = Array.isArray(raw) ? raw.join('/') : raw;
    const objectPath = `/objects/${wildcardPath}`;
    const objectFile = await objectStorageService.getObjectEntityFile(objectPath);
    const response = await objectStorageService.downloadObject(objectFile);

    res.status(response.status);
    response.headers.forEach((value, key) => res.setHeader(key, value));

    if (response.body) {
      const nodeStream = Readable.fromWeb(response.body as ReadableStream<Uint8Array>);
      nodeStream.pipe(res);
    } else {
      res.end();
    }
  } catch (error) {
    if (error instanceof ObjectNotFoundError) {
      req.log.warn({ err: error }, 'Object not found');
      res.status(404).json({ error: 'Object not found' });
      return;
    }
    req.log.error({ err: error }, 'Error serving object');
    res.status(500).json({ error: 'Failed to serve object' });
  }
});

export default router;
