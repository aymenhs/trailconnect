import { TRPCError } from "@trpc/server";
import { describe, expect, it } from "vitest";
import { DomainError } from "../domainError";
import { GENERIC_SERVER_ERROR, publicErrorMessage } from "./trpc";

describe("publicErrorMessage", () => {
  it("hides the text of an unexpected error", () => {
    const leak = new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      cause: new Error("Failed query: select `email` from `users` where `id` = ?"),
    });

    expect(publicErrorMessage(leak)).toBe(GENERIC_SERVER_ERROR);
  });

  it("keeps a message written for the member", () => {
    const refusal = new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      cause: new DomainError("The file is not a valid image of the declared type"),
    });

    expect(publicErrorMessage(refusal)).toBe(
      "The file is not a valid image of the declared type"
    );
  });

  it("leaves errors raised on purpose by a procedure unchanged", () => {
    expect(
      publicErrorMessage(
        new TRPCError({ code: "NOT_FOUND", message: "Event not found" })
      )
    ).toBe("Event not found");
  });
});
