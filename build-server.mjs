/**
 * Production build script for the unified Nouvil server.
 * Bundles server.ts (Express + socket.io + scheduler) into server.mjs.
 * Next.js is built separately via `next build`.
 */
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { build as esbuild } from "esbuild";

globalThis.require = createRequire(import.meta.url);

const __dirname = path.dirname(fileURLToPath(import.meta.url));

await esbuild({
  entryPoints: [path.resolve(__dirname, "server.ts")],
  platform: "node",
  bundle: true,
  format: "esm",
  outfile: path.resolve(__dirname, "server.mjs"),
  logLevel: "info",
  alias: {
    "@workspace/db": path.resolve(__dirname, "lib/db/src/index.ts"),
    "@workspace/api-zod": path.resolve(__dirname, "lib/api-zod/src/index.ts"),
  },
  external: [
    "*.node",
    // Native / hard-to-bundle packages
    "connect-pg-simple",
    "bcrypt",
    "sharp",
    "better-sqlite3",
    "sqlite3",
    "canvas",
    "argon2",
    "fsevents",
    "re2",
    "farmhash",
    "bufferutil",
    "utf-8-validate",
    "pg-native",
    "archiver",
    "nodemailer",
    "pino-pretty",
    // Next.js itself is kept external — it uses its own internal loader
    "next",
  ],
  sourcemap: "linked",
  banner: {
    js: `import { createRequire as __bannerCrReq } from 'node:module';
import __bannerPath from 'node:path';
import __bannerUrl from 'node:url';
globalThis.require = __bannerCrReq(import.meta.url);
globalThis.__filename = __bannerUrl.fileURLToPath(import.meta.url);
globalThis.__dirname = __bannerPath.dirname(globalThis.__filename);
`,
  },
});

console.log("✅ Server bundle written to server.mjs");
