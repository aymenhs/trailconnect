import { describe, expect, it } from "vitest";
import { DomainError } from "./domainError";
import { stripImageMetadata } from "./imageMetadata";

/** A marker segment: FF, marker, 2-byte length, payload. */
function jpegSegment(marker: number, payload: Buffer): Buffer {
  const header = Buffer.from([0xff, marker, 0, 0]);
  header.writeUInt16BE(payload.length + 2, 2);
  return Buffer.concat([header, payload]);
}

/** EXIF (little-endian TIFF) holding an orientation and a GPS pointer. */
function exifPayload(orientation: number): Buffer {
  const tiff = Buffer.alloc(8 + 2 + 2 * 12 + 4);
  tiff.write("II", 0, "ascii");
  tiff.writeUInt16LE(42, 2);
  tiff.writeUInt32LE(8, 4);
  tiff.writeUInt16LE(2, 8);
  tiff.writeUInt16LE(0x0112, 10); // Orientation
  tiff.writeUInt16LE(3, 12);
  tiff.writeUInt32LE(1, 14);
  tiff.writeUInt16LE(orientation, 18);
  tiff.writeUInt16LE(0x8825, 22); // GPS IFD pointer
  tiff.writeUInt16LE(4, 24);
  tiff.writeUInt32LE(1, 26);
  tiff.writeUInt32LE(0xdeadbeef, 30);
  return Buffer.concat([
    Buffer.from("Exif\0\0", "binary"),
    tiff,
    Buffer.from("GPS 48.8566N 2.3522E home", "ascii"),
  ]);
}

const scan = Buffer.from([
  0xff, 0xda, 0x00, 0x04, 0x01, 0x02, 0x33, 0x44, 0xff, 0xd9,
]);
const jfif = jpegSegment(0xe0, Buffer.from("JFIF\0\x01\x01", "binary"));

function jpeg(...segments: Buffer[]) {
  return Buffer.concat([Buffer.from([0xff, 0xd8]), ...segments, scan]);
}

describe("stripImageMetadata — JPEG", () => {
  it("removes EXIF (GPS included), XMP and comments but keeps the pixels", () => {
    const input = jpeg(
      jfif,
      jpegSegment(0xe1, exifPayload(1)),
      jpegSegment(0xfe, Buffer.from("taken at 12 rue des Érables", "utf8"))
    );

    const output = stripImageMetadata(input, "image/jpeg");

    expect(output.includes(Buffer.from("GPS"))).toBe(false);
    expect(output.includes(Buffer.from("Érables"))).toBe(false);
    expect(output.includes(Buffer.from("Exif"))).toBe(false);
    expect(output).toEqual(jpeg(jfif));
  });

  it("keeps the orientation so portrait photos are not shown sideways", () => {
    const input = jpeg(jfif, jpegSegment(0xe1, exifPayload(6)));

    const output = stripImageMetadata(input, "image/jpeg");

    expect(output.includes(Buffer.from("GPS"))).toBe(false);
    const exif = output.indexOf(Buffer.from("Exif\0\0", "binary"));
    expect(exif).toBe(6);
    // Big-endian TIFF, one entry: tag 0x0112, SHORT, count 1, value 6.
    const tiff = output.subarray(exif + 6);
    expect(tiff.readUInt16BE(10)).toBe(0x0112);
    expect(tiff.readUInt16BE(18)).toBe(6);
    expect(output.subarray(-scan.length)).toEqual(scan);
  });

  it("refuses bytes that are not a JPEG", () => {
    expect(() =>
      stripImageMetadata(
        Buffer.from("<html><script>alert(1)</script>"),
        "image/jpeg"
      )
    ).toThrow(DomainError);
    expect(() =>
      stripImageMetadata(
        Buffer.from([0xff, 0xd8, 0xff, 0xe1, 0xff, 0xff]),
        "image/jpeg"
      )
    ).toThrow(DomainError);
  });
});

function pngChunk(type: string, data: Buffer): Buffer {
  const header = Buffer.alloc(8);
  header.writeUInt32BE(data.length, 0);
  header.write(type, 4, "ascii");
  return Buffer.concat([header, data, Buffer.alloc(4)]);
}

describe("stripImageMetadata — PNG", () => {
  const signature = Buffer.from([
    0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
  ]);
  const ihdr = pngChunk("IHDR", Buffer.alloc(13, 1));
  const idat = pngChunk("IDAT", Buffer.from([7, 7, 7]));
  const iend = pngChunk("IEND", Buffer.alloc(0));

  it("removes EXIF and text chunks", () => {
    const input = Buffer.concat([
      signature,
      ihdr,
      pngChunk("eXIf", Buffer.from("GPS")),
      pngChunk("tEXt", Buffer.from("Author\0Ana Tremblay")),
      idat,
      iend,
    ]);

    expect(stripImageMetadata(input, "image/png")).toEqual(
      Buffer.concat([signature, ihdr, idat, iend])
    );
  });

  it("refuses a file that is not a PNG", () => {
    expect(() =>
      stripImageMetadata(Buffer.from("GIF89a...."), "image/png")
    ).toThrow(DomainError);
  });
});

function riffChunk(fourcc: string, data: Buffer): Buffer {
  const header = Buffer.alloc(8);
  header.write(fourcc, 0, "ascii");
  header.writeUInt32LE(data.length, 4);
  return Buffer.concat([
    header,
    data,
    data.length % 2 ? Buffer.alloc(1) : Buffer.alloc(0),
  ]);
}

function webp(...chunks: Buffer[]) {
  const body = Buffer.concat(chunks);
  const header = Buffer.alloc(12);
  header.write("RIFF", 0, "ascii");
  header.writeUInt32LE(body.length + 4, 4);
  header.write("WEBP", 8, "ascii");
  return Buffer.concat([header, body]);
}

describe("stripImageMetadata — WebP", () => {
  it("removes EXIF and XMP chunks and clears their flags", () => {
    const flags = Buffer.alloc(10);
    flags[0] = 0x08 | 0x04 | 0x10; // EXIF, XMP, alpha
    const image = riffChunk("VP8L", Buffer.from([1, 2, 3]));
    const input = webp(
      riffChunk("VP8X", flags),
      image,
      riffChunk("EXIF", Buffer.from("GPS 48.85N")),
      riffChunk("XMP ", Buffer.from("<x:xmpmeta/>"))
    );

    const output = stripImageMetadata(input, "image/webp");

    const cleared = Buffer.alloc(10);
    cleared[0] = 0x10; // alpha kept
    expect(output).toEqual(webp(riffChunk("VP8X", cleared), image));
    expect(output.readUInt32LE(4)).toBe(output.length - 8);
  });

  it("refuses a file that is not a WebP", () => {
    expect(() =>
      stripImageMetadata(Buffer.from("RIFF\0\0\0\0WAVEfmt "), "image/webp")
    ).toThrow(DomainError);
  });
});
