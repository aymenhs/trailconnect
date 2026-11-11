// Removes metadata from uploaded images before they are stored.
//
// Phone photos carry EXIF: GPS coordinates, time, device. Recap photos are
// public, and a picture taken at home publishes the address. Only avatars and
// outing covers were re-encoded in the browser; recap, group and route images
// went up as-is. This runs on the server, so every client is covered.
//
// It also checks that the bytes are the image type claimed: a file named
// .png that is not a PNG is refused.
//
// No image library: JPEG, PNG and WebP are containers of tagged segments, and
// metadata lives in its own segments, so dropping those is enough. Pixel data
// is copied untouched — no re-compression, no quality loss.

import { DomainError } from "./domainError";

export type UploadImageType = "image/jpeg" | "image/png" | "image/webp";

const PNG_SIGNATURE = Buffer.from([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
]);

export function stripImageMetadata(
  data: Buffer,
  mimeType: UploadImageType
): Buffer {
  if (mimeType === "image/jpeg") return stripJpeg(data);
  if (mimeType === "image/png") return stripPng(data);
  return stripWebp(data);
}

function notThisType(): never {
  throw new DomainError("The file is not a valid image of the declared type");
}

// --- JPEG --------------------------------------------------------------------

const APP1 = 0xe1; // EXIF, XMP
const APP13 = 0xed; // IPTC / Photoshop
const COMMENT = 0xfe;
const START_OF_SCAN = 0xda;
const DROPPED_JPEG_MARKERS = new Set([APP1, APP13, COMMENT]);

function stripJpeg(data: Buffer): Buffer {
  if (data.length < 4 || data[0] !== 0xff || data[1] !== 0xd8) notThisType();
  const kept: Buffer[] = [data.subarray(0, 2)];
  let orientation: number | null = null;
  let offset = 2;
  while (offset < data.length) {
    if (data[offset] !== 0xff) notThisType();
    const marker = data[offset + 1];
    if (marker === 0xff) {
      // Fill byte before a marker.
      offset += 1;
      continue;
    }
    if (marker === START_OF_SCAN) {
      // Compressed image data up to the end: copied as it is.
      kept.push(data.subarray(offset));
      return Buffer.concat(withOrientation(kept, orientation));
    }
    if (offset + 4 > data.length) notThisType();
    const length = data.readUInt16BE(offset + 2);
    const end = offset + 2 + length;
    if (length < 2 || end > data.length) notThisType();
    const segment = data.subarray(offset, end);
    if (marker === APP1) orientation ??= readExifOrientation(segment.subarray(4));
    if (!DROPPED_JPEG_MARKERS.has(marker)) kept.push(segment);
    offset = end;
  }
  notThisType();
}

/**
 * Puts back the one EXIF field worth keeping. Phones store the picture
 * sideways and let the orientation tag turn it; without it every portrait
 * photo would show on its side.
 */
function withOrientation(kept: Buffer[], orientation: number | null) {
  if (!orientation || orientation === 1) return kept;
  const [startOfImage, ...rest] = kept;
  return [startOfImage, minimalExifSegment(orientation), ...rest];
}

function minimalExifSegment(orientation: number): Buffer {
  const tiff = Buffer.alloc(26);
  tiff.write("MM", 0, "ascii"); // big-endian
  tiff.writeUInt16BE(42, 2);
  tiff.writeUInt32BE(8, 4); // first IFD right after the header
  tiff.writeUInt16BE(1, 8); // one entry
  tiff.writeUInt16BE(0x0112, 10); // Orientation
  tiff.writeUInt16BE(3, 12); // SHORT
  tiff.writeUInt32BE(1, 14); // count
  tiff.writeUInt16BE(orientation, 18); // value, left-aligned in 4 bytes
  tiff.writeUInt32BE(0, 22); // no next IFD
  const payload = Buffer.concat([Buffer.from("Exif\0\0", "binary"), tiff]);
  const header = Buffer.from([0xff, APP1, 0, 0]);
  header.writeUInt16BE(payload.length + 2, 2);
  return Buffer.concat([header, payload]);
}

function readExifOrientation(payload: Buffer): number | null {
  if (payload.subarray(0, 6).toString("binary") !== "Exif\0\0") return null;
  const tiff = payload.subarray(6);
  if (tiff.length < 8) return null;
  const order = tiff.subarray(0, 2).toString("ascii");
  if (order !== "II" && order !== "MM") return null;
  const little = order === "II";
  const u16 = (at: number) =>
    little ? tiff.readUInt16LE(at) : tiff.readUInt16BE(at);
  const u32 = (at: number) =>
    little ? tiff.readUInt32LE(at) : tiff.readUInt32BE(at);
  const ifd = u32(4);
  if (ifd + 2 > tiff.length) return null;
  const entries = u16(ifd);
  for (let index = 0; index < entries; index += 1) {
    const entry = ifd + 2 + index * 12;
    if (entry + 12 > tiff.length) return null;
    if (u16(entry) === 0x0112) {
      const value = u16(entry + 8);
      return value >= 1 && value <= 8 ? value : null;
    }
  }
  return null;
}

// --- PNG ---------------------------------------------------------------------

/** Text, EXIF and timestamp chunks; pixels, palette and colour data stay. */
const DROPPED_PNG_CHUNKS = new Set(["eXIf", "tEXt", "zTXt", "iTXt", "tIME"]);

function stripPng(data: Buffer): Buffer {
  if (!data.subarray(0, 8).equals(PNG_SIGNATURE)) notThisType();
  const kept: Buffer[] = [PNG_SIGNATURE];
  let offset = 8;
  while (offset < data.length) {
    if (offset + 12 > data.length) notThisType();
    const length = data.readUInt32BE(offset);
    const type = data.subarray(offset + 4, offset + 8).toString("ascii");
    const end = offset + 12 + length;
    if (end > data.length) notThisType();
    if (!DROPPED_PNG_CHUNKS.has(type)) kept.push(data.subarray(offset, end));
    offset = end;
    if (type === "IEND") return Buffer.concat(kept);
  }
  notThisType();
}

// --- WebP --------------------------------------------------------------------

const VP8X_EXIF_FLAG = 0x08;
const VP8X_XMP_FLAG = 0x04;

function stripWebp(data: Buffer): Buffer {
  if (
    data.length < 12 ||
    data.subarray(0, 4).toString("ascii") !== "RIFF" ||
    data.subarray(8, 12).toString("ascii") !== "WEBP"
  )
    notThisType();
  const kept: Buffer[] = [];
  let offset = 12;
  while (offset < data.length) {
    if (offset + 8 > data.length) notThisType();
    const fourcc = data.subarray(offset, offset + 4).toString("ascii");
    const size = data.readUInt32LE(offset + 4);
    const end = offset + 8 + size + (size % 2);
    if (offset + 8 + size > data.length) notThisType();
    const chunk = data.subarray(offset, Math.min(end, data.length));
    if (fourcc === "VP8X") {
      const flagsCleared = Buffer.from(chunk);
      flagsCleared[8] &= ~(VP8X_EXIF_FLAG | VP8X_XMP_FLAG);
      kept.push(flagsCleared);
    } else if (fourcc !== "EXIF" && fourcc !== "XMP ") kept.push(chunk);
    offset = end;
  }
  const body = Buffer.concat(kept);
  const header = Buffer.alloc(12);
  header.write("RIFF", 0, "ascii");
  header.writeUInt32LE(body.length + 4, 4);
  header.write("WEBP", 8, "ascii");
  return Buffer.concat([header, body]);
}
