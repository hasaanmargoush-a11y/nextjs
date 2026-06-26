/**
 * Unified Nouvil Server
 * Embeds Express (all API routes + Socket.io) inside a Next.js custom server.
 * Single entry point for Hostinger deployment.
 */
import "dotenv/config";
import { createServer } from "node:http";
import next from "next";
import app from "./server/app";
import { initSocket } from "./server/socket";
import { startScheduler } from "./server/scheduler";

const dev = process.env.NODE_ENV !== "production";
const hostname = "0.0.0.0";
const port = Number(process.env.PORT ?? 3000);

const nextApp = next({ dev, hostname, port });
const handle = nextApp.getRequestHandler();

nextApp
  .prepare()
  .then(() => {
    // Pass all non-Express-handled requests through to Next.js
    app.use((req, res) => {
      handle(req, res);
    });

    const httpServer = createServer(app);
    initSocket(httpServer);

    httpServer.listen(port, hostname, () => {
      console.log(
        `[Nouvil] ✅ Unified server on port ${port} (${dev ? "development" : "production"})`
      );
      startScheduler();
    });

    httpServer.on("error", (err: Error) => {
      console.error("[Nouvil] Server error:", err);
      process.exit(1);
    });
  })
  .catch((err: unknown) => {
    console.error("[Nouvil] Failed to start:", err);
    process.exit(1);
  });
