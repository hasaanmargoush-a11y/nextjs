import { Router, type IRouter, type Request, type Response, type NextFunction } from "express";
import { spawn } from "child_process";
import multer from "multer";
import path from "path";
import { db, usersTable } from "../../lib/db/src/index";
import { eq } from "drizzle-orm";

const router: IRouter = Router();

// ── Super Admin Guard ─────────────────────────────────────────────────────────
function getUserIdFromToken(authHeader: string | undefined): number | null {
  if (!authHeader?.startsWith("Bearer ")) return null;
  try {
    const token = authHeader.slice(7);
    const decoded = Buffer.from(token, "base64").toString("utf-8");
    const [idStr] = decoded.split(":");
    const id = parseInt(idStr, 10);
    return isNaN(id) ? null : id;
  } catch { return null; }
}

function requireSuperAdmin(req: Request, res: Response, next: NextFunction): void {
  let userId = req.session.userId;
  if (!userId) {
    const fromToken = getUserIdFromToken(req.headers.authorization);
    if (fromToken) { userId = fromToken; req.session.userId = fromToken; }
  }
  if (!userId) { res.status(401).json({ error: "يجب تسجيل الدخول أولاً" }); return; }

  db.select({ role: usersTable.role })
    .from(usersTable)
    .where(eq(usersTable.id, userId))
    .limit(1)
    .then(([user]) => {
      if (!user || user.role !== "super_admin") {
        res.status(403).json({ error: "هذه الميزة حصرية للسوبر أدمن فقط" });
        return;
      }
      next();
    })
    .catch(() => res.status(500).json({ error: "خطأ في الخادم" }));
}

