import { Router, type IRouter, type Request, type Response } from "express";
import { db, ideProjectsTable, ideExecutionLogsTable, userProjectsTable, projectStarsTable, projectSnapshotsTable, usersTable } from "../../lib/db/src/index";
import { eq, and, sql, desc } from "drizzle-orm";
import { scanProjectFiles, shouldAutoBan } from "../lib/codeScanner";
import { notify } from "../lib/notifications";
import { recordSecurityEvent } from "./security";
import { spawn } from "child_process";
import { writeFile, unlink, mkdir, rm, stat, readFile, readdir, symlink } from "fs/promises";
import { tmpdir } from "os";
import { join, resolve as resolvePath } from "path";
import { randomBytes } from "crypto";

const router: IRouter = Router();

// ── Helpers ───────────────────────────────────────────────────────────────────
function getIp(req: Request): string {
  const forwarded = req.headers["x-forwarded-for"];
  if (typeof forwarded === "string") return forwarded.split(",")[0].trim();
  return req.socket?.remoteAddress ?? "unknown";
}

function requireAuth(req: Request, res: Response, next: () => void): void {
  if (!req.session?.userId) { res.status(401).json({ error: "يجب تسجيل الدخول أولاً" }); return; }
  next();
}

// ── In-memory rate limiter (per-IP + per-user) ────────────────────────────────
const RATE_LIMIT    = 120;
const RATE_WINDOW   = 5 * 60 * 1000;
const ipBuckets     = new Map<string, { count: number; resetAt: number }>();
const userBuckets   = new Map<number, { count: number; resetAt: number }>();

function checkBucket(map: Map<string | number, { count: number; resetAt: number }>, key: string | number): boolean {
  const now = Date.now();
  let b = map.get(key);
  if (!b || now > b.resetAt) { b = { count: 0, resetAt: now + RATE_WINDOW }; map.set(key, b); }
  if (b.count >= RATE_LIMIT) return false;
  b.count++;
  return true;
}

function checkRateLimit(ip: string, userId?: number | null): boolean {
  if (!checkBucket(ipBuckets, ip)) return false;
  if (userId && !checkBucket(userBuckets, userId)) return false;
  return true;
}

// ── Concurrent execution semaphore ────────────────────────────────────────────
let activeExecutions = 0;
const MAX_CONCURRENT = 20;

async function withExecutionSlot<T>(fn: () => Promise<T>): Promise<T> {
  if (activeExecutions >= MAX_CONCURRENT) {
    throw new Error("الخادم يعمل بطاقته الكاملة حالياً. حاول مرة أخرى بعد لحظات.");
  }
  activeExecutions++;
  try { return await fn(); }
  finally { activeExecutions--; }
}

// ── Per-user shell rate limiter (DoS protection) ──────────────────────────────
// Prevents rapid-fire heavy commands from one user. Separate, stricter bucket
// from the general code-execution rate limiter.
const SHELL_RATE_LIMIT  = 20;               // max 20 shell commands
const SHELL_RATE_WINDOW = 5 * 60 * 1000;   // per 5-minute window
const shellUserBuckets  = new Map<number, { count: number; resetAt: number }>();

function checkShellRateLimit(userId: number): boolean {
  const now = Date.now();
  let b = shellUserBuckets.get(userId);
  if (!b || now > b.resetAt) { b = { count: 0, resetAt: now + SHELL_RATE_WINDOW }; shellUserBuckets.set(userId, b); }
  if (b.count >= SHELL_RATE_LIMIT) return false;
  b.count++;
  return true;
}

// ── Per-user shell concurrency limiter (DoS protection) ───────────────────────
// A single user can have at most MAX_USER_SHELL_CONCURRENT shell commands running
// simultaneously. Prevents spawning many parallel heavy processes.
const userShellActive       = new Map<number, number>();
const MAX_USER_SHELL_CONCURRENT = 2;

function acquireUserShellSlot(userId: number): boolean {
  const n = userShellActive.get(userId) ?? 0;
  if (n >= MAX_USER_SHELL_CONCURRENT) return false;
  userShellActive.set(userId, n + 1);
  return true;
}

function releaseUserShellSlot(userId: number): void {
  userShellActive.set(userId, Math.max(0, (userShellActive.get(userId) ?? 1) - 1));
}

// ── Async fire-and-forget audit logger ───────────────────────────────────────
function logExecution(data: {
  userId: number | null; ip: string; language: string; status: string;
  blockReason?: string; codeSnippet?: string; durationMs?: number; exitCode?: number | null;
}): void {
  db.insert(ideExecutionLogsTable).values({
    userId:      data.userId,
    ip:          data.ip,
    language:    data.language,
    status:      data.status,
    blockReason: data.blockReason ?? null,
    codeSnippet: data.codeSnippet ?? null,
    durationMs:  data.durationMs  ?? null,
    exitCode:    data.exitCode    ?? null,
  }).catch(() => {});
}

// ── Dangerous pattern scanner (Node.js / TypeScript only) ────────────────────
// Defence-in-depth: blocks static requires, dynamic imports, obfuscation tricks.
// Works alongside --disallow-code-generation-from-strings, --no-addons, and the
// sandboxed ENV (no DATABASE_URL / secrets). Three independent layers.
// Only block modules that can escape the sandbox or exfiltrate secrets.
// Safe educational modules (readline, path, crypto, os, http, https) are ALLOWED.
const BLOCKED_MODULES = [
  "child_process", "cluster", "worker_threads", "vm",
  "net", "dgram", "dns", "tls", "http2",
  "repl", "inspector", "fs",
];
const MOD_PATTERN = BLOCKED_MODULES.map(m => m.replace("_", "_?")).join("|");

