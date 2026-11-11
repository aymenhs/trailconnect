import type { Express, Request, Response } from "express";
import {
  LEGACY_MEDIA_URL_PREFIX,
  MEDIA_URL_PREFIX,
  openStoredFile,
} from "../storage";

const MIME_BY_EXTENSION: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
  ".gpx": "application/gpx+xml",
  ".kml": "application/vnd.google-earth.kml+xml",
  ".pdf": "application/pdf",
};

function contentTypeFor(key: string): string {
  const dot = key.lastIndexOf(".");
  const extension = dot === -1 ? "" : key.slice(dot).toLowerCase();
  return MIME_BY_EXTENSION[extension] ?? "application/octet-stream";
}

/**
 * Serves user uploads from local disk.
 *
 * This used to ask the Manus Forge API for a presigned S3 URL and answer with a
 * 307 redirect. Files are now on this server, so they are streamed directly.
 *
 * Two routes on purpose: `/uploads/*` is the current one, `/manus-storage/*`
 * keeps working because rows written while the app ran on Manus still store
 * that prefix in `coverImageUrl`, `gpxUrl`, `avatarUrl` and friends.
 */
export function registerStorageProxy(app: Express) {
  const serve = async (req: Request, res: Response) => {
    const key = (req.params as Record<string, string>)[0];
    if (!key) {
      res.status(400).send("Missing storage key");
      return;
    }

    const file = await openStoredFile(key);
    if (!file) {
      res.status(404).send("Not found");
      return;
    }

    res.set("Content-Type", contentTypeFor(key));
    res.set("Content-Length", String(file.size));
    // Stored keys carry a random suffix and are never rewritten in place, so
    // they are safe to cache hard.
    res.set("Cache-Control", "public, max-age=31536000, immutable");
    file.stream.on("error", () => {
      if (!res.headersSent) res.status(500).end();
      else res.end();
    });
    file.stream.pipe(res);
  };

  app.get(`${MEDIA_URL_PREFIX}/*`, serve);
  app.get(`${LEGACY_MEDIA_URL_PREFIX}/*`, serve);
}
