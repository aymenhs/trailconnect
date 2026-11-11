/**
 * tRPC procedures that carry a file (base64, up to ~8 MB). They were only
 * under the general API limit of 300 requests a minute — more than 2 GB a
 * minute of disk writes for one account — while the dedicated upload route
 * allows 20. They now share that upload quota.
 */
const UPLOAD_PROCEDURES = new Set([
  "hiking.media.uploadImage",
  "hiking.tracks.upload",
]);

/**
 * Whether a `/api/trpc/<path>` request calls an upload procedure. A batched
 * call lists several procedures separated by commas.
 */
export function isTrpcUploadPath(path: string): boolean {
  return path
    .replace(/^\/+/, "")
    .split(",")
    .some(procedure => UPLOAD_PROCEDURES.has(procedure));
}
