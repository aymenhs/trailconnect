import "dotenv/config";
import express from "express";
import rateLimit from "express-rate-limit";
import helmet from "helmet";
import { timingSafeEqual } from "crypto";
import { createServer } from "http";
import net from "net";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { ENV } from "./env";
import { registerOAuthRoutes } from "./oauth";
import { registerStorageProxy } from "./storageProxy";
import { appRouter } from "../routers";
import * as db from "../db";
import { finalizeDueAccountDeletions } from "../accountErasure";
import { runOutingMaintenance } from "../outingLifecycle";
import { createContext } from "./context";
import { sdk } from "./sdk";
import { isTrpcUploadPath } from "./uploadRoutes";
import { serveStatic, setupVite } from "./vite";

/**
 * Scheduled tasks authenticate with a shared secret compared in constant time.
 * Answers the request itself when it is refused; returns true when it may run.
 */
function authorizeScheduledTask(
  req: express.Request,
  res: express.Response
): boolean {
  if (!ENV.cronSecret) {
    res.status(503).json({ error: "cron-secret-not-configured" });
    return false;
  }
  const header = req.headers.authorization ?? "";
  const provided = header.startsWith("Bearer ") ? header.slice(7) : "";
  const expected = Buffer.from(ENV.cronSecret);
  const candidate = Buffer.from(provided);
  const authorized =
    candidate.length === expected.length &&
    timingSafeEqual(candidate, expected);
  if (!authorized) res.status(403).json({ error: "cron-only" });
  return authorized;
}

function isPortAvailable(port: number): Promise<boolean> {
  return new Promise(resolve => {
    const server = net.createServer();
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
    server.on("error", () => resolve(false));
  });
}