const BLOCKED_NODE_PATTERNS: Array<{ re: RegExp; label: string }> = [
  // CommonJS static require — both bare and node: prefixed forms
  ...BLOCKED_MODULES.flatMap(m => [
    {
      re: new RegExp(`require\\s*\\(\\s*['"\`]${m.replace("_", "_?")}['"\`]\\s*\\)`),
      label: `require('${m}')`,
    },
    {
      re: new RegExp(`require\\s*\\(\\s*['"\`]node:${m.replace("_", "_?")}['"\`]\\s*\\)`),
      label: `require('node:${m}')`,
    },
  ]),
  // String concatenation require bypass (e.g. require('child' + '_process'))
  { re: /require\s*\(\s*['"`][a-z_]+['"`]\s*\+/, label: "require() string concat bypass" },
  // ESM static import
  { re: new RegExp(`from\\s+['"\`](?:node:)?(?:${MOD_PATTERN})['"\`]`), label: "ESM import of blocked module" },
  // Dynamic import() of blocked modules
  { re: new RegExp(`import\\s*\\(\\s*['"\`](?:node:)?(?:${MOD_PATTERN})['"\`]\\s*\\)`), label: "dynamic ESM import of blocked module" },
  // Any dynamic/variable require
  { re: /require\s*\(\s*(?![`'"])/,                       label: "dynamic require()" },
  // process access (env / internal)
  { re: /process\.env/,                                   label: "process.env" },
  { re: /process\.exit\s*\(/,                             label: "process.exit" },
  { re: /process\.kill\s*\(/,                             label: "process.kill" },
  { re: /process\.binding\s*\(/,                          label: "process.binding" },
  { re: /process\.dlopen\s*\(/,                           label: "process.dlopen" },
  { re: /process\.mainModule/,                            label: "process.mainModule" },
  { re: /process\s*\[/,                                   label: "process[] bracket access" },
  // module.require / require.main bypass
  { re: /module\.require\s*\(/,                           label: "module.require bypass" },
  { re: /require\.main/,                                  label: "require.main access" },
  // Sensitive filesystem paths
  { re: /\/etc\/(?:passwd|shadow|hostname|hosts)/,        label: "/etc/*" },
  { re: /\/proc\//,                                       label: "/proc/*" },
  { re: /\/sys\//,                                        label: "/sys/*" },
  { re: /\/var\/run\//,                                   label: "/var/run/*" },
  // Code generation
  { re: /new\s+Function\s*\(/,                            label: "new Function()" },
  { re: /\beval\s*\(/,                                    label: "eval()" },
  { re: /(?:setTimeout|setInterval)\s*\(\s*['"`]/,        label: "timer string injection" },
  // Prototype pollution
  { re: /__proto__/,                                      label: "__proto__ pollution" },
  { re: /constructor\.prototype/,                         label: "constructor.prototype access" },
  // globalThis bypass tricks
  { re: /globalThis\s*\[/,                                label: "globalThis[] access" },
  { re: /globalThis\.__/,                                 label: "globalThis.__" },
  { re: /\bself\s*\[/,                                    label: "self[] bracket access" },
  // Buffer obfuscation (decode hidden code)
  { re: /Buffer\.from\s*\(\s*['"`][A-Za-z0-9+/=]{20,}['"`]\s*,\s*['"`]base64['"`]/,  label: "Buffer base64 decode" },
  { re: /Buffer\.from\s*\(\s*['"`][0-9a-fA-F]{20,}['"`]\s*,\s*['"`]hex['"`]/,        label: "Buffer hex decode" },
  // Function constructor chain
  { re: /\(function\s*\(\)\s*\{[\s\S]{0,30}return\s+(?:this|global)/,                 label: "Function global leak" },
  // Template literal require bypass (e.g. require(`child_${'pro'}cess`))
  { re: /require\s*\(\s*`/,                                                             label: "template literal require()" },
  // Dangerous npm wrappers — packages that shell out, exec or re-export blocked APIs.
  // Blocked statically so `npm install shelljs && require('shelljs')` fails immediately.
  ...["shelljs", "execa", "cross-spawn", "child-process-promise",
      "node-pty", "pty.js", "node-gyp", "prebuild", "nan",
      "fs-extra", "graceful-fs",
      "dotenv", "dotenv-safe", "dotenv-expand",
      "env-var", "env-paths",
      "open", "opener",
      "systeminformation", "node-os-utils",
      "network",
  ].flatMap(pkg => {
    const esc = pkg.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/-/g, "[-_]?");
    return [
      { re: new RegExp(`require\\s*\\(\\s*['"\`]${esc}['"\`]\\s*\\)`), label: `require('${pkg}')` },
      { re: new RegExp(`from\\s+['"\`]${esc}['"\`]`),                   label: `import '${pkg}'` },
      { re: new RegExp(`import\\s*\\(\\s*['"\`]${esc}['"\`]\\s*\\)`),   label: `dynamic import('${pkg}')` },
    ];
  }),
];

function scanNodeCode(code: string): string | null {
  for (const { re, label } of BLOCKED_NODE_PATTERNS) {
    if (re.test(code)) return label;
  }
  return null;
}

// ── Path traversal guard ──────────────────────────────────────────────────────
function safePathInDir(filePath: string, baseDir: string): string | null {
  const clean = filePath.replace(/\0/g, "").replace(/^\/+/, "");
  const resolved = resolvePath(baseDir, clean);
  if (!resolved.startsWith(baseDir + "/") && resolved !== baseDir) return null;
  return resolved;
}

// ── Judge0 integration (for compiled/interpreted languages) ───────────────────
const JUDGE0_LANG_IDS: Record<string, number> = {
  c:          50,
  cpp:        54,
  java:       62,
  go:         60,
  rust:       73,
  ruby:       72,
  php:        68,
  kotlin:     78,
  swift:      83,
  python:     71,
  typescript: 74,
};

interface Judge0Response {
  stdout:         string | null;
  stderr:         string | null;
  compile_output: string | null;
  status:         { id: number; description: string };
  time:           string | null;
  memory:         number | null;
}

async function runOnJudge0(
  code: string, lang: string, stdin = "",
): Promise<{ stdout: string; stderr: string; exitCode: number; durationMs: number; timedOut: boolean; engine: string }> {
  const langId = JUDGE0_LANG_IDS[lang.toLowerCase()];
  if (!langId) throw new Error(`Judge0 لا يدعم اللغة: ${lang}`);

  const rapidApiKey = process.env.RAPIDAPI_KEY;
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  let baseUrl = "https://ce.judge0.com";

  if (rapidApiKey) {
    baseUrl = "https://judge0-ce.p.rapidapi.com";
    headers["X-RapidAPI-Key"] = rapidApiKey;
    headers["X-RapidAPI-Host"] = "judge0-ce.p.rapidapi.com";
  }

  const start = Date.now();

  // Attempt with one automatic retry on network / 5xx failures
  let resp: globalThis.Response | null = null;
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      resp = await fetch(`${baseUrl}/submissions?base64_encoded=false&wait=true`, {
        method: "POST",
        headers,
        body: JSON.stringify({ source_code: code, language_id: langId, stdin }),
        signal: AbortSignal.timeout(25_000),
      });
      if (resp.ok || resp.status < 500) break; // don't retry 4xx
    } catch (e) {
      if (attempt === 1) throw new Error(`تعذّر الاتصال بـ Judge0 — حاول مرة أخرى بعد لحظة`);
      await new Promise<void>(r => setTimeout(r, 1500)); // wait 1.5s then retry
    }
    if (attempt === 0 && resp && !resp.ok) {
      await new Promise<void>(r => setTimeout(r, 1500));
    }
  }

  if (!resp || !resp.ok) {
    throw new Error(`خادم Judge0 مؤقتاً غير متاح (${resp?.status ?? "timeout"}) — جرّب مرة أخرى`);
  }
  const data = await resp.json() as Judge0Response;
  const durationMs = Date.now() - start;

  const compileErr = data.compile_output ? `\n[Compile Output]\n${data.compile_output}` : "";
  const stderr     = (data.stderr ?? "") + compileErr;
  const statusId   = data.status.id;

  // Judge0 status IDs: 3=Accepted, 4=WrongAnswer, 5=TLE, 6=CompErr, 11=RuntimeErr
  return {
    stdout:    data.stdout ?? "",
    stderr:    stderr.trim(),
    exitCode:  statusId === 3 ? 0 : 1,
    durationMs,
    timedOut:  statusId === 5,
    engine:    "Judge0",
  };
}

// ── Language config (Node.js / TypeScript local) ──────────────────────────────
interface LangConfig { ext: string; cmd: string; args: (f: string) => string[] }

// Node.js security flags — reliable across Nix/nvm environments.
// Network isolation handled by: unshare --net (when available) + pattern scanner.
// File system: SANDBOX_ENV strips DATABASE_URL/secrets so no sensitive data leaks.
const NODE_SECURITY_FLAGS = [
  "--max-old-space-size=256",
  "--disallow-code-generation-from-strings",
  "--no-addons",
];

// Use process.execPath so we always find Node regardless of Nix/nvm path
const NODE_BIN = process.execPath;

const LOCAL_LANGUAGES: Record<string, LangConfig> = {
  javascript: { ext: "js", cmd: NODE_BIN, args: f => [...NODE_SECURITY_FLAGS, f] },
  node:       { ext: "js", cmd: NODE_BIN, args: f => [...NODE_SECURITY_FLAGS, f] },
  typescript: { ext: "ts", cmd: NODE_BIN, args: f => [...NODE_SECURITY_FLAGS, "--experimental-strip-types", f] },
};

// Languages that go to Judge0 (includes python for real-library server execution)
const JUDGE0_LANGUAGES = new Set(["c", "cpp", "java", "go", "rust", "ruby", "php", "kotlin", "swift", "python"]);

const MAX_OUTPUT_BYTES = 50 * 1024;
const TIMEOUT_MS       = 8_000;
const MAX_CODE_BYTES   = 64 * 1024;
const MAX_PROJECT_SIZE = 5 * 1024 * 1024;
const MAX_FILES        = 100;

// ── Sandbox mode probe: detect if unshare --net is available ─────────────────
let UNSHARE_AVAILABLE: boolean | null = null;
async function probeUnshare(): Promise<boolean> {
  if (UNSHARE_AVAILABLE !== null) return UNSHARE_AVAILABLE;
  return new Promise(resolve => {
    const p = spawn("unshare", ["--net", "--", "echo", "ok"], { stdio: "ignore" });
    const t = setTimeout(() => { try { p.kill(); } catch {} resolve(false); }, 500);
    p.on("close", code => { clearTimeout(t); UNSHARE_AVAILABLE = code === 0; resolve(UNSHARE_AVAILABLE); });
    p.on("error", () => { clearTimeout(t); UNSHARE_AVAILABLE = false; resolve(false); });
  });
}

// Determine the best execution prefix based on environment capability
async function buildSpawnArgs(cmd: string, args: string[]): Promise<{ cmd: string; args: string[] }> {
  const unshare = await probeUnshare();
  // When using unshare, pass the full absolute cmd path so it's found inside the new namespace
  if (unshare) return { cmd: "unshare", args: ["--net", "--", cmd, ...args] };
  return { cmd, args };
}

// ── Sandboxed execution environment ──────────────────────────────────────────
// Inherit PATH from the current process so Nix-installed binaries are found,
// but strip out sensitive env vars that could leak secrets.

const SANDBOX_ENV = {
  LANG: "en_US.UTF-8",
  HOME: tmpdir(),
  TMPDIR: tmpdir(),
  // Inherit the full Nix PATH so Node.js binary resolves correctly
  PATH: process.env.PATH ?? "/usr/local/bin:/usr/bin:/bin",
  NODE_PATH: "",
  // Required by Nix-wrapped binaries (npx, node, etc.) — unbound = fatal error
  XDG_CONFIG_HOME: join(tmpdir(), ".config"),
  XDG_DATA_HOME: join(tmpdir(), ".local", "share"),
  XDG_CACHE_HOME: join(tmpdir(), ".cache"),
};

// ── Per-user npm sandbox directory ───────────────────────────────────────────
function getUserNpmDir(userId: number): string {
  return join(tmpdir(), `nouvil-npm-${userId}`);
}

// ── Per-user workspace disk quota ─────────────────────────────────────────────
const MAX_WORKSPACE_BYTES = 500 * 1024 * 1024; // 500 MB per user

async function getWorkspaceBytes(dir: string): Promise<number> {
  try {
    const result = await runShellCmd("du", ["-sb", dir], dir, 8_000);
    const m = result.stdout.match(/^(\d+)/);
    return m ? parseInt(m[1], 10) : 0;
  } catch { return 0; }
}

// ── Per-user sandboxed workspace ──────────────────────────────────────────────
// Each user gets an isolated /tmp/nouvil-ws-{userId}/ directory.
// ALL file and shell operations are strictly confined to this directory.
function getUserWorkspace(userId: number): string {
  return join(tmpdir(), `nouvil-ws-${userId}`);
}

// ── Workspace auto-cleanup ────────────────────────────────────────────────────
// Scans /tmp for nouvil-ws-* directories and removes any not accessed in 7 days.
// Prevents unbounded disk accumulation from inactive users.
async function cleanupStaleWorkspaces(): Promise<void> {
  const tmp = tmpdir();
  const cutoffMs = 7 * 24 * 60 * 60 * 1000; // 7 days
  try {
    const { readdir, stat: fsStat, rm } = await import("fs/promises");
    const entries = await readdir(tmp);
    const wsEntries = entries.filter(e => e.startsWith("nouvil-ws-") || e.startsWith("nouvil-npm-"));
    for (const entry of wsEntries) {
      const fullPath = join(tmp, entry);
      try {
        const st = await fsStat(fullPath);
        const ageMs = Date.now() - Math.max(st.mtimeMs, st.atimeMs);
        if (ageMs > cutoffMs) {
          await rm(fullPath, { recursive: true, force: true });
        }
      } catch { /* ignore individual failures */ }
    }
  } catch { /* ignore if /tmp not accessible */ }
}

// Run cleanup every 6 hours; first run after 30s (avoid startup latency)
setTimeout(() => {
  cleanupStaleWorkspaces().catch(() => {});
  setInterval(() => { cleanupStaleWorkspaces().catch(() => {}); }, 6 * 60 * 60 * 1000);
}, 30_000);

/**
 * Resolve `inputPath` (possibly relative) against `cwd`, ensuring the result
 * stays inside `wsRoot`. Returns null if it would escape the workspace.
 */
function resolveInWorkspace(inputPath: string, cwd: string, wsRoot: string): string | null {
  const clean = inputPath.replace(/\0/g, ""); // strip null bytes
  const resolved = resolvePath(cwd, clean);
  if (resolved !== wsRoot && !resolved.startsWith(wsRoot + "/")) return null;
  return resolved;
}

/** Convert absolute workspace path → relative string for client display */
function toRelCwd(absPath: string, wsRoot: string): string {
  if (absPath === wsRoot) return "";
  if (absPath.startsWith(wsRoot + "/")) return absPath.slice(wsRoot.length + 1);
  return "";
}

// ── Shell command runner for /api/ide/shell ───────────────────────────────────
async function runShellCmd(
  cmd: string, args: string[], cwd: string, timeoutMs: number,
): Promise<{ stdout: string; stderr: string; exitCode: number }> {
  return new Promise((resolve) => {
    const env: NodeJS.ProcessEnv = {
      PATH: process.env.PATH ?? "/usr/local/bin:/usr/bin:/bin",
      HOME: tmpdir(),
      TMPDIR: tmpdir(),
      NPM_CONFIG_CACHE: join(tmpdir(), ".npm"),
      NPM_CONFIG_UPDATE_NOTIFIER: "false",
      npm_config_loglevel: "warn",
      LANG: "en_US.UTF-8",
      XDG_CONFIG_HOME: join(tmpdir(), ".config"),
      XDG_DATA_HOME: join(tmpdir(), ".local", "share"),
      XDG_CACHE_HOME: join(tmpdir(), ".cache"),
    };
    const proc = spawn(cmd, args, { cwd, env, shell: false });
    let stdout = "", stderr = "";
    const timer = setTimeout(() => {
      try { proc.kill("SIGKILL"); } catch {}
      resolve({ stdout, stderr: stderr + "\n⏱ انتهت المهلة الزمنية", exitCode: 124 });
    }, timeoutMs);
    proc.stdout?.on("data", (c: Buffer) => { if (stdout.length < 100_000) stdout += c.toString("utf-8"); });
    proc.stderr?.on("data", (c: Buffer) => { if (stderr.length < 20_000) stderr += c.toString("utf-8"); });
    proc.on("close", (code) => { clearTimeout(timer); resolve({ stdout, stderr, exitCode: code ?? 0 }); });
    proc.on("error", (err) => { clearTimeout(timer); resolve({ stdout: "", stderr: `خطأ: ${err.message}`, exitCode: 1 }); });
  });
}

// ── Local sandboxed execution (Node.js / TypeScript) ─────────────────────────
async function runCodeLocal(
  code: string, lang: string, stdin = "", npmDir = "",
): Promise<{ stdout: string; stderr: string; exitCode: number | null; durationMs: number; timedOut: boolean; engine: string }> {
  const config = LOCAL_LANGUAGES[lang.toLowerCase()];
  if (!config) throw new Error(`اللغة غير مدعومة محلياً: ${lang}`);

  const id   = randomBytes(8).toString("hex");
  const file = join(tmpdir(), `ide_${id}.${config.ext}`);
  await writeFile(file, code, "utf-8");

  const spawnTarget = await buildSpawnArgs(config.cmd, config.args(file));
  const start = Date.now();
  const nodeModulesPath = npmDir ? join(npmDir, "node_modules") : "";

  return new Promise((resolve) => {
    let stdout = "", stderr = "", killed = false;

    const proc = spawn(spawnTarget.cmd, spawnTarget.args, {
      cwd: tmpdir(),
      env: { ...SANDBOX_ENV, NODE_PATH: nodeModulesPath },
    });

    // Pipe stdin then close so readline/input() doesn't block forever
    try {
      if (stdin) { proc.stdin.write(stdin + (stdin.endsWith("\n") ? "" : "\n")); }
      proc.stdin.end();
    } catch { /* ignore — stdin may not be writable */ }

    const timer = setTimeout(() => { killed = true; try { proc.kill("SIGKILL"); } catch {} }, TIMEOUT_MS);

    proc.stdout.on("data", (c: Buffer) => { if (stdout.length < MAX_OUTPUT_BYTES) stdout += c.toString("utf-8"); });
    proc.stderr.on("data", (c: Buffer) => { if (stderr.length < MAX_OUTPUT_BYTES) stderr += c.toString("utf-8"); });

    proc.on("close", (exitCode) => {
      clearTimeout(timer);
      unlink(file).catch(() => {});
      resolve({
        stdout, engine: "Node.js",
        stderr: killed ? stderr + "\n⏱ انتهت المهلة الزمنية (8 ثوانٍ)" : stderr,
        exitCode: killed ? null : exitCode,
        durationMs: Date.now() - start,
        timedOut: killed,
      });
    });

    proc.on("error", (err) => {
      clearTimeout(timer);
      unlink(file).catch(() => {});
      resolve({ stdout: "", stderr: `خطأ في التشغيل: ${err.message}`, exitCode: -1, durationMs: Date.now() - start, timedOut: false, engine: "Node.js" });
    });
  });
}

// ── Multi-file local execution ────────────────────────────────────────────────
interface ExtraFile { path: string; content: string }

async function runCodeMultiFileLocal(
  files: ExtraFile[], entryFile: string, lang: string, stdin = "", npmDir = "",
): Promise<{ stdout: string; stderr: string; exitCode: number | null; durationMs: number; timedOut: boolean; engine: string }> {
  const config = LOCAL_LANGUAGES[lang.toLowerCase()];
  if (!config) throw new Error(`اللغة غير مدعومة محلياً: ${lang}`);

  const id  = randomBytes(8).toString("hex");
  const dir = join(tmpdir(), `ide_multi_${id}`);
  await mkdir(dir, { recursive: true });

  for (const { path: filePath, content } of files) {
    const dest = safePathInDir(filePath, dir);
    if (!dest) {
      await rm(dir, { recursive: true, force: true }).catch(() => {});
      throw new Error(`مسار ملف غير آمن: ${filePath}`);
    }
    const parent = dest.substring(0, dest.lastIndexOf("/"));
    if (parent && parent !== dir) await mkdir(parent, { recursive: true });
    await writeFile(dest, content, "utf-8");
  }

  const entryPath = safePathInDir(entryFile, dir);
  if (!entryPath) {
    await rm(dir, { recursive: true, force: true }).catch(() => {});
    throw new Error("مسار ملف الإدخال غير آمن");
  }

  // For multi-file, use the same security flags as single-file execution
  const multiFileArgs = config.ext === "js"
    ? [...NODE_SECURITY_FLAGS, entryPath]
    : [...NODE_SECURITY_FLAGS, "--experimental-strip-types", entryPath];

  const spawnTarget = await buildSpawnArgs(config.cmd, multiFileArgs);

  const start = Date.now();
  return new Promise((resolve) => {
    let stdout = "", stderr = "", killed = false;
    const nodeModulesPath = npmDir ? join(npmDir, "node_modules") : "";
    const nodePath = [dir, nodeModulesPath].filter(Boolean).join(":");
    const proc = spawn(spawnTarget.cmd, spawnTarget.args, {
      cwd: dir,
      env: { ...SANDBOX_ENV, NODE_PATH: nodePath },
    });
    // Pipe stdin then close so readline doesn't block forever
    try {
      if (stdin) { proc.stdin.write(stdin + (stdin.endsWith("\n") ? "" : "\n")); }
      proc.stdin.end();
    } catch { /* ignore */ }
    const timer = setTimeout(() => { killed = true; try { proc.kill("SIGKILL"); } catch {} }, TIMEOUT_MS);
    proc.stdout.on("data", (c: Buffer) => { if (stdout.length < MAX_OUTPUT_BYTES) stdout += c.toString("utf-8"); });
    proc.stderr.on("data", (c: Buffer) => { if (stderr.length < MAX_OUTPUT_BYTES) stderr += c.toString("utf-8"); });
    proc.on("close", (exitCode) => {
      clearTimeout(timer);
      rm(dir, { recursive: true, force: true }).catch(() => {});
      resolve({
        stdout, engine: "Node.js",
        stderr: killed ? stderr + "\n⏱ انتهت المهلة الزمنية (8 ثوانٍ)" : stderr,
        exitCode: killed ? null : exitCode,
        durationMs: Date.now() - start,
        timedOut: killed,
      });
    });
    proc.on("error", (err) => {
      clearTimeout(timer);
      rm(dir, { recursive: true, force: true }).catch(() => {});
      resolve({ stdout: "", stderr: `خطأ: ${err.message}`, exitCode: -1, durationMs: Date.now() - start, timedOut: false, engine: "Node.js" });
    });
  });
}

// ── POST /api/ide/run ─────────────────────────────────────────────────────────
router.post("/ide/run", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const ip     = getIp(req);
  const userId = req.session.userId ?? null;
  const body   = req.body as {
    code?: string; language?: string;
    files?: ExtraFile[]; entryFile?: string; stdin?: string;
  };
  const lang = ((body.language ?? "unknown")).toLowerCase();

  if (!checkRateLimit(ip, userId)) {
    logExecution({ userId, ip, language: lang, status: "rate_limited",
      blockReason: `تجاوز حد ${RATE_LIMIT} طلب / 5 دقائق`, codeSnippet: String(body.code ?? "").slice(0, 300) });
    res.status(429).json({ error: `تجاوزت الحد المسموح به (${RATE_LIMIT} طلب / 5 دقائق). انتظر قليلاً.` });
    return;
  }

  if (!body.language || typeof body.language !== "string") { res.status(400).json({ error: "language مطلوب" }); return; }

  const isJudge0Lang  = JUDGE0_LANGUAGES.has(lang);
  const isLocalLang   = !!LOCAL_LANGUAGES[lang];

  if (!isJudge0Lang && !isLocalLang) {
    logExecution({ userId, ip, language: lang, status: "blocked_pattern",
      blockReason: `لغة غير مدعومة: ${lang}`, codeSnippet: "" });
    res.status(400).json({
      error: `اللغة "${body.language}" غير مدعومة.`,
      supported: [...Object.keys(LOCAL_LANGUAGES), ...Array.from(JUDGE0_LANGUAGES)],
    });
    return;
  }

  // ── Judge0 path (compiled languages) ──────────────────────────────────────
  if (isJudge0Lang) {
    const code = String(body.code ?? "");
    if (!code) { res.status(400).json({ error: "code مطلوب" }); return; }
    if (code.length > MAX_CODE_BYTES) {
      res.status(400).json({ error: `حجم الكود كبير جداً (الحد ${MAX_CODE_BYTES / 1024} KB)` }); return;
    }
    try {
      const result = await withExecutionSlot(() => runOnJudge0(code, lang, String(body.stdin ?? "")));
      logExecution({ userId, ip, language: lang,
        status: result.timedOut ? "timeout" : (result.exitCode === 0 ? "success" : "error"),
        codeSnippet: code.slice(0, 300), durationMs: result.durationMs, exitCode: result.exitCode });
      res.json(result);
    } catch (err) {
      logExecution({ userId, ip, language: lang, status: "error", blockReason: String(err), codeSnippet: String(body.code ?? "").slice(0, 300) });
      res.status(500).json({ error: String(err) });
    }
    return;
  }

  // ── Multi-file local execution ──
  if (Array.isArray(body.files) && body.files.length > 0 && body.entryFile) {
    const totalSize = body.files.reduce((s, f) => s + (f.content?.length ?? 0), 0);
    if (totalSize > MAX_PROJECT_SIZE) {
      res.status(400).json({ error: `حجم المشروع كبير جداً (الحد ${MAX_PROJECT_SIZE / 1024 / 1024} MB)` }); return;
    }
    for (const f of body.files) {
      const blocked = scanNodeCode(String(f.content ?? ""));
      if (blocked) {
        logExecution({ userId, ip, language: lang, status: "blocked_pattern",
          blockReason: `نمط محظور في ${f.path}: ${blocked}`, codeSnippet: String(f.content ?? "").slice(0, 300) });
        res.status(400).json({ error: `كود محجوب في "${f.path}": يحتوي على نمط غير مسموح به (${blocked}).` });
        return;
      }
    }
    try {
      const npmDir = userId ? getUserNpmDir(userId) : "";
      const result = await withExecutionSlot(() => runCodeMultiFileLocal(body.files!, body.entryFile!, lang, String(body.stdin ?? ""), npmDir));
      logExecution({ userId, ip, language: lang,
        status: result.timedOut ? "timeout" : (result.exitCode === 0 ? "success" : "error"),
        codeSnippet: body.entryFile, durationMs: result.durationMs, exitCode: result.exitCode });
      res.json(result);
    } catch (err) {
      logExecution({ userId, ip, language: lang, status: "error", blockReason: String(err) });
      res.status(500).json({ error: String(err) });
    }
    return;
  }

  // ── Single-file local execution ──
  const code = String(body.code ?? "");
  if (!code) { res.status(400).json({ error: "code مطلوب" }); return; }
  if (code.length > MAX_CODE_BYTES) {
    logExecution({ userId, ip, language: lang, status: "blocked_pattern", blockReason: `حجم كبير: ${code.length} bytes` });
    res.status(400).json({ error: `حجم الكود كبير جداً (الحد الأقصى ${MAX_CODE_BYTES / 1024} KB)` });
    return;
  }
  const blockedLabel = scanNodeCode(code);
  if (blockedLabel) {
    logExecution({ userId, ip, language: lang, status: "blocked_pattern",
      blockReason: `نمط محظور: ${blockedLabel}`, codeSnippet: code.slice(0, 300) });
    res.status(400).json({ error: `كود محجوب لأسباب أمنية: يحتوي على نمط غير مسموح به (${blockedLabel}).` });
    return;
  }
  try {
    const npmDir2 = userId ? getUserNpmDir(userId) : "";
    const result = await withExecutionSlot(() => runCodeLocal(code, lang, String(body.stdin ?? ""), npmDir2));
    logExecution({ userId, ip, language: lang,
      status: result.timedOut ? "timeout" : (result.exitCode === 0 ? "success" : "error"),
      codeSnippet: code.slice(0, 300), durationMs: result.durationMs, exitCode: result.exitCode });
    res.json(result);
  } catch (err) {
    logExecution({ userId, ip, language: lang, status: "error", blockReason: String(err), codeSnippet: code.slice(0, 300) });
    res.status(500).json({ error: String(err) });
  }
});

// ── POST /api/ide/shell — interactive sandboxed terminal ──────────────────────

// Package name: allows @scope/name and optional @version specifier
const PKG_RE = /^(@[a-z0-9][\w.-]*\/)?[a-z0-9][\w.\-]{0,213}(@[\w.\-^~>=<*]+)?$/i;
// Script name for npm run <script>
const SCRIPT_NAME_RE = /^[a-z0-9][a-z0-9:_.-]{0,50}$/i;

const ALLOWED_NPM_SUBS = new Set([
  "install", "i", "ci",
  "uninstall", "remove", "rm", "un", "r",
  "list", "ls",
  "init",
  "run", "run-script",
  "test", "build",
  "outdated", "audit",
]);

// npx packages whose names suggest shell/system access — blocked as defence-in-depth
const BLOCKED_NPX = new Set([
  "shelljs", "execa", "cross-spawn", "node-pty", "pty.js",
  "forever", "pm2", "nodemon",
  "ngrok", "localtunnel", "expose",
  "dotenv-cli", "env-cmd",
]);

// ── Network & dangerous command blocklist ─────────────────────────────────────
// Explicit reject list for commands that could exfiltrate data, spawn shells,
// or escalate privileges. Most would hit "command not found" anyway since we
// only allow a whitelist, but we give clear, user-facing error messages.
const BLOCKED_NETWORK_CMDS = new Set([
  // Network tools
  "curl", "wget", "nc", "netcat", "ncat", "nmap", "socat",
  "ssh", "scp", "sftp", "ftp", "tftp", "rsync", "rcp",
  "telnet", "openssl",
  // Recon / DNS
  "ping", "ping6", "traceroute", "tracepath", "mtr",
  "dig", "host", "nslookup", "whois", "arping",
  // Packet capture
  "tcpdump", "tshark", "wireshark",
  // Network config (could reveal internal addresses)
  "ifconfig", "ip", "netstat", "ss", "arp", "route", "iwconfig",
  // Shell spawning — could be used to bypass the command whitelist
  "bash", "sh", "zsh", "fish", "dash", "csh", "ksh", "tcsh",
  // General script runtimes with network APIs (users should use the code editor)
  "python", "python3", "python2", "perl", "ruby", "php",
  // Privilege escalation
  "sudo", "su", "doas", "pkexec", "runuser",
  // VCS (could pull malicious code or push secrets)
  "git", "svn", "hg",
  // Container / orchestration (could escape sandbox)
  "docker", "podman", "kubectl", "helm",
  // Service management
  "systemctl", "service", "init",
  // Background task schedulers
  "crontab", "at", "nohup",
  // Process control (could kill server processes)
  "kill", "killall", "pkill",
  // Dangerous disk / user operations
  "dd", "mkfs", "fdisk", "parted",
  "useradd", "userdel", "passwd", "groupadd",
  "chmod", "chown", "chgrp",
]);

/**
 * Wrap a spawn call with `nice -n 19` (lowest CPU priority).
 * Prevents a single user's process from starving the server under load.
 */
function niceSpawn(cmd: string, args: string[]): { cmd: string; args: string[] } {
  return { cmd: "nice", args: ["-n", "19", "--", cmd, ...args] };
}

/**
 * Spawn a process that is:
 *  1. Network-isolated via `unshare --net` (when the kernel supports it)
 *  2. CPU-deprioritized via `nice -n 19`
 *
 * Used for `npm run`, `npm build`, `npm test` — user's scripts that should NOT
 * need internet access. `npm install` and `npx` are excluded because they
 * legitimately need the npm registry.
 */
async function spawnNetIsolated(
  cmd: string,
  args: string[],
  options: { cwd: string; env: NodeJS.ProcessEnv; timeoutMs: number },
): Promise<{ stdout: string; stderr: string; exitCode: number }> {
  const unshare = await probeUnshare();
  let spawnCmd: string;
  let spawnArgs: string[];

  if (unshare) {
    // Full isolation: network namespace + low CPU priority
    spawnCmd = "unshare";
    spawnArgs = ["--net", "--", "nice", "-n", "19", "--", cmd, ...args];
  } else {
    // Fallback: CPU deprioritization only (unshare not available in this env)
    spawnCmd = "nice";
    spawnArgs = ["-n", "19", "--", cmd, ...args];
  }

  return new Promise((resolve) => {
    const proc = spawn(spawnCmd, spawnArgs, { cwd: options.cwd, env: options.env, shell: false });
    let stdout = "", stderr = "";
    const timer = setTimeout(() => {
      try { proc.kill("SIGKILL"); } catch {}
      resolve({ stdout, stderr: stderr + "\n⏱ انتهت المهلة الزمنية", exitCode: 124 });
    }, options.timeoutMs);
    proc.stdout?.on("data", (c: Buffer) => { if (stdout.length < 200_000) stdout += c.toString("utf-8"); });
    proc.stderr?.on("data", (c: Buffer) => { if (stderr.length < 50_000) stderr += c.toString("utf-8"); });
    proc.on("close", (code) => { clearTimeout(timer); resolve({ stdout, stderr, exitCode: code ?? 0 }); });
    proc.on("error", (err) => { clearTimeout(timer); resolve({ stdout: "", stderr: `خطأ: ${err.message}`, exitCode: 1 }); });
  });
}

// Absolute paths that must never be accessible from the user's workspace
const FORBIDDEN_PATH_PREFIXES = [
  "/home/runner/workspace",
  "/home/runner/.config",
  "/etc/",
  "/proc/",
  "/sys/",
  "/var/run",
  "/root",
  "/boot",
];

function isForbiddenPath(p: string): boolean {
  return FORBIDDEN_PATH_PREFIXES.some(pfx => p === pfx || p.startsWith(pfx + "/"));
}

const SHELL_HELP = [
  "╔══════════════════════════════════════════════════════╗",
  "║          Nouvil Cloud Terminal — الأوامر المتاحة     ║",
  "╚══════════════════════════════════════════════════════╝",
  "",
  "📁 إدارة الملفات والمجلدات:",
  "  ls [-la] [path]          عرض محتوى المجلد",
  "  cd <dir>                 الانتقال إلى مجلد",
  "  pwd                      المسار الحالي",
  "  mkdir [-p] <dir>         إنشاء مجلد",
  "  rm [-rf] <path>          حذف ملف أو مجلد",
  "  touch <file>             إنشاء ملف فارغ",
  "  cat <file>               عرض محتوى ملف",
  "  cp <src> <dest>          نسخ ملف",
  "  mv <src> <dest>          نقل/إعادة تسمية",
  "",
  "📦 إدارة الحزم (npm):",
  "  npm install <pkg>        تثبيت حزمة",
  "  npm install              تثبيت من package.json",
  "  npm uninstall <pkg>      حذف حزمة",
  "  npm list                 عرض الحزم المثبتة",
  "  npm init -y              إنشاء package.json",
  "  npm run <script>         تشغيل سكريبت",
  "  npm test / npm build     اختبار / بناء المشروع",
  "",
  "🚀 إنشاء مشاريع (npx):",
  "  npx create-react-app my-app      مشروع React",
  "  npx create-vite my-app           مشروع Vite",
  "  npx create-next-app my-app       مشروع Next.js",
  "  npx express-generator my-api     مشروع Express",
  "  npx @nestjs/cli new my-app       مشروع NestJS",
  "",
  "⚙️  معلومات:",
  "  node --version           إصدار Node.js",
  "  npm --version            إصدار npm",
  "  python3 --version        معلومات Python",
  "  echo <text>              طباعة نص",
  "  clear                    مسح الشاشة",
  "",
  "⚠️  ملاحظة: البيئة معزولة — لا يمكن الوصول لملفات الموقع.",
].join("\n");

router.post("/ide/shell", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const userId = req.session.userId!;
  const { command, cwd: clientCwd } = req.body as { command?: string; cwd?: string };
  if (!command || typeof command !== "string") { res.status(400).json({ error: "command مطلوب" }); return; }

  const cmd = command.trim();
  if (!cmd) { res.json({ stdout: "", stderr: "", exitCode: 0 }); return; }

  // ── DoS protection: per-user shell rate limit ─────────────────────────────
  // 20 shell commands per 5 minutes per user — prevents command flooding.
  if (!checkShellRateLimit(userId)) {
    res.status(429).json({
      error: "تجاوزت الحد المسموح (20 أمر كل 5 دقائق). انتظر قليلاً ثم حاول مرة أخرى.",
    });
    return;
  }

  // ── DoS protection: per-user concurrency limit ────────────────────────────
  // Max 2 simultaneous heavy shell commands per user.
  if (!acquireUserShellSlot(userId)) {
    res.status(429).json({
      error: "لديك أمر قيد التنفيذ بالفعل. انتظر حتى ينتهي قبل إرسال أمر جديد.",
    });
    return;
  }

  try {

  // ── Set up user workspace ─────────────────────────────────────────────────
  const wsRoot = getUserWorkspace(userId);
  await mkdir(wsRoot, { recursive: true });

  // Resolve client's cwd (relative) → absolute, validated within wsRoot
  const rawCwd = typeof clientCwd === "string" ? clientCwd.replace(/\0/g, "") : "";
  let absCwd = rawCwd ? resolvePath(wsRoot, rawCwd) : wsRoot;
  // Security: if resolved cwd somehow escapes workspace, reset to root
  if (absCwd !== wsRoot && !absCwd.startsWith(wsRoot + "/")) absCwd = wsRoot;
  // Extra: block access to forbidden paths
  if (isForbiddenPath(absCwd)) absCwd = wsRoot;

  const parts = cmd.split(/\s+/);
  const first = parts[0].toLowerCase();

  // ── Network & dangerous command blocklist ─────────────────────────────────
  // Explicit rejection with a clear error message. These commands would also
  // be caught by the whitelist below, but we give specific feedback here.
  if (BLOCKED_NETWORK_CMDS.has(first)) {
    res.json({
      stdout: "",
      stderr: `${first}: محظور — أوامر الشبكة والـ shell المباشرة غير مسموح بها في البيئة المعزولة.\nاكتب "help" لعرض الأوامر المتاحة.\n`,
      exitCode: 1,
    });
    return;
  }

  // ── clear ─────────────────────────────────────────────────────────────────
  if (cmd === "clear" || cmd === "cls") {
    res.json({ stdout: "", stderr: "", exitCode: 0, action: "clear" });
    return;
  }

  // ── help ──────────────────────────────────────────────────────────────────
  if (cmd === "help" || cmd === "--help" || cmd === "-h") {
    res.json({ stdout: SHELL_HELP + "\n", stderr: "", exitCode: 0 });
    return;
  }

  // ── pwd ───────────────────────────────────────────────────────────────────
  if (cmd === "pwd") {
    const display = toRelCwd(absCwd, wsRoot);
    res.json({ stdout: (display ? `~/${display}` : "~") + "\n", stderr: "", exitCode: 0 });
    return;
  }

  // ── echo ──────────────────────────────────────────────────────────────────
  if (first === "echo") {
    res.json({ stdout: parts.slice(1).join(" ") + "\n", stderr: "", exitCode: 0 });
    return;
  }

  // ── cd ────────────────────────────────────────────────────────────────────
  if (first === "cd") {
    const target = parts[1];
    let newAbs: string;
    if (!target || target === "~" || target === "/") {
      newAbs = wsRoot;
    } else if (target === "-") {
      res.json({ stdout: "", stderr: "cd -: غير مدعوم\n", exitCode: 1 });
      return;
    } else {
      const resolved = resolveInWorkspace(target, absCwd, wsRoot);
      if (!resolved) {
        res.json({ stdout: "", stderr: `cd: ${target}: خارج نطاق مساحة العمل\n`, exitCode: 1 });
        return;
      }
      if (isForbiddenPath(resolved)) {
        res.json({ stdout: "", stderr: `cd: ${target}: مسار محظور\n`, exitCode: 1 });
        return;
      }
      // Check the directory exists
      try {
        const st = await stat(resolved);
        if (!st.isDirectory()) {
          res.json({ stdout: "", stderr: `cd: ${target}: ليس مجلداً\n`, exitCode: 1 });
          return;
        }
      } catch {
        res.json({ stdout: "", stderr: `cd: ${target}: لا يوجد مجلد بهذا الاسم\n`, exitCode: 1 });
        return;
      }
      newAbs = resolved;
    }
    const newRel = toRelCwd(newAbs, wsRoot);
    res.json({ stdout: "", stderr: "", exitCode: 0, cwd: newRel });
    return;
  }

  // ── ls ────────────────────────────────────────────────────────────────────
  if (first === "ls") {
    const flags: string[] = [];
    const nonFlags: string[] = [];
    for (const p of parts.slice(1)) {
      if (p.startsWith("-")) flags.push(p); else nonFlags.push(p);
    }
    const targetRaw = nonFlags[0] ?? ".";
    const targetAbs = resolveInWorkspace(targetRaw, absCwd, wsRoot);
    if (!targetAbs || isForbiddenPath(targetAbs)) {
      res.json({ stdout: "", stderr: `ls: ${targetRaw}: مسار غير مسموح\n`, exitCode: 1 });
      return;
    }
    try {
      await mkdir(targetAbs, { recursive: true });
    } catch { /* already exists */ }
    const args = ["--color=never", ...flags, targetAbs];
    const r = await runShellCmd("ls", args, absCwd, 8_000);
    res.json(r); return;
  }

  // ── mkdir ─────────────────────────────────────────────────────────────────
  if (first === "mkdir") {
    const flags: string[] = [];
    const dirs: string[] = [];
    for (const p of parts.slice(1)) {
      if (p.startsWith("-")) flags.push(p); else dirs.push(p);
    }
    if (dirs.length === 0) {
      res.json({ stdout: "", stderr: "mkdir: اسم المجلد مطلوب\n", exitCode: 1 });
      return;
    }
    let lastErr = "";
    for (const d of dirs) {
      const abs = resolveInWorkspace(d, absCwd, wsRoot);
      if (!abs || isForbiddenPath(abs)) { lastErr = `mkdir: ${d}: مسار غير مسموح`; continue; }
      try { await mkdir(abs, { recursive: true }); }
      catch (e) { lastErr = `mkdir: ${d}: ${String(e)}`; }
    }
    res.json({ stdout: "", stderr: lastErr ? lastErr + "\n" : "", exitCode: lastErr ? 1 : 0 });
    return;
  }

  // ── touch ─────────────────────────────────────────────────────────────────
  if (first === "touch") {
    const files = parts.slice(1).filter(p => !p.startsWith("-"));
    if (files.length === 0) {
      res.json({ stdout: "", stderr: "touch: اسم الملف مطلوب\n", exitCode: 1 });
      return;
    }
    let lastErr = "";
    for (const f of files) {
      const abs = resolveInWorkspace(f, absCwd, wsRoot);
      if (!abs || isForbiddenPath(abs)) { lastErr = `touch: ${f}: مسار غير مسموح`; continue; }
      try {
        const parentDir = abs.substring(0, abs.lastIndexOf("/"));
        if (parentDir) await mkdir(parentDir, { recursive: true });
        try { await stat(abs); } catch { await writeFile(abs, "", { flag: "a" }); }
      } catch (e) { lastErr = `touch: ${f}: ${String(e)}`; }
    }
    res.json({ stdout: "", stderr: lastErr ? lastErr + "\n" : "", exitCode: lastErr ? 1 : 0 });
    return;
  }

  // ── cat ───────────────────────────────────────────────────────────────────
  if (first === "cat") {
    const files = parts.slice(1).filter(p => !p.startsWith("-"));
    if (files.length === 0) {
      res.json({ stdout: "", stderr: "cat: اسم الملف مطلوب\n", exitCode: 1 });
      return;
    }
    const MAX_CAT = 100 * 1024; // 100 KB
    let out = "";
    let lastErr = "";
    for (const f of files) {
      const abs = resolveInWorkspace(f, absCwd, wsRoot);
      if (!abs || isForbiddenPath(abs)) { lastErr = `cat: ${f}: مسار غير مسموح`; continue; }
      try {
        const buf = await readFile(abs);
        if (buf.length > MAX_CAT) { out += `[الملف كبير جداً — ${buf.length} bytes]\n`; continue; }
        out += buf.toString("utf-8");
      } catch { lastErr = `cat: ${f}: الملف غير موجود أو لا يمكن قراءته`; }
    }
    res.json({ stdout: out, stderr: lastErr ? lastErr + "\n" : "", exitCode: lastErr ? 1 : 0 });
    return;
  }

  // ── rm ────────────────────────────────────────────────────────────────────
  if (first === "rm") {
    const flags: string[] = [];
    const targets: string[] = [];
    for (const p of parts.slice(1)) {
      if (p.startsWith("-")) flags.push(p); else targets.push(p);
    }
    if (targets.length === 0) {
      res.json({ stdout: "", stderr: "rm: هدف الحذف مطلوب\n", exitCode: 1 });
      return;
    }
    // Only allow -r, -f, -rf, -fr flags
    const allowedRmFlags = new Set(["-r", "-f", "-rf", "-fr", "-R", "-rF", "-Rf"]);
    for (const fl of flags) {
      if (!allowedRmFlags.has(fl)) {
        res.json({ stdout: "", stderr: `rm: الخيار ${fl} غير مسموح\n`, exitCode: 1 });
        return;
      }
    }
    const recursive = flags.some(f => f.includes("r") || f.includes("R"));
    let lastErr = "";
    for (const t of targets) {
      const abs = resolveInWorkspace(t, absCwd, wsRoot);
      if (!abs || isForbiddenPath(abs)) { lastErr = `rm: ${t}: مسار غير مسموح`; continue; }
      // Block removing workspace root itself
      if (abs === wsRoot) { lastErr = `rm: لا يمكن حذف مجلد العمل الرئيسي`; continue; }
      try {
        if (recursive) {
          await rm(abs, { recursive: true, force: true });
        } else {
          await unlink(abs);
        }
      } catch (e) { lastErr = `rm: ${t}: ${String(e)}`; }
    }
    res.json({ stdout: "", stderr: lastErr ? lastErr + "\n" : "", exitCode: lastErr ? 1 : 0 });
    return;
  }

  // ── cp ────────────────────────────────────────────────────────────────────
  if (first === "cp") {
    const nonFlagParts = parts.slice(1).filter(p => !p.startsWith("-"));
    if (nonFlagParts.length < 2) {
      res.json({ stdout: "", stderr: "cp: المصدر والهدف مطلوبان\n", exitCode: 1 });
      return;
    }
    const [srcRaw, destRaw] = nonFlagParts;
    const srcAbs  = resolveInWorkspace(srcRaw, absCwd, wsRoot);
    const destAbs = resolveInWorkspace(destRaw, absCwd, wsRoot);
    if (!srcAbs || !destAbs || isForbiddenPath(srcAbs) || isForbiddenPath(destAbs)) {
      res.json({ stdout: "", stderr: "cp: مسار غير مسموح\n", exitCode: 1 });
      return;
    }
    const hasR = parts.some(p => p === "-r" || p === "-R" || p === "-rf" || p === "-rp");
    const r = await runShellCmd("cp", hasR ? ["-r", srcAbs, destAbs] : [srcAbs, destAbs], absCwd, 10_000);
    res.json(r); return;
  }

  // ── mv ────────────────────────────────────────────────────────────────────
  if (first === "mv") {
    const nonFlagParts = parts.slice(1).filter(p => !p.startsWith("-"));
    if (nonFlagParts.length < 2) {
      res.json({ stdout: "", stderr: "mv: المصدر والهدف مطلوبان\n", exitCode: 1 });
      return;
    }
    const [srcRaw, destRaw] = nonFlagParts;
    const srcAbs  = resolveInWorkspace(srcRaw, absCwd, wsRoot);
    const destAbs = resolveInWorkspace(destRaw, absCwd, wsRoot);
    if (!srcAbs || !destAbs || isForbiddenPath(srcAbs) || isForbiddenPath(destAbs)) {
      res.json({ stdout: "", stderr: "mv: مسار غير مسموح\n", exitCode: 1 });
      return;
    }
    const r = await runShellCmd("mv", [srcAbs, destAbs], absCwd, 10_000);
    res.json(r); return;
  }

  // ── python / pip info ─────────────────────────────────────────────────────
  if (/^python3?\s+(--version|-V)$/.test(cmd)) {
    res.json({ stdout: "Python 3.12 (Pyodide — WASM في المتصفح)\n", stderr: "", exitCode: 0 });
    return;
  }
  if (/^pip3?\s+install\b/.test(cmd)) {
    const pkg = parts.slice(2).find(p => !p.startsWith("-")) ?? "الحزمة";
    res.json({
      stdout: [
        `💡 Python في البيئة يعمل عبر Pyodide (WASM) في المتصفح.`,
        `لا تحتاج pip install! فقط اكتب في كودك: import ${pkg}`,
        `وستُحمَّل الحزمة تلقائياً عند الضغط على ▶ تشغيل.`,
        `الحزم المدعومة: numpy, pandas, matplotlib, scipy, sympy, PIL, scikit-learn, وأكثر.`,
      ].join("\n") + "\n",
      stderr: "", exitCode: 0,
    });
    return;
  }

  // ── node --version ────────────────────────────────────────────────────────
  if (cmd === "node --version" || cmd === "node -v") {
    const r = await runShellCmd(NODE_BIN, ["--version"], absCwd, 5_000);
    res.json(r); return;
  }

  // ── npm --version ─────────────────────────────────────────────────────────
  if (cmd === "npm --version" || cmd === "npm -v") {
    const r = await runShellCmd("npm", ["--version"], absCwd, 5_000);
    res.json(r); return;
  }

  // ── npx ───────────────────────────────────────────────────────────────────
  if (first === "npx") {
    if (parts.length < 2) {
      res.json({ stdout: "", stderr: "npx: اسم الحزمة مطلوب\n", exitCode: 1 });
      return;
    }

    // Extract package name (may have @version like create-react-app@latest or @scope/pkg)
    let pkgSpec = parts[1];
    // Handle --yes / -y flag that might precede the package name
    let argStart = 2;
    if (pkgSpec === "--yes" || pkgSpec === "-y") {
      pkgSpec = parts[2]; argStart = 3;
    }
    if (!pkgSpec) {
      res.json({ stdout: "", stderr: "npx: اسم الحزمة مطلوب\n", exitCode: 1 });
      return;
    }

    // Validate package name (strip @version suffix for the blocklist check)
    const basePkg = pkgSpec.replace(/@[^/][^@]*$/, "").toLowerCase();
    if (!PKG_RE.test(pkgSpec)) {
      res.json({ stdout: "", stderr: `npx: اسم حزمة غير صالح: ${pkgSpec}\n`, exitCode: 1 });
      return;
    }
    if (BLOCKED_NPX.has(basePkg)) {
      res.json({ stdout: "", stderr: `npx: ${pkgSpec}: هذه الحزمة محظورة في بيئة التطوير.\n`, exitCode: 1 });
      return;
    }

    // Extra args after the package name (e.g. project name for create-react-app)
    const extraArgs = parts.slice(argStart);
    // Validate extra args: must not contain shell metacharacters or path traversal
    const SAFE_ARG_RE = /^[a-z0-9@._\-/=:,]+$/i;
    for (const arg of extraArgs) {
      if (!SAFE_ARG_RE.test(arg)) {
        res.json({ stdout: "", stderr: `npx: وسيط غير صالح: ${arg}\n`, exitCode: 1 });
        return;
      }
    }

    try {
      await mkdir(absCwd, { recursive: true });
      // Long timeout for project scaffolding (create-react-app can take 3-4 min)
      const isScaffold = /^create-/.test(basePkg) || basePkg.includes("/cli");
      const timeoutMs = isScaffold ? 360_000 : 120_000;

      const env: NodeJS.ProcessEnv = {
        PATH: process.env.PATH ?? "/usr/local/bin:/usr/bin:/bin",
        HOME: wsRoot,
        TMPDIR: tmpdir(),
        NPM_CONFIG_CACHE: join(tmpdir(), `.npm-${userId}`),
        NPM_CONFIG_UPDATE_NOTIFIER: "false",
        npm_config_loglevel: "warn",
        LANG: "en_US.UTF-8",
        CI: "true", // suppress interactive prompts in many CLIs
        // Required by Nix-wrapped binaries (npx, node, etc.) — unbound = fatal error
        XDG_CONFIG_HOME: join(wsRoot, ".config"),
        XDG_DATA_HOME: join(wsRoot, ".local", "share"),
        XDG_CACHE_HOME: join(wsRoot, ".cache"),
        // No DATABASE_URL, no RAPIDAPI_KEY, no secrets
      };

      // Use nice -n 19 to deprioritize CPU (npx keeps network for package download)
      const { cmd: npxCmd, args: npxArgs } = niceSpawn("npx", ["--yes", pkgSpec, ...extraArgs]);
      const result = await new Promise<{ stdout: string; stderr: string; exitCode: number }>((resolve) => {
        const proc = spawn(npxCmd, npxArgs, { cwd: absCwd, env, shell: false });
        let stdout = "", stderr = "";
        const timer = setTimeout(() => {
          try { proc.kill("SIGKILL"); } catch {}
          resolve({ stdout, stderr: stderr + "\n⏱ انتهت المهلة الزمنية", exitCode: 124 });
        }, timeoutMs);
        proc.stdout?.on("data", (c: Buffer) => { if (stdout.length < 200_000) stdout += c.toString("utf-8"); });
        proc.stderr?.on("data", (c: Buffer) => { if (stderr.length < 50_000) stderr += c.toString("utf-8"); });
        proc.on("close", (code) => { clearTimeout(timer); resolve({ stdout, stderr, exitCode: code ?? 0 }); });
        proc.on("error", (err) => { clearTimeout(timer); resolve({ stdout: "", stderr: `خطأ: ${err.message}`, exitCode: 1 }); });
      });

      res.json(result);
    } catch (err) {
      res.status(500).json({ error: String(err) });
    }
    return;
  }

  // ── npm commands ──────────────────────────────────────────────────────────
  if (first === "npm") {
    const sub = (parts[1] ?? "").toLowerCase();

    if (!ALLOWED_NPM_SUBS.has(sub)) {
      res.json({ stdout: "", stderr: `npm ${sub}: غير مدعوم.\nالأوامر المتاحة: ${[...ALLOWED_NPM_SUBS].join(", ")}\n`, exitCode: 1 });
      return;
    }

    // Validate package names for install/uninstall
    if (["install", "i", "ci", "uninstall", "remove", "rm", "un", "r"].includes(sub)) {
      const pkgArgs = parts.slice(2).filter(p => !p.startsWith("-"));
      for (const p of pkgArgs) {
        if (!PKG_RE.test(p)) {
          res.json({ stdout: "", stderr: `npm: اسم حزمة غير صالح: ${p}\n`, exitCode: 1 });
          return;
        }
      }
    }

    // Validate script name for npm run
    if (sub === "run" || sub === "run-script") {
      const scriptName = parts[2];
      if (scriptName && !SCRIPT_NAME_RE.test(scriptName)) {
        res.json({ stdout: "", stderr: `npm run: اسم سكريبت غير صالح: ${scriptName}\n`, exitCode: 1 });
        return;
      }
    }

    try {
      await mkdir(absCwd, { recursive: true });

      // ── Disk quota guard — block installs that would exceed 500 MB ──────────
      if (["install", "i", "ci"].includes(sub)) {
        const wsBytes = await getWorkspaceBytes(wsRoot);
        if (wsBytes > MAX_WORKSPACE_BYTES) {
          res.json({
            stdout: "",
            stderr: [
              `⚠ تجاوزت مساحة العمل الحد المسموح به (${Math.round(wsBytes / 1024 / 1024)} MB / 500 MB).`,
              `احذف حزماً غير ضرورية أولاً:`,
              `  rm -rf node_modules`,
              `  npm uninstall <pkg>`,
            ].join("\n") + "\n",
            exitCode: 1,
          });
          return;
        }
      }

      const env: NodeJS.ProcessEnv = {
        PATH: process.env.PATH ?? "/usr/local/bin:/usr/bin:/bin",
        HOME: wsRoot,
        TMPDIR: tmpdir(),
        NPM_CONFIG_CACHE: join(tmpdir(), `.npm-${userId}`),
        NPM_CONFIG_UPDATE_NOTIFIER: "false",
        npm_config_loglevel: "warn",
        LANG: "en_US.UTF-8",
        XDG_CONFIG_HOME: join(wsRoot, ".config"),
        XDG_DATA_HOME: join(wsRoot, ".local", "share"),
        XDG_CACHE_HOME: join(wsRoot, ".cache"),
        // No secrets
      };

      let npmArgs: string[];
      let timeoutMs: number;
      // Scripts that run the user's own code should NOT access the network.
      // npm install / ci / outdated / audit legitimately need the npm registry.
      let needsNetIsolation = false;

      if (sub === "list" || sub === "ls") {
        npmArgs = ["list", "--depth=0", ...parts.slice(2)];
        timeoutMs = 15_000;
      } else if (sub === "init") {
        npmArgs = ["init", "-y", ...parts.slice(2).filter(p => p !== "-y")];
        timeoutMs = 15_000;
      } else if (sub === "install" || sub === "i" || sub === "ci") {
        // Needs network to download packages — no network isolation, but nice.
        // --ignore-scripts prevents malicious postinstall/preinstall scripts from
        // executing arbitrary code during package installation.
        npmArgs = [sub, "--no-fund", "--no-audit", "--ignore-scripts", ...parts.slice(2)];
        timeoutMs = 300_000;
      } else if (sub === "uninstall" || sub === "remove" || sub === "rm" || sub === "un" || sub === "r") {
        npmArgs = [sub, "--no-fund", "--no-audit", "--ignore-scripts", ...parts.slice(2)];
        timeoutMs = 30_000;
      } else if (sub === "run" || sub === "run-script") {
        npmArgs = ["run", ...parts.slice(2)];
        timeoutMs = 300_000;
        needsNetIsolation = true;  // user's script — should NOT need internet
      } else if (sub === "build") {
        npmArgs = ["run", "build"];
        timeoutMs = 300_000;
        needsNetIsolation = true;  // build scripts — no internet needed
      } else if (sub === "test") {
        npmArgs = ["test", "--", ...parts.slice(2)];
        timeoutMs = 120_000;
        needsNetIsolation = true;  // test scripts — no internet needed
      } else {
        npmArgs = [sub, "--no-fund", "--no-audit", ...parts.slice(2)];
        timeoutMs = 60_000;
      }

      let result: { stdout: string; stderr: string; exitCode: number };
      if (needsNetIsolation) {
        // spawnNetIsolated: network-blocked (unshare --net) + CPU-deprioritized (nice -n 19)
        result = await spawnNetIsolated("npm", npmArgs, { cwd: absCwd, env, timeoutMs });
      } else {
        // Network allowed (for npm install etc.) but still CPU-deprioritized
        const { cmd: nmCmd, args: nmArgs } = niceSpawn("npm", npmArgs);
        result = await new Promise((resolve) => {
          const proc = spawn(nmCmd, nmArgs, { cwd: absCwd, env, shell: false });
          let stdout = "", stderr = "";
          const timer = setTimeout(() => {
            try { proc.kill("SIGKILL"); } catch {}
            resolve({ stdout, stderr: stderr + "\n⏱ انتهت المهلة الزمنية", exitCode: 124 });
          }, timeoutMs);
          proc.stdout?.on("data", (c: Buffer) => { if (stdout.length < 200_000) stdout += c.toString("utf-8"); });
          proc.stderr?.on("data", (c: Buffer) => { if (stderr.length < 50_000) stderr += c.toString("utf-8"); });
          proc.on("close", (code) => { clearTimeout(timer); resolve({ stdout, stderr, exitCode: code ?? 0 }); });
          proc.on("error", (err) => { clearTimeout(timer); resolve({ stdout: "", stderr: `خطأ: ${err.message}`, exitCode: 1 }); });
        });
      }

      res.json(result);
    } catch (err) {
      res.status(500).json({ error: String(err) });
    }
    return;
  }

  // ── unknown command ───────────────────────────────────────────────────────
  res.json({
    stdout: "",
    stderr: `command not found: ${first}\nاكتب "help" لعرض جميع الأوامر المتاحة.\n`,
    exitCode: 127,
  });

  } finally {
    releaseUserShellSlot(userId);
  }
});

// ── GET /api/ide/supported-languages ─────────────────────────────────────────
router.get("/ide/supported-languages", (_req: Request, res: Response): void => {
  res.json({
    local:  Object.keys(LOCAL_LANGUAGES),
    judge0: Array.from(JUDGE0_LANGUAGES),
  });
});

// ── GET /api/ide/project — load workspace ────────────────────────────────────
router.get("/ide/project", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const userId = req.session.userId!;
  const { blockId } = req.query;
  if (!blockId || typeof blockId !== "string") { res.status(400).json({ error: "blockId مطلوب" }); return; }
  const [project] = await db.select().from(ideProjectsTable)
    .where(and(eq(ideProjectsTable.userId, userId), eq(ideProjectsTable.blockId, blockId)));
  res.json(project ?? null);
});

// ── POST /api/ide/project — save workspace ────────────────────────────────────
router.post("/ide/project", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const userId = req.session.userId!;
  const { blockId, files } = req.body as { blockId?: string; files?: unknown[] };
  if (!blockId || !Array.isArray(files)) { res.status(400).json({ error: "blockId و files مطلوبان" }); return; }
  if (files.length > MAX_FILES) { res.status(400).json({ error: `عدد الملفات كبير جداً (الحد الأقصى ${MAX_FILES} ملف)` }); return; }
  if (JSON.stringify(files).length > MAX_PROJECT_SIZE) { res.status(400).json({ error: "حجم المشروع كبير جداً (الحد الأقصى 5 MB)" }); return; }
  await db.execute(sql`
    INSERT INTO ide_projects (user_id, block_id, files, updated_at)
    VALUES (${userId}, ${blockId}, ${JSON.stringify(files)}::jsonb, NOW())
    ON CONFLICT (user_id, block_id)
    DO UPDATE SET files = EXCLUDED.files, updated_at = NOW()
  `);
  res.json({ ok: true });
});

// ── GET /api/ide/workspace-tree — read user's filesystem workspace ────────────
const WS_SKIP_DIRS = new Set([
  "node_modules", ".git", "dist", "build", ".next", "__pycache__",
  ".cache", ".npm", "coverage", ".nyc_output", ".parcel-cache", ".turbo",
]);
const WS_MAX_NODES  = 300;
const WS_MAX_FILE_BYTES = 500 * 1024; // 500 KB per file
const WS_MAX_TOTAL_BYTES = 10 * 1024 * 1024; // 10 MB total read

interface WsFileNode {
  id: string; name: string; type: "file" | "folder";
  content: string; parentId: string | null; isOpen: boolean;
}

async function readWorkspaceTree(
  dirPath: string, parentId: string,
  allNodes: WsFileNode[],
  counters: { nodes: number; totalBytes: number },
  depth: number,
): Promise<void> {
  if (counters.nodes >= WS_MAX_NODES || depth > 8) return;
  let entries;
  try { entries = await readdir(dirPath, { withFileTypes: true }); }
  catch { return; }

  // Folders first, then files, both alphabetically
  entries.sort((a, b) => {
    const ad = a.isDirectory(), bd = b.isDirectory();
    if (ad && !bd) return -1;
    if (!ad && bd) return 1;
    return a.name.localeCompare(b.name);
  });

  for (const entry of entries) {
    if (counters.nodes >= WS_MAX_NODES) break;
    if (entry.name.startsWith(".") && entry.name !== ".env") continue; // skip hidden (except .env)

    if (entry.isDirectory()) {
      if (WS_SKIP_DIRS.has(entry.name)) continue;
      const nodeId = randomBytes(6).toString("hex");
      allNodes.push({ id: nodeId, name: entry.name, type: "folder", content: "", parentId, isOpen: true });
      counters.nodes++;
      await readWorkspaceTree(join(dirPath, entry.name), nodeId, allNodes, counters, depth + 1);
    } else if (entry.isFile()) {
      const nodeId = randomBytes(6).toString("hex");
      let content = "";
      try {
        const fileStats = await stat(join(dirPath, entry.name));
        if (fileStats.size > WS_MAX_FILE_BYTES) {
          content = `[ملف كبير جداً — ${(fileStats.size / 1024).toFixed(1)} KB — لم يُحمَّل]`;
        } else if (counters.totalBytes + fileStats.size > WS_MAX_TOTAL_BYTES) {
          content = `[تجاوز الحد الإجمالي 10 MB]`;
        } else {
          const buf = await readFile(join(dirPath, entry.name));
          // Skip binary files (contain null bytes)
          if (buf.includes(0)) {
            content = `[ملف ثنائي — ${(fileStats.size / 1024).toFixed(1)} KB]`;
          } else {
            content = buf.toString("utf-8");
            counters.totalBytes += fileStats.size;
          }
        }
      } catch { content = ""; }
      allNodes.push({ id: nodeId, name: entry.name, type: "file", content, parentId, isOpen: false });
      counters.nodes++;
    }
  }
}

router.get("/ide/workspace-tree", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const userId = req.session.userId!;
  const wsRoot = getUserWorkspace(userId);
  try { await mkdir(wsRoot, { recursive: true }); } catch { /* exists */ }

  const rootId = randomBytes(6).toString("hex");
  const nodes: WsFileNode[] = [
    { id: rootId, name: "workspace", type: "folder", content: "", parentId: null, isOpen: true },
  ];
  const counters = { nodes: 1, totalBytes: 0 };
  await readWorkspaceTree(wsRoot, rootId, nodes, counters, 0);

  res.json({ files: nodes, count: nodes.length });
});

// ── GET /api/projects/community ───────────────────────────────────────────────
router.get("/projects/community", async (req: Request, res: Response): Promise<void> => {
  const search = String(req.query.search ?? "").trim().slice(0, 100);
  const tag    = String(req.query.tag ?? "").trim().slice(0, 30);
  const sort   = req.query.sort === "oldest" ? "oldest" : req.query.sort === "stars" ? "stars" : "latest";
  const page   = Math.max(1, parseInt(String(req.query.page ?? "1"), 10));
  const limit  = 24;
  const offset = (page - 1) * limit;
  const userId = req.session?.userId ?? null;

  const searchPattern = `%${search}%`;
  const orderDir = sort === "oldest"
    ? sql`up.created_at ASC`
    : sort === "stars"
    ? sql`stars_count DESC, up.created_at DESC`
    : sql`up.created_at DESC`;

  const baseSelect = sql`
    SELECT up.id, up.name, up.description, up.tags, up.is_public,
           up.created_at, up.updated_at, up.forked_from, up.views_count,
           u.username, u.name AS author_name, u.avatar,
           (SELECT COUNT(*)::int FROM user_projects WHERE forked_from = up.id) AS fork_count,
           (SELECT COUNT(*)::int FROM project_stars WHERE project_id = up.id) AS stars_count
           ${userId ? sql`, (SELECT COUNT(*)::int FROM project_stars WHERE project_id = up.id AND user_id = ${userId}) > 0 AS is_starred` : sql`, false AS is_starred`}
    FROM user_projects up
    JOIN users u ON u.id = up.user_id
    WHERE up.is_public = true
  `;

  const searchCond = search ? sql`AND (up.name ILIKE ${searchPattern} OR up.description ILIKE ${searchPattern})` : sql``;
  const tagCond    = tag ? sql`AND ${tag} = ANY(up.tags)` : sql``;

  const result = await db.execute(sql`
    ${baseSelect} ${searchCond} ${tagCond}
    ORDER BY ${orderDir}
    LIMIT ${limit} OFFSET ${offset}
  `);

  const countResult = await db.execute(sql`
    SELECT COUNT(*)::int AS total
    FROM user_projects up
    WHERE up.is_public = true ${searchCond} ${tagCond}
  `);

  const total = (countResult.rows[0] as { total: number })?.total ?? 0;
  res.json({ projects: result.rows, total, page, totalPages: Math.ceil(total / limit) });
});

// ── GET /api/projects/community/:id ──────────────────────────────────────────
router.get("/projects/community/:id", async (req: Request, res: Response): Promise<void> => {
  const projectId = parseInt(String(req.params.id), 10);
  if (isNaN(projectId)) { res.status(400).json({ error: "معرف المشروع غير صحيح" }); return; }
  const userId = req.session?.userId ?? null;

  const result = await db.execute(sql`
    SELECT
      up.id, up.name, up.description, up.how_it_works, up.requirements,
      up.files, up.tags, up.is_public, up.created_at, up.updated_at,
      up.forked_from, up.user_id AS owner_id, up.views_count,
      u.username, u.name AS author_name, u.avatar,
      (SELECT COUNT(*)::int FROM user_projects WHERE forked_from = up.id) AS fork_count,
      (SELECT COUNT(*)::int FROM project_stars WHERE project_id = up.id) AS stars_count,
      (SELECT up2.name FROM user_projects up2 WHERE up2.id = up.forked_from) AS forked_from_name
      ${userId ? sql`, (SELECT COUNT(*)::int FROM project_stars WHERE project_id = up.id AND user_id = ${userId}) > 0 AS is_starred` : sql`, false AS is_starred`}
    FROM user_projects up
    JOIN users u ON u.id = up.user_id
    WHERE up.id = ${projectId} AND up.is_public = true
  `);

  if (!result.rows[0]) { res.status(404).json({ error: "المشروع غير موجود أو خاص" }); return; }

  // Increment view count asynchronously
  db.execute(sql`UPDATE user_projects SET views_count = views_count + 1 WHERE id = ${projectId}`).catch(() => {});

  res.json(result.rows[0]);
});

// ── POST /api/projects/:id/star — toggle star ─────────────────────────────────
router.post("/projects/:id/star", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const userId    = req.session.userId!;
  const projectId = parseInt(String(req.params.id), 10);
  if (isNaN(projectId)) { res.status(400).json({ error: "معرف المشروع غير صحيح" }); return; }

  // Check project exists and is public
  const check = await db.execute(sql`SELECT id, user_id FROM user_projects WHERE id = ${projectId} AND is_public = true`);
  if (!check.rows[0]) { res.status(404).json({ error: "المشروع غير موجود" }); return; }
  const projectOwnerId = (check.rows[0] as { id: number; user_id: number }).user_id;

  // Check existing star
  const existing = await db.execute(sql`SELECT id FROM project_stars WHERE user_id = ${userId} AND project_id = ${projectId}`);
  if (existing.rows[0]) {
    await db.execute(sql`DELETE FROM project_stars WHERE user_id = ${userId} AND project_id = ${projectId}`);
    const countRes = await db.execute(sql`SELECT COUNT(*)::int AS cnt FROM project_stars WHERE project_id = ${projectId}`);
    res.json({ starred: false, starsCount: (countRes.rows[0] as { cnt: number }).cnt });
  } else {
    await db.insert(projectStarsTable).values({ userId, projectId });
    const countRes = await db.execute(sql`SELECT COUNT(*)::int AS cnt FROM project_stars WHERE project_id = ${projectId}`);

    // Notify project owner if it's not their own star
    if (projectOwnerId !== userId) {
      const [starrer] = await db.select({ name: usersTable.name, username: usersTable.username })
        .from(usersTable).where(eq(usersTable.id, userId)).limit(1);
      const starrerName = starrer?.name ?? starrer?.username ?? "أحدهم";
      notify(projectOwnerId, {
        type: "achievement",
        title: "⭐ نجمة جديدة على مشروعك!",
        body: `قام ${starrerName} بإعطاء نجمة لمشروعك`,
        link: `/community-projects/${projectId}`,
        metadata: { projectId, starrerId: userId },
      }).catch(() => {/* silent */});
    }

    res.json({ starred: true, starsCount: (countRes.rows[0] as { cnt: number }).cnt });
  }
});

// ── GET /api/projects/trending — top 6 public projects by score ───────────────
router.get("/projects/trending", async (req: Request, res: Response): Promise<void> => {
  const result = await db.execute(sql`
    SELECT
      up.id, up.name, up.description, up.tags, up.created_at, up.views_count,
      up.forked_from,
      u.username, u.name AS author_name, u.avatar,
      (SELECT COUNT(*)::int FROM user_projects WHERE forked_from = up.id) AS fork_count,
      (SELECT COUNT(*)::int FROM project_stars WHERE project_id = up.id)  AS stars_count,
      (
        (SELECT COUNT(*)::int FROM user_projects WHERE forked_from = up.id) * 3
        + (SELECT COUNT(*)::int FROM project_stars WHERE project_id = up.id) * 2
        + up.views_count
      ) AS trending_score
    FROM user_projects up
    JOIN users u ON u.id = up.user_id
    WHERE up.is_public = true
    ORDER BY trending_score DESC, up.created_at DESC
    LIMIT 6
  `);
  res.json(result.rows);
});

// ── GET /api/projects — list user's named projects ────────────────────────────
router.get("/projects", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const userId = req.session.userId!;
  const projects = await db.select({
    id:          userProjectsTable.id,
    name:        userProjectsTable.name,
    description: userProjectsTable.description,
    tags:        userProjectsTable.tags,
    isPublic:    userProjectsTable.isPublic,
    forkedFrom:  userProjectsTable.forkedFrom,
    viewsCount:  userProjectsTable.viewsCount,
    createdAt:   userProjectsTable.createdAt,
    updatedAt:   userProjectsTable.updatedAt,
  })
    .from(userProjectsTable)
    .where(eq(userProjectsTable.userId, userId))
    .orderBy(desc(userProjectsTable.updatedAt));
  res.json(projects);
});

// ── GET /api/projects/public/:username ───────────────────────────────────────
router.get("/projects/public/:username", async (req: Request, res: Response): Promise<void> => {
  const { username } = req.params;
  const result = await db.execute(sql`
    SELECT up.id, up.name, up.description, up.tags, up.created_at, up.updated_at,
           up.forked_from, up.views_count,
           (SELECT COUNT(*)::int FROM project_stars WHERE project_id = up.id) AS stars_count
    FROM user_projects up
    JOIN users u ON u.id = up.user_id
    WHERE u.username = ${username} AND up.is_public = true
    ORDER BY up.updated_at DESC
    LIMIT 20
  `);
  res.json(result.rows);
});

// ── GET /api/projects/:id — load a named project ──────────────────────────────
router.get("/projects/:id", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const userId    = req.session.userId!;
  const projectId = parseInt(String(req.params.id), 10);
  if (isNaN(projectId)) { res.status(400).json({ error: "معرف المشروع غير صحيح" }); return; }

  const result = await db.execute(sql`
    SELECT up.*, u.username, u.name AS author_name,
           (SELECT COUNT(*)::int FROM project_stars WHERE project_id = up.id) AS stars_count
    FROM user_projects up
    JOIN users u ON u.id = up.user_id
    WHERE up.id = ${projectId} AND (up.user_id = ${userId} OR up.is_public = true)
  `);

  if (!result.rows[0]) { res.status(404).json({ error: "المشروع غير موجود" }); return; }
  res.json(result.rows[0]);
});

// ── POST /api/projects/:id/fork ───────────────────────────────────────────────
router.post("/projects/:id/fork", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const userId    = req.session.userId!;
  const projectId = parseInt(String(req.params.id), 10);
  if (isNaN(projectId)) { res.status(400).json({ error: "معرف المشروع غير صحيح" }); return; }

  const result = await db.execute(sql`SELECT * FROM user_projects WHERE id = ${projectId} AND is_public = true`);
  const original = result.rows[0] as {
    id: number; name: string; description: string; how_it_works: string;
    requirements: string; files: unknown[]; tags: string[]; user_id: number;
  } | undefined;

  if (!original) { res.status(404).json({ error: "المشروع غير موجود أو خاص" }); return; }

  const countResult = await db.execute(sql`SELECT COUNT(*)::int AS cnt FROM user_projects WHERE user_id = ${userId}`);
  const cnt = (countResult.rows[0] as { cnt: number })?.cnt ?? 0;
  if (cnt >= 50) { res.status(400).json({ error: "وصلت للحد الأقصى من المشاريع (50 مشروع)" }); return; }

  const [forked] = await db.insert(userProjectsTable).values({
    userId,
    name:         `${String(original.name)} (نسخة)`,
    description:  String(original.description ?? ""),
    howItWorks:   String(original.how_it_works ?? ""),
    requirements: String(original.requirements ?? ""),
    files:        Array.isArray(original.files) ? original.files : [],
    tags:         Array.isArray(original.tags) ? original.tags : [],
    isPublic:     false,
    forkedFrom:   original.id,
  }).returning({ id: userProjectsTable.id });

  // Notify original project owner if it's not their own fork
  if (original.user_id !== userId) {
    const [forker] = await db.select({ name: usersTable.name, username: usersTable.username })
      .from(usersTable).where(eq(usersTable.id, userId)).limit(1);
    const forkerName = forker?.name ?? forker?.username ?? "أحدهم";
    notify(original.user_id, {
      type: "achievement",
      title: "🍴 تم نسخ مشروعك!",
      body: `قام ${forkerName} بنسخ (fork) مشروعك "${String(original.name)}"`,
      link: `/community-projects/${original.id}`,
      metadata: { projectId: original.id, forkerId: userId, forkedProjectId: forked.id },
    }).catch(() => {/* silent */});
  }

  res.json({ ok: true, id: forked.id, forkedFrom: original.id });
});

// ── POST /api/projects — create or update a named project ────────────────────
router.post("/projects", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const userId = req.session.userId!;
  const { id, name, description, howItWorks, requirements, files, tags, isPublic } = req.body as {
    id?: number; name?: string; description?: string; howItWorks?: string; requirements?: string;
    files?: unknown[]; tags?: string[]; isPublic?: boolean;
  };

  if (!name?.trim()) { res.status(400).json({ error: "اسم المشروع مطلوب" }); return; }
  if (!Array.isArray(files)) { res.status(400).json({ error: "files مطلوب" }); return; }
  if (files.length > MAX_FILES) { res.status(400).json({ error: `عدد الملفات كبير جداً (الحد الأقصى ${MAX_FILES} ملف)` }); return; }
  if (JSON.stringify(files).length > MAX_PROJECT_SIZE) { res.status(400).json({ error: "حجم المشروع كبير جداً (الحد الأقصى 5 MB)" }); return; }

  const safeName        = name.trim().slice(0, 100);
  const safeDesc        = (description ?? "").trim().slice(0, 1000);
  const safeHowItWorks  = (howItWorks ?? "").trim().slice(0, 2000);
  const safeRequirements = (requirements ?? "").trim().slice(0, 1000);
  const safeTags        = (tags ?? []).slice(0, 10).map(t => String(t).slice(0, 30));
  const safePublic      = isPublic === true;

  // ── Security scan when publishing to community ────────────────────────────
  if (safePublic && Array.isArray(files)) {
    const scan = scanProjectFiles(files);
    if (!scan.clean) {
      const ip    = getIp(req);
      const [usr] = await db.select({ email: usersTable.email })
        .from(usersTable).where(eq(usersTable.id, userId)).limit(1);
      const autoBan = shouldAutoBan(scan);
      await recordSecurityEvent({
        userId,
        ip,
        email: usr?.email,
        type:     "malicious_community_project",
        severity: scan.threats[0]?.severity ?? "medium",
        details: {
          projectName: safeName,
          summary:     scan.summary,
          score:       scan.score,
          threats:     scan.threats,
        },
        autoBan,
      });
      if (autoBan) {
        res.status(403).json({
          error: "تم رفض نشر المشروع: احتوى على كود مشبوه وتم إيقاف حسابك مؤقتاً.",
          scanSummary: scan.summary,
          banned: true,
        });
        return;
      }
      res.status(422).json({
        error: "تم رفض نشر المشروع: احتوى على أنماط مشبوهة.",
        scanSummary: scan.summary,
        threats: scan.threats.map(t => ({ name: t.name, severity: t.severity, file: t.file })),
      });
      return;
    }
  }

  if (id) {
    const [existing] = await db.select({ id: userProjectsTable.id })
      .from(userProjectsTable)
      .where(and(eq(userProjectsTable.id, id), eq(userProjectsTable.userId, userId)));
    if (!existing) { res.status(404).json({ error: "المشروع غير موجود" }); return; }

    await db.update(userProjectsTable)
      .set({
        name: safeName, description: safeDesc, howItWorks: safeHowItWorks,
        requirements: safeRequirements, files, tags: safeTags,
        isPublic: safePublic, updatedAt: new Date(),
      })
      .where(and(eq(userProjectsTable.id, id), eq(userProjectsTable.userId, userId)));
    res.json({ ok: true, id });
    return;
  }

  const countResult = await db.execute(sql`SELECT COUNT(*)::int AS cnt FROM user_projects WHERE user_id = ${userId}`);
  const cnt = (countResult.rows[0] as { cnt: number })?.cnt ?? 0;
  if (cnt >= 50) { res.status(400).json({ error: "وصلت للحد الأقصى من المشاريع (50 مشروع)" }); return; }

  const [created] = await db.insert(userProjectsTable)
    .values({
      userId, name: safeName, description: safeDesc,
      howItWorks: safeHowItWorks, requirements: safeRequirements,
      files, tags: safeTags, isPublic: safePublic,
    })
    .returning({ id: userProjectsTable.id });

  res.json({ ok: true, id: created.id });
});

