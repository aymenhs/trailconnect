import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import path from "node:path";
import { defineConfig, type Plugin, type ViteDevServer } from "vite";
import { VitePWA } from "vite-plugin-pwa";

const isProductionBuild = process.env.NODE_ENV === "production";

/**
 * The product promised an offline mode and shipped none: no service worker, no
 * manifest. Without network the application did not load at all — in a hiking
 * app, whose whole point is the place where coverage stops.
 *
 * The shell is precached so the app always starts. Outing data is
 * NetworkFirst: fresh when there is signal, still readable when there is not.
 */
function pwaPlugin() {
  return VitePWA({
    registerType: "prompt",
    includeAssets: ["favicon.svg", "icons/*.png", "social-card.png"],
    manifest: {
      name: "TrailConnect — Aventures partagées",
      short_name: "TrailConnect",
      description:
        "Organisez et rejoignez des randonnées de groupe : parcours, covoiturage, préparation et coordination du jour J.",
      lang: "fr-CA",
      start_url: "/",
      scope: "/",
      display: "standalone",
      orientation: "portrait",
      background_color: "#f8fbf4",
      theme_color: "#18362d",
      categories: ["sports", "travel", "social"],
      icons: [
        { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
        { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
        {
          src: "/icons/maskable-192.png",
          sizes: "192x192",
          type: "image/png",
          purpose: "maskable",
        },
        {
          src: "/icons/maskable-512.png",
          sizes: "512x512",
          type: "image/png",
          purpose: "maskable",
        },
      ],
    },
    workbox: {
      globPatterns: ["**/*.{js,css,html,svg,png,woff2}"],
      // Deep links must fall back to the shell, which then routes client-side.
      navigateFallback: "/index.html",
      navigateFallbackDenylist: [
        /^\/api\//,
        /^\/uploads\//,
        // Rows written on Manus still point at this prefix.
        /^\/manus-storage\//,
        /^\/healthz/,
      ],
      cleanupOutdatedCaches: true,
      runtimeCaching: [
        {
          // Outing data: fresh when online, still there at the trailhead.
          urlPattern: ({ url }) => url.pathname.startsWith("/api/trpc"),
          handler: "NetworkFirst",
          options: {
            cacheName: "trailconnect-api",
            networkTimeoutSeconds: 5,
            expiration: { maxEntries: 200, maxAgeSeconds: 60 * 60 * 24 * 14 },
            cacheableResponse: { statuses: [0, 200] },
          },
        },
        {
          urlPattern: ({ url }) =>
            url.pathname.startsWith("/uploads/") ||
            url.pathname.startsWith("/manus-storage/"),
          handler: "CacheFirst",
          options: {
            cacheName: "trailconnect-media",
            expiration: { maxEntries: 80, maxAgeSeconds: 60 * 60 * 24 * 30 },
            cacheableResponse: { statuses: [0, 200] },
          },
        },
        {
          urlPattern: ({ url }) => url.origin === "https://fonts.gstatic.com",
          handler: "CacheFirst",
          options: {
            cacheName: "trailconnect-fonts",
            expiration: { maxEntries: 20, maxAgeSeconds: 60 * 60 * 24 * 365 },
            cacheableResponse: { statuses: [0, 200] },
          },
        },
      ],
    },
    devOptions: { enabled: false },
  });
}

// The Manus dev tooling (runtime bridge, JSX source locations, debug collector)
// was removed with the migration: it phoned home, and its debug collector was
// being copied into production builds.
const plugins = isProductionBuild
  ? [react(), tailwindcss(), pwaPlugin()]
  : [react(), tailwindcss()];

export default defineConfig({
  plugins,
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "client", "src"),
      "@shared": path.resolve(import.meta.dirname, "shared"),
      "@assets": path.resolve(import.meta.dirname, "attached_assets"),
    },
  },
  envDir: path.resolve(import.meta.dirname),
  root: path.resolve(import.meta.dirname, "client"),
  publicDir: path.resolve(import.meta.dirname, "client", "public"),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes("node_modules")) return;
          if (
            /\/node_modules\/(?:\.pnpm\/[^/]+\/node_modules\/)?(?:react|react-dom|scheduler|use-sync-external-store)(?:\/|$)/.test(
              id
            )
          )
            return "react-vendor";
          if (
            id.includes("@trpc") ||
            id.includes("@tanstack/react-query") ||
            id.includes("superjson")
          )
            return "data-vendor";
          if (id.includes("lucide-react")) return "icons-vendor";
          if (
            id.includes("@radix-ui") ||
            id.includes("vaul") ||
            id.includes("cmdk")
          )
            return "ui-vendor";
          if (id.includes("recharts")) return "charts-vendor";
        },
      },
    },
  },
  server: {
    host: true,
    // Preview domains of the previous host; keep only what you serve from.
    allowedHosts: ["localhost", "127.0.0.1"],
    fs: {
      strict: true,
      deny: ["**/.*"],
    },
  },
});
