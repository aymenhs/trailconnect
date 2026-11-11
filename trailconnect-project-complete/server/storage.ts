// User-uploaded files: outing covers, avatars, post images, GPX/KML tracks.
//
// This used to call the Manus Forge API for a presigned URL and PUT straight to
// their S3 bucket. Self-hosted, the files live on the server's own disk under
// UPLOAD_DIR and are served by `registerStorageProxy`.
//
// The public interface (storagePut / storageGet / storageGetSignedUrl) is
// unchanged, so nothing upstream in db.ts had to move. Swapping in MinIO or an
// S3 bucket later means reimplementing these three functions and nothing else.

import { randomUUID } from "crypto";
import { createReadStream, type ReadStream } from "fs";
import { mkdir, stat, unlink, writeFile } from "fs/promises";
import path from "path";
import { ENV } from "./_core/env";

/** URL prefix under which uploads are served. Also stored in the database. */
export const MEDIA_URL_PREFIX = "/uploads";

/**
 * Legacy prefix. Rows written while the app ran on Manus still hold
 * `/manus-storage/<key>` URLs, so the read path keeps answering on it.
 */
export const LEGACY_MEDIA_URL_PREFIX = "/manus-storage";

function getUploadRoot(): string {
  return path.resolve(ENV.uploadDir);
}

/**
 * Resolves a storage key to an absolute path, refusing anything that escapes
 * the upload root — the key reaches us from a URL, so `../../etc/passwd` has to
 * be impossible rather than merely unlikely.
 */
export function resolveStoragePath(relKey: string): string | null {
  const key = normalizeKey(relKey);
  if (!key) return null;
  const root = getUploadRoot();
  const resolved = path.resolve(root, key);
  const withinRoot =
    resolved === root || resolved.startsWith(root + path.sep);
  return withinRoot ? resolved : null;
}

function normalizeKey(relKey: string): string {
  return relKey.replace(/^\/+/, "").replace(/\\/g, "/");
}

function appendHashSuffix(relKey: string): string {
  const hash = randomUUID().replace(/-/g, "").slice(0, 8);
  const lastDot = relKey.lastIndexOf(".");
  if (lastDot === -1) return `${relKey}_${hash}`;
  return `${relKey.slice(0, lastDot)}_${hash}${relKey.slice(lastDot)}`;
}

export async function storagePut(
  relKey: string,
  data: Buffer | Uint8Array | string,
  _contentType = "application/octet-stream"
): Promise<{ key: string; url: string }> {
  const key = appendHashSuffix(normalizeKey(relKey));
  const destination = resolveStoragePath(key);
  if (!destination) throw new Error("Invalid storage key");

  await mkdir(path.dirname(destination), { recursive: true });
  const payload =
    typeof data === "string" ? Buffer.from(data, "utf-8") : Buffer.from(data);
  await writeFile(destination, payload);

  return { key, url: `${MEDIA_URL_PREFIX}/${key}` };
}

export async function storageGet(
  relKey: string
): Promise<{ key: string; url: string }> {
  const key = normalizeKey(relKey);
  return { key, url: `${MEDIA_URL_PREFIX}/${key}` };
}

/**
 * Files are served directly by this server, so there is no signing step and
 * nothing expires. Kept so callers written against the Forge contract still
 * compile.
 */
export async function storageGetSignedUrl(relKey: string): Promise<string> {
  const { url } = await storageGet(relKey);
  return url;
}

/** Opens a stored file for streaming, or null when it is absent. */
export async function openStoredFile(
  relKey: string
): Promise<{ stream: ReadStream; size: number } | null> {
  const resolved = resolveStoragePath(relKey);
  if (!resolved) return null;
  try {
    const stats = await stat(resolved);
    if (!stats.isFile()) return null;
    return { stream: createReadStream(resolved), size: stats.size };
  } catch {
    return null;
  }
}

/**
 * Removes an upload given the URL stored in the database. Account erasure
 * needs it: clearing `avatarUrl` in a row left the file itself reachable by
 * anyone holding the link. Returns false when there was nothing to delete —
 * an external URL, a key outside the upload root, or a file already gone.
 */
export async function storageDeleteByUrl(url: string): Promise<boolean> {
  const prefix = [MEDIA_URL_PREFIX, LEGACY_MEDIA_URL_PREFIX].find(candidate =>
    url.startsWith(`${candidate}/`)
  );
  if (!prefix) return false;
  const resolved = resolveStoragePath(url.slice(prefix.length + 1));
  if (!resolved) return false;
  try {
    await unlink(resolved);
    return true;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return false;
    throw error;
  }
}