// ── PUT /api/projects/:id/metadata ────────────────────────────────────────────
router.put("/projects/:id/metadata", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const userId    = req.session.userId!;
  const projectId = parseInt(String(req.params.id), 10);
  if (isNaN(projectId)) { res.status(400).json({ error: "معرف المشروع غير صحيح" }); return; }

  const { name, description, howItWorks, requirements, isPublic, tags } = req.body as {
    name?: string; description?: string; howItWorks?: string;
    requirements?: string; isPublic?: boolean; tags?: string[];
  };
  if (!name?.trim()) { res.status(400).json({ error: "اسم المشروع مطلوب" }); return; }

  const updated = await db.update(userProjectsTable)
    .set({
      name:         name.trim().slice(0, 100),
      description:  (description ?? "").trim().slice(0, 1000),
      howItWorks:   (howItWorks ?? "").trim().slice(0, 2000),
      requirements: (requirements ?? "").trim().slice(0, 1000),
      isPublic:     isPublic === true,
      tags:         (tags ?? []).slice(0, 10).map(t => String(t).slice(0, 30)),
      updatedAt:    new Date(),
    })
    .where(and(eq(userProjectsTable.id, projectId), eq(userProjectsTable.userId, userId)))
    .returning({ id: userProjectsTable.id });
  if (updated.length === 0) { res.status(404).json({ error: "المشروع غير موجود" }); return; }
  res.json({ ok: true });
});

