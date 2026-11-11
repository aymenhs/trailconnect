function required(name: string, value: string): string {
  if (!value && process.env.NODE_ENV === "production") {
    throw new Error(
      `${name} must be set in production. See .env.example for the full list.`
    );
  }
  return value;
}

export const ENV = {
  appId: process.env.APP_ID ?? process.env.VITE_APP_ID ?? "trailconnect",
  /** Signs the session JWT. Rotating it invalidates every session. */
  cookieSecret: required("JWT_SECRET", process.env.JWT_SECRET ?? ""),
  databaseUrl: required("DATABASE_URL", process.env.DATABASE_URL ?? ""),
  /** externalId of the account bootstrapped as administrator. */
  ownerExternalId: process.env.OWNER_EXTERNAL_ID ?? "",
  isProduction: process.env.NODE_ENV === "production",

  /** Where user uploads live on disk. Back this directory up. */
  uploadDir: process.env.UPLOAD_DIR ?? "./var/uploads",

  /** Public origin, used to build absolute links in emails and OAuth callbacks. */
  appUrl: (process.env.APP_URL ?? "http://localhost:3000").replace(/\/+$/, ""),

  /** Google OAuth. Empty values disable the provider rather than crashing. */
  googleClientId: process.env.GOOGLE_CLIENT_ID ?? "",
  googleClientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",

  /** Shared secret for the scheduled-task endpoints (systemd timer or cron). */
  cronSecret: process.env.CRON_SECRET ?? "",
};
