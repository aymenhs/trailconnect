/**
 * A file name the upload endpoints accept (`[A-Za-z0-9_.-]`, one extension).
 *
 * Several screens sent `file.name` as-is, and the server refuses anything else
 * with a generic "could not upload": "Capture d’écran.png" or
 * "Mont Albert.gpx" simply failed. Accents are folded, other characters become
 * dashes, and `fallback` ("photo.jpg") covers a name with nothing usable.
 */
export function safeUploadFilename(name: string, fallback: string): string {
  const folded = name.normalize("NFD").replace(/[̀-ͯ]/g, "");
  const dot = folded.lastIndexOf(".");
  const extension =
    dot > 0 ? folded.slice(dot + 1).toLowerCase().replace(/[^a-z0-9]/g, "") : "";
  const base = (dot > 0 ? folded.slice(0, dot) : folded)
    .replace(/[^A-Za-z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120);
  const fallbackDot = fallback.lastIndexOf(".");
  return `${base || fallback.slice(0, fallbackDot)}.${
    extension || fallback.slice(fallbackDot + 1)
  }`;
}
