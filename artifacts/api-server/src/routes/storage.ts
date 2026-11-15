import { Readable } from 'stream';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { Router, type IRouter, type Request, type Response } from 'express';

import {
  ObjectNotFoundError,
  ObjectStorageService,
} from '../lib/objectStorage';
import { RequestUploadUrlBody, RequestUploadUrlResponse } from '@workspace/api-zod';
import { getSessionUser } from './library';

const router: IRouter = Router();
const objectStorageService = new ObjectStorageService();

const LOCAL_UPLOADS_DIR = path.resolve(process.cwd(), 'uploads');
if (!fs.existsSync(LOCAL_UPLOADS_DIR)) {
  fs.mkdirSync(LOCAL_UPLOADS_DIR, { recursive: true });
}

/**
 * POST /storage/uploads/request-url
 *
 * Request a presigned URL for file upload.
 * The client sends JSON metadata (name, size, contentType) — NOT the file.
 * Then uploads the file directly to the returned presigned URL.
 * Requires auth middleware so public callers cannot mint write-capable URLs.
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

    const extension = name.toLowerCase().split('.').pop() ?? '';
    const mimeByExtension: Record<string, string[]> = {
      png: ['image/png'],
      jpg: ['image/jpeg'],
      jpeg: ['image/jpeg'],
      webp: ['image/webp'],
      pdf: ['application/pdf'],
      epub: ['application/epub+zip'],
      doc: ['application/msword'],
      docx: ['application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
      txt: ['text/plain'],
    };
    const allowedExtensions = purpose === 'cover'
      ? ['png', 'jpg', 'jpeg', 'webp']
      : purpose === 'book'
        ? ['pdf', 'epub', 'doc', 'docx']
        : ['pdf', 'epub', 'doc', 'docx', 'txt'];
    const maxCoverSize = 50 * 1024 * 1024; // 50 MB for cover images
    const maxBookSize = 2 * 1024 * 1024 * 1024; // 2 GB for book and study note files (no restrictive MB cap)
    const maxSize = purpose === 'cover' ? maxCoverSize : maxBookSize;
    if (!allowedExtensions.includes(extension)) {
      res.status(400).json({ error: purpose === 'cover' ? 'Cover images must be PNG, JPG, or WebP.' : 'Unsupported file type. Choose a PDF, EPUB, Word document, or text file where allowed.' });
      return;
    }
    if (size > maxSize) {
      res.status(413).json({ error: purpose === 'cover' ? 'Cover images must be 50 MB or smaller.' : 'File exceeds maximum supported size (2 GB).' });
      return;
    }

    try {
      let uploadURL: string;
      let objectPath: string;
      try {
        uploadURL = await objectStorageService.getObjectEntityUploadURL(purpose);
        objectPath = objectStorageService.normalizeObjectEntityPath(uploadURL);
      } catch {
        const fileId = crypto.randomUUID();
        const safeName = encodeURIComponent(name);
        const host = req.get('host') || 'localhost:5173';
        const protocol = req.protocol || 'http';
        uploadURL = `${protocol}://${host}/api/storage/uploads/file/${fileId}/${safeName}`;
        objectPath = `/uploads/file/${fileId}/${safeName}`;
      }

      res.json(RequestUploadUrlResponse.parse({
        uploadURL,
        objectPath,
        metadata: { name, size, contentType, purpose },
      }));
    } catch (error) {
      req.log.error({ err: error }, 'Error generating upload URL');
      res.status(500).json({ error: 'Failed to generate upload URL' });
    }
  },
);

const handleFileUpload = (req: Request, res: Response): void => {
  const { fileId, filename } = req.params;
  const decoded = decodeURIComponent(filename);
  const targetDir = path.join(LOCAL_UPLOADS_DIR, fileId);
  fs.mkdirSync(targetDir, { recursive: true });
  const targetPath = path.join(targetDir, decoded);

  const writeStream = fs.createWriteStream(targetPath);
  req.pipe(writeStream);

  writeStream.on('finish', () => {
    res.status(200).json({ ok: true });
  });

  writeStream.on('error', (err) => {
    req.log.error({ err }, 'Error writing uploaded file');
    res.status(500).json({ error: 'Failed to save uploaded file' });
  });
};

/**
 * PUT /storage/uploads/file/:fileId/:filename
 * Also handles legacy / duplicate path prefix /storage/api/storage/uploads/file/:fileId/:filename
 */
router.put('/storage/uploads/file/:fileId/:filename', handleFileUpload);
router.put('/storage/api/storage/uploads/file/:fileId/:filename', handleFileUpload);

const handleFileServing = (req: Request, res: Response): void => {
  const { fileId, filename } = req.params;
  const decoded = decodeURIComponent(filename);
  const targetPath = path.join(LOCAL_UPLOADS_DIR, fileId, decoded);

  if (!fs.existsSync(targetPath)) {
    res.status(404).json({ error: 'File not found' });
    return;
  }

  const isDownload = req.query.download === '1' || req.query.download === 'true';
  if (isDownload) {
    res.download(targetPath, decoded);
    return;
  }

  // Set Content-Disposition inline with proper filename so PDFs open in browser tab and download cleanly
  res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(decoded)}"`);
  res.sendFile(targetPath);
};

/**
 * GET /storage/uploads/file/:fileId/:filename
 * Also handles legacy / duplicate path prefix /storage/api/storage/uploads/file/:fileId/:filename
 */
router.get('/storage/uploads/file/:fileId/:filename', handleFileServing);
router.get('/storage/api/storage/uploads/file/:fileId/:filename', handleFileServing);

/**
 * GET /storage/public-objects/*
 *
 * Serve public assets from PUBLIC_OBJECT_SEARCH_PATHS.
 * These are unconditionally public — no authentication or ACL checks.
 * IMPORTANT: Always provide this endpoint when object storage is set up.
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
        const nodeStream = Readable.fromWeb(
          response.body as ReadableStream<Uint8Array>,
        );
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
 *
 * Serve object entities from PRIVATE_OBJECT_DIR.
 * These are served from a separate path from /public-objects and can optionally
 * be protected with authentication or ACL checks based on the use case.
 */
router.get('/storage/objects/*path', async (req: Request, res: Response) => {
  try {
    const raw = req.params.path;
    const wildcardPath = Array.isArray(raw) ? raw.join('/') : raw;
    const objectPath = `/objects/${wildcardPath}`;
    const objectFile =
      await objectStorageService.getObjectEntityFile(objectPath);

    // --- Protected route example (uncomment when using replit-auth) ---
    // if (!req.isAuthenticated()) {
    //   res.status(401).json({ error: "Unauthorized" });
    //   return;
    // }
    // const canAccess = await objectStorageService.canAccessObjectEntity({
    //   userId: req.user.id,
    //   objectFile,
    //   requestedPermission: ObjectPermission.READ,
    // });
    // if (!canAccess) {
    //   res.status(403).json({ error: "Forbidden" });
    //   return;
    // }

    const response = await objectStorageService.downloadObject(objectFile);

    res.status(response.status);
    response.headers.forEach((value, key) => res.setHeader(key, value));

    if (response.body) {
      const nodeStream = Readable.fromWeb(
        response.body as ReadableStream<Uint8Array>,
      );
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