async function findAvailablePort(startPort: number = 3000): Promise<number> {
  for (let port = startPort; port < startPort + 20; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available port found starting from ${startPort}`);
}

async function startServer() {
  const app = express();
  const server = createServer(app);

  // Behind Caddy/nginx the TLS termination happens upstream. Without this the
  // session cookie never gets its `secure` flag, and a SameSite=None cookie
  // without `secure` is rejected outright by every current browser — login
  // would fail with no visible error.
  app.set("trust proxy", 1);

  app.use(
    helmet({
      // Vite injects inline styles and the dev client needs websockets, so the
      // policy is only enforced on production builds.
      contentSecurityPolicy: ENV.isProduction
        ? {
            directives: {
              defaultSrc: ["'self'"],
              scriptSrc: ["'self'"],
              styleSrc: [
                "'self'",
                "'unsafe-inline'",
                "https://fonts.googleapis.com",
              ],
              fontSrc: ["'self'", "https://fonts.gstatic.com", "data:"],
              imgSrc: ["'self'", "data:", "blob:", "https:"],
              connectSrc: ["'self'", "https://api.open-meteo.com", "https:"],
              frameAncestors: ["'none'"],
              objectSrc: ["'none'"],
              baseUri: ["'self'"],
            },
          }
        : false,
      // Google Maps and the storage redirects load cross-origin resources.
      crossOriginEmbedderPolicy: false,
      crossOriginResourcePolicy: { policy: "cross-origin" },
    })
  );

  // Uploads travel base64-encoded inside tRPC payloads, so the ceiling has to
  // clear the ~8 MB of real content — but 50 MB let an anonymous caller pin a
  // whole request worth of memory per connection.
  app.use(express.json({ limit: "12mb" }));
  app.use(express.urlencoded({ limit: "12mb", extended: true }));

  const apiLimiter = rateLimit({
    windowMs: 60_000,
    limit: 300,
    standardHeaders: "draft-7",
    legacyHeaders: false,
    message: { error: "too-many-requests" },
  });
  const uploadLimiter = rateLimit({
    windowMs: 60_000,
    limit: 20,
    standardHeaders: "draft-7",
    legacyHeaders: false,
    message: { error: "too-many-uploads" },
  });
  const authLimiter = rateLimit({
    windowMs: 15 * 60_000,
    limit: 30,
    standardHeaders: "draft-7",
    legacyHeaders: false,
    message: { error: "too-many-login-attempts" },
  });

  // Liveness plus a real database round-trip. `system.health` cannot serve this
  // role: it requires an input payload and returns `{ok:true}` unconditionally.
  //
  // The driver's error text stays in the server log: it names the database
  // host and user, which an anonymous endpoint has no reason to publish.
  app.get("/healthz", async (_req, res) => {
    const { error, ...database } = await db.checkDatabaseHealth();
    if (error) console.error("[Health] database check failed:", error);
    return res.status(database.ok ? 200 : 503).json({
      ok: database.ok,
      database,
      uptimeSeconds: Math.round(process.uptime()),
      timestamp: new Date().toISOString(),
    });
  });

  registerStorageProxy(app);
  app.use("/api/oauth", authLimiter);
  registerOAuthRoutes(app);
  app.post(
    "/api/tracks/upload",
    uploadLimiter,
    express.raw({ type: "application/octet-stream", limit: "12mb" }),
    async (req, res) => {
      try {
        const user = await sdk.authenticateRequest(req).catch(() => null);
        if (!user || user.accountStatus !== "active")
          return res.status(401).json({ error: "authentication-required" });
        const filename =
          typeof req.query.filename === "string" ? req.query.filename : "";
        if (!/^[a-zA-Z0-9_.-]+\.(gpx|kml)$/i.test(filename))
          return res.status(400).json({ error: "invalid-track-filename" });
        if (!Buffer.isBuffer(req.body) || req.body.length === 0)
          return res.status(400).json({ error: "missing-track-content" });
        const mimeType = filename.toLowerCase().endsWith(".kml")
          ? "application/vnd.google-earth.kml+xml"
          : "application/gpx+xml";
        const uploaded = await db.uploadRouteTrackBytes(
          user.id,
          filename,
          mimeType,
          req.body
        );
        return res.status(201).json({ url: uploaded.url, key: uploaded.key });
      } catch (error) {
        console.error("[TrackUpload] failed:", error);
        return res.status(500).json({ error: "track-upload-failed" });
      }
    }
  );
  // Scheduled task, called by a systemd timer or a cron entry:
  //   curl -fsS -X POST -H "Authorization: Bearer $CRON_SECRET" \
  //     https://<host>/api/scheduled/finalize-account-deletions
  //
  // Authentication used to ride on a Manus cron session (an `openId` prefixed
  // `cron_`, validated against their API). Self-hosted there is no such issuer,
  // so it is a shared secret compared in constant time.
  app.post("/api/scheduled/finalize-account-deletions", async (req, res) => {
    try {
      if (!authorizeScheduledTask(req, res)) return;
      const finalized = await finalizeDueAccountDeletions();
      return res.json({ ok: true, finalized });
    } catch (error) {
      console.error("[Cron] account deletion finalization failed:", error);
      return res.status(500).json({
        error: "account-deletion-finalization-failed",
        timestamp: new Date().toISOString(),
      });
    }
  });
  // Every 15 minutes (deploy/trailconnect-maintenance.timer): closes finished
  // outings and sends the departure reminders that are due.
  app.post("/api/scheduled/outing-maintenance", async (req, res) => {
    try {
      if (!authorizeScheduledTask(req, res)) return;
      return res.json({ ok: true, ...(await runOutingMaintenance()) });
    } catch (error) {
      console.error("[Cron] outing maintenance failed:", error);
      return res.status(500).json({
        error: "outing-maintenance-failed",
        timestamp: new Date().toISOString(),
      });
    }
  });
  // tRPC API. File uploads also count against the upload quota.
  app.use("/api/trpc", (req, res, next) =>
    isTrpcUploadPath(req.path) ? uploadLimiter(req, res, next) : next()
  );
  app.use(
    "/api/trpc",
    apiLimiter,
    createExpressMiddleware({
      router: appRouter,
      createContext,
    })
  );
  // development mode uses Vite, production mode uses static files
  if (process.env.NODE_ENV === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  const preferredPort = parseInt(process.env.PORT || "3000");
  // In production the reverse proxy points at one fixed port. Drifting to the
  // next free one left Caddy forwarding to nothing while the process looked
  // healthy; failing loudly lets systemd report and restart it.
  const port = ENV.isProduction
    ? preferredPort
    : await findAvailablePort(preferredPort);

  if (port !== preferredPort) {
    console.log(`Port ${preferredPort} is busy, using port ${port} instead`);
  }

  server.listen(port, () => {
    console.log(`Server running on http://localhost:${port}/`);
  });
}

startServer().catch(error => {
  console.error("[Server] failed to start:", error);
  // A non-zero exit is what tells systemd the service did not come up.
  process.exit(1);
});