// ── PUT /api/projects/:id/files — autosave files ──────────────────────────────
router.put("/projects/:id/files", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const userId    = req.session.userId!;
  const projectId = parseInt(String(req.params.id), 10);
  if (isNaN(projectId)) { res.status(400).json({ error: "معرف المشروع غير صحيح" }); return; }
  const { files } = req.body as { files?: unknown[] };
  if (!Array.isArray(files)) { res.status(400).json({ error: "files مطلوب" }); return; }
  if (files.length > MAX_FILES) { res.status(400).json({ error: "عدد الملفات كبير جداً" }); return; }
  if (JSON.stringify(files).length > MAX_PROJECT_SIZE) { res.status(400).json({ error: "حجم المشروع كبير جداً" }); return; }

  const updated = await db.update(userProjectsTable)
    .set({ files, updatedAt: new Date() })
    .where(and(eq(userProjectsTable.id, projectId), eq(userProjectsTable.userId, userId)))
    .returning({ id: userProjectsTable.id });
  if (updated.length === 0) { res.status(404).json({ error: "المشروع غير موجود" }); return; }
  res.json({ ok: true });
});

// ── DELETE /api/projects/:id ──────────────────────────────────────────────────
router.delete("/projects/:id", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const userId    = req.session.userId!;
  const projectId = parseInt(String(req.params.id), 10);
  if (isNaN(projectId)) { res.status(400).json({ error: "معرف المشروع غير صحيح" }); return; }
  await db.delete(userProjectsTable)
    .where(and(eq(userProjectsTable.id, projectId), eq(userProjectsTable.userId, userId)));
  res.json({ ok: true });
});