// ── Multer for SQL upload (memory, 200MB max) ─────────────────────────────────
const sqlUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 200 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const name = file.originalname.toLowerCase();
    const mime = file.mimetype;
    const ok = name.endsWith(".sql") ||
      mime === "application/octet-stream" ||
      mime === "text/plain" ||
      mime === "application/sql" ||
      mime === "application/x-sql";
    if (ok) { cb(null, true); } else { cb(new Error("فقط ملفات .sql مسموح بها")); }
  },
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/admin/backup/db  — stream pg_dump to browser
// ─────────────────────────────────────────────────────────────────────────────
router.get("/admin/backup/db", requireSuperAdmin, (req: Request, res: Response): void => {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) { res.status(500).json({ error: "DATABASE_URL غير محدد في بيئة السيرفر" }); return; }

  const today = new Date().toISOString().slice(0, 10);
  const filename = `nouvil-db-${today}.sql`;

  res.setHeader("Content-Type", "application/octet-stream");
  res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
  res.setHeader("Transfer-Encoding", "chunked");

  const pgDump = spawn("pg_dump", [
    "--clean",
    "--if-exists",
    "--no-password",
    "--no-owner",
    "--no-acl",
    dbUrl,
  ], { stdio: ["ignore", "pipe", "pipe"] });

  pgDump.stdout.pipe(res);

  let stderrBuf = "";
  pgDump.stderr.on("data", (d: Buffer) => { stderrBuf += d.toString(); });

  pgDump.on("error", (err) => {
    if (!res.headersSent) res.status(500).json({ error: "فشل تشغيل pg_dump: " + err.message });
    else res.end();
  });

  pgDump.on("close", (code) => {
    if (code !== 0) {
      if (!res.writableEnded) res.end();
    }
  });

  req.on("close", () => { pgDump.kill(); });
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/admin/backup/restore  — upload .sql and restore via psql
// ─────────────────────────────────────────────────────────────────────────────
router.post(
  "/admin/backup/restore",
  requireSuperAdmin,
  sqlUpload.single("sqlFile"),
  async (req: Request, res: Response): Promise<void> => {
    if (!req.file) { res.status(400).json({ error: "لم يتم رفع أي ملف .sql" }); return; }

    const dbUrl = process.env.DATABASE_URL;
    if (!dbUrl) { res.status(500).json({ error: "DATABASE_URL غير محدد في بيئة السيرفر" }); return; }

    const sqlContent = req.file.buffer.toString("utf-8");

    // Basic sanity check — must contain SQL keywords
    const lower = sqlContent.toLowerCase();
    const looksLikeSQL = lower.includes("create ") || lower.includes("insert ") ||
      lower.includes("drop ") || lower.includes("select ") || lower.includes("--");
    if (!looksLikeSQL) {
      res.status(400).json({ error: "الملف لا يبدو ملف SQL صحيح" });
      return;
    }

    try {
      await new Promise<void>((resolve, reject) => {
        const psql = spawn("psql", ["--no-password", "-v", "ON_ERROR_STOP=0", dbUrl], {
          stdio: ["pipe", "pipe", "pipe"],
        });

        let stderr = "";
        let stdout = "";
        psql.stdout.on("data", (d: Buffer) => { stdout += d.toString(); });
        psql.stderr.on("data", (d: Buffer) => { stderr += d.toString(); });

        psql.stdin.write(sqlContent, "utf-8");
        psql.stdin.end();

        psql.on("error", reject);
        psql.on("close", (code) => {
          if (code === 0 || code === null) resolve();
          else reject(new Error(
            (stderr || stdout).trim().slice(0, 500) || `psql خرج بكود ${code}`
          ));
        });
      });

      res.json({ ok: true, message: "✅ تمت استعادة قاعدة البيانات بنجاح" });
    } catch (err) {
      res.status(500).json({
        error: "فشلت الاستعادة: " + (err instanceof Error ? err.message : String(err)),
      });
    }
  }
);

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/admin/backup/codebase  — clean tar.gz (no Replit files, no node_modules)
// Only includes: artifacts/nouvil, artifacts/api-server, lib/, and root config files
// ─────────────────────────────────────────────────────────────────────────────
router.get("/admin/backup/codebase", requireSuperAdmin, (req: Request, res: Response): void => {
  const workspaceRoot = process.env.WORKSPACE_ROOT ?? path.resolve(process.cwd(), "../..");

  const today = new Date().toISOString().slice(0, 10);
  const filename = `nouvil-codebase-${today}.tar.gz`;

  res.setHeader("Content-Type", "application/gzip");
  res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
  res.setHeader("Transfer-Encoding", "chunked");

  // Only include real project files — exclude everything Replit-specific
  const excludes = [
    // build outputs & deps
    "*/node_modules",
    "*/.next",
    "*/dist",
    "*/.cache",
    "*/*.tsbuildinfo",
    // secrets
    "*/.env",
    "*/.env.*",
    // Replit infrastructure — not needed to run the project
    ".replit",
    ".replitignore",
    "replit.md",
    "skills-lock.json",
    ".agents",
    ".local",
    ".config",
    "attached_assets",
    "scripts",
    // mockup sandbox is a Replit dev tool, not part of the app
    "artifacts/mockup-sandbox",
  ];

  const excludeArgs = excludes.flatMap((e) => ["--exclude", e]);

  // Only archive the directories that matter for running the project
  const included = [
    "artifacts/nouvil",
    "artifacts/api-server",
    "lib",
    "package.json",
    "pnpm-workspace.yaml",
    "pnpm-lock.yaml",
    "tsconfig.base.json",
    "tsconfig.json",
    ".gitignore",
    ".npmrc",
  ];

  const tar = spawn(
    "tar",
    [
      "-czf", "-",
      ...excludeArgs,
      "-C", workspaceRoot,
      ...included,
    ],
    { cwd: workspaceRoot }
  );

  tar.stdout.pipe(res);

  tar.stderr.on("data", (chunk: Buffer) => {
    req.log?.warn?.({ msg: "tar stderr", data: chunk.toString() });
  });

  tar.on("error", (err) => {
    if (!res.headersSent) res.status(500).json({ error: "فشل إنشاء الأرشيف: " + err.message });
    else res.destroy(err);
  });

  tar.on("close", (code) => {
    if (code !== 0 && !res.writableEnded) res.end();
  });

  req.on("close", () => { tar.kill(); });
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/admin/backup/status  — lightweight ping for UI health check
// ─────────────────────────────────────────────────────────────────────────────
router.get("/admin/backup/status", requireSuperAdmin, (_req: Request, res: Response): void => {
  res.json({ ok: true, pgDumpAvailable: true });
});

export default router;
