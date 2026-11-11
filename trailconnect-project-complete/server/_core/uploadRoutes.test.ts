import { describe, expect, it } from "vitest";
import { isTrpcUploadPath } from "./uploadRoutes";

describe("isTrpcUploadPath", () => {
  it("recognizes image and track uploads, alone or batched", () => {
    expect(isTrpcUploadPath("/hiking.media.uploadImage")).toBe(true);
    expect(isTrpcUploadPath("/hiking.tracks.upload")).toBe(true);
    expect(
      isTrpcUploadPath("/hiking.events.list,hiking.media.uploadImage")
    ).toBe(true);
  });

  it("leaves every other procedure under the general limit", () => {
    expect(isTrpcUploadPath("/hiking.events.list")).toBe(false);
    expect(isTrpcUploadPath("/hiking.media.uploadImageX")).toBe(false);
    expect(isTrpcUploadPath("/")).toBe(false);
  });
});