// ── GET /api/projects/:id/snapshots — list snapshots ─────────────────────────
router.get("/projects/:id/snapshots", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const userId    = req.session.userId!;
  const projectId = parseInt(String(req.params.id), 10);
  if (isNaN(projectId)) { res.status(400).json({ error: "معرف غير صحيح" }); return; }
  // verify ownership
  const project = await db.select({ id: userProjectsTable.id })
    .from(userProjectsTable)
    .where(and(eq(userProjectsTable.id, projectId), eq(userProjectsTable.userId, userId)))
    .limit(1);
  if (!project.length) { res.status(404).json({ error: "المشروع غير موجود" }); return; }

  const rows = await db.select({
    id:        projectSnapshotsTable.id,
    message:   projectSnapshotsTable.message,
    createdAt: projectSnapshotsTable.createdAt,
  })
    .from(projectSnapshotsTable)
    .where(eq(projectSnapshotsTable.projectId, projectId))
    .orderBy(desc(projectSnapshotsTable.createdAt))
    .limit(50);
  res.json({ snapshots: rows });
});

// ── POST /api/projects/:id/snapshots — create snapshot ───────────────────────
router.post("/projects/:id/snapshots", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const userId    = req.session.userId!;
  const projectId = parseInt(String(req.params.id), 10);
  if (isNaN(projectId)) { res.status(400).json({ error: "معرف غير صحيح" }); return; }
  const { message, files } = req.body as { message?: string; files?: unknown[] };
  if (!Array.isArray(files)) { res.status(400).json({ error: "files مطلوب" }); return; }
  const safeMsg = (message ?? "").trim().slice(0, 200) || "نقطة استرداد";

  // verify ownership
  const project = await db.select({ id: userProjectsTable.id })
    .from(userProjectsTable)
    .where(and(eq(userProjectsTable.id, projectId), eq(userProjectsTable.userId, userId)))
    .limit(1);
  if (!project.length) { res.status(404).json({ error: "المشروع غير موجود" }); return; }

  // enforce max 20 snapshots per project (FIFO — delete oldest when limit hit)
  const existing = await db.select({ id: projectSnapshotsTable.id })
    .from(projectSnapshotsTable)
    .where(eq(projectSnapshotsTable.projectId, projectId))
    .orderBy(desc(projectSnapshotsTable.createdAt));
  if (existing.length >= 20) {
    const toDelete = existing.slice(19).map(r => r.id);
    for (const id of toDelete) {
      await db.delete(projectSnapshotsTable).where(eq(projectSnapshotsTable.id, id));
    }
  }

  const [snap] = await db.insert(projectSnapshotsTable).values({
    projectId, userId, message: safeMsg, files,
  }).returning({ id: projectSnapshotsTable.id, message: projectSnapshotsTable.message, createdAt: projectSnapshotsTable.createdAt });
  res.json({ ok: true, snapshot: snap });
});

