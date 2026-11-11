import { NOT_ADMIN_ERR_MSG, UNAUTHED_ERR_MSG } from "@shared/const";
import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import { DomainError } from "../domainError";
import type { TrpcContext } from "./context";

export const GENERIC_SERVER_ERROR = "Something went wrong. Please try again.";

/**
 * What the client may read of an error. A procedure that let a failed query
 * escape answered with its text — "Failed query: select … from `users` …" —
 * because tRPC forwards the message of an unexpected error. Unexpected errors
 * now reach the client as a generic message; the details stay in the log.
 */
export function publicErrorMessage(error: TRPCError): string {
  if (error.code !== "INTERNAL_SERVER_ERROR") return error.message;
  if (error.cause instanceof DomainError) return error.cause.message;
  return GENERIC_SERVER_ERROR;
}

const t = initTRPC.context<TrpcContext>().create({
  transformer: superjson,
  errorFormatter({ shape, error }) {
    const message = publicErrorMessage(error);
    if (message === GENERIC_SERVER_ERROR)
      console.error("[API] unexpected error:", error.cause ?? error);
    const { stack: _stack, ...data } = shape.data;
    return { ...shape, message, data };
  },
});

export const router = t.router;
export const publicProcedure = t.procedure;

const requireUser = t.middleware(async opts => {
  const { ctx, next } = opts;

  if (!ctx.user) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: UNAUTHED_ERR_MSG });
  }

  return next({
    ctx: {
      ...ctx,
      user: ctx.user,
    },
  });
});

export const protectedProcedure = t.procedure.use(requireUser);

export const adminProcedure = t.procedure.use(
  t.middleware(async opts => {
    const { ctx, next } = opts;

    if (!ctx.user || ctx.user.role !== "admin") {
      throw new TRPCError({ code: "FORBIDDEN", message: NOT_ADMIN_ERR_MSG });
    }

    return next({
      ctx: {
        ...ctx,
        user: ctx.user,
      },
    });
  })
);
