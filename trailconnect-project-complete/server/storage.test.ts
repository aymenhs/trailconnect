import { mkdtemp, readFile, rm } from "fs/promises";
import { tmpdir } from "os";
import path from "path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

let uploadRoot: string;

beforeEach(async () => {
  uploadRoot = await mkdtemp(path.join(tmpdir(), "trailconnect-storage-"));
  process.env.UPLOAD_DIR = uploadRoot;
  // ENV reads process.env at module load, so the module has to be re-imported
  // once the directory exists.
  vi.resetModules();
});

afterEach(async () => {
  await rm(uploadRoot, { recursive: true, force: true });
  delete process.env.UPLOAD_DIR;
});

async function loadStorage() {
  return import("./storage");
}

describe("local upload storage", () => {
  it("writes the file and returns a URL under the uploads prefix", async () => {
    const { storagePut } = await loadStorage();
    const { key, url } = await storagePut(
      "users/7/tracks/route.gpx",
      Buffer.from("<gpx/>"),
      "application/gpx+xml"
    );

    expect(url).toBe(`/uploads/${key}`);
    expect(key).toMatch(/^users\/7\/tracks\/route_[0-9a-f]{8}\.gpx$/);
    await expect(
      readFile(path.join(uploadRoot, key), "utf-8")
    ).resolves.toBe("<gpx/>");
  });

  it("gives each upload a distinct key so one never overwrites another", async () => {
    const { storagePut } = await loadStorage();
    const first = await storagePut("users/7/social/photo.webp", Buffer.from("a"));
    const second = await storagePut("users/7/social/photo.webp", Buffer.from("b"));

    expect(first.key).not.toBe(second.key);
    await expect(
      readFile(path.join(uploadRoot, first.key), "utf-8")
    ).resolves.toBe("a");
  });

  it("refuses keys that climb out of the upload directory", async () => {
    const { resolveStoragePath } = await loadStorage();
    // The key arrives from a URL path, so traversal has to be impossible
    // rather than merely unlikely.
    expect(resolveStoragePath("../../etc/passwd")).toBeNull();
    expect(resolveStoragePath("users/../../../secret")).toBeNull();
    expect(resolveStoragePath("users/7/ok.webp")).not.toBeNull();
  });

  it("reports a missing file instead of throwing", async () => {
    const { openStoredFile } = await loadStorage();
    await expect(openStoredFile("users/7/nope.webp")).resolves.toBeNull();
  });

  it("streams a stored file back with its size", async () => {
    const { storagePut, openStoredFile } = await loadStorage();
    const { key } = await storagePut("users/7/social/x.webp", Buffer.from("hello"));

    const file = await openStoredFile(key);
    expect(file?.size).toBe(5);
    file?.stream.destroy();
  });

  it("deletes an upload by its public URL, including legacy ones", async () => {
    const { storagePut, storageDeleteByUrl, openStoredFile } =
      await loadStorage();
    const current = await storagePut("users/7/avatar.webp", Buffer.from("a"));
    const legacy = await storagePut("users/7/cover.webp", Buffer.from("b"));

    await storageDeleteByUrl(current.url);
    await storageDeleteByUrl(`/manus-storage/${legacy.key}`);

    await expect(openStoredFile(current.key)).resolves.toBeNull();
    await expect(openStoredFile(legacy.key)).resolves.toBeNull();
  });

  it("ignores missing files, external URLs and keys escaping the root", async () => {
    const { storageDeleteByUrl } = await loadStorage();
    await expect(
      storageDeleteByUrl("/uploads/users/7/already-gone.webp")
    ).resolves.toBe(false);
    await expect(
      storageDeleteByUrl("https://example.com/photo.webp")
    ).resolves.toBe(false);
    await expect(
      storageDeleteByUrl("/uploads/../../etc/passwd")
    ).resolves.toBe(false);
  });
});