// ── Bundle rate limiter ───────────────────────────────────────────────────────
const BUNDLE_RATE_LIMIT  = 10;
const BUNDLE_RATE_WINDOW = 60_000; // 10 bundles per minute per user
const bundleUserBuckets  = new Map<number, { count: number; resetAt: number }>();
function checkBundleRateLimit(userId: number): boolean {
  const now = Date.now();
  let b = bundleUserBuckets.get(userId);
  if (!b || now > b.resetAt) { b = { count: 0, resetAt: now + BUNDLE_RATE_WINDOW }; bundleUserBuckets.set(userId, b); }
  if (b.count >= BUNDLE_RATE_LIMIT) return false;
  b.count++;
  return true;
}

// esbuild binary (devDependency of api-server, available in process.cwd()/node_modules)
const ESBUILD_BIN = resolvePath(process.cwd(), "node_modules", ".bin", "esbuild");

// ── POST /api/ide/bundle — server-side esbuild bundling for React/web projects ─
// Accepts VFS files + entry point, writes them to a temp dir, symlinks the
// user's workspace node_modules (installed via `npm install` in the terminal),
// runs esbuild, and returns the bundled JS + CSS.
router.post("/bundle", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const userId = req.session.userId!;

  if (!checkBundleRateLimit(userId)) {
    res.status(429).json({ error: "تجاوزت حد التجميع (10 مرات/دقيقة). حاول مرة أخرى بعد قليل." });
    return;
  }

  const { files, entry } = req.body as {
    files: Array<{ name: string; content: string }>;
    entry: string;
  };

  if (!Array.isArray(files) || !files.length || typeof entry !== "string") {
    res.status(400).json({ error: "files (array) و entry (string) مطلوبان" });
    return;
  }
  if (entry.includes("..") || entry.startsWith("/")) {
    res.status(400).json({ error: "مسار الملف الرئيسي غير صحيح" });
    return;
  }

  const bundleDir  = join(tmpdir(), `nouvil-bundle-${userId}`);
  const outJsFile  = join(tmpdir(), `nouvil-out-${userId}.js`);
  const outCssFile = join(tmpdir(), `nouvil-out-${userId}.css`);

  try {
    await rm(bundleDir, { recursive: true, force: true });
    await mkdir(bundleDir, { recursive: true });

    // Write all VFS files to the bundle directory
    for (const file of files) {
      if (typeof file.name !== "string" || typeof file.content !== "string") continue;
      const safePath = safePathInDir(file.name.replace(/^\/+/, ""), bundleDir);
      if (!safePath) continue;
      const parentDir = safePath.slice(0, safePath.lastIndexOf("/"));
      if (parentDir && parentDir !== bundleDir) await mkdir(parentDir, { recursive: true });
      await writeFile(safePath, file.content, "utf-8");
    }

    // Symlink workspace node_modules so packages installed via `npm install` are available
    const wsNm = join(tmpdir(), `nouvil-ws-${userId}`, "node_modules");
    try {
      const s = await stat(wsNm);
      if (s.isDirectory()) {
        await symlink(wsNm, join(bundleDir, "node_modules")).catch(() => {});
      }
    } catch { /* workspace doesn't have node_modules yet — esbuild will report missing packages */ }

    // Validate entry file exists in the bundle dir
    const entryPath = safePathInDir(entry.replace(/^\/+/, ""), bundleDir);
    if (!entryPath) { res.status(400).json({ error: "مسار الملف الرئيسي غير صالح" }); return; }
    try { await stat(entryPath); } catch {
      res.status(400).json({ error: `ملف الدخول غير موجود: ${entry}` }); return;
    }

    // Run esbuild CLI
    const bundleError = await new Promise<string>((resolve) => {
      const args = [
        entryPath,
        "--bundle",
        "--format=iife",
        `--outfile=${outJsFile}`,
        "--loader:.tsx=tsx", "--loader:.ts=ts", "--loader:.jsx=jsx", "--loader:.js=js",
        "--loader:.css=css",
        "--loader:.svg=dataurl", "--loader:.png=dataurl", "--loader:.jpg=dataurl",
        "--loader:.jpeg=dataurl", "--loader:.gif=dataurl", "--loader:.webp=dataurl",
        "--jsx=automatic",
        "--target=es2020",
        "--log-level=error",
        "--error-limit=20",
      ];
      const proc = spawn(ESBUILD_BIN, args, {
        cwd: bundleDir,
        timeout: 30_000,
        env: { PATH: process.env.PATH ?? "/usr/bin:/bin:/usr/local/bin" },
      });
      let stderr = "";
      (proc as any).stderr.on("data", (d: Buffer) => { stderr += d.toString(); });
      proc.on("close", (code: number | null) => resolve(code === 0 ? "" : (stderr.trim() || "esbuild failed with no output")));
      proc.on("error", (err: Error) => resolve(`لم يتم العثور على esbuild: ${err.message}\nتأكد من وجود esbuild في node_modules`));
    });

    if (bundleError) {
      res.status(400).json({ error: bundleError });
      return;
    }

    const js = await readFile(outJsFile, "utf-8");
    let css = "";
    try { css = await readFile(outCssFile, "utf-8"); } catch { /* no CSS output — that's fine */ }

    res.json({ ok: true, js, css });
  } catch (err) {
    res.status(500).json({ error: `خطأ أثناء التجميع: ${err instanceof Error ? err.message : String(err)}` });
  } finally {
    rm(outJsFile, { force: true }).catch(() => {});
    rm(outCssFile, { force: true }).catch(() => {});
  }
});

