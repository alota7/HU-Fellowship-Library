import fs from "node:fs";
import path from "node:path";
import express, { type Express } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import cookieParser from "cookie-parser";
import router from "./routes";
import { logger } from "./lib/logger";

const app: Express = express();

app.set("trust proxy", 1);

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);

const corsOrigin = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(",").map((s) => s.trim()).filter(Boolean)
  : true;

app.use(cors({ origin: corsOrigin, credentials: true }));
app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/api", router);

// Return JSON 404 for unknown API paths instead of falling through to the SPA shell
app.use("/api", (_req, res) => {
  res.status(404).json({ error: "API route not found." });
});

function resolveFrontendDistDir(): string | null {
  const candidates = [
    path.resolve(process.cwd(), "public"),
    path.resolve(process.cwd(), "../hu-fellowship-library/dist/public"),
    path.resolve(process.cwd(), "artifacts/hu-fellowship-library/dist/public"),
  ];
  for (const dir of candidates) {
    if (fs.existsSync(path.join(dir, "index.html"))) {
      return dir;
    }
  }
  return null;
}

const frontendDistDir = resolveFrontendDistDir();
if (frontendDistDir) {
  app.use(
    express.static(frontendDistDir, {
      setHeaders(res, filePath) {
        if (filePath.endsWith("sw.js") || filePath.endsWith("index.html")) {
          res.setHeader("Cache-Control", "no-cache, must-revalidate");
        } else if (filePath.endsWith("manifest.webmanifest")) {
          res.setHeader("Content-Type", "application/manifest+json");
          res.setHeader("Cache-Control", "no-cache, must-revalidate");
        } else if (filePath.includes(`${path.sep}assets${path.sep}`)) {
          res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
        }
      },
    }),
  );

  // SPA client-side routing fallback for all non-API GET/HEAD requests
  app.use((req, res, next) => {
    if (req.method !== "GET" && req.method !== "HEAD") {
      return next();
    }
    res.setHeader("Cache-Control", "no-cache, must-revalidate");
    return res.sendFile(path.join(frontendDistDir, "index.html"));
  });
}

export default app;