// ── POST /api/projects/:id/snapshots/:snapId/restore — restore snapshot ───────
router.post("/projects/:id/snapshots/:snapId/restore", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const userId    = req.session.userId!;
  const projectId = parseInt(String(req.params.id), 10);
  const snapId    = parseInt(String(req.params.snapId), 10);
  if (isNaN(projectId) || isNaN(snapId)) { res.status(400).json({ error: "معرف غير صحيح" }); return; }

  const snap = await db.select()
    .from(projectSnapshotsTable)
    .where(and(
      eq(projectSnapshotsTable.id, snapId),
      eq(projectSnapshotsTable.projectId, projectId),
      eq(projectSnapshotsTable.userId, userId),
    ))
    .limit(1);
  if (!snap.length) { res.status(404).json({ error: "نقطة الاسترداد غير موجودة" }); return; }

  // restore: update project files to snapshot files
  await db.update(userProjectsTable)
    .set({ files: snap[0].files as unknown[], updatedAt: new Date() })
    .where(and(eq(userProjectsTable.id, projectId), eq(userProjectsTable.userId, userId)));

  res.json({ ok: true, files: snap[0].files });
});

// ── DELETE /api/projects/:id/snapshots/:snapId ────────────────────────────────
router.delete("/projects/:id/snapshots/:snapId", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const userId    = req.session.userId!;
  const projectId = parseInt(String(req.params.id), 10);
  const snapId    = parseInt(String(req.params.snapId), 10);
  if (isNaN(projectId) || isNaN(snapId)) { res.status(400).json({ error: "معرف غير صحيح" }); return; }
  await db.delete(projectSnapshotsTable)
    .where(and(
      eq(projectSnapshotsTable.id, snapId),
      eq(projectSnapshotsTable.projectId, projectId),
      eq(projectSnapshotsTable.userId, userId),
    ));
  res.json({ ok: true });
});

export default router;
