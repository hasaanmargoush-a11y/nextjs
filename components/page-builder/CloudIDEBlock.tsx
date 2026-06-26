"use client";

import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import { toast } from "sonner";
import dynamic from "next/dynamic";
import { useTheme } from "next-themes";
import { useAuth } from "@/lib/auth-context";
import {
  File, Folder, FolderOpen, Trash2, Download, Upload,
  Play, Terminal, X, Menu, Eye, Code2, RotateCcw,
  Loader2, FilePlus, FolderPlus, Edit3, CheckCircle2,
  AlertCircle, LogIn, ChevronRight, Cpu, Copy, Scissors,
  Clipboard, WrapText, Eraser, BookmarkPlus, FolderCheck,
  ExternalLink, Save, Globe, Lock, GitFork, Info, Users,
  RefreshCw, Plus, Search, History, Archive, GitBranch, Clock,
  MoreHorizontal, Smartphone, ShieldCheck, Package,
  Maximize2, Minimize2,
} from "lucide-react";

// ── Dynamic Monaco (SSR-safe) ─────────────────────────────────────────────────
const MonacoEditor = dynamic(() => import("@monaco-editor/react"), {
  ssr: false,
  loading: () => (
    <div className="flex-1 flex items-center justify-center bg-[#1e1e1e] h-full">
      <div className="flex flex-col items-center gap-3">
        <Loader2 className="w-7 h-7 text-violet-400 animate-spin" />
        <span className="text-slate-400 text-xs">جاري تحميل المحرر...</span>
      </div>
    </div>
  ),
});

// ── Types ─────────────────────────────────────────────────────────────────────
type FileNodeType = "file" | "folder";

interface FileNode {
  id: string;
  name: string;
  type: FileNodeType;
  content: string;
  parentId: string | null;
  isOpen?: boolean;
}

interface TerminalLine {
  type: "log" | "error" | "info" | "warn" | "system" | "image";
  text: string;
  imageData?: string;
  ts: number;
}

type IDEMode = "editor" | "preview";
type SaveStatus = "idle" | "saving" | "saved" | "error";

interface ClipboardItem { node: FileNode; action: "copy" | "cut"; }
interface ContextMenuState {
  x: number; y: number;
  target: "file" | "folder" | "sidebar" | "editor";
  nodeId?: string;
  parentId?: string;
  rootFolderId?: string;
}
interface PendingNew { parentId: string; type: FileNodeType; }

// ── Execution language map ────────────────────────────────────────────────────
// Languages that run on the server (Node.js local or Judge0 remote)
const SERVER_LANG_MAP: Record<string, string> = {
  py:    "python",
  js:    "javascript",
  ts:    "typescript",
  rs:    "rust",
  go:    "go",
  java:  "java",
  cpp:   "cpp",
  c:     "c",
  rb:    "ruby",
  php:   "php",
  kt:    "kotlin",
  swift: "swift",
  sql:   "sql",
};

// Languages that run via Judge0 cloud (heavy compiled languages)
const JUDGE0_LANGS = new Set(["rust", "go", "java", "cpp", "c", "ruby", "php", "kotlin", "swift"]);

function serverLang(filename: string): string | null {
  const ext = filename.split(".").pop()?.toLowerCase() ?? "";
  return SERVER_LANG_MAP[ext] ?? null;
}

const SERVER_LANG_LABELS: Record<string, { label: string; color: string; bg: string; border: string }> = {
  python:     { label: "Pyodide",     color: "text-yellow-300",  bg: "bg-yellow-500/20",  border: "border-yellow-500/30"  },
  javascript: { label: "Node.js",     color: "text-green-300",   bg: "bg-green-500/20",   border: "border-green-500/30"   },
  typescript: { label: "TypeScript",  color: "text-blue-300",    bg: "bg-blue-500/20",    border: "border-blue-500/30"    },
  rust:       { label: "Rust",        color: "text-orange-300",  bg: "bg-orange-500/20",  border: "border-orange-500/30"  },
  go:         { label: "Go",          color: "text-cyan-300",    bg: "bg-cyan-500/20",    border: "border-cyan-500/30"    },
  java:       { label: "Java",        color: "text-red-300",     bg: "bg-red-500/20",     border: "border-red-500/30"     },
  cpp:        { label: "C++",         color: "text-purple-300",  bg: "bg-purple-500/20",  border: "border-purple-500/30"  },
  c:          { label: "C",           color: "text-slate-300",   bg: "bg-slate-500/20",   border: "border-slate-500/30"   },
  ruby:       { label: "Ruby",        color: "text-pink-300",    bg: "bg-pink-500/20",    border: "border-pink-500/30"    },
  php:        { label: "PHP",         color: "text-indigo-300",  bg: "bg-indigo-500/20",  border: "border-indigo-500/30"  },
  kotlin:     { label: "Kotlin",      color: "text-violet-300",  bg: "bg-violet-500/20",  border: "border-violet-500/30"  },
  swift:      { label: "Swift",       color: "text-orange-200",  bg: "bg-orange-400/20",  border: "border-orange-400/30"  },
  sql:        { label: "SQL",         color: "text-sky-300",     bg: "bg-sky-500/20",     border: "border-sky-500/30"     },
};

// ── Language detection ────────────────────────────────────────────────────────
function langFromName(name: string): string {
  const ext = name.split(".").pop()?.toLowerCase() ?? "";
  const map: Record<string, string> = {
    ts: "typescript", tsx: "typescript",
    js: "javascript", jsx: "javascript",
    html: "html", htm: "html",
    css: "css", scss: "scss",
    json: "json", jsonc: "json",
    md: "markdown", mdx: "markdown",
    py: "python", php: "php", sql: "sql",
    sh: "shell", bash: "shell", xml: "xml",
    yaml: "yaml", yml: "yaml", txt: "plaintext",
    rs: "rust", go: "go", java: "java",
    c: "c", cpp: "cpp", h: "c",
    rb: "ruby", kt: "kotlin", swift: "swift",
  };
  return map[ext] ?? "plaintext";
}

function fileIcon(name: string): string {
  const ext = name.split(".").pop()?.toLowerCase() ?? "";
  const iconMap: Record<string, string> = {
    html: "HTM", htm: "HTM", css: "CSS", scss: "CSS",
    js: "JS", jsx: "JSX", ts: "TS", tsx: "TSX",
    json: "JSON", py: "PY", php: "PHP", sql: "SQL",
    md: "MD", sh: "SH", txt: "TXT", rs: "RS",
    go: "GO", java: "JAVA", rb: "RB", kt: "KT",
    swift: "SWIFT", c: "C", cpp: "C++", h: "H",
  };
  const label = iconMap[ext];
  return label ? label : (ext ? ext.toUpperCase().slice(0, 4) : "");
}

// ── Detect language tags from file tree ───────────────────────────────────────
function detectTags(files: FileNode[]): string[] {
  const extSet = new Set<string>();
  files.filter(f => f.type === "file").forEach(f => {
    const ext = f.name.split(".").pop()?.toLowerCase() ?? "";
    if (ext) extSet.add(ext);
  });
  const tagMap: Record<string, string> = {
    html: "HTML", css: "CSS", js: "JavaScript", ts: "TypeScript",
    py: "Python", php: "PHP", sql: "SQL", rs: "Rust", go: "Go",
    java: "Java", rb: "Ruby", kt: "Kotlin", swift: "Swift",
  };
  return [...extSet].map(e => tagMap[e] ?? e).filter(Boolean).slice(0, 5);
}

// ── Default starter project ───────────────────────────────────────────────────
function defaultFiles(): FileNode[] {
  return [
    { id: "root", name: "مشروعي", type: "folder", content: "", parentId: null, isOpen: true },
    {
      id: "index.html", name: "index.html", type: "file", parentId: "root",
      content: `<!DOCTYPE html>\n<html lang="ar" dir="rtl">\n<head>\n  <meta charset="UTF-8">\n  <meta name="viewport" content="width=device-width, initial-scale=1.0">\n  <title>مشروعي</title>\n  <link rel="stylesheet" href="style.css">\n</head>\n<body>\n  <div class="container">\n    <h1>مرحباً بك</h1>\n    <p>ابدأ بتعديل هذا الكود!</p>\n    <button id="btn">اضغط هنا</button>\n    <p id="output"></p>\n  </div>\n  <script src="app.js"></script>\n</body>\n</html>`,
    },
    {
      id: "style.css", name: "style.css", type: "file", parentId: "root",
      content: `* { box-sizing: border-box; margin: 0; padding: 0; }\nbody {\n  font-family: 'Tajawal', sans-serif;\n  background: #0f1629;\n  color: #e2e8f0;\n  min-height: 100vh;\n  display: flex;\n  align-items: center;\n  justify-content: center;\n}\n.container { text-align: center; padding: 2rem; }\nh1 { font-size: 2.5rem; color: #67e8f9; margin-bottom: 1rem; }\np { color: #94a3b8; margin-bottom: 1.5rem; font-size: 1.1rem; }\nbutton {\n  background: linear-gradient(135deg, #06b6d4, #8b5cf6);\n  color: white;\n  border: none;\n  padding: 0.8rem 2.5rem;\n  border-radius: 14px;\n  font-size: 1rem;\n  cursor: pointer;\n  transition: all 0.2s;\n  font-family: inherit;\n}\nbutton:hover { opacity: 0.85; transform: translateY(-2px); }\n#output { margin-top: 1rem; color: #67e8f9; font-weight: bold; }`,
    },
    {
      id: "app.js", name: "app.js", type: "file", parentId: "root",
      content: `const btn = document.getElementById('btn');\nconst output = document.getElementById('output');\nlet count = 0;\n\nbtn.addEventListener('click', () => {\n  count++;\n  output.textContent = \`ضغطت \${count} مرة!\`;\n  console.log('تم الضغط —', count);\n});\n\nconsole.log('تم تحميل المشروع بنجاح');`,
    },
  ];
}

function uid() { return Math.random().toString(36).slice(2, 9); }

// Valid terminal line types — used to sanitise incoming postMessage data
const VALID_TERM_TYPES = new Set<string>(["log", "error", "warn", "info", "system"]);

// ── Import map generator ───────────────────────────────────────────────────────
/** Build a <script type="importmap"> tag from package.json deps using esm.sh CDN */
function buildImportMapScript(files: FileNode[]): string {
  const pkgFile = files.find(f => f.type === "file" && f.name === "package.json");
  const imports: Record<string, string> = {
    "react":                  "https://esm.sh/react@18",
    "react-dom":              "https://esm.sh/react-dom@18",
    "react-dom/client":       "https://esm.sh/react-dom@18/client",
    "react-dom/server":       "https://esm.sh/react-dom@18/server",
    "react/jsx-runtime":      "https://esm.sh/react@18/jsx-runtime",
    "react/jsx-dev-runtime":  "https://esm.sh/react@18/jsx-dev-runtime",
  };
  if (pkgFile?.content) {
    try {
      const pkg = JSON.parse(pkgFile.content);
      const allDeps = { ...(pkg.dependencies ?? {}), ...(pkg.peerDependencies ?? {}) };
      for (const [name, ver] of Object.entries(allDeps)) {
        if (typeof ver !== "string" || imports[name]) continue;
        const cleanVer = ver.replace(/^[\^~>=<*| ]+/, "").split(/\s/)[0] || "latest";
        const esmUrl = `https://esm.sh/${name}@${cleanVer}`;
        imports[name] = esmUrl;
        imports[`${name}/`] = `${esmUrl}/`;
      }
    } catch { /* ignore JSON errors */ }
  }
  return `<script type="importmap">${JSON.stringify({ imports })}</script>`;
}

/** Detect the most likely entry point file (for esbuild bundling) */
function detectEntryPoint(files: FileNode[]): string | null {
  const candidates = [
    "src/main.tsx", "src/main.ts", "src/main.jsx", "src/main.js",
    "src/index.tsx", "src/index.ts", "src/index.jsx", "src/index.js",
    "main.tsx", "main.ts", "main.jsx", "main.js",
    "index.tsx", "index.ts", "index.jsx", "index.js",
    "App.tsx", "App.ts", "App.jsx", "app.tsx", "app.ts", "app.jsx",
  ];
  const vfs = buildVfsMap(files);
  for (const c of candidates) { if (vfs.has(c)) return c; }
  return null;
}

// ── Normalize loaded files ────────────────────────────────────────────────────
// Guarantees:
//  1. Every folder has isOpen = true (so the tree is never all-collapsed on load)
//  2. A root folder exists (parentId === null). If none exists, one is synthesised.
//  3. Any file/folder whose parentId points to a non-existent node is re-attached
//     to the root folder so nothing is orphaned/invisible.
function getFilenameForLang(lang: string): string {
  const map: Record<string, string> = {
    html: "index.html", css: "styles.css",
    javascript: "script.js", js: "script.js",
    python: "main.py", py: "main.py",
    react: "App.jsx", jsx: "App.jsx",
    typescript: "main.ts", ts: "main.ts",
    cpp: "main.cpp", c: "main.c",
    rust: "main.rs", go: "main.go", java: "Main.java",
  };
  return map[lang.toLowerCase()] ?? "code.txt";
}

function buildSandboxFiles(code: string, lang: string): FileNode[] {
  return [
    { id: "sandbox-root", name: "مدرسة البرمجة", type: "folder", content: "", parentId: null },
    { id: `sandbox-file-${Date.now()}`, name: getFilenameForLang(lang), type: "file", content: code, parentId: "sandbox-root" },
  ];
}

function normalizeFiles(raw: FileNode[]): FileNode[] {
  // Step 1 — open all folders
  let files = raw.map(f => f.type === "folder" ? { ...f, isOpen: true } : f);

  // Step 2 — ensure a root folder exists
  const existingIds = new Set(files.map(f => f.id));
  const hasRoot = files.some(f => f.parentId === null);
  let rootId = "root";
  if (!hasRoot) {
    // Pick the smallest existing id set that could be "root", or create fresh
    const candidateRoot = files.find(f => f.type === "folder");
    if (candidateRoot) {
      // Promote the first folder to root
      files = files.map(f => f.id === candidateRoot.id ? { ...f, parentId: null, isOpen: true } : f);
      rootId = candidateRoot.id;
    } else {
      // No folder at all — synthesise one
      files = [{ id: rootId, name: "مشروعي", type: "folder", content: "", parentId: null, isOpen: true }, ...files];
      existingIds.add(rootId);
    }
  } else {
    const rootNode = files.find(f => f.parentId === null);
    if (rootNode) rootId = rootNode.id;
  }

  // Step 3 — re-attach orphaned nodes (parentId points to nothing)
  files = files.map(f => {
    if (f.parentId !== null && !existingIds.has(f.parentId)) {
      return { ...f, parentId: rootId };
    }
    return f;
  });

  return files;
}

// ── Auth helpers ──────────────────────────────────────────────────────────────
function getToken(): string | null {
  return typeof window !== "undefined" ? localStorage.getItem("nouvil_token") : null;
}

function authHeaders(): Record<string, string> {
  const h: Record<string, string> = { "Content-Type": "application/json" };
  const t = getToken();
  if (t) h["Authorization"] = `Bearer ${t}`;
  return h;
}

// ── Preview Builder ───────────────────────────────────────────────────────────
// ── Virtual File System Path Resolver ────────────────────────────────────────
/** Returns the path of a node relative to the project root (e.g. "js/app.js") */
function getVirtualPath(node: FileNode, files: FileNode[]): string {
  if (!node.parentId) return ""; // root folder itself
  const parent = files.find(f => f.id === node.parentId);
  if (!parent || !parent.parentId) return node.name; // direct child of root
  const parentPath = getVirtualPath(parent, files);
  return parentPath ? `${parentPath}/${node.name}` : node.name;
}

/** Build a map of virtualPath → FileNode for all file nodes */
function buildVfsMap(files: FileNode[]): Map<string, FileNode> {
  const map = new Map<string, FileNode>();
  files.filter(f => f.type === "file").forEach(f => map.set(getVirtualPath(f, files), f));
  return map;
}

/** Resolve a relative href/src reference to an absolute virtual path.
 *  Returns null for external URLs (http/https/data: etc.) */
function resolveRef(ref: string, baseDir: string): string | null {
  if (!ref) return null;
  if (/^(https?:|data:|\/\/|#)/.test(ref)) return null; // external → leave as-is
  // Join baseDir + ref then normalise . and ..
  const raw = baseDir ? `${baseDir}/${ref}` : ref;
  const parts: string[] = [];
  for (const seg of raw.split("/")) {
    if (seg === "" || seg === ".") continue;
    if (seg === "..") parts.pop();
    else parts.push(seg);
  }
  return parts.join("/");
}

function buildPreviewHtml(files: FileNode[]): string {
  // Open CSP: allow external fetch/XHR + external CDN scripts (Babel, esm.sh, etc.)
  const csp = `<meta http-equiv="Content-Security-Policy" content="default-src 'self' 'unsafe-inline' 'unsafe-eval' data: blob: https:; connect-src *;">`;
  const needsBabel = files.some(f =>
    f.type === "file" && (f.name.endsWith(".ts") || f.name.endsWith(".tsx") || f.name.endsWith(".jsx"))
  );
  // Import maps resolve npm package imports (e.g. `import React from 'react'`)
  // via esm.sh CDN — must appear BEFORE Babel and any module scripts.
  const importMapScript = needsBabel ? buildImportMapScript(files) : "";
  const babelScript = needsBabel
    ? `<script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>`
    : "";

  const vfs = buildVfsMap(files);

  // ── No HTML file: generate wrapper using root-level JS/CSS only ────────────
  const htmlFile = files.find(f => f.name.endsWith(".html") && f.type === "file");
  if (!htmlFile) {
    // Only use files directly in the root folder (parentId === root folder id)
    const rootFolder = files.find(f => f.parentId === null);
    const rootFiles = rootFolder
      ? files.filter(f => f.parentId === rootFolder.id && f.type === "file")
      : files.filter(f => f.type === "file");
    const js  = rootFiles.filter(f => f.name.endsWith(".js")).map(f => f.content).join("\n");
    const jsx = rootFiles.filter(f => f.name.endsWith(".jsx")).map(f => f.content).join("\n");
    const ts  = rootFiles.filter(f => f.name.endsWith(".ts")).map(f => f.content).join("\n");
    const tsx = rootFiles.filter(f => f.name.endsWith(".tsx")).map(f => f.content).join("\n");
    const css = rootFiles.filter(f => f.name.endsWith(".css")).map(f => f.content).join("\n");
    const scriptTag = tsx
      ? `<script type="text/babel" data-presets="typescript,react" data-type="module">${tsx}<\/script>`
      : ts
      ? `<script type="text/babel" data-presets="typescript" data-type="module">${ts}<\/script>`
      : jsx
      ? `<script type="text/babel" data-presets="react" data-type="module">${jsx}<\/script>`
      : `<script>${js}<\/script>`;
    return `<!DOCTYPE html><html><head>${csp}${importMapScript}${babelScript}<style>${css}</style></head><body><div id="root"></div>${scriptTag}</body></html>`;
  }

  // ── HTML file found: resolve real paths ────────────────────────────────────
  const htmlVPath = getVirtualPath(htmlFile, files);
  const htmlDir   = htmlVPath.includes("/") ? htmlVPath.slice(0, htmlVPath.lastIndexOf("/")) : "";

  let html = htmlFile.content;
  // importMapScript must come before babelScript (import maps must precede module scripts)
  const headInject = `${csp}${importMapScript}${babelScript}`;
  html = html.includes("<head>") ? html.replace(/<head>/i, `<head>${headInject}`) : headInject + html;

  // Replace <link href="..."> — must resolve to the correct folder
  html = html.replace(/<link([^>]*)href=["']([^"']+)["']([^>]*)>/gi, (match, before, href, after) => {
    const resolved = resolveRef(href, htmlDir);
    if (resolved === null) return match; // external
    const linked = vfs.get(resolved);
    if (!linked) return `<!-- ⚠ ملف مفقود: ${href} (${resolved}) -->`;
    return `<style>/* ${resolved} */\n${linked.content}</style>`;
  });

  // Replace <script src="..."> — must resolve to the correct folder
  html = html.replace(/<script([^>]*)src=["']([^"']+)["']([^>]*)><\/script>/gi, (match, before, src) => {
    const resolved = resolveRef(src, htmlDir);
    if (resolved === null) return match; // external
    const linked = vfs.get(resolved);
    if (!linked) return `<script>console.error('⚠ ملف مفقود: ${src} → ${resolved}')<\/script>`;
    const isTsx = linked.name.endsWith(".tsx");
    const isTs  = linked.name.endsWith(".ts") && !isTsx;
    const isJsx = linked.name.endsWith(".jsx");
    const hasImports = /^\s*import\s+/m.test(linked.content);
    if (isTsx) {
      const mod = hasImports ? ' data-type="module"' : '';
      return `<script type="text/babel" data-presets="typescript,react"${mod}>/* ${resolved} */\n${linked.content}<\/script>`;
    }
    if (isTs) {
      const mod = hasImports ? ' data-type="module"' : '';
      return `<script type="text/babel" data-presets="typescript"${mod}>/* ${resolved} */\n${linked.content}<\/script>`;
    }
    if (isJsx) {
      const mod = hasImports ? ' data-type="module"' : '';
      return `<script type="text/babel" data-presets="react"${mod}>/* ${resolved} */\n${linked.content}<\/script>`;
    }
    if (hasImports) {
      return `<script type="module">/* ${resolved} */\n${linked.content}<\/script>`;
    }
    return `<script>/* ${resolved} */\n${linked.content}<\/script>`;
  });

  // Fix inline <script type="text/babel"> blocks that use import statements:
  // Babel standalone can't inject a plain <script> with ES module syntax —
  // adding data-type="module" makes it output a blob module URL instead.
  html = html.replace(
    /(<script\b[^>]*type=["']text\/babel["'][^>]*>)([\s\S]*?)(<\/script>)/gi,
    (match, openTag, content, closeTag) => {
      if (/^\s*import\s+/m.test(content) && !openTag.includes("data-type=")) {
        const fixed = openTag.replace(/>$/, ' data-type="module">');
        return `${fixed}${content}${closeTag}`;
      }
      return match;
    }
  );

  return html;
}

// ── ANSI Color Parser ─────────────────────────────────────────────────────────
const ANSI_COLOR_MAP: Record<string, string> = {
  "30": "text-slate-800", "31": "text-red-400",    "32": "text-green-400",
  "33": "text-yellow-400","34": "text-blue-400",   "35": "text-purple-400",
  "36": "text-cyan-400",  "37": "text-slate-200",  "90": "text-slate-500",
  "91": "text-red-300",   "92": "text-green-300",  "93": "text-yellow-300",
  "94": "text-blue-300",  "95": "text-purple-300", "96": "text-cyan-300",
  "97": "text-white",     "1":  "font-bold",
};
function parseAnsi(text: string): React.ReactNode {
  // eslint-disable-next-line no-control-regex
  const parts = text.split(/(\x1b\[[0-9;]*m)/);
  const nodes: React.ReactNode[] = [];
  let cls: string[] = [];
  parts.forEach((part, i) => {
    // eslint-disable-next-line no-control-regex
    const m = part.match(/^\x1b\[([0-9;]*)m$/);
    if (m) {
      const codes = m[1] === "" || m[1] === "0" ? [] : m[1].split(";");
      if (codes.length === 0) { cls = []; }
      else { codes.forEach(c => { const k = ANSI_COLOR_MAP[c]; if (k && !cls.includes(k)) cls.push(k); }); }
    } else if (part) {
      nodes.push(<span key={i} className={cls.join(" ") || undefined}>{part}</span>);
    }
  });
  return nodes.length ? <>{nodes}</> : <>{text}</>;
}

// ── Pyodide package name map (import alias → pyodide package id) ──────────────
const PYODIDE_PKG_MAP: Record<string, string> = {
  numpy:        "numpy",
  pandas:       "pandas",
  matplotlib:   "matplotlib",
  scipy:        "scipy",
  sklearn:      "scikit-learn",
  PIL:          "pillow",
  sympy:        "sympy",
  networkx:     "networkx",
  seaborn:      "seaborn",
  bs4:          "beautifulsoup4",
  lxml:         "lxml",
  openpyxl:     "openpyxl",
  regex:        "regex",
  cryptography: "cryptography",
  statsmodels:  "statsmodels",
  pytz:         "pytz",
  dateutil:     "python-dateutil",
  cv2:          "opencv-python",
  shapely:      "shapely",
};

function detectPyodidePackages(code: string): string[] {
  const seen = new Set<string>();
  const pkgs: string[] = [];
  const re = /^(?:import\s+([\w]+)|from\s+([\w]+)\s+import)/gm;
  let m: RegExpExecArray | null;
  while ((m = re.exec(code)) !== null) {
    const name = (m[1] ?? m[2] ?? "").split(".")[0];
    const pkg = PYODIDE_PKG_MAP[name];
    if (pkg && !seen.has(pkg)) { seen.add(pkg); pkgs.push(pkg); }
  }
  return pkgs;
}

function buildPyodideHtml(code: string, stdin = ""): string {
  const encoded = typeof btoa !== "undefined"
    ? btoa(unescape(encodeURIComponent(code)))
    : Buffer.from(code).toString("base64");
  const encodedStdin = typeof btoa !== "undefined"
    ? btoa(unescape(encodeURIComponent(stdin)))
    : Buffer.from(stdin).toString("base64");
  const pkgs = detectPyodidePackages(code);
  const pkgsJson = JSON.stringify(pkgs);
  const hasMpl = pkgs.includes("matplotlib") || /matplotlib|plt\./.test(code);
  return `<!DOCTYPE html><html><head>
<meta http-equiv="Content-Security-Policy" content="default-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.jsdelivr.net; connect-src https://cdn.jsdelivr.net; worker-src blob:;">
<script src="https://cdn.jsdelivr.net/pyodide/v0.26.4/full/pyodide.js"><\/script>
</head><body><script>
(async () => {
  const notify = (type, text) => { try { parent.postMessage({ __ide_py: true, type, text }, '*'); } catch(_) {} };

  // ── Security: allow only cdn.jsdelivr.net ───────────────────────────────────
  const _blockedMsg = 'الوصول للشبكة محظور في بيئة Pyodide الآمنة';
  const _origFetch = window.fetch;
  window.fetch = function(input) {
    const url = typeof input === 'string' ? input : (input instanceof URL ? input.href : input.url);
    if (!url || !url.includes('cdn.jsdelivr.net')) return Promise.reject(new TypeError(_blockedMsg));
    return _origFetch.apply(this, arguments);
  };
  const _OrigXHR = window.XMLHttpRequest;
  window.XMLHttpRequest = function() {
    const xhr = new _OrigXHR();
    const _open = xhr.open.bind(xhr);
    xhr.open = function(method, url) {
      if (!String(url).includes('cdn.jsdelivr.net')) throw new TypeError(_blockedMsg);
      return _open.apply(xhr, arguments);
    };
    return xhr;
  };
  window.WebSocket = function() { throw new TypeError(_blockedMsg); };
  // ────────────────────────────────────────────────────────────────────────────

  try {
    notify('system', 'جاري تحميل Python (Pyodide WASM)...');
    const pyodide = await loadPyodide({ stdout: t => notify('log', t), stderr: t => notify('error', t) });

    // ── stdin queue ──────────────────────────────────────────────────────────
    const rawStdin = decodeURIComponent(escape(atob("${encodedStdin}")));
    const stdinLines = rawStdin ? rawStdin.split('\\n') : [];
    let stdinIdx = 0;
    pyodide.setStdin({
      stdin: () => {
        const line = stdinLines[stdinIdx] !== undefined ? stdinLines[stdinIdx++] : '';
        notify('info', '⌨ ' + line);
        return line + '\\n';
      }
    });

    // ── Load detected packages ───────────────────────────────────────────────
    const pkgs = ${pkgsJson};
    if (pkgs.length > 0) {
      notify('system', '📦 جاري تحميل الحزم: ' + pkgs.join(', ') + '...');
      try {
        await pyodide.loadPackage(pkgs, { messageCallback: msg => {
          if (msg.startsWith('Loading ') || msg.startsWith('Loaded ')) notify('info', msg);
        }});
        notify('system', '✅ تم تحميل ' + pkgs.length + ' حزمة بنجاح');
      } catch(e) {
        notify('warn', 'تحذير — فشل تحميل بعض الحزم: ' + String(e));
      }
    }

    // ── Matplotlib: force Agg (non-interactive) backend ─────────────────────
    ${hasMpl ? `
    try {
      await pyodide.runPythonAsync("import matplotlib\\nmatplotlib.use('Agg')");
    } catch(_) {}
    ` : ""}

    // ── Run user code ────────────────────────────────────────────────────────
    notify('system', 'Python جاهز — جاري التنفيذ...');
    const code = decodeURIComponent(escape(atob("${encoded}")));
    const t0 = performance.now();
    try {
      await pyodide.runPythonAsync(code);

      // ── Capture matplotlib figures ────────────────────────────────────────
      ${hasMpl ? `
      try {
        const figs = await pyodide.runPythonAsync(\`
import io, base64, matplotlib.pyplot as _plt
_out = []
for _n in _plt.get_fignums():
  _fig = _plt.figure(_n)
  _buf = io.BytesIO()
  _fig.savefig(_buf, format='png', bbox_inches='tight', dpi=100, facecolor=_fig.get_facecolor())
  _buf.seek(0)
  _out.append(base64.b64encode(_buf.read()).decode())
  _plt.close(_fig)
_out
\`);
        if (figs && figs.length) {
          for (const b64 of figs.toJs ? figs.toJs() : figs) {
            parent.postMessage({ __ide_py: true, type: 'image', data: b64 }, '*');
          }
        }
      } catch(e) { notify('warn', 'تعذّر عرض الرسوم: ' + String(e)); }
      ` : ""}

      const dur = Math.round(performance.now() - t0);
      parent.postMessage({ __ide_py: true, type: 'done', exitCode: 0, durationMs: dur }, '*');
    } catch(e) {
      notify('error', String(e));
      parent.postMessage({ __ide_py: true, type: 'done', exitCode: 1, durationMs: 0 }, '*');
    }
  } catch(e) {
    notify('error', 'فشل تحميل Pyodide: ' + String(e));
    parent.postMessage({ __ide_py: true, type: 'done', exitCode: -1, durationMs: 0 }, '*');
  }
})();
<\/script></body></html>`;
}

function injectConsoleCapture(html: string): string {
  const script = `<script>
(function(){
  const _IGNORE_WARNS = [
    'in-browser Babel transformer',
    'precompile your scripts',
    'babeljs.io',
  ];
  const _o = {log:console.log,error:console.error,warn:console.warn,info:console.info};
  ['log','error','warn','info'].forEach(k => {
    console[k] = function(...args){
      _o[k].apply(console,args);
      const txt = args.map(String).join(' ');
      if(k==='warn' && _IGNORE_WARNS.some(p=>txt.includes(p))) return;
      try{window.parent.postMessage({__ide_log:true,type:k,text:txt},'*');}catch(_){}
    };
  });
  window.addEventListener('error',e=>{
    // Skip cross-origin / CDN script errors (no useful info)
    if(!e.message || e.message==='Script error.' || e.lineno===0) return;
    try{window.parent.postMessage({__ide_log:true,type:'error',text:e.message+' (line '+e.lineno+')'},'*');}catch(_){}
  });
})();
<\/script>`;
  if (html.includes("<head>")) return html.replace(/<head>/i, `<head>${script}`);
  return script + html;
}

// ── Context Menu Component ────────────────────────────────────────────────────
interface ContextMenuProps {
  menu: ContextMenuState;
  clipboard: ClipboardItem | null;
  onClose: () => void;
  onRename: (id: string) => void;
  onCopy: (id: string) => void;
  onCut: (id: string) => void;
  onPaste: (targetId: string) => void;
  onDelete: (id: string) => void;
  onNewFile: (parentId: string) => void;
  onNewFolder: (parentId: string) => void;
  onFormatCode: () => void;
  onClearTerminal: () => void;
}

function ContextMenu({
  menu, clipboard, onClose,
  onRename, onCopy, onCut, onPaste, onDelete,
  onNewFile, onNewFolder, onFormatCode, onClearTerminal,
}: ContextMenuProps) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const close = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) onClose(); };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [onClose]);

  const item = (icon: React.ReactNode, label: string, onClick: () => void, danger = false) => (
    <button key={label} onMouseDown={e => { e.preventDefault(); onClick(); onClose(); }}
      className={`w-full flex items-center gap-2.5 px-3 py-2 text-xs rounded-lg transition-colors text-left hover:bg-white/10 ${danger ? "text-red-400 hover:text-red-300" : "text-slate-200"}`}>
      {icon}<span>{label}</span>
    </button>
  );
  const sep = () => <div className="h-px bg-white/10 my-1" />;

  const rootId = menu.rootFolderId ?? "root";

  return (
    <div ref={ref} style={{ position: "fixed", top: menu.y, left: menu.x, zIndex: 9999 }}
      className="bg-[#1e1e2e] border border-white/15 rounded-xl shadow-2xl shadow-black/60 py-1.5 px-1.5 min-w-[190px] backdrop-blur-xl"
      onContextMenu={e => e.preventDefault()}>

      {menu.target === "folder" && menu.nodeId && (<>
        {item(<FilePlus className="w-3.5 h-3.5 text-cyan-400" />, "ملف جديد هنا", () => onNewFile(menu.nodeId!))}
        {item(<FolderPlus className="w-3.5 h-3.5 text-amber-400" />, "مجلد جديد هنا", () => onNewFolder(menu.nodeId!))}
        {sep()}
        {item(<Edit3 className="w-3.5 h-3.5 text-violet-400" />, "إعادة تسمية", () => onRename(menu.nodeId!))}
        {sep()}
        {item(<Copy className="w-3.5 h-3.5 text-cyan-400" />, "نسخ", () => onCopy(menu.nodeId!))}
        {item(<Scissors className="w-3.5 h-3.5 text-amber-400" />, "قص", () => onCut(menu.nodeId!))}
        {clipboard && item(<Clipboard className="w-3.5 h-3.5 text-green-400" />, "لصق داخله", () => onPaste(menu.nodeId!))}
        {/* Root folder cannot be deleted */}
        {menu.nodeId !== menu.rootFolderId && (<>{sep()}{item(<Trash2 className="w-3.5 h-3.5" />, "حذف", () => onDelete(menu.nodeId!), true)}</>)}
      </>)}

      {menu.target === "file" && menu.nodeId && (<>
        {item(<FilePlus className="w-3.5 h-3.5 text-cyan-400" />, "ملف جديد بجانبه", () => onNewFile(menu.parentId ?? rootId))}
        {item(<FolderPlus className="w-3.5 h-3.5 text-amber-400" />, "مجلد جديد هنا", () => onNewFolder(menu.parentId ?? rootId))}
        {sep()}
        {item(<Edit3 className="w-3.5 h-3.5 text-violet-400" />, "إعادة تسمية", () => onRename(menu.nodeId!))}
        {sep()}
        {item(<Copy className="w-3.5 h-3.5 text-cyan-400" />, "نسخ", () => onCopy(menu.nodeId!))}
        {item(<Scissors className="w-3.5 h-3.5 text-amber-400" />, "قص", () => onCut(menu.nodeId!))}
        {sep()}
        {item(<Trash2 className="w-3.5 h-3.5" />, "حذف", () => onDelete(menu.nodeId!), true)}
      </>)}

      {menu.target === "sidebar" && (<>
        {item(<FilePlus className="w-3.5 h-3.5 text-cyan-400" />, "ملف جديد", () => onNewFile(rootId))}
        {item(<FolderPlus className="w-3.5 h-3.5 text-amber-400" />, "مجلد جديد", () => onNewFolder(rootId))}
        {clipboard && (<>{sep()}{item(<Clipboard className="w-3.5 h-3.5 text-green-400" />, "لصق هنا", () => onPaste(rootId))}</>)}
      </>)}

      {menu.target === "editor" && (<>
        {item(<WrapText className="w-3.5 h-3.5 text-violet-400" />, "تنسيق الكود", onFormatCode)}
        {item(<Eraser className="w-3.5 h-3.5 text-slate-400" />, "مسح التيرمنال", onClearTerminal)}
      </>)}
    </div>
  );
}

// ── Inline New Node Input ─────────────────────────────────────────────────────
function NewNodeInput({ type, onConfirm, onCancel }: { type: FileNodeType; onConfirm: (name: string) => void; onCancel: () => void; }) {
  const [val, setVal] = useState("");
  const confirm = () => { if (val.trim()) onConfirm(val.trim()); else onCancel(); };
  return (
    <div className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg bg-violet-500/10 border border-violet-500/30"
      onMouseDown={e => e.stopPropagation()}>
      {type === "file" ? <FilePlus className="w-3.5 h-3.5 text-cyan-400 flex-shrink-0" /> : <FolderPlus className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />}
      <input
        autoFocus
        value={val} onChange={e => setVal(e.target.value)}
        onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); confirm(); } if (e.key === "Escape") { e.preventDefault(); onCancel(); } }}
        placeholder={type === "file" ? "style.css، index.html، script.py..." : "اسم المجلد"}
        className="flex-1 bg-transparent border-b border-violet-400 outline-none text-xs py-0.5 text-white placeholder:text-slate-600 font-mono min-w-0"
        dir="ltr" />
    </div>
  );
}

// ── Root Drop Zone ────────────────────────────────────────────────────────────
function RootDropZone({ onDrop }: { onDrop: () => void }) {
  const [over, setOver] = useState(false);
  return (
    <div
      onDragOver={e => { e.preventDefault(); e.stopPropagation(); setOver(true); }}
      onDragLeave={() => setOver(false)}
      onDrop={e => { e.preventDefault(); e.stopPropagation(); setOver(false); onDrop(); }}
      className={`mx-1 mb-1 flex items-center justify-center gap-1.5 rounded-lg border-2 border-dashed py-2 text-[10px] transition-all
        ${over ? "border-violet-400 bg-violet-500/15 text-violet-300" : "border-slate-600/40 text-slate-600 hover:border-slate-500/60"}`}
    >
      <FolderCheck className="w-3 h-3 flex-shrink-0" />
      <span>أفلت هنا للمستوى الأول</span>
    </div>
  );
}

// ── Tree Node ─────────────────────────────────────────────────────────────────
function TreeNode({
  node, childrenMap, activeId, depth,
  onSelect, onToggle, onDelete, onRename, onTriggerAdd,
  onContextMenu, onLongPress, draggedId, onDragStart, onDropInto,
  pendingNew, onConfirmNew, onCancelNew,
  renameTarget,
}: {
  node: FileNode; childrenMap: Map<string, FileNode[]>; activeId: string | null; depth: number;
  onSelect: (id: string) => void; onToggle: (id: string) => void;
  onDelete: (id: string) => void; onRename: (id: string, name: string) => void;
  onTriggerAdd: (parentId: string, type: FileNodeType) => void;
  onContextMenu: (e: React.MouseEvent, nodeId: string) => void;
  onLongPress: (e: React.TouchEvent, nodeId: string) => void;
  draggedId: string | null; onDragStart: (id: string) => void; onDropInto: (targetFolderId: string) => void;
  pendingNew: PendingNew | null; onConfirmNew: (name: string) => void; onCancelNew: () => void;
  renameTarget: string | null;
}) {
  const [renaming, setRenaming] = useState(false);
  const [draft, setDraft] = useState(node.name);

  useEffect(() => {
    if (renameTarget === node.id) {
      setRenaming(true);
      setDraft(node.name);
    }
  }, [renameTarget, node.id, node.name]);
  const [dropOver, setDropOver] = useState(false);
  const children = childrenMap.get(node.id) ?? [];
  const isActive = activeId === node.id;
  const isDragging = draggedId === node.id;

  const commitRename = () => { if (draft.trim()) onRename(node.id, draft.trim()); setRenaming(false); };

  return (
    <div
      onDragOver={e => { if (node.type !== "folder" || !draggedId || draggedId === node.id) return; e.preventDefault(); e.stopPropagation(); setDropOver(true); }}
      onDragLeave={() => setDropOver(false)}
      onDrop={e => { e.preventDefault(); e.stopPropagation(); setDropOver(false); if (node.type !== "folder" || !draggedId || draggedId === node.id) return; onDropInto(node.id); }}
    >
      <div
        draggable={node.id !== "root"}
        onDragStart={e => { if (node.id === "root") { e.preventDefault(); return; } e.dataTransfer.effectAllowed = "move"; onDragStart(node.id); }}
        className={`group flex items-center gap-1.5 px-2 py-2 rounded-lg cursor-pointer text-xs transition-all border select-none
          ${isActive ? "bg-violet-500/25 text-violet-200 border-violet-500/30" : "hover:bg-white/5 text-slate-300 hover:text-white border-transparent"}
          ${isDragging ? "opacity-40" : ""}
          ${dropOver ? "bg-cyan-500/15 border-cyan-500/40 text-cyan-200" : ""}`}
        style={{ paddingRight: `${0.5 + depth * 0.875}rem` }}
        onClick={() => node.type === "folder" ? onToggle(node.id) : onSelect(node.id)}
        onContextMenu={e => { e.preventDefault(); e.stopPropagation(); onContextMenu(e, node.id); }}
        onTouchStart={e => onLongPress(e, node.id)}
        onTouchEnd={e => { e.preventDefault(); }}
        onTouchMove={e => e.stopPropagation()}
      >
        {node.type === "folder" ? (
          <>
            <ChevronRight className={`w-3 h-3 text-slate-500 transition-transform flex-shrink-0 ${node.isOpen ? "rotate-90" : ""}`} />
            {node.isOpen ? <FolderOpen className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" /> : <Folder className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />}
          </>
        ) : <span className="w-3 h-3 flex-shrink-0 inline-block" />}

        {renaming ? (
          <input autoFocus value={draft} onChange={e => setDraft(e.target.value)}
            onBlur={commitRename}
            onKeyDown={e => { if (e.key === "Enter") commitRename(); if (e.key === "Escape") { setDraft(node.name); setRenaming(false); } }}
            className="flex-1 bg-transparent border-b border-violet-400 outline-none text-xs py-0.5 text-white min-w-0" dir="ltr" />
        ) : (
          <span className="flex-1 truncate select-none font-mono">
            {node.type === "file" && <span className="mr-1">{fileIcon(node.name)}</span>}
            {node.name}
          </span>
        )}

        <div className="opacity-0 group-hover:opacity-100 flex items-center gap-0.5 flex-shrink-0 transition-opacity">
          {node.type === "folder" && (<>
            <button onClick={e => { e.stopPropagation(); onTriggerAdd(node.id, "file"); }} className="p-0.5 hover:text-cyan-400 transition-colors" title="ملف جديد"><FilePlus className="w-3 h-3" /></button>
            <button onClick={e => { e.stopPropagation(); onTriggerAdd(node.id, "folder"); }} className="p-0.5 hover:text-amber-400 transition-colors" title="مجلد جديد"><FolderPlus className="w-3 h-3" /></button>
          </>)}
          {node.id !== "root" && (<>
            <button onClick={e => { e.stopPropagation(); setRenaming(true); setDraft(node.name); }} className="p-0.5 hover:text-violet-400 transition-colors" title="إعادة تسمية"><Edit3 className="w-3 h-3" /></button>
            <button onClick={e => { e.stopPropagation(); onDelete(node.id); }} className="p-0.5 hover:text-red-400 transition-colors" title="حذف"><Trash2 className="w-3 h-3" /></button>
          </>)}
        </div>
      </div>

      {node.type === "folder" && node.isOpen && (
        <div className="relative">
          {/* Indent guide line — vertical connector aligned under the folder icon */}
          <div
            className="absolute top-0 bottom-0 w-px pointer-events-none"
            style={{
              right: `${0.5 + depth * 0.875 + 0.55}rem`,
              background: "linear-gradient(to bottom, rgba(255,255,255,0.12), rgba(255,255,255,0.05))",
            }}
          />
          {children.map(child => (
            <TreeNode key={child.id} node={child} childrenMap={childrenMap} activeId={activeId} depth={depth + 1}
              onSelect={onSelect} onToggle={onToggle} onDelete={onDelete} onRename={onRename} onTriggerAdd={onTriggerAdd}
              onContextMenu={onContextMenu} onLongPress={onLongPress} draggedId={draggedId} onDragStart={onDragStart} onDropInto={onDropInto}
              pendingNew={pendingNew} onConfirmNew={onConfirmNew} onCancelNew={onCancelNew}
              renameTarget={renameTarget} />
          ))}
          {pendingNew && pendingNew.parentId === node.id && (
            <div style={{ paddingRight: `${0.5 + (depth + 1) * 0.875}rem` }} className="px-2 py-1">
              <NewNodeInput type={pendingNew.type} onConfirm={onConfirmNew} onCancel={onCancelNew} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Save to Profile Modal ─────────────────────────────────────────────────────
interface SaveModalProps {
  files: FileNode[];
  isForkMode: boolean;
  forkedFromId: number | null;
  onClose: () => void;
  onSaved: (id: number, name: string) => void;
}

interface ProjectListItem {
  id: number;
  name: string;
  description: string;
  tags: string[];
  updatedAt: string;
}

interface ProjectMeta {
  name: string;
  description: string;
  how_it_works: string;
  requirements: string;
  is_public: boolean;
  tags: string[];
}

type SaveStep = "choice" | "new-form" | "pick-project" | "update-form";

function SaveProjectForm({
  initialName, initialDesc, initialHowItWorks, initialRequirements, initialPublic,
  isForkMode, files, targetProjectId,
  onBack, onClose, onSaved,
}: {
  initialName: string; initialDesc: string; initialHowItWorks: string;
  initialRequirements: string; initialPublic: boolean;
  isForkMode: boolean; files: FileNode[]; targetProjectId: number | null;
  onBack?: () => void; onClose: () => void; onSaved: (id: number, name: string) => void;
}) {
  const [name, setName] = useState(initialName);
  const [desc, setDesc] = useState(initialDesc);
  const [howItWorks, setHowItWorks] = useState(initialHowItWorks);
  const [requirements, setRequirements] = useState(initialRequirements);
  const [isPublic, setIsPublic] = useState(initialPublic);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const save = async () => {
    if (!name.trim()) { setError("أدخل اسم المشروع"); return; }
    setSaving(true); setError("");
    try {
      const tags = detectTags(files);
      const body: Record<string, unknown> = {
        name: name.trim(), description: desc.trim(),
        howItWorks: howItWorks.trim(), requirements: requirements.trim(),
        files, tags, isPublic,
      };
      if (targetProjectId) body.id = targetProjectId;
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { ...authHeaders(), "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(body),
      });
      const data = await res.json() as { ok?: boolean; id?: number; error?: string };
      if (!res.ok) { setError(data.error ?? "فشل الحفظ"); return; }
      onSaved(data.id!, name.trim());
    } catch (e) { setError("فشل الاتصال بالسيرفر: " + String(e)); }
    finally { setSaving(false); }
  };

  const isUpdate = !!targetProjectId && !isForkMode;

  return (
    <>
      {/* header */}
      <div className="flex items-center gap-3 mb-5">
        <div className={`w-10 h-10 rounded-xl border flex items-center justify-center flex-shrink-0 ${isForkMode ? "bg-amber-500/20 border-amber-500/30" : isUpdate ? "bg-green-500/20 border-green-500/30" : "bg-violet-500/20 border-violet-500/30"}`}>
          {isForkMode ? <GitFork className="w-5 h-5 text-amber-400" /> : isUpdate ? <RefreshCw className="w-5 h-5 text-green-400" /> : <BookmarkPlus className="w-5 h-5 text-violet-400" />}
        </div>
        <div>
          <h3 className="text-white font-black">{isForkMode ? "نسخ المشروع لملفي" : isUpdate ? "تحديث المشروع" : "حفظ مشروع جديد"}</h3>
          <p className="text-xs text-slate-500">{isForkMode ? "نسخة مستقلة في ملفك" : isUpdate ? "سيتم استبدال ملفات المشروع بالكود الحالي" : "سيظهر في لوحة التحكم تحت «مشاريعي»"}</p>
        </div>
        <div className="mr-auto flex items-center gap-2">
          {onBack && <button onClick={onBack} className="text-slate-500 hover:text-white transition-colors text-xs flex items-center gap-1"><ChevronRight className="w-3.5 h-3.5 rotate-180" /> رجوع</button>}
          <button onClick={onClose} className="text-slate-500 hover:text-white transition-colors"><X className="w-4 h-4" /></button>
        </div>
      </div>

      {isForkMode && (
        <div className="flex items-start gap-2 bg-amber-500/10 border border-amber-500/20 rounded-xl px-3 py-2.5 mb-4">
          <GitFork className="w-3.5 h-3.5 text-amber-400 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-amber-300">هذا ليس مشروعك. سيتم إنشاء نسخة مستقلة في ملفك الشخصي ولن يتأثر المشروع الأصلي.</p>
        </div>
      )}
      {isUpdate && (
        <div className="flex items-start gap-2 bg-green-500/10 border border-green-500/20 rounded-xl px-3 py-2.5 mb-4">
          <RefreshCw className="w-3.5 h-3.5 text-green-400 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-green-300">سيتم تحديث ملفات هذا المشروع بالكود الحالي في المحرر. البيانات مجلوبة من المشروع القديم ويمكنك تعديلها.</p>
        </div>
      )}

      <div className="space-y-3">
        <div>
          <label className="text-xs text-slate-400 mb-1 block">اسم المشروع *</label>
          <input value={name} onChange={e => setName(e.target.value)}
            onKeyDown={e => e.key === "Enter" && save()}
            placeholder="مثال: تطبيق حاسبة، موقع بورتفوليو..."
            className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white placeholder:text-slate-600 outline-none focus:border-violet-500/60 transition-colors"
            dir="rtl" />
        </div>
        <div>
          <label className="text-xs text-slate-400 mb-1 block">وصف مختصر (اختياري)</label>
          <textarea value={desc} onChange={e => setDesc(e.target.value)} rows={2}
            placeholder="وصف بسيط عن المشروع..."
            className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white placeholder:text-slate-600 outline-none focus:border-violet-500/60 transition-colors resize-none"
            dir="rtl" />
        </div>

        {/* Public toggle */}
        <button type="button" onClick={() => setIsPublic(v => !v)}
          className={`w-full flex items-center gap-3 p-3 rounded-xl border transition-all ${isPublic ? "bg-cyan-500/15 border-cyan-500/40 text-cyan-300" : "bg-white/5 border-white/10 text-slate-400 hover:border-white/20"}`}>
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${isPublic ? "bg-cyan-500/25" : "bg-white/5"}`}>
            {isPublic ? <Globe className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
          </div>
          <div className="text-right flex-1">
            <p className="text-xs font-bold">{isPublic ? "مشروع عام — يظهر في المجتمع" : "مشروع خاص — لك فقط"}</p>
            <p className="text-[10px] opacity-60 mt-0.5">{isPublic ? "يمكن لأي مطور رؤيته واستنساخه" : "اضغط لمشاركته مع مجتمع المطورين"}</p>
          </div>
          <div className={`w-9 h-5 rounded-full transition-colors flex-shrink-0 relative ${isPublic ? "bg-cyan-500" : "bg-white/15"}`}>
            <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all ${isPublic ? "right-0.5" : "left-0.5"}`} />
          </div>
        </button>

        {/* Extra docs fields (shown when public) */}
        {isPublic && (
          <div className="space-y-3 pt-1">
            <div className="flex items-center gap-2 text-xs text-cyan-400 bg-cyan-500/10 border border-cyan-500/20 rounded-lg px-3 py-2">
              <Users className="w-3.5 h-3.5 flex-shrink-0" />
              <span>المعلومات التالية تساعد المجتمع على فهم مشروعك</span>
            </div>
            <div>
              <label className="text-xs text-slate-400 mb-1 block">كيف يعمل المشروع؟ (اختياري)</label>
              <textarea value={howItWorks} onChange={e => setHowItWorks(e.target.value)} rows={3}
                placeholder="اشرح آلية عمل مشروعك خطوة بخطوة..."
                className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white placeholder:text-slate-600 outline-none focus:border-cyan-500/60 transition-colors resize-none"
                dir="rtl" />
            </div>
            <div>
              <label className="text-xs text-slate-400 mb-1 block">المتطلبات (اختياري)</label>
              <textarea value={requirements} onChange={e => setRequirements(e.target.value)} rows={2}
                placeholder="مثال:&#10;- متصفح حديث&#10;- Python 3.8+"
                className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white placeholder:text-slate-600 outline-none focus:border-cyan-500/60 transition-colors resize-none"
                dir="rtl" />
            </div>
          </div>
        )}

          <div className="flex items-center gap-2 text-xs text-slate-500">
            <FolderCheck className="w-3.5 h-3.5" />
            <span>{files.filter(f => f.type === "file").length} ملفات · لغات: {detectTags(files).join("، ") || "غير محدد"}</span>
          </div>
          {error && <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">{error}</p>}
        </div>

        <div className="flex gap-3 mt-5">
          <button onClick={save} disabled={saving}
            className={`flex-1 py-2.5 rounded-xl disabled:opacity-50 text-white text-sm font-bold transition-colors flex items-center justify-center gap-2 ${
              isForkMode ? "bg-amber-600 hover:bg-amber-500" : isUpdate ? "bg-green-600 hover:bg-green-500" : "bg-violet-600 hover:bg-violet-500"
            }`}>
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : isForkMode ? <GitFork className="w-4 h-4" /> : isUpdate ? <RefreshCw className="w-4 h-4" /> : <Save className="w-4 h-4" />}
            {saving ? "جاري الحفظ..." : isForkMode ? "نسخ وحفظ في ملفي" : isUpdate ? "تحديث المشروع" : "حفظ المشروع"}
          </button>
          <button onClick={onClose} className="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 text-sm font-bold transition-colors border border-white/10">
            إلغاء
          </button>
        </div>
      </>
  );
}

function SaveToProfileModal({ files, isForkMode, forkedFromId, onClose, onSaved }: SaveModalProps) {
  const [step, setStep] = useState<SaveStep>(isForkMode ? "new-form" : "choice");
  const [projectsList, setProjectsList] = useState<ProjectListItem[]>([]);
  const [loadingProjects, setLoadingProjects] = useState(false);
  const [selectedProject, setSelectedProject] = useState<ProjectListItem | null>(null);
  const [selectedMeta, setSelectedMeta] = useState<ProjectMeta | null>(null);
  const [loadingMeta, setLoadingMeta] = useState(false);

  const fetchProjects = async () => {
    setLoadingProjects(true);
    try {
      const res = await fetch("/api/projects", { headers: authHeaders(), credentials: "include" });
      const data = await res.json() as ProjectListItem[];
      setProjectsList(Array.isArray(data) ? data : []);
    } catch { setProjectsList([]); }
    finally { setLoadingProjects(false); }
  };

  const fetchMeta = async (project: ProjectListItem) => {
    setLoadingMeta(true);
    setSelectedProject(project);
    try {
      const res = await fetch(`/api/projects/${project.id}`, { headers: authHeaders(), credentials: "include" });
      if (res.ok) {
        const d = await res.json() as { name: string; description: string; how_it_works: string; requirements: string; is_public: boolean; tags: string[] };
        setSelectedMeta({ name: d.name, description: d.description, how_it_works: d.how_it_works ?? "", requirements: d.requirements ?? "", is_public: d.is_public ?? false, tags: d.tags ?? [] });
      }
    } catch { /* keep null */ }
    finally { setLoadingMeta(false); }
    setStep("update-form");
  };

  const goPickProject = () => {
    setStep("pick-project");
    fetchProjects();
  };

  const modal = (content: React.ReactNode) => (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
      <div className="relative bg-[#1a1a2e] border border-violet-500/30 rounded-2xl p-6 max-w-lg w-full shadow-2xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        {content}
      </div>
    </div>
  );

  /* ── step: choice ── */
  if (step === "choice") return modal(
    <>
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-violet-500/20 border border-violet-500/30 flex items-center justify-center flex-shrink-0">
          <BookmarkPlus className="w-5 h-5 text-violet-400" />
        </div>
        <div>
          <h3 className="text-white font-black">حفظ المشروع</h3>
          <p className="text-xs text-slate-500">اختر طريقة الحفظ</p>
        </div>
        <button onClick={onClose} className="mr-auto text-slate-500 hover:text-white transition-colors"><X className="w-4 h-4" /></button>
      </div>
      <div className="space-y-3">
        <button onClick={() => setStep("new-form")}
          className="w-full flex items-center gap-4 p-4 rounded-2xl bg-violet-500/10 border border-violet-500/30 hover:border-violet-400/60 hover:bg-violet-500/15 transition-all group text-right">
          <div className="w-12 h-12 rounded-xl bg-violet-500/20 border border-violet-500/30 flex items-center justify-center flex-shrink-0 group-hover:bg-violet-500/30 transition-colors">
            <Plus className="w-6 h-6 text-violet-400" />
          </div>
          <div className="flex-1">
            <p className="font-black text-white">حفظ كمشروع جديد</p>
            <p className="text-xs text-slate-400 mt-0.5">إنشاء مشروع جديد في ملفك الشخصي مع بيانات جديدة</p>
          </div>
          <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-violet-400 transition-colors rotate-180" />
        </button>

        <button onClick={goPickProject}
          className="w-full flex items-center gap-4 p-4 rounded-2xl bg-green-500/10 border border-green-500/30 hover:border-green-400/60 hover:bg-green-500/15 transition-all group text-right">
          <div className="w-12 h-12 rounded-xl bg-green-500/20 border border-green-500/30 flex items-center justify-center flex-shrink-0 group-hover:bg-green-500/30 transition-colors">
            <RefreshCw className="w-6 h-6 text-green-400" />
          </div>
          <div className="flex-1">
            <p className="font-black text-white">تحديث مشروع موجود</p>
            <p className="text-xs text-slate-400 mt-0.5">اختر مشروعاً من مشاريعك لاستبدال ملفاته بالكود الحالي</p>
          </div>
          <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-green-400 transition-colors rotate-180" />
        </button>
      </div>
    </>
  );

  /* ── step: pick-project ── */
  if (step === "pick-project") return modal(
    <>
      <div className="flex items-center gap-3 mb-5">
        <div className="w-10 h-10 rounded-xl bg-green-500/20 border border-green-500/30 flex items-center justify-center flex-shrink-0">
          <RefreshCw className="w-5 h-5 text-green-400" />
        </div>
        <div>
          <h3 className="text-white font-black">اختر المشروع</h3>
          <p className="text-xs text-slate-500">سيتم استبدال ملفاته بالكود الحالي</p>
        </div>
        <div className="mr-auto flex items-center gap-2">
          <button onClick={() => setStep("choice")} className="text-slate-500 hover:text-white transition-colors text-xs flex items-center gap-1"><ChevronRight className="w-3.5 h-3.5 rotate-180" /> رجوع</button>
          <button onClick={onClose} className="text-slate-500 hover:text-white transition-colors"><X className="w-4 h-4" /></button>
        </div>
      </div>
      {loadingProjects ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 text-violet-400 animate-spin" />
        </div>
      ) : projectsList.length === 0 ? (
        <div className="text-center py-10">
          <FolderCheck className="w-12 h-12 text-slate-600 mx-auto mb-3" />
          <p className="text-slate-400 font-bold">لا يوجد مشاريع محفوظة</p>
          <p className="text-slate-600 text-xs mt-1">احفظ مشروعاً أولاً ثم يمكنك تحديثه</p>
          <button onClick={() => setStep("choice")} className="mt-4 text-xs text-violet-400 hover:text-violet-300">← رجوع للاختيار</button>
        </div>
      ) : (
        <div className="space-y-2 max-h-80 overflow-y-auto pl-1">
          {projectsList.map(proj => (
            <button key={proj.id} onClick={() => fetchMeta(proj)}
              disabled={loadingMeta && selectedProject?.id === proj.id}
              className="w-full flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-white/10 hover:border-green-500/40 hover:bg-green-500/10 transition-all text-right group disabled:opacity-50">
              <div className="w-9 h-9 rounded-lg bg-violet-500/15 border border-violet-500/20 flex items-center justify-center flex-shrink-0">
                {loadingMeta && selectedProject?.id === proj.id ? <Loader2 className="w-4 h-4 text-violet-400 animate-spin" /> : <Code2 className="w-4 h-4 text-violet-400" />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-white text-sm truncate group-hover:text-green-300 transition-colors">{proj.name}</p>
                {proj.description && <p className="text-xs text-slate-500 truncate">{proj.description}</p>}
                {proj.tags?.length > 0 && (
                  <div className="flex gap-1 mt-1">
                    {proj.tags.slice(0, 3).map(t => <span key={t} className="text-[9px] px-1.5 py-0.5 rounded-md bg-violet-500/15 border border-violet-500/20 text-violet-300 font-medium">{t}</span>)}
                  </div>
                )}
              </div>
              <ChevronRight className="w-4 h-4 text-slate-600 group-hover:text-green-400 transition-colors rotate-180 flex-shrink-0" />
            </button>
          ))}
        </div>
      )}
    </>
  );

  /* ── step: new-form ── */
  if (step === "new-form") return modal(
    <SaveProjectForm
      initialName="" initialDesc="" initialHowItWorks="" initialRequirements="" initialPublic={false}
      isForkMode={isForkMode}
      files={files}
      targetProjectId={null}
      onBack={isForkMode ? undefined : () => setStep("choice")}
      onClose={onClose}
      onSaved={onSaved}
    />
  );

  /* ── step: update-form ── */
  return modal(
    selectedMeta ? (
      <SaveProjectForm
        initialName={selectedMeta.name}
        initialDesc={selectedMeta.description}
        initialHowItWorks={selectedMeta.how_it_works}
        initialRequirements={selectedMeta.requirements}
        initialPublic={selectedMeta.is_public}
        isForkMode={false}
        files={files}
        targetProjectId={selectedProject!.id}
        onBack={() => setStep("pick-project")}
        onClose={onClose}
        onSaved={onSaved}
      />
    ) : (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-8 h-8 text-violet-400 animate-spin" />
      </div>
    )
  );
}

// ── Login Modal ───────────────────────────────────────────────────────────────
function LoginPromptModal({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div className="relative bg-[#1a1a2e] border border-violet-500/30 rounded-2xl p-8 max-w-sm w-full shadow-2xl text-center" onClick={e => e.stopPropagation()}>
        <div className="w-16 h-16 rounded-2xl bg-violet-500/20 border border-violet-500/30 flex items-center justify-center mx-auto mb-4">
          <LogIn className="w-8 h-8 text-violet-400" />
        </div>
        <h3 className="text-white text-xl font-black mb-2">سجّل دخولك لحفظ مشروعك</h3>
        <p className="text-slate-400 text-sm mb-6 leading-relaxed">يمكنك الكتابة الآن، لكن لن يتم حفظ المشروع إلا بعد تسجيل الدخول.</p>
        <div className="flex gap-3">
          <a href="/auth/login" className="flex-1 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-sm font-bold transition-colors">تسجيل الدخول</a>
          <a href="/auth/register" className="flex-1 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 text-sm font-bold transition-colors border border-white/10">إنشاء حساب</a>
        </div>
        <button onClick={onClose} className="mt-4 text-xs text-slate-500 hover:text-slate-400 transition-colors">تابع بدون حساب</button>
      </div>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
interface CloudIDEProps { s: Record<string, unknown>; }

export function CloudIDEBlock({ s }: CloudIDEProps) {
  const { resolvedTheme } = useTheme();
  const { user, loading: authLoading } = useAuth();
  const isDark = resolvedTheme !== "light";

  const title      = String(s.title ?? "Cloud IDE — محرر الكود");
  const showTitle  = s.showTitle !== false;
  const editorHeightVal  = Number(s.editorHeight ?? 580);
  const editorHeightUnit = String(s.editorHeightUnit ?? "px");
  const editorHeight     = `${editorHeightVal}${editorHeightUnit}`;
  const editorHeightInner = editorHeightUnit === "px"
    ? `${editorHeightVal - 44}px`
    : `calc(${editorHeight} - 44px)`;

  // ── Refs (never stale in callbacks) ──────────────────────────────────────────
  const blockIdRef         = useRef("");
  const userIdRef          = useRef<number | null>(null);
  const activeProjectIdRef = useRef<number | null>(null);
  const filesRef           = useRef<FileNode[]>([]);
  // ── Sandbox from school "جرب بنفسك" — URL-param based, StrictMode-safe ──────
  const sandboxFromUrlRef     = useRef<FileNode[] | null>(null);
  const sandboxUrlCheckedRef  = useRef(false);
  const saveTimerRef       = useRef<ReturnType<typeof setTimeout> | null>(null);
  const termRef            = useRef<HTMLDivElement>(null);
  const fileInputRef       = useRef<HTMLInputElement>(null);
  const pyIframeRef        = useRef<HTMLIFrameElement>(null);
  const previewIframeRef   = useRef<HTMLIFrameElement>(null);
  const ideContainerRef    = useRef<HTMLDivElement>(null);
  const monacoRef          = useRef<unknown>(null);
  // Undo / clipboard refs (stale-closure safe)
  const undoStackRef       = useRef<FileNode[][]>([]);
  const monacoFocusedRef   = useRef(false);
  const clipboardRef       = useRef<ClipboardItem | null>(null);
  // Terminal resize
  const termResizingRef    = useRef<{ startY: number; startH: number } | null>(null);
  // Save ref (avoids stale closure in keyboard handler)
  const doSaveRef          = useRef<(() => void) | null>(null);

  // ── State ────────────────────────────────────────────────────────────────────
  const [mounted, setMounted]             = useState(false);
  const [files, setFiles]                 = useState<FileNode[]>([]);
  const [openTabs, setOpenTabs]           = useState<string[]>([]);
  const [activeTabId, setActiveTabId]     = useState<string | null>(null);
  const [mode, setMode]                   = useState<IDEMode>("editor");
  // On mobile (<768px) sidebar starts closed to maximise editor area
  const [sidebarOpen, setSidebarOpen]     = useState(() =>
    typeof window !== "undefined" ? window.innerWidth >= 768 : true
  );
  const [showTerminal, setShowTerminal]   = useState(true);
  const [terminalLines, setTerminalLines] = useState<TerminalLine[]>([]);
  const [stdinValue, setStdinValue]       = useState("");
  const [showStdin, setShowStdin]         = useState(false);
  const stdinRef = useRef("");
  const [terminalHeight, setTerminalHeight] = useState(160);
  const [isRunning, setIsRunning]         = useState(false);
  const [isServerRunning, setIsServerRunning] = useState(false);
  const [isBundling, setIsBundling]       = useState(false);
  const [terminalCmd, setTerminalCmd]     = useState("");
  const [isShellRunning, setIsShellRunning] = useState(false);
  const [cmdHistory, setCmdHistory]       = useState<string[]>([]);
  const [historyIdx, setHistoryIdx]       = useState(-1);
  const [shellCwd, setShellCwd]           = useState<string>("");  // relative path from workspace root
  const [isWsSyncing, setIsWsSyncing]     = useState(false);
  // Welcome screen (shown when workspace is empty on first visit)
  const [showWelcome, setShowWelcome]     = useState(false);
  const [welcomeAction, setWelcomeAction] = useState<"file" | "folder" | null>(null);
  const [welcomeInput, setWelcomeInput]   = useState("");
  const termInputRef = useRef<HTMLInputElement>(null);
  const [previewSrc, setPreviewSrc]       = useState<string>("");
  const [externalDragOver, setExternalDragOver] = useState(false);
  const [saveStatus, setSaveStatus]       = useState<SaveStatus>("idle");
  const [dbLoaded, setDbLoaded]           = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [pyodideSrc, setPyodideSrc]       = useState<string>("");

  // Named project state
  const [activeProjectId, setActiveProjectId]     = useState<number | null>(null);
  const [activeProjectName, setActiveProjectName] = useState("");
  const [showSaveModal, setShowSaveModal]         = useState(false);
  const [projectSavedBanner, setProjectSavedBanner] = useState("");
  const [isForeignProject, setIsForeignProject]   = useState(false);
  const [foreignProjectOwnerId, setForeignProjectOwnerId] = useState<number | null>(null);
  const isForeignRef = useRef(false);

  // Templates modal
  const [showTemplates, setShowTemplates] = useState(false);

  // Fullscreen mode — synced with native browser Fullscreen API
  const [isFullscreen, setIsFullscreen]   = useState(false);

  // Git-like snapshot versioning
  const [showHistory, setShowHistory]           = useState(false);
  const [showCommitModal, setShowCommitModal]   = useState(false);
  const [commitMsg, setCommitMsg]               = useState("");
  const [committingInProgress, setCommittingInProgress] = useState(false);
  const [snapshots, setSnapshots] = useState<{ id: number; message: string; createdAt: string }[]>([]);
  const [snapshotsLoading, setSnapshotsLoading] = useState(false);

  // Python execution mode: browser (Pyodide) or server (Judge0)
  const [pythonMode, setPythonMode] = useState<"browser" | "server">("browser");

  // ZIP import ref
  const zipInputRef = useRef<HTMLInputElement>(null);

  // Explorer search
  const [fileSearch, setFileSearch]   = useState("");
  const [searchOpen, setSearchOpen]   = useState(false);
  const searchInputRef                = useRef<HTMLInputElement>(null);

  // Context menu / DnD / clipboard
  const [draggedId, setDraggedId]     = useState<string | null>(null);
  const [clipboard, setClipboard]     = useState<ClipboardItem | null>(null);
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);
  const [pendingNew, setPendingNew]   = useState<PendingNew | null>(null);
  const [renameTarget, setRenameTarget] = useState<string | null>(null);

  // Mobile state
  const [isMobile, setIsMobile]               = useState(() => typeof window !== "undefined" ? window.innerWidth < 768 : false);
  const [showMobileMore, setShowMobileMore]   = useState(false);
  const [showMobileProjects, setShowMobileProjects] = useState(false);
  const [mobileProjects, setMobileProjects]   = useState<ProjectListItem[]>([]);
  const [mobileProjectsLoading, setMobileProjectsLoading] = useState(false);
  const [unsavedChanges, setUnsavedChanges]   = useState(0);
  const longPressTimerRef                     = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longPressFiredRef                     = useRef(false);

  useEffect(() => { setMounted(true); }, []);
  useEffect(() => { if (renameTarget) { const t = setTimeout(() => setRenameTarget(null), 100); return () => clearTimeout(t); } }, [renameTarget]);
  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, []);

  // Long-press handler — replaces right-click on mobile
  const startLongPress = useCallback((e: React.TouchEvent, nodeId: string) => {
    longPressFiredRef.current = false;
    if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current);
    const touch = e.touches[0];
    const x = touch.clientX;
    const y = touch.clientY;
    longPressTimerRef.current = setTimeout(() => {
      longPressFiredRef.current = true;
      if (navigator.vibrate) navigator.vibrate(30);
      const node = filesRef.current.find(f => f.id === nodeId);
      if (!node) return;
      const safeX = Math.min(x, window.innerWidth - 210);
      const safeY = Math.min(y, window.innerHeight - 260);
      if (node.type === "folder") {
        const rootId = filesRef.current.find(f => f.parentId === null)?.id ?? "root";
        setContextMenu({ x: safeX, y: safeY, target: "folder", nodeId, parentId: node.parentId ?? undefined, rootFolderId: rootId });
      } else {
        setContextMenu({ x: safeX, y: safeY, target: "file", nodeId, parentId: node.parentId ?? undefined });
      }
    }, 500);
  }, []);
  const endLongPress = useCallback(() => {
    if (longPressTimerRef.current) { clearTimeout(longPressTimerRef.current); longPressTimerRef.current = null; }
  }, []);

  // Keep refs in sync
  useEffect(() => { userIdRef.current = user?.id ?? null; }, [user]);
  useEffect(() => {
    activeProjectIdRef.current = activeProjectId;
    // Persist last opened project so reload restores it
    if (typeof window === "undefined") return;
    if (activeProjectId && !isForeignProject) {
      try { localStorage.setItem("nouvil_ide_last_project", String(activeProjectId)); } catch { /* ignore */ }
    }
  }, [activeProjectId, isForeignProject]);
  useEffect(() => { filesRef.current = files; }, [files]);
  useEffect(() => { isForeignRef.current = isForeignProject; }, [isForeignProject]);
  useEffect(() => { clipboardRef.current = clipboard; }, [clipboard]);
  useEffect(() => { stdinRef.current = stdinValue; }, [stdinValue]);
  // doSaveRef sync happens below, after doSave is defined

  // ── Resolve blockId + projectId from URL ─────────────────────────────────────
  useEffect(() => {
    if (typeof window === "undefined") return;
    blockIdRef.current = "ide:" + window.location.pathname;
    const params = new URLSearchParams(window.location.search);
    let pid = parseInt(params.get("projectId") ?? "", 10);
    // If no projectId in URL, restore last opened project from localStorage
    if (isNaN(pid) || pid <= 0) {
      try {
        const saved = localStorage.getItem("nouvil_ide_last_project");
        if (saved) pid = parseInt(saved, 10);
      } catch { /* ignore */ }
    }
    if (!isNaN(pid) && pid > 0) {
      activeProjectIdRef.current = pid;
      setActiveProjectId(pid);
    }
  }, []);

  // ── Initialize terminal ──────────────────────────────────────────────────────
  useEffect(() => {
    setTerminalLines([
      { type: "system", text: "مرحباً بك في Nouvil Cloud IDE  🚀", ts: Date.now() },
      { type: "info",   text: "🌐 ويب (HTML/CSS/JS/React CDN) → ▶ ويب    |    🐍 Python → ▶ تشغيل    |    ⚙️ Node.js / Rust / Go / C++ → ▶ تشغيل", ts: Date.now() },
      { type: "info",   text: "💡 Terminal: اكتب help لعرض الأوامر المتاحة", ts: Date.now() },
    ]);
  }, []);

  // ── School sandbox: read URL params once (StrictMode-safe via ref guard) ─────
  // When user clicks "جرب بنفسك" in /learn/*, the code arrives as ?school_code=&school_lang=
  // We store it in a ref so StrictMode double-invocation doesn't lose it.
  useEffect(() => {
    if (sandboxUrlCheckedRef.current) return; // already handled (StrictMode second run)
    sandboxUrlCheckedRef.current = true;
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const schoolCode = params.get("school_code");
    const schoolLang = params.get("school_lang") ?? "html";
    if (!schoolCode) return;
    const raw = buildSandboxFiles(schoolCode, schoolLang);
    sandboxFromUrlRef.current = normalizeFiles(raw);
    // Clean URL so reloads don't re-inject
    const url = new URL(window.location.href);
    url.searchParams.delete("school_code");
    url.searchParams.delete("school_lang");
    window.history.replaceState({}, "", url.toString());
  }, []);

  // ── Load project — filesystem-first, then DB fallback ───────────────────────
  useEffect(() => {
    if (authLoading) return;

    const blockId = blockIdRef.current;
    const pid     = activeProjectIdRef.current;

    // ── Named project (community / ?projectId=N) — existing behaviour ─────────
    if (pid) {
      if (!user) { setDbLoaded(true); return; }
      fetch(`/api/projects/${pid}`, { headers: authHeaders(), credentials: "include" })
        .then(r => r.ok ? r.json() : null)
        .then((project) => {
          if (project?.files && Array.isArray(project.files) && project.files.length > 0) {
            const loaded = normalizeFiles(project.files as FileNode[]);
            setFiles(loaded);
            filesRef.current = loaded;
            setActiveProjectName(project.name ?? "");
            const tabs = loaded.filter(f => f.type === "file").slice(0, 3).map(f => f.id);
            if (tabs.length) { setOpenTabs(tabs); setActiveTabId(tabs[0]); }
            const ownerId = project.user_id ?? project.userId ?? null;
            if (ownerId && user && ownerId !== user.id) {
              setIsForeignProject(true);
              setForeignProjectOwnerId(ownerId);
              isForeignRef.current = true;
              setTerminalLines([{ type: "warn", text: `مشروع ${project.author_name ?? "مستخدم آخر"} — اضغط "نسخ وحفظ" للتعديل`, ts: Date.now() }]);
            } else {
              setTerminalLines([{ type: "system", text: `تم تحميل مشروع: ${project.name}`, ts: Date.now() }]);
            }
          }
          setDbLoaded(true);
        })
        .catch(() => setDbLoaded(true));
      return;
    }

    // ── Regular workspace: guest — handled by localStorage effect below ──────
    // We still need to call setDbLoaded so the IDE renders; showWelcome will be
    // set in the localStorage effect if nothing is saved locally.
    if (!user) { setDbLoaded(true); return; }

    // ── Sandbox from school "جرب بنفسك" — ref is StrictMode-safe ────────────────
    if (sandboxFromUrlRef.current) {
      const normalized = sandboxFromUrlRef.current;
      setFiles(normalized);
      filesRef.current = normalized;
      const firstFile = normalized.find(f => f.type === "file");
      if (firstFile) { setOpenTabs([firstFile.id]); setActiveTabId(firstFile.id); }
      setShowWelcome(false);
      setTerminalLines([{ type: "system", text: "تم تحميل الكود من مدرسة البرمجة — جاهز للتجربة 🎓", ts: Date.now() }]);
      setDbLoaded(true);
      return;
    }

    // ── Guest → Logged-in migration ───────────────────────────────────────────
    // If the user just logged in and has guest files in localStorage, migrate
    // them to the server so they are not lost.
    if (typeof window !== "undefined") {
      const guestKey = `nouvil_ide_guest_${blockId || "default"}`;
      const savedGuest = (() => { try { return localStorage.getItem(guestKey); } catch { return null; } })();
      if (savedGuest) {
        try {
          const parsed = JSON.parse(savedGuest);
          const isValidNode = (n: unknown): n is FileNode =>
            typeof n === "object" && n !== null &&
            typeof (n as FileNode).id === "string" &&
            typeof (n as FileNode).name === "string" &&
            ((n as FileNode).type === "file" || (n as FileNode).type === "folder") &&
            typeof (n as FileNode).content === "string";
          if (Array.isArray(parsed) && parsed.length > 0 && parsed.every(isValidNode)) {
            const migrated = normalizeFiles(parsed);
            setFiles(migrated);
            filesRef.current = migrated;
            const firstFile = migrated.find(f => f.type === "file");
            if (firstFile) { setOpenTabs([firstFile.id]); setActiveTabId(firstFile.id); }
            setShowWelcome(false);
            // Save migrated files to server
            fetch("/api/ide/project", {
              method: "POST",
              headers: { ...authHeaders(), "Content-Type": "application/json" },
              credentials: "include",
              body: JSON.stringify({ blockId, files: migrated }),
            }).catch(() => {/* ignore */});
            // Clear guest data
            try { localStorage.removeItem(guestKey); } catch { /* ignore */ }
            setTerminalLines([{ type: "system", text: "✓ تم نقل مشروعك بعد تسجيل الدخول", ts: Date.now() }]);
            setDbLoaded(true);
            return;
          }
        } catch { /* ignore */ }
      }
    }

    // Step 1: Try filesystem (single source of truth for terminal sync)
    fetch("/api/ide/workspace-tree", { headers: authHeaders(), credentials: "include" })
      .then(r => r.ok ? r.json() : null)
      .then(async (fsData: { files: FileNode[]; count: number } | null) => {
        if (fsData?.files && fsData.files.length > 1) {
          // Filesystem has files → use them as Explorer content
          const normalized = normalizeFiles(fsData.files);
          setFiles(normalized);
          filesRef.current = normalized;
          const codeExts = [".js", ".ts", ".jsx", ".tsx", ".html", ".css", ".json", ".py", ".md"];
          const firstFile = normalized.find(f => f.type === "file" && codeExts.some(e => f.name.endsWith(e)))
            ?? normalized.find(f => f.type === "file");
          if (firstFile) { setOpenTabs([firstFile.id]); setActiveTabId(firstFile.id); }
          // Sync terminal CWD: if single top-level folder, start there
          const root = normalized.find(f => f.parentId === null);
          const topFolders = root ? normalized.filter(f => f.parentId === root.id && f.type === "folder") : [];
          if (topFolders.length === 1) setShellCwd(topFolders[0].name);
          setTerminalLines([{ type: "system", text: "تم تحميل workspace — Terminal مرتبط بـ Explorer ✓", ts: Date.now() }]);
          setDbLoaded(true);
          return;
        }

        // Step 2: Filesystem empty → try DB (backward compat for old saved projects)
        if (!blockId) { setShowWelcome(true); setDbLoaded(true); return; }
        try {
          const r2 = await fetch(`/api/ide/project?blockId=${encodeURIComponent(blockId)}`, {
            headers: authHeaders(), credentials: "include",
          });
          const project = r2.ok ? await r2.json() : null;
          if (project?.files && Array.isArray(project.files) && project.files.length > 0) {
            const loaded = normalizeFiles(project.files as FileNode[]);
            setFiles(loaded);
            filesRef.current = loaded;
            const tabs = loaded.filter(f => f.type === "file").slice(0, 3).map(f => f.id);
            if (tabs.length) { setOpenTabs(tabs); setActiveTabId(tabs[0]); }
            setTerminalLines([{ type: "system", text: "تم استعادة مشروعك المحفوظ", ts: Date.now() }]);
          } else {
            // Both empty → first visit, show welcome screen
            setShowWelcome(true);
          }
        } catch { setShowWelcome(true); }
        setDbLoaded(true);
      })
      .catch(() => { setShowWelcome(true); setDbLoaded(true); });
  }, [user, authLoading]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Guest localStorage fallback ──────────────────────────────────────────────
  // Load guest workspace on first render when not logged in
  useEffect(() => {
    if (user || authLoading || typeof window === "undefined") return;

    // ── Sandbox from school "جرب بنفسك" — guest path ────────────────────────────
    if (sandboxFromUrlRef.current) {
      const normalized = sandboxFromUrlRef.current;
      setFiles(normalized);
      filesRef.current = normalized;
      const firstFile = normalized.find(f => f.type === "file");
      if (firstFile) { setOpenTabs([firstFile.id]); setActiveTabId(firstFile.id); }
      setShowWelcome(false);
      return;
    }

    const saved = localStorage.getItem(`nouvil_ide_guest_${blockIdRef.current || "default"}`);
    if (!saved) {
      // No saved guest workspace → show welcome screen
      setShowWelcome(true);
      return;
    }
    try {
      const parsed = JSON.parse(saved);
      // Validate schema: must be an array of objects with required FileNode fields
      const isValidNode = (n: unknown): n is FileNode =>
        typeof n === "object" && n !== null &&
        typeof (n as FileNode).id === "string" &&
        typeof (n as FileNode).name === "string" &&
        ((n as FileNode).type === "file" || (n as FileNode).type === "folder") &&
        typeof (n as FileNode).content === "string";
      if (Array.isArray(parsed) && parsed.length > 0 && parsed.every(isValidNode)) {
        const normalized = normalizeFiles(parsed);
        setFiles(normalized);
        filesRef.current = normalized;
        const firstFile = normalized.find(f => f.type === "file");
        if (firstFile) { setOpenTabs([firstFile.id]); setActiveTabId(firstFile.id); }
        setShowWelcome(false);
      } else {
        setShowWelcome(true);
      }
    } catch { setShowWelcome(true); }
  }, [user, authLoading]); // eslint-disable-line react-hooks/exhaustive-deps

  // Save guest workspace whenever files change and user is not logged in
  useEffect(() => {
    if (user || !mounted || typeof window === "undefined") return;
    try { localStorage.setItem(`nouvil_ide_guest_${blockIdRef.current || "default"}`, JSON.stringify(files)); } catch { /* ignore */ }
  }, [files, user, mounted]);

  // ── Auto-save (uses refs to avoid stale closures) ────────────────────────────
  const doSave = useCallback((currentFiles: FileNode[]) => {
    if (!userIdRef.current) return;
    const pid = activeProjectIdRef.current;

    // Never auto-save to a foreign project (project owned by someone else)
    // Fall back to blockId-based save so user's edits are not lost locally
    const isForeign = isForeignRef.current;
    const effectivePid = isForeign ? null : pid;

    setSaveStatus("saving");
    const url = effectivePid ? `/api/projects/${effectivePid}/files` : `/api/ide/project`;
    const body = effectivePid
      ? { files: currentFiles }
      : { blockId: blockIdRef.current, files: currentFiles };

    if (!blockIdRef.current && !effectivePid) { setSaveStatus("idle"); return; }

    fetch(url, {
      method: effectivePid ? "PUT" : "POST",
      headers: authHeaders(),
      credentials: "include",
      body: JSON.stringify(body),
    })
      .then(r => { if (r.ok) { setSaveStatus("saved"); setUnsavedChanges(0); } else setSaveStatus("error"); })
      .catch(() => setSaveStatus("error"))
      .finally(() => setTimeout(() => setSaveStatus("idle"), 2500));
  }, []);

  const triggerAutoSave = useCallback((newFiles: FileNode[]) => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    setUnsavedChanges(c => c + 1);
    saveTimerRef.current = setTimeout(() => doSave(newFiles), 3000);
  }, [doSave]);

  // Sync doSaveRef after doSave is defined (was moved here from top to fix forward-reference TS error)
  useEffect(() => { doSaveRef.current = () => doSave(filesRef.current); }, [doSave]);

  // ── Console capture ───────────────────────────────────────────────────────────
  // Security: only accept messages from known trusted iframes (previewIframeRef or
  // pyIframeRef). This prevents malicious community project code from injecting
  // fake terminal messages by calling window.parent.postMessage() directly.
  useEffect(() => {
    const handler = (e: MessageEvent) => {
      if (typeof e.data !== "object" || !e.data) return;
      if (e.data.__ide_log) {
        // Only accept console-capture messages from our web-preview iframe
        if (e.source !== previewIframeRef.current?.contentWindow) return;
        const { type, text } = e.data as { type: string; text: unknown };
        if (typeof text !== "string") return;
        const safeType = VALID_TERM_TYPES.has(String(type)) ? (type as TerminalLine["type"]) : "log";
        setTerminalLines(prev => [...prev.slice(-4999), { type: safeType, text: text.slice(0, 2000), ts: Date.now() }]);
        return;
      }
      if (e.data.__ide_py) {
        // Only accept Pyodide execution messages from our hidden Pyodide iframe
        if (e.source !== pyIframeRef.current?.contentWindow) return;
        const { type, text, data, exitCode, durationMs } = e.data as { type: string; text?: string; data?: string; exitCode?: number; durationMs?: number; };
        if (type === "done") {
          const dur = durationMs !== undefined ? ` (${durationMs}ms)` : "";
          setTerminalLines(prev => [
            ...prev.slice(-4999),
            exitCode === 0
              ? { type: "system", text: `انتهى التنفيذ بنجاح${dur}`, ts: Date.now() }
              : { type: "warn",   text: `انتهى بكود خروج ${exitCode}${dur}`, ts: Date.now() },
          ]);
          setIsServerRunning(false);
        } else if (type === "image" && data) {
          setTerminalLines(prev => [...prev.slice(-4999), { type: "image", text: "", imageData: data, ts: Date.now() }]);
        } else if (text !== undefined) {
          const msgType = VALID_TERM_TYPES.has(type) ? type as TerminalLine["type"] : "log";
          setTerminalLines(prev => [...prev.slice(-4999), { type: msgType, text: String(text).slice(0, 2000), ts: Date.now() }]);
        }
      }
    };
    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, []);

  useEffect(() => {
    if (termRef.current) termRef.current.scrollTop = termRef.current.scrollHeight;
  }, [terminalLines]);

  // ── Derived state ─────────────────────────────────────────────────────────────
  const activeFile = files.find(f => f.id === activeTabId && f.type === "file") ?? null;
  const monacoTheme = isDark ? "vs-dark" : "vs";
  const activeLang  = activeFile ? serverLang(activeFile.name) : null;
  const serverLangStyle = activeLang ? SERVER_LANG_LABELS[activeLang] : null;

  // ── Tab helpers ───────────────────────────────────────────────────────────────
  const openTab = useCallback((id: string) => {
    setOpenTabs(prev => (prev.includes(id) ? prev : [...prev, id]));
    setActiveTabId(id);
    setMode("editor");
    // On mobile, close the sidebar drawer after selecting a file
    if (typeof window !== "undefined" && window.innerWidth < 768) setSidebarOpen(false);
  }, []);

  const closeTab = useCallback((id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setOpenTabs(prev => {
      const idx = prev.indexOf(id);
      const next = prev.filter(t => t !== id);
      setActiveTabId(curr => {
        if (curr !== id) return curr;
        if (next.length === 0) return null;
        return next[Math.max(0, idx - 1)];
      });
      return next;
    });
  }, []);

  // ── File operations ───────────────────────────────────────────────────────────
  const updateContent = useCallback((id: string, content: string) => {
    setFiles(prev => {
      const next = prev.map(f => f.id === id ? { ...f, content } : f);
      filesRef.current = next;
      triggerAutoSave(next);
      return next;
    });
  }, [triggerAutoSave]);

  const triggerAddNode = useCallback((parentId: string, type: FileNodeType) => {
    // If the target parent doesn't exist (e.g. root was somehow deleted), create a new root first
    const parentExists = filesRef.current.some(f => f.id === parentId);
    if (!parentExists) {
      const newRootId = uid();
      const newRoot: FileNode = { id: newRootId, name: "مشروعي", type: "folder", content: "", parentId: null, isOpen: true };
      setFiles(prev => {
        const next = [newRoot, ...prev];
        filesRef.current = next;
        triggerAutoSave(next);
        return next;
      });
      setPendingNew({ parentId: newRootId, type });
      return;
    }
    setFiles(prev => prev.map(f => f.id === parentId ? { ...f, isOpen: true } : f));
    setPendingNew({ parentId, type });
  }, [triggerAutoSave]);

  const confirmAddNode = useCallback((name: string) => {
    if (!pendingNew || !name.trim()) { setPendingNew(null); return; }
    const trimmed = name.trim();
    const siblings = filesRef.current.filter(f => f.parentId === pendingNew.parentId);
    if (siblings.some(f => f.name.toLowerCase() === trimmed.toLowerCase())) {
      toast.error(`"${trimmed}" موجود بالفعل في هذا المسار`);
      return;
    }
    const id = uid();
    setFiles(prev => {
      const next = [...prev, { id, name: trimmed, type: pendingNew.type, content: "", parentId: pendingNew.parentId, isOpen: false }];
      filesRef.current = next;
      triggerAutoSave(next);
      return next;
    });
    if (pendingNew.type === "file") openTab(id);
    setPendingNew(null);
  }, [pendingNew, triggerAutoSave, openTab]);

  const cancelAddNode = useCallback(() => { setPendingNew(null); }, []);

  const deleteNode = useCallback((id: string) => {
    // Block deletion of root folder
    const target = filesRef.current.find(f => f.id === id);
    if (target?.parentId === null) {
      toast.error("لا يمكن حذف المجلد الرئيسي للمشروع");
      return;
    }
    // Push undo snapshot before deleting
    undoStackRef.current = [...undoStackRef.current.slice(-49), [...filesRef.current]];
    setFiles(prev => {
      const toRemove = new Set<string>();
      const collect = (nid: string) => { toRemove.add(nid); prev.filter(f => f.parentId === nid).forEach(c => collect(c.id)); };
      collect(id);
      setOpenTabs(tabs => {
        const remaining = tabs.filter(t => !toRemove.has(t));
        setActiveTabId(curr => { if (!curr || !toRemove.has(curr)) return curr; return remaining.length > 0 ? remaining[remaining.length - 1] : null; });
        return remaining;
      });
      const next = prev.filter(f => !toRemove.has(f.id));
      filesRef.current = next;
      triggerAutoSave(next);
      return next;
    });
  }, [triggerAutoSave]);

  const renameNode = useCallback((id: string, name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    const node = filesRef.current.find(f => f.id === id);
    if (!node) return;
    if (node.name === trimmed) return;
    const siblings = filesRef.current.filter(f => f.parentId === node.parentId && f.id !== id);
    if (siblings.some(f => f.name.toLowerCase() === trimmed.toLowerCase())) {
      toast.error(`"${trimmed}" موجود بالفعل في هذا المسار`);
      return;
    }
    // Push undo snapshot before renaming
    undoStackRef.current = [...undoStackRef.current.slice(-49), [...filesRef.current]];
    setFiles(prev => {
      const next = prev.map(f => f.id === id ? { ...f, name: trimmed } : f);
      filesRef.current = next;
      triggerAutoSave(next);
      return next;
    });
  }, [triggerAutoSave]);

  const toggleFolder = useCallback((id: string) => {
    setFiles(prev => {
      const node = prev.find(f => f.id === id);
      // When OPENING a folder, sync terminal CWD to that folder's path
      if (node && !node.isOpen && node.type === "folder") {
        const path = getVirtualPath(node, prev);
        if (path) setShellCwd(path); // path = "" for root → keep unchanged
      }
      return prev.map(f => f.id === id ? { ...f, isOpen: !f.isOpen } : f);
    });
  }, []);

  // ── Drag-and-Drop ─────────────────────────────────────────────────────────────
  const handleTreeDragStart = useCallback((id: string) => { setDraggedId(id); }, []);

  const handleDropInto = useCallback((targetFolderId: string) => {
    if (!draggedId || draggedId === targetFolderId) { setDraggedId(null); return; }
    const isDescendant = (checkId: string, ancestorId: string, allFiles: FileNode[]): boolean => {
      const node = allFiles.find(f => f.id === checkId);
      if (!node || node.parentId === null) return false;
      if (node.parentId === ancestorId) return true;
      return isDescendant(node.parentId, ancestorId, allFiles);
    };
    // Push undo snapshot before moving
    undoStackRef.current = [...undoStackRef.current.slice(-49), [...filesRef.current]];
    setFiles(prev => {
      if (isDescendant(targetFolderId, draggedId, prev)) { setDraggedId(null); return prev; }
      const next = prev.map(f => f.id === draggedId ? { ...f, parentId: targetFolderId } : f);
      filesRef.current = next;
      triggerAutoSave(next);
      return next;
    });
    setDraggedId(null);
  }, [draggedId, triggerAutoSave]);

  useEffect(() => {
    const stop = () => setDraggedId(null);
    window.addEventListener("dragend", stop);
    return () => window.removeEventListener("dragend", stop);
  }, []);

  // ── Clipboard ─────────────────────────────────────────────────────────────────
  const handleCopy = useCallback((nodeId: string) => {
    const node = files.find(f => f.id === nodeId);
    if (node) setClipboard({ node, action: "copy" });
  }, [files]);

  const handleCut = useCallback((nodeId: string) => {
    const node = files.find(f => f.id === nodeId);
    if (node) setClipboard({ node, action: "cut" });
  }, [files]);

  const handlePaste = useCallback((targetFolderId: string) => {
    const cb = clipboardRef.current ?? clipboard;
    if (!cb) return;
    const { node, action } = cb;
    // Push undo snapshot before any paste operation
    undoStackRef.current = [...undoStackRef.current.slice(-49), [...filesRef.current]];
    if (action === "cut") {
      setFiles(prev => {
        const next = prev.map(f => f.id === node.id ? { ...f, parentId: targetFolderId } : f);
        filesRef.current = next;
        triggerAutoSave(next);
        return next;
      });
      setClipboard(null);
    } else {
      const deepCopy = (srcId: string, newParentId: string, allFiles: FileNode[]): FileNode[] => {
        const src = allFiles.find(f => f.id === srcId);
        if (!src) return [];
        const newId = uid();
        const newNode: FileNode = { ...src, id: newId, parentId: newParentId, name: src.name + "_copy" };
        const childCopies = allFiles.filter(f => f.parentId === srcId).flatMap(child => deepCopy(child.id, newId, allFiles));
        return [newNode, ...childCopies];
      };
      setFiles(prev => {
        const copies = deepCopy(node.id, targetFolderId, prev);
        const next = [...prev, ...copies];
        filesRef.current = next;
        triggerAutoSave(next);
        return next;
      });
    }
  }, [clipboard, triggerAutoSave]);

  // ── Context menu ──────────────────────────────────────────────────────────────
  const openContextMenu = useCallback((e: React.MouseEvent, target: ContextMenuState["target"], nodeId?: string) => {
    e.preventDefault(); e.stopPropagation();
    const rootId = filesRef.current.find(f => f.parentId === null)?.id ?? "root";
    const node = nodeId ? filesRef.current.find(f => f.id === nodeId) : null;
    const parentId = node ? (node.parentId ?? rootId) : rootId;
    setContextMenu({ x: e.clientX, y: e.clientY, target, nodeId, parentId, rootFolderId: rootId });
  }, []);

  const closeContextMenu = useCallback(() => setContextMenu(null), []);

  const handleNodeContextMenu = useCallback((e: React.MouseEvent, nodeId: string) => {
    const node = filesRef.current.find(f => f.id === nodeId);
    openContextMenu(e, node?.type === "folder" ? "folder" : "file", nodeId);
  }, [openContextMenu]);

  const handleFormatCode = useCallback(() => {
    if (monacoRef.current) {
      try { (monacoRef.current as { trigger: (s: string, cmd: string, args: unknown) => void }).trigger("keyboard", "editor.action.formatDocument", {}); } catch (_) {}
    }
  }, []);

  const clearTerminal = useCallback(() => {
    setTerminalLines([{ type: "system", text: "Terminal صافي", ts: Date.now() }]);
  }, []);

  // ── Interactive shell command handler ─────────────────────────────────────────
  const handleShellCommand = useCallback(async (cmd: string) => {
    const trimmed = cmd.trim();
    if (!trimmed) return;

    // Save to history
    setCmdHistory(prev => [trimmed, ...prev.slice(0, 49)]);
    setHistoryIdx(-1);
    setTerminalCmd("");

    // Show the typed command in terminal with current dir in prompt
    const promptLabel = shellCwd ? `~/${shellCwd}` : "~";
    setTerminalLines(prev => [...prev.slice(-4999), { type: "system", text: `${promptLabel}$ ${trimmed}`, ts: Date.now() }]);

    setIsShellRunning(true);
    try {
      const res = await fetch("/api/ide/shell", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        credentials: "include",
        body: JSON.stringify({ command: trimmed, cwd: shellCwd }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
        setTerminalLines(prev => [...prev.slice(-4999), { type: "error", text: String((err as { error?: string }).error ?? `HTTP ${res.status}`), ts: Date.now() }]);
        return;
      }

      const data = await res.json() as { stdout?: string; stderr?: string; exitCode?: number; action?: string; cwd?: string };

      // clear action
      if (data.action === "clear") { clearTerminal(); return; }

      // Update cwd if server returned a new one (from cd command)
      if (typeof data.cwd === "string") {
        setShellCwd(data.cwd);
      }

      // stdout lines
      if (data.stdout?.trim()) {
        for (const line of data.stdout.split("\n")) {
          if (line || data.stdout.endsWith("\n")) {
            setTerminalLines(prev => [...prev.slice(-4999), { type: "log", text: line, ts: Date.now() }]);
          }
        }
      }
      // stderr lines
      if (data.stderr?.trim()) {
        for (const line of data.stderr.split("\n")) {
          if (line) setTerminalLines(prev => [...prev.slice(-4999), { type: "error", text: line, ts: Date.now() }]);
        }
      }

      // Auto-sync Explorer after commands that create/move/delete files
      const firstWord = trimmed.split(/\s+/)[0] ?? "";
      const createsFiles = ["npx", "mkdir", "touch", "cp", "mv", "rm"].includes(firstWord) ||
        (firstWord === "npm" && /\binstall\b|\bi\b/.test(trimmed));
      if (createsFiles && (data.exitCode === 0 || data.exitCode == null)) {
        // Small delay so the FS write completes before we read it
        setTimeout(() => silentWsSync(), 500);
      }
    } catch (err) {
      setTerminalLines(prev => [...prev.slice(-4999), { type: "error", text: String(err), ts: Date.now() }]);
    } finally {
      setIsShellRunning(false);
      // Re-focus input after command finishes
      setTimeout(() => termInputRef.current?.focus(), 50);
    }
  }, [clearTerminal, shellCwd]);

  // ── Workspace Sync: read server filesystem → update Explorer ─────────────────
  const handleWsSync = useCallback(async () => {
    if (isWsSyncing) return;
    setIsWsSyncing(true);
    setTerminalLines(prev => [...prev.slice(-4999), {
      type: "system", text: "⟳ جارٍ قراءة الملفات من workspace...", ts: Date.now(),
    }]);
    try {
      const res = await fetch("/api/ide/workspace-tree", {
        headers: authHeaders(),
        credentials: "include",
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
        setTerminalLines(prev => [...prev.slice(-4999), {
          type: "error", text: `فشل المزامنة: ${(err as { error?: string }).error ?? `HTTP ${res.status}`}`, ts: Date.now(),
        }]);
        return;
      }
      const d = await res.json() as { files: FileNode[]; count: number };
      if (!d.files || d.files.length <= 1) {
        setTerminalLines(prev => [...prev.slice(-4999), {
          type: "info", text: "Workspace فارغ. جرّب: npx create-react-app my-app أو npx express-generator my-api", ts: Date.now(),
        }]);
        return;
      }
      const normalized = normalizeFiles(d.files);
      setFiles(normalized);
      filesRef.current = normalized;

      // Open the first code file automatically
      const codeExts = [".js", ".ts", ".jsx", ".tsx", ".html", ".css", ".json", ".md", ".py"];
      const firstFile = normalized.find(
        f => f.type === "file" && codeExts.some(ext => f.name.endsWith(ext))
      ) ?? normalized.find(f => f.type === "file");
      if (firstFile) {
        setOpenTabs([firstFile.id]);
        setActiveTabId(firstFile.id);
      }

      setTerminalLines(prev => [...prev.slice(-4999), {
        type: "system", text: `✔ تم تحميل ${d.count} عنصر من workspace إلى Explorer`, ts: Date.now(),
      }]);
    } catch (err) {
      setTerminalLines(prev => [...prev.slice(-4999), {
        type: "error", text: `خطأ في المزامنة: ${String(err)}`, ts: Date.now(),
      }]);
    } finally {
      setIsWsSyncing(false);
    }
  }, [isWsSyncing]);

  // ── Silent auto-sync after terminal commands ──────────────────────────────────
  // Same as handleWsSync but without terminal messages — used after npx/mkdir etc.
  const silentWsSync = useCallback(async () => {
    try {
      const res = await fetch("/api/ide/workspace-tree", { headers: authHeaders(), credentials: "include" });
      if (!res.ok) return;
      const d = await res.json() as { files: FileNode[]; count: number };
      if (!d.files || d.files.length <= 1) return;
      const normalized = normalizeFiles(d.files);
      setFiles(normalized);
      filesRef.current = normalized;
      setShowWelcome(false);
      // Sync terminal CWD: if single top-level folder, go there
      const root = normalized.find(f => f.parentId === null);
      const topFolders = root ? normalized.filter(f => f.parentId === root.id && f.type === "folder") : [];
      if (topFolders.length === 1) setShellCwd(prev => prev || topFolders[0].name);
    } catch { /* silent */ }
  }, []);

  // ── Welcome screen: create initial file or folder ─────────────────────────────
  const createWelcomeNode = useCallback(() => {
    const name = welcomeInput.trim();
    if (!name) return;
    const rootId = "root_" + Date.now();
    let newFiles: FileNode[];
    if (welcomeAction === "folder") {
      newFiles = [{ id: rootId, name, type: "folder", content: "", parentId: null, isOpen: true }];
    } else {
      // "file" action — wrap in a root folder
      const fileId = "f_" + Date.now();
      newFiles = [
        { id: rootId, name: "مشروعي", type: "folder", content: "", parentId: null, isOpen: true },
        { id: fileId, name, type: "file", content: "", parentId: rootId },
      ];
    }
    setFiles(newFiles);
    filesRef.current = newFiles;
    const firstFile = newFiles.find(f => f.type === "file");
    if (firstFile) { setOpenTabs([firstFile.id]); setActiveTabId(firstFile.id); }
    setWelcomeInput("");
    setWelcomeAction(null);
    setShowWelcome(false);
    triggerAutoSave(newFiles);
  }, [welcomeAction, welcomeInput, triggerAutoSave]);

  // ── Native Fullscreen (browser-level — hides browser chrome) ─────────────────
  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      ideContainerRef.current?.requestFullscreen?.().catch(() => {});
    } else {
      document.exitFullscreen?.().catch(() => {});
    }
  }, []);

  useEffect(() => {
    const onFsChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", onFsChange);
    return () => document.removeEventListener("fullscreenchange", onFsChange);
  }, []);

  // ── Keyboard Shortcuts ────────────────────────────────────────────────────────
  // Global: Ctrl+S (save), Ctrl+` (toggle terminal), Ctrl+F (Monaco find)
  // Explorer only: Ctrl+Z (undo), Ctrl+C (copy), Ctrl+X (cut), Ctrl+V (paste)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!e.ctrlKey && !e.metaKey) return;
      const key = e.key.toLowerCase();

      // ── Global shortcuts (work even when Monaco is focused) ────────────────
      if (key === "s") {
        e.preventDefault();
        doSaveRef.current?.();
        return;
      }
      if (e.key === "`") {
        e.preventDefault();
        setShowTerminal(prev => !prev);
        return;
      }
      if (key === "f") {
        // Trigger Monaco's built-in find dialog
        e.preventDefault();
        try { (monacoRef.current as { getAction: (id: string) => { run: () => void } | null } | null)
          ?.getAction("actions.find")?.run(); } catch (_) {}
        return;
      }

      // ── Explorer shortcuts (skip when Monaco editor is focused) ───────────
      if (monacoFocusedRef.current) return;
      // Skip if focus is inside a text input / textarea (rename inputs etc.)
      const tag = (e.target as HTMLElement).tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;

      if (key === "z") {
        if (undoStackRef.current.length === 0) {
          toast.info("لا يوجد شيء للتراجع عنه");
          return;
        }
        e.preventDefault();
        const prev = undoStackRef.current[undoStackRef.current.length - 1];
        undoStackRef.current = undoStackRef.current.slice(0, -1);
        setFiles(prev);
        filesRef.current = prev;
        triggerAutoSave(prev);
        toast.success("تم التراجع ↩", { duration: 1500 });
        return;
      }

      if (key === "c") {
        // If the user has text selected anywhere on the page, let the browser copy it natively
        if (window.getSelection()?.toString()) return;
        // Only act when a file tab is selected (not a folder)
        const node = filesRef.current.find(f => f.id === activeTabId && f.type === "file");
        if (!node) return;
        e.preventDefault();
        setClipboard({ node, action: "copy" });
        toast.success(`نُسِخ: ${node.name}`, { duration: 1500 });
        return;
      }

      if (key === "x") {
        // If the user has text selected anywhere on the page, let the browser cut it natively
        if (window.getSelection()?.toString()) return;
        const node = filesRef.current.find(f => f.id === activeTabId && f.type === "file");
        if (!node || node.parentId === null) return; // can't cut root
        e.preventDefault();
        setClipboard({ node, action: "cut" });
        toast.success(`تم قص: ${node.name}`, { duration: 1500 });
        return;
      }

      if (key === "v") {
        const cb = clipboardRef.current;
        if (!cb) return;
        e.preventDefault();
        // Paste target: if active is a folder → inside it; if active is a file → its parent; fallback root
        const activeNode = filesRef.current.find(f => f.id === activeTabId);
        const targetId = activeNode
          ? (activeNode.type === "folder"
              ? activeNode.id
              : (activeNode.parentId ?? filesRef.current.find(f => f.parentId === null)?.id ?? "root"))
          : filesRef.current.find(f => f.parentId === null)?.id ?? "root";
        handlePaste(targetId);
        toast.success(`تم اللصق في المجلد`, { duration: 1500 });
        return;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activeTabId, handlePaste, triggerAutoSave]);

  // ── Snapshot (Git-like) functions ────────────────────────────────────────────
  const loadSnapshots = useCallback(async () => {
    if (!activeProjectId) return;
    setSnapshotsLoading(true);
    try {
      const res = await fetch(`/api/projects/${activeProjectId}/snapshots`, {
        headers: authHeaders(), credentials: "include",
      });
      if (res.ok) {
        const data = await res.json() as { snapshots: { id: number; message: string; createdAt: string }[] };
        setSnapshots(data.snapshots ?? []);
      }
    } catch { /* ignore */ } finally { setSnapshotsLoading(false); }
  }, [activeProjectId]);

  const createSnapshot = useCallback(async (message: string) => {
    if (!activeProjectId || !message.trim()) return;
    setCommittingInProgress(true);
    try {
      const res = await fetch(`/api/projects/${activeProjectId}/snapshots`, {
        method: "POST",
        headers: { ...authHeaders(), "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ message: message.trim(), files }),
      });
      if (res.ok) {
        toast.success("تم حفظ نقطة استرداد");
        setShowCommitModal(false);
        setCommitMsg("");
        loadSnapshots();
      } else {
        toast.error("فشل في حفظ نقطة الاسترداد");
      }
    } catch { toast.error("فشل في حفظ نقطة الاسترداد"); }
    finally { setCommittingInProgress(false); }
  }, [activeProjectId, files, loadSnapshots]);

  const restoreSnapshot = useCallback(async (snapId: number) => {
    if (!confirm("سيتم استبدال الملفات الحالية بهذه النسخة. هل تريد المتابعة؟")) return;
    try {
      const res = await fetch(`/api/projects/${activeProjectId}/snapshots/${snapId}/restore`, {
        method: "POST", headers: authHeaders(), credentials: "include",
      });
      if (res.ok) {
        const data = await res.json() as { files: FileNode[] };
        if (Array.isArray(data.files) && data.files.length > 0) {
          setFiles(data.files);
          const firstFile = data.files.find(f => f.type === "file");
          if (firstFile) setActiveTabId(firstFile.id);
          setShowHistory(false);
          toast.success("تم استعادة النسخة");
        }
      } else { toast.error("فشل في استعادة النسخة"); }
    } catch { toast.error("فشل في الاستعادة"); }
  }, [activeProjectId]);

  const deleteSnapshot = useCallback(async (snapId: number) => {
    if (!confirm("هل تريد حذف نقطة الاسترداد هذه؟")) return;
    try {
      await fetch(`/api/projects/${activeProjectId}/snapshots/${snapId}`, {
        method: "DELETE", headers: authHeaders(), credentials: "include",
      });
      setSnapshots(prev => prev.filter(s => s.id !== snapId));
    } catch { toast.error("فشل في الحذف"); }
  }, [activeProjectId]);

  // ── ZIP Import ────────────────────────────────────────────────────────────────
  const importZip = useCallback(async (file: File) => {
    try {
      const JSZip = (await import("jszip")).default;
      const zip   = await JSZip.loadAsync(file);
      const newFiles: FileNode[] = [];
      const folderMap = new Map<string, string>();

      const rootId = "root_" + Date.now();
      const rootName = file.name.replace(/\.zip$/i, "") || "مشروعي";
      newFiles.push({ id: rootId, name: rootName, type: "folder", content: "", parentId: null, isOpen: true });
      folderMap.set("", rootId);

      // Collect entries; sort folders first so parent dirs exist before children
      type ZipEntry = { path: string; isDir: boolean; zipObj: { dir: boolean; async: (type: "string") => Promise<string> } };
      const entries: ZipEntry[] = [];
      zip.forEach((relativePath, zipObj) => entries.push({ path: relativePath, isDir: (zipObj as { dir: boolean }).dir, zipObj: zipObj as ZipEntry["zipObj"] }));
      entries.sort((a, b) => (a.isDir ? 0 : 1) - (b.isDir ? 0 : 1));

      for (const { path: relativePath, isDir, zipObj } of entries) {
        if (relativePath.startsWith("__MACOSX") || relativePath.includes(".DS_Store")) continue;
        const cleanPath = relativePath.replace(/\/$/, "");
        const parts = cleanPath.split("/").filter(Boolean);
        if (parts.length === 0) continue;

        let parentId = rootId;
        for (let i = 0; i < parts.length; i++) {
          const fullPath = parts.slice(0, i + 1).join("/");
          const isLast   = i === parts.length - 1;
          const isFolder = isDir || !isLast;
          const existing = folderMap.get(fullPath);
          if (existing) { parentId = existing; continue; }

          const nodeId = "z_" + fullPath.replace(/[^a-z0-9]/gi, "_") + "_" + Math.random().toString(36).slice(2, 6);
          if (isFolder) {
            newFiles.push({ id: nodeId, name: parts[i], type: "folder", content: "", parentId, isOpen: false });
            folderMap.set(fullPath, nodeId);
            parentId = nodeId;
          } else {
            const content = await zipObj.async("string").catch(() => "");
            newFiles.push({ id: nodeId, name: parts[i], type: "file", content, parentId });
          }
        }
      }

      const fileCount = newFiles.filter(f => f.type === "file").length;
      if (fileCount === 0) { toast.error("الملف المضغوط فارغ أو لا يحتوي ملفات نصية"); return; }
      setFiles(newFiles);
      filesRef.current = newFiles;
      const firstFile = newFiles.find(f => f.type === "file");
      if (firstFile) setActiveTabId(firstFile.id);
      setShowWelcome(false);
      toast.success(`تم استيراد ${fileCount} ملف من ${file.name}`);
    } catch (err) { toast.error("فشل في قراءة الملف: " + String(err)); }
  }, []);

  // ── Mobile projects drawer ────────────────────────────────────────────────────
  const loadMobileProjects = useCallback(async () => {
    if (!user) return;
    setMobileProjectsLoading(true);
    try {
      const res = await fetch("/api/projects", { headers: authHeaders(), credentials: "include" });
      const data = await res.json() as ProjectListItem[];
      setMobileProjects(Array.isArray(data) ? data : []);
    } catch { setMobileProjects([]); }
    finally { setMobileProjectsLoading(false); }
  }, [user]);

  const switchToProject = useCallback(async (proj: ProjectListItem) => {
    setShowMobileProjects(false);
    setTerminalLines(prev => [...prev, { type: "system", text: `جاري تحميل: ${proj.name}...`, ts: Date.now() }]);
    try {
      const res = await fetch(`/api/projects/${proj.id}`, { headers: authHeaders(), credentials: "include" });
      if (!res.ok) throw new Error("not found");
      const project = await res.json() as { files: FileNode[]; name: string; user_id?: number };
      if (project?.files && Array.isArray(project.files) && project.files.length > 0) {
        const loaded = normalizeFiles(project.files);
        setFiles(loaded);
        filesRef.current = loaded;
        const tabs = loaded.filter(f => f.type === "file").slice(0, 3).map(f => f.id);
        if (tabs.length) { setOpenTabs(tabs); setActiveTabId(tabs[0]); }
      }
      setActiveProjectId(proj.id);
      activeProjectIdRef.current = proj.id;
      setActiveProjectName(proj.name);
      // Check ownership
      const ownerId = project.user_id ?? null;
      if (ownerId && user && ownerId !== user.id) {
        setIsForeignProject(true); isForeignRef.current = true;
        setForeignProjectOwnerId(ownerId);
      } else {
        setIsForeignProject(false); isForeignRef.current = false;
        setForeignProjectOwnerId(null);
      }
      // Update URL
      const url = new URL(window.location.href);
      url.searchParams.set("projectId", String(proj.id));
      window.history.replaceState({}, "", url.toString());
      setTerminalLines(prev => [...prev, { type: "system", text: `تم تحميل: ${proj.name}`, ts: Date.now() }]);
    } catch {
      toast.error("فشل تحميل المشروع");
      setTerminalLines(prev => [...prev, { type: "error", text: "فشل تحميل المشروع", ts: Date.now() }]);
    }
  }, [user]);

  // ── Save to profile ───────────────────────────────────────────────────────────
  const handleProjectSaved = useCallback((id: number, name: string) => {
    setActiveProjectId(id);
    activeProjectIdRef.current = id;
    setActiveProjectName(name);
    setShowSaveModal(false);
    setProjectSavedBanner(`تم حفظ "${name}" في مشاريعك`);
    // Update browser URL without reload
    const url = new URL(window.location.href);
    url.searchParams.set("projectId", String(id));
    window.history.replaceState({}, "", url.toString());
    setTimeout(() => setProjectSavedBanner(""), 4000);
  }, []);

  // ── Code execution ────────────────────────────────────────────────────────────
  const runOnServer = useCallback(async () => {
    if (!activeFile || !activeLang) return;

    // SQL: no execution engine — show helpful message
    if (activeLang === "sql") {
      setShowTerminal(true);
      setTerminalLines(prev => [
        ...prev,
        { type: "warn", text: "ℹ SQL — محرر الكود يدعم كتابة SQL وتلوين الصياغة فقط.", ts: Date.now() },
        { type: "system", text: "لتشغيل SQL، استخدم قاعدة بيانات حقيقية مثل PostgreSQL أو MySQL أو SQLite.", ts: Date.now() },
      ]);
      return;
    }

    if (!user) { setShowLoginModal(true); return; }
    setIsServerRunning(true); setShowTerminal(true); setMode("editor");
    const style = SERVER_LANG_LABELS[activeLang];
    const isJudge0 = JUDGE0_LANGS.has(activeLang) || (activeLang === "python" && pythonMode === "server");
    const isPyodide = activeLang === "python" && pythonMode === "browser";
    const engineLabel = isPyodide ? "Pyodide WASM" : isJudge0 ? "Judge0 Cloud" : style?.label ?? activeLang;
    setTerminalLines(prev => [...prev, {
      type: "system",
      text: `▶ تنفيذ ${activeFile.name} — ${engineLabel}...`,
      ts: Date.now(),
    }]);

    // Pyodide browser mode for Python
    if (isPyodide) { setPyodideSrc(buildPyodideHtml(activeFile.content, stdinRef.current)); return; }

    // One-time Judge0 privacy notice
    if (isJudge0 && typeof window !== "undefined" && !localStorage.getItem("nouvil_judge0_notice")) {
      toast("يتم إرسال الكود إلى Judge0 (خادم خارجي) للتنفيذ — لا ترسل بيانات حساسة", {
        duration: 6000,
      });
      localStorage.setItem("nouvil_judge0_notice", "1");
    }
    try {
      let body: Record<string, unknown>;
      const stdinPayload = stdinRef.current.trim();
      if (isJudge0) {
        // Judge0 path: single-file only (compiled languages don't multi-file well)
        body = { code: activeFile.content, language: activeLang, stdin: stdinPayload };
      } else {
        // Local Node.js path: multi-file support so require() works across files
        const vfs = buildVfsMap(filesRef.current);
        const allSourceFiles: { path: string; content: string }[] = [];
        vfs.forEach((node, virtualPath) => { allSourceFiles.push({ path: virtualPath, content: node.content }); });
        const entryFile = getVirtualPath(activeFile, filesRef.current);
        body = allSourceFiles.length > 1
          ? { code: activeFile.content, language: activeLang, entryFile, files: allSourceFiles, stdin: stdinPayload }
          : { code: activeFile.content, language: activeLang, stdin: stdinPayload };
      }
      const res = await fetch("/api/ide/run", {
        method: "POST",
        headers: { ...authHeaders(), "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(body),
      });
      const data = await res.json() as {
        stdout?: string; stderr?: string; exitCode?: number | null;
        durationMs?: number; error?: string; engine?: string; timedOut?: boolean;
      };
      if (!res.ok) {
        setTerminalLines(prev => [...prev, { type: "error", text: data.error ?? "خطأ غير معروف", ts: Date.now() }]);
        return;
      }
      const dur = data.durationMs !== undefined ? ` (${data.durationMs}ms)` : "";
      if (data.engine) {
        setTerminalLines(prev => [...prev, { type: "system", text: `تنفيذ عبر ${data.engine}`, ts: Date.now() }]);
      }
      if (data.stdout?.trim()) {
        data.stdout.trim().split("\n").forEach(line =>
          setTerminalLines(prev => [...prev, { type: "log", text: line, ts: Date.now() }])
        );
      }
      if (data.stderr?.trim()) {
        data.stderr.trim().split("\n").forEach(line =>
          setTerminalLines(prev => [...prev, { type: "error", text: line, ts: Date.now() }])
        );
      }
      if (!data.stdout?.trim() && !data.stderr?.trim()) {
        setTerminalLines(prev => [...prev, { type: "system", text: "(لا يوجد مخرجات)", ts: Date.now() }]);
      }
      const exitCode = data.exitCode;
      setTerminalLines(prev => [...prev,
        data.timedOut
          ? { type: "warn", text: `انتهت المهلة الزمنية${dur}`, ts: Date.now() }
          : exitCode === 0
          ? { type: "system", text: `انتهى التنفيذ بنجاح${dur}`, ts: Date.now() }
          : { type: "warn",   text: `انتهى بكود خروج ${exitCode ?? "?"}${dur}`, ts: Date.now() }
      ]);
    } catch (e) {
      setTerminalLines(prev => [...prev, { type: "error", text: `فشل الاتصال: ${String(e)}`, ts: Date.now() }]);
    } finally { setIsServerRunning(false); }
  }, [activeFile, activeLang, user]);

  const runPreview = useCallback(() => {
    setIsRunning(true);
    setTerminalLines([{ type: "system", text: "▶ تشغيل الكود...", ts: Date.now() }]);
    setPreviewSrc(injectConsoleCapture(buildPreviewHtml(files)));
    setMode("preview");
    setTimeout(() => setIsRunning(false), 500);
  }, [files]);

  // ── Bundle & Preview (esbuild server-side) ────────────────────────────────────
  // Uses the /api/ide/bundle endpoint which runs esbuild on the server, resolving
  // imports from the user's workspace node_modules (installed via `npm install`).
  const bundlePreview = useCallback(async () => {
    if (!user) { setShowLoginModal(true); return; }
    const entry = detectEntryPoint(files);
    if (!entry) {
      setShowTerminal(true);
      setTerminalLines(prev => [...prev, {
        type: "error",
        text: "❌ لم يُعثر على ملف دخول — المتوقع: src/main.tsx أو index.tsx أو App.tsx",
        ts: Date.now(),
      }]);
      return;
    }
    setIsBundling(true);
    setShowTerminal(true);
    setTerminalLines([
      { type: "system", text: "⚡ تجميع المشروع باستخدام esbuild...", ts: Date.now() },
      { type: "info",   text: `📂 نقطة الدخول: ${entry}`, ts: Date.now() },
    ]);
    try {
      const vfsFiles = files
        .filter(f => f.type === "file")
        .map(f => ({ name: getVirtualPath(f, files) || f.name, content: f.content }));
      const resp = await fetch("/api/ide/bundle", {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({ files: vfsFiles, entry }),
      });
      const data = await resp.json() as { ok?: boolean; js?: string; css?: string; error?: string };
      if (!resp.ok || data.error) {
        const errLines = (data.error ?? "خطأ غير معروف").split("\n").filter(Boolean).slice(0, 40);
        setTerminalLines(prev => [
          ...prev,
          ...errLines.map(l => ({ type: "error" as const, text: l, ts: Date.now() })),
          { type: "warn", text: "❌ فشل التجميع — راجع الأخطاء أعلاه", ts: Date.now() },
        ]);
        return;
      }
      const { js = "", css = "" } = data;
      const bundleHtml = [
        `<!DOCTYPE html>`,
        `<html dir="ltr">`,
        `<head>`,
        `  <meta charset="UTF-8">`,
        `  <meta name="viewport" content="width=device-width, initial-scale=1.0">`,
        `  <style>*,*::before,*::after{box-sizing:border-box}body{margin:0;font-family:system-ui,sans-serif}</style>`,
        css ? `  <style>${css}<\/style>` : "",
        `</head>`,
        `<body>`,
        `  <div id="root"></div>`,
        `  <script>${js}<\/script>`,
        `</body>`,
        `</html>`,
      ].filter(Boolean).join("\n");
      setPreviewSrc(injectConsoleCapture(bundleHtml));
      setMode("preview");
      setTerminalLines(prev => [
        ...prev,
        { type: "system", text: "✅ تم التجميع بنجاح — المعاينة جاهزة!", ts: Date.now() },
      ]);
    } catch (e) {
      setTerminalLines(prev => [...prev, {
        type: "error", text: `فشل الاتصال: ${String(e)}`, ts: Date.now(),
      }]);
    } finally { setIsBundling(false); }
  }, [files, user]);

  // Pre-build preview src on mount without switching to preview mode
  useEffect(() => {
    setPreviewSrc(injectConsoleCapture(buildPreviewHtml(files)));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Download ──────────────────────────────────────────────────────────────────
  const handleDownload = useCallback(async () => {
    try {
      const JSZip = (await import("jszip")).default;
      const zip = new JSZip();
      const addToZip = (folder: InstanceType<typeof JSZip>, parentId: string | null) => {
        files.filter(f => f.parentId === parentId).forEach(f => {
          if (f.type === "file") folder.file(f.name, f.content);
          else addToZip(folder.folder(f.name)!, f.id);
        });
      };
      addToZip(zip, "root");
      const blob = await zip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a"); a.href = url; a.download = `${activeProjectName || "project"}.zip`; a.click();
      URL.revokeObjectURL(url);
      setTerminalLines(prev => [...prev, { type: "system", text: "تم تحميل المشروع كـ ZIP", ts: Date.now() }]);
    } catch (e) { setTerminalLines(prev => [...prev, { type: "error", text: "فشل التحميل: " + String(e), ts: Date.now() }]); }
  }, [files, activeProjectName]);

  // ── External file upload ──────────────────────────────────────────────────────
  const processUploadedFiles = useCallback(async (fileList: FileList) => {
    const results: FileNode[] = [];
    for (const file of Array.from(fileList)) {
      const text = await file.text();
      results.push({ id: uid(), name: file.name, type: "file", content: text, parentId: "root" });
    }
    setFiles(prev => {
      // If no root exists yet (first time), create one
      const hasRoot = prev.some(f => f.parentId === null);
      const base = hasRoot ? prev : [{ id: "root", name: "مشروعي", type: "folder" as FileNodeType, content: "", parentId: null, isOpen: true }];
      const next = [...base, ...results.map(r => ({ ...r, parentId: base.find(f => f.parentId === null)?.id ?? "root" }))];
      filesRef.current = next;
      triggerAutoSave(next);
      return next;
    });
    setShowWelcome(false);
    setTerminalLines(prev => [...prev, { type: "system", text: `تم رفع ${results.length} ملف`, ts: Date.now() }]);
    if (results[0]) openTab(results[0].id);
  }, [triggerAutoSave, openTab]);

  const handleExternalDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); setExternalDragOver(false);
    if (e.dataTransfer.files.length) processUploadedFiles(e.dataTransfer.files);
  }, [processUploadedFiles]);

  const termColor: Record<string, string> = {
    log: "text-slate-300", error: "text-red-400", warn: "text-amber-400",
    info: "text-cyan-400", system: "text-violet-400",
  };

  const rootNodes = useMemo(() => files.filter(f => f.parentId === null), [files]);

  // Pre-build parent→children map once (O(n)) for O(1) tree lookup — avoids O(n²) per-node filter
  const childrenMap = useMemo(() => {
    const map = new Map<string, FileNode[]>();
    files.forEach(f => {
      if (f.parentId !== null) {
        const existing = map.get(f.parentId);
        if (existing) existing.push(f);
        else map.set(f.parentId, [f]);
      }
    });
    return map;
  }, [files]);

  // Build full path string for a file node (for search results display)
  const getFilePath = useCallback((nodeId: string): string => {
    const parts: string[] = [];
    let current = files.find(f => f.id === nodeId);
    while (current) {
      parts.unshift(current.name);
      current = current.parentId ? files.find(f => f.id === current!.parentId) : undefined;
    }
    return parts.join(" / ");
  }, [files]);

  // Flat list of files matching the search query
  const searchResults = useMemo(() => {
    const q = fileSearch.trim().toLowerCase();
    if (!q) return [];
    return files.filter(f => f.type === "file" && f.name.toLowerCase().includes(q));
  }, [files, fileSearch]);

  // Web project = has at least one .html file → show preview/web buttons
  // isWebProject: HTML files OR React JSX/TSX files (browser preview makes sense)
  const isWebProject = useMemo(
    () => files.some(f => f.type === "file" && (
      f.name.toLowerCase().endsWith(".html") ||
      f.name.toLowerCase().endsWith(".jsx")  ||
      f.name.toLowerCase().endsWith(".tsx")
    )),
    [files]
  );

  // isNpmProject: project has a package.json with at least one dependency
  const isNpmProject = useMemo(() => {
    const pkg = files.find(f => f.type === "file" && f.name === "package.json");
    if (!pkg?.content) return false;
    try {
      const { dependencies = {}, devDependencies = {} } = JSON.parse(pkg.content);
      return Object.keys(dependencies).length > 0 || Object.keys(devDependencies).length > 0;
    } catch { return false; }
  }, [files]);

  // If the active file changes to a server-side language and we're in preview mode, go back to editor
  useEffect(() => {
    if (activeLang && mode === "preview") setMode("editor");
  }, [activeTabId]); // eslint-disable-line react-hooks/exhaustive-deps
  const mainH = editorHeight;

  if (!mounted || authLoading || !dbLoaded) {
    return (
      <div className="w-full py-6 px-4">
        <div className="rounded-2xl border dark:border-white/10 border-slate-200 dark:bg-[#1e1e2e] bg-slate-800 flex items-center justify-center" style={{ height: editorHeight }}>
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="w-8 h-8 text-violet-400 animate-spin" />
            <span className="text-slate-400 text-sm">جاري تحميل بيئة التطوير...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full py-6 px-4">
      {/* Foreign project banner */}
      {isForeignProject && !projectSavedBanner && (
        <div className="mb-3 flex items-center gap-2 text-xs text-amber-300 bg-amber-500/10 border border-amber-500/20 rounded-xl px-4 py-2.5">
          <Info className="w-4 h-4 flex-shrink-0" />
          <span className="flex-1">أنت تشاهد مشروع مطور آخر. يمكنك تعديله محلياً، ثم اضغط «نسخ وحفظ» لحفظ نسختك الخاصة.</span>
          <a href="/community-projects" className="underline hover:text-amber-200 transition-colors flex items-center gap-1 flex-shrink-0">
            المجتمع <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      )}

      {/* Security sandbox banner — shown when viewing a community project */}
      {isForeignProject && !projectSavedBanner && (
        <div className="mb-3 flex items-center gap-2 text-xs text-emerald-300 bg-emerald-500/8 border border-emerald-500/20 rounded-xl px-4 py-2">
          <ShieldCheck className="w-3.5 h-3.5 flex-shrink-0 text-emerald-400" />
          <span className="flex-1 dark:text-emerald-300/80">
            <span className="font-bold text-emerald-400">بيئة معزولة: </span>
            كود المشروع يعمل في صندوق حماية منفصل ولا يستطيع الوصول لحسابك أو بياناتك.
          </span>
        </div>
      )}

      {/* Saved project banner */}
      {projectSavedBanner && (
        <div className="mb-3 flex items-center gap-2 text-xs text-green-300 bg-green-500/10 border border-green-500/20 rounded-xl px-4 py-2.5">
          <FolderCheck className="w-4 h-4 flex-shrink-0" />
          <span className="flex-1">{projectSavedBanner}</span>
          <a href="/dashboard" className="underline hover:text-green-200 transition-colors flex items-center gap-1">
            لوحة التحكم <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      )}

      {/* Clipboard indicator */}
      {clipboard && (
        <div className="mb-2 flex items-center gap-2 text-xs text-slate-400 bg-white/5 border border-white/10 rounded-lg px-3 py-1.5">
          {clipboard.action === "copy" ? <Copy className="w-3 h-3 text-cyan-400 flex-shrink-0" /> : <Scissors className="w-3 h-3 text-amber-400 flex-shrink-0" />}
          <span className="flex-1 min-w-0 truncate">
            {clipboard.action === "copy" ? "تم نسخ" : "تم قص"}{" "}
            <span className="font-mono text-white">{clipboard.node.name}</span>
            {" — "}
            {isMobile ? "اضغط مطولاً على مجلد للصق" : "انقر بالزر الأيمن على مجلد للصق"}
          </span>
          <button onClick={() => setClipboard(null)} className="flex-shrink-0 hover:text-red-400 transition-colors"><X className="w-3 h-3" /></button>
        </div>
      )}

      {/* Title bar */}
      {showTitle && (
        <div className="mb-4 flex items-center gap-3 flex-wrap">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-500/20 to-cyan-500/20 border border-violet-500/30 flex items-center justify-center flex-shrink-0">
            <Code2 className="w-5 h-5 text-violet-400" />
          </div>
          <div className="min-w-0">
            <h2 className="text-lg font-black dark:text-white text-slate-900 flex items-center gap-2">
              {title}
              {activeProjectName && (
                <span className="text-sm font-medium text-violet-300 bg-violet-500/15 border border-violet-500/20 px-2 py-0.5 rounded-lg truncate max-w-[200px]">
                  {activeProjectName}
                </span>
              )}
            </h2>
            <p className="text-xs dark:text-slate-400 text-slate-500">محرر كود احترافي • متعدد اللغات • معاينة فورية</p>
          </div>
          {!user && (
            <div className="mr-auto flex items-center gap-2 text-xs text-amber-400 bg-amber-400/10 border border-amber-400/20 rounded-lg px-3 py-1.5">
              <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
              <span>سجّل دخولك لحفظ مشروعك تلقائياً</span>
            </div>
          )}
        </div>
      )}

      {/* ── IDE Container ── */}
      <div dir="ltr"
        ref={ideContainerRef}
        className="ide-fullscreen-container rounded-2xl overflow-hidden border dark:border-white/10 border-slate-200 shadow-2xl relative"
        style={isFullscreen ? {} : { height: mainH, minHeight: "380px" }}
        onDragOver={e => { e.preventDefault(); if (e.dataTransfer.types.includes("Files")) setExternalDragOver(true); }}
        onDragLeave={() => setExternalDragOver(false)}
        onDrop={handleExternalDrop}
        onContextMenu={e => e.preventDefault()}
      >
        {externalDragOver && (
          <div className="absolute inset-0 z-30 bg-violet-500/20 border-2 border-dashed border-violet-400 rounded-2xl flex items-center justify-center pointer-events-none">
            <div className="flex flex-col items-center gap-2 text-violet-300">
              <Upload className="w-10 h-10" /><span className="text-sm font-bold">أفلت الملفات هنا</span>
            </div>
          </div>
        )}

        {/* ── Welcome Screen (first visit / empty workspace) ── */}
        {showWelcome && (
          <div className="absolute inset-0 z-20 flex items-center justify-center dark:bg-[#13131f]/95 bg-slate-900/95 backdrop-blur-sm rounded-2xl" dir="rtl">
            <div className="w-full max-w-sm px-6 text-center">
              {/* Icon */}
              <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-violet-500/20 to-cyan-500/20 border border-violet-500/30 flex items-center justify-center">
                <Code2 className="w-8 h-8 text-violet-400" />
              </div>
              <h2 className="text-xl font-black text-white mb-1">مرحباً بك في Cloud IDE</h2>
              <p className="text-slate-400 text-sm mb-6">ابدأ مشروعك الجديد أو استورد مشروعاً موجوداً</p>

              {/* Inline name input when action selected */}
              {welcomeAction && (
                <div className="mb-5 flex flex-col gap-3" dir="ltr">
                  <input
                    autoFocus
                    value={welcomeInput}
                    onChange={e => setWelcomeInput(e.target.value)}
                    placeholder={welcomeAction === "file" ? "اسم الملف  e.g. main.py" : "اسم المجلد  e.g. my-project"}
                    className="w-full bg-white/5 border border-white/15 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 outline-none focus:border-violet-500/60 focus:ring-1 focus:ring-violet-500/30 transition-all"
                    dir="ltr"
                    onKeyDown={e => {
                      if (e.key === "Enter") createWelcomeNode();
                      if (e.key === "Escape") { setWelcomeAction(null); setWelcomeInput(""); }
                    }}
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={createWelcomeNode}
                      disabled={!welcomeInput.trim()}
                      className="flex-1 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-bold transition-colors"
                    >إنشاء</button>
                    <button
                      onClick={() => { setWelcomeAction(null); setWelcomeInput(""); }}
                      className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 text-sm transition-colors"
                    >إلغاء</button>
                  </div>
                </div>
              )}

              {/* Main options grid */}
              {!welcomeAction && (
                <div className="grid grid-cols-2 gap-3 mb-5">
                  <button
                    onClick={() => setWelcomeAction("file")}
                    className="flex flex-col items-center gap-2 p-4 rounded-xl bg-white/5 border border-white/10 hover:bg-violet-500/15 hover:border-violet-500/30 text-slate-300 hover:text-white transition-all group"
                  >
                    <File className="w-6 h-6 text-violet-400 group-hover:scale-110 transition-transform" />
                    <span className="text-xs font-semibold">ملف جديد</span>
                  </button>
                  <button
                    onClick={() => setWelcomeAction("folder")}
                    className="flex flex-col items-center gap-2 p-4 rounded-xl bg-white/5 border border-white/10 hover:bg-amber-500/15 hover:border-amber-500/30 text-slate-300 hover:text-white transition-all group"
                  >
                    <Folder className="w-6 h-6 text-amber-400 group-hover:scale-110 transition-transform" />
                    <span className="text-xs font-semibold">مجلد جديد</span>
                  </button>
                  <button
                    onClick={() => { setShowWelcome(false); setTimeout(() => fileInputRef.current?.click(), 50); }}
                    className="flex flex-col items-center gap-2 p-4 rounded-xl bg-white/5 border border-white/10 hover:bg-cyan-500/15 hover:border-cyan-500/30 text-slate-300 hover:text-white transition-all group"
                  >
                    <Upload className="w-6 h-6 text-cyan-400 group-hover:scale-110 transition-transform" />
                    <span className="text-xs font-semibold">رفع ملفات</span>
                  </button>
                  <button
                    onClick={() => { setShowWelcome(false); setTimeout(() => zipInputRef.current?.click(), 50); }}
                    className="flex flex-col items-center gap-2 p-4 rounded-xl bg-white/5 border border-white/10 hover:bg-green-500/15 hover:border-green-500/30 text-slate-300 hover:text-white transition-all group"
                  >
                    <Archive className="w-6 h-6 text-green-400 group-hover:scale-110 transition-transform" />
                    <span className="text-xs font-semibold">استيراد ZIP</span>
                  </button>
                </div>
              )}

              {!welcomeAction && (
                <p className="text-xs text-slate-600">
                  أو ابدأ بكتابة أوامر في التيرمنال أسفل الصفحة
                  <br />
                  <span className="text-slate-500">مثال: <code className="font-mono text-violet-400">npx create-react-app my-app</code></span>
                </p>
              )}
            </div>
          </div>
        )}

        {/* ── Top Toolbar ── */}
        <div className="flex items-center gap-1.5 px-3 py-2 dark:bg-[#1a1a2e] bg-slate-800 border-b dark:border-white/5 border-slate-600/50 flex-shrink-0 overflow-x-auto scrollbar-none">
          <div className="hidden sm:flex items-center gap-1.5 flex-shrink-0">
            <div className="w-3 h-3 rounded-full bg-red-500/80" />
            <div className="w-3 h-3 rounded-full bg-amber-400/80" />
            <div className="w-3 h-3 rounded-full bg-green-500/80" />
          </div>
          <button onClick={() => setSidebarOpen(o => !o)} className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/10 transition-colors flex-shrink-0">
            <Menu className="w-4 h-4" />
          </button>
          <div className="flex-1" />

          {/* Save to profile button */}
          {user && (
            <button onClick={() => setShowSaveModal(true)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors border flex-shrink-0 ${
                isForeignProject
                  ? "bg-amber-500/20 text-amber-300 hover:bg-amber-500/30 border-amber-500/30"
                  : "bg-violet-500/20 text-violet-300 hover:bg-violet-500/30 border-violet-500/30"
              }`}
              title={isForeignProject ? "نسخ المشروع لملفك الشخصي" : (activeProjectId ? "تحديث المشروع المحفوظ" : "حفظ في ملفي الشخصي")}>
              {isForeignProject ? <GitFork className="w-3.5 h-3.5" /> : <BookmarkPlus className="w-3.5 h-3.5" />}
              <span className="hidden sm:inline">{isForeignProject ? "نسخ وحفظ" : (activeProjectId ? "تحديث" : "حفظ في ملفي")}</span>
            </button>
          )}

          {/* Mode toggle — only for web projects */}
          {isWebProject && (
            <div className="flex items-center bg-white/5 border border-white/10 rounded-xl p-0.5 gap-0.5 flex-shrink-0">
              <button onClick={() => setMode("editor")} className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${mode === "editor" ? "bg-violet-600 text-white shadow-lg shadow-violet-500/20" : "text-slate-400 hover:text-white"}`}>
                <Code2 className="w-3.5 h-3.5" /><span className="hidden sm:inline">المحرر</span>
              </button>
              <button onClick={() => setMode("preview")} className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${mode === "preview" ? "bg-cyan-600 text-white shadow-lg shadow-cyan-500/20" : "text-slate-400 hover:text-white"}`}>
                <Eye className="w-3.5 h-3.5" /><span className="hidden sm:inline">المعاينة</span>
              </button>
            </div>
          )}

          {activeLang && serverLangStyle && (
            <button onClick={runOnServer} disabled={isServerRunning} className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all disabled:opacity-50 border flex-shrink-0 ${serverLangStyle.bg} ${serverLangStyle.color} ${serverLangStyle.border} hover:brightness-125`}>
              {isServerRunning ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Cpu className="w-3.5 h-3.5" />}
              <span className="hidden sm:inline">{serverLangStyle.label}</span>
            </button>
          )}

          {/* Web run button — for web/JSX/TSX projects (CDN + import maps) */}
          {isWebProject && (
            <button onClick={runPreview} disabled={isRunning || isBundling}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-green-500/20 text-green-400 hover:bg-green-500/30 text-xs font-bold transition-colors disabled:opacity-50 border border-green-500/20 flex-shrink-0"
              title="تشغيل سريع (Babel CDN + import maps)">
              {isRunning ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5 fill-current" />}
              <span className="hidden sm:inline">ويب</span>
            </button>
          )}

          {/* Bundle & Preview — esbuild server-side (supports npm packages from node_modules) */}
          {(isWebProject || isNpmProject) && (
            <button onClick={bundlePreview} disabled={isBundling || isRunning}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-violet-500/20 text-violet-400 hover:bg-violet-500/30 text-xs font-bold transition-colors disabled:opacity-50 border border-violet-500/20 flex-shrink-0"
              title="تجميع كامل باستخدام esbuild (يدعم npm packages من node_modules)">
              {isBundling ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Package className="w-3.5 h-3.5" />}
              <span className="hidden sm:inline">Bundle</span>
            </button>
          )}

          {/* ── Desktop-only secondary buttons ── */}
          {/* Share project button */}
          {activeProjectId && (
            <button onClick={() => { const url = new URL(window.location.href); url.searchParams.set("projectId", String(activeProjectId)); navigator.clipboard.writeText(url.toString()).then(() => toast.success("تم نسخ رابط المشروع"), () => toast.error("فشل نسخ الرابط")); }}
              className="hidden sm:flex w-7 h-7 rounded-lg items-center justify-center text-slate-500 hover:text-cyan-400 hover:bg-cyan-500/10 transition-colors" title="مشاركة المشروع">
              <Globe className="w-3.5 h-3.5" />
            </button>
          )}

          <button onClick={() => setShowTemplates(true)}
            className="hidden sm:flex w-7 h-7 rounded-lg items-center justify-center text-slate-500 hover:text-violet-400 hover:bg-violet-500/10 transition-colors" title="قوالب المشاريع">
            <Plus className="w-3.5 h-3.5" />
          </button>

          {user && activeProjectId && (
            <button onClick={() => { setShowHistory(true); loadSnapshots(); }}
              className="hidden sm:flex w-7 h-7 rounded-lg items-center justify-center text-slate-500 hover:text-green-400 hover:bg-green-500/10 transition-colors" title="تاريخ التغييرات">
              <History className="w-3.5 h-3.5" />
            </button>
          )}

          {user && activeProjectId && (
            <button onClick={() => setShowCommitModal(true)}
              className="hidden sm:flex w-7 h-7 rounded-lg items-center justify-center text-slate-500 hover:text-yellow-400 hover:bg-yellow-500/10 transition-colors" title="حفظ نقطة استرداد">
              <GitBranch className="w-3.5 h-3.5" />
            </button>
          )}

          {activeLang === "python" && (
            <button onClick={() => setPythonMode(m => m === "browser" ? "server" : "browser")}
              className={`hidden sm:flex items-center gap-1 px-1.5 h-7 rounded-lg text-[10px] font-bold transition-colors ${pythonMode === "server" ? "bg-violet-500/20 text-violet-300 border border-violet-500/30" : "bg-yellow-500/20 text-yellow-300 border border-yellow-500/30"}`}
              title={pythonMode === "browser" ? "يعمل في المتصفح (Pyodide) — اضغط للتبديل لـ Judge0" : "يعمل على السيرفر (Judge0) — اضغط للتبديل لـ Pyodide"}>
              PY {pythonMode === "browser" ? "WASM" : "J0"}
            </button>
          )}

          <button onClick={() => setShowTerminal(o => !o)}
            className={`hidden sm:flex w-7 h-7 rounded-lg items-center justify-center transition-colors ${showTerminal ? "bg-slate-600 text-cyan-300" : "text-slate-500 hover:text-white hover:bg-white/10"}`}>
            <Terminal className="w-3.5 h-3.5" />
          </button>

          <button onClick={() => fileInputRef.current?.click()}
            className="hidden sm:flex w-7 h-7 rounded-lg items-center justify-center text-slate-500 hover:text-white hover:bg-white/10 transition-colors" title="رفع ملفات فردية">
            <Upload className="w-3.5 h-3.5" />
          </button>
          <input ref={fileInputRef} type="file" multiple className="hidden"
            onChange={e => { if (e.target.files?.length) processUploadedFiles(e.target.files); }} />

          <button onClick={() => zipInputRef.current?.click()}
            className="hidden sm:flex w-7 h-7 rounded-lg items-center justify-center text-slate-500 hover:text-cyan-400 hover:bg-cyan-500/10 transition-colors" title="استيراد مشروع ZIP">
            <Archive className="w-3.5 h-3.5" />
          </button>
          <input ref={zipInputRef} type="file" accept=".zip" className="hidden"
            onChange={e => { const f = e.target.files?.[0]; if (f) { importZip(f); e.target.value = ""; }}} />

          <button onClick={handleDownload}
            className="hidden sm:flex w-7 h-7 rounded-lg items-center justify-center text-slate-500 hover:text-white hover:bg-white/10 transition-colors" title="تحميل المشروع ZIP">
            <Download className="w-3.5 h-3.5" />
          </button>

          {/* ── Fullscreen toggle ── */}
          <button onClick={toggleFullscreen}
            className={`flex w-7 h-7 rounded-lg items-center justify-center transition-colors ${isFullscreen ? "bg-sky-500/25 text-sky-300 hover:bg-sky-500/35" : "text-slate-500 hover:text-sky-300 hover:bg-sky-500/15"}`}
            title={isFullscreen ? "الخروج من وضع ملء الشاشة (Esc)" : "ملء الشاشة (F)"}>
            {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </button>

          {/* ── Mobile "More" button ── */}
          <div className="relative sm:hidden flex-shrink-0">
            <button onClick={() => setShowMobileMore(o => !o)}
              className={`w-7 h-7 rounded-lg flex items-center justify-center transition-colors ${showMobileMore ? "bg-white/15 text-white" : "text-slate-400 hover:text-white hover:bg-white/10"}`}>
              <MoreHorizontal className="w-4 h-4" />
            </button>
            {showMobileMore && (
              <div className="absolute top-9 left-0 z-50 w-52 bg-[#1e1e2e] border border-white/15 rounded-xl shadow-2xl shadow-black/60 py-1.5 px-1.5 backdrop-blur-xl">
                <button onClick={() => { setShowTemplates(true); setShowMobileMore(false); }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-xs rounded-lg transition-colors text-left hover:bg-white/10 text-slate-200">
                  <Plus className="w-3.5 h-3.5 text-violet-400" /> قوالب المشاريع
                </button>
                {activeProjectId && (
                  <button onClick={() => { const url = new URL(window.location.href); url.searchParams.set("projectId", String(activeProjectId)); navigator.clipboard.writeText(url.toString()).then(() => toast.success("تم نسخ رابط المشروع")); setShowMobileMore(false); }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-xs rounded-lg transition-colors text-left hover:bg-white/10 text-slate-200">
                    <Globe className="w-3.5 h-3.5 text-cyan-400" /> مشاركة المشروع
                  </button>
                )}
                {user && activeProjectId && (<>
                  <button onClick={() => { setShowHistory(true); loadSnapshots(); setShowMobileMore(false); }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-xs rounded-lg transition-colors text-left hover:bg-white/10 text-slate-200">
                    <History className="w-3.5 h-3.5 text-green-400" /> تاريخ التغييرات
                  </button>
                  <button onClick={() => { setShowCommitModal(true); setShowMobileMore(false); }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-xs rounded-lg transition-colors text-left hover:bg-white/10 text-slate-200">
                    <GitBranch className="w-3.5 h-3.5 text-yellow-400" /> حفظ نقطة استرداد
                  </button>
                </>)}
                <div className="h-px bg-white/10 my-1" />
                <button onClick={() => { fileInputRef.current?.click(); setShowMobileMore(false); }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-xs rounded-lg transition-colors text-left hover:bg-white/10 text-slate-200">
                  <Upload className="w-3.5 h-3.5 text-slate-400" /> رفع ملفات
                </button>
                <button onClick={() => { zipInputRef.current?.click(); setShowMobileMore(false); }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-xs rounded-lg transition-colors text-left hover:bg-white/10 text-slate-200">
                  <Archive className="w-3.5 h-3.5 text-cyan-400" /> استيراد ZIP
                </button>
                <button onClick={() => { handleDownload(); setShowMobileMore(false); }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-xs rounded-lg transition-colors text-left hover:bg-white/10 text-slate-200">
                  <Download className="w-3.5 h-3.5 text-slate-400" /> تحميل ZIP
                </button>
                {activeLang === "python" && (
                  <button onClick={() => { setPythonMode(m => m === "browser" ? "server" : "browser"); setShowMobileMore(false); }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-xs rounded-lg transition-colors text-left hover:bg-white/10 text-amber-300">
                    <Cpu className="w-3.5 h-3.5" /> Python: {pythonMode === "browser" ? "Pyodide" : "Judge0"}
                  </button>
                )}
              </div>
            )}
          </div>

          <div className="flex items-center w-5 justify-center flex-shrink-0">
            {saveStatus === "saving" && <span title="جاري الحفظ..."><Loader2 className="w-3.5 h-3.5 text-violet-400 animate-spin" /></span>}
            {saveStatus === "saved"  && <span title="تم الحفظ"><CheckCircle2 className="w-3.5 h-3.5 text-green-400" /></span>}
            {saveStatus === "error"  && <span title="فشل الحفظ"><AlertCircle className="w-3.5 h-3.5 text-red-400" /></span>}
          </div>
        </div>

        {/* ── Main Body ── */}
        <div className="flex overflow-hidden" style={{ height: editorHeightInner }}>

          {/* ── File Tree Sidebar — overlay on mobile, inline on md+ ── */}
          {sidebarOpen && (
            <>
              {/* Mobile backdrop */}
              <div
                className="md:hidden absolute inset-0 z-10 bg-black/50 backdrop-blur-sm"
                onClick={() => setSidebarOpen(false)}
              />
            </>
          )}
          {sidebarOpen && (
            <div className="absolute md:relative z-20 md:z-auto w-4/5 sm:w-64 md:w-52 md:max-w-none flex-shrink-0 dark:bg-[#1e1e2e] bg-slate-800 border-r dark:border-white/5 border-slate-600/50 flex flex-col overflow-hidden h-full">
              {/* Header row */}
              <div className="px-2.5 pt-2.5 pb-2 flex items-center justify-between flex-shrink-0 border-b dark:border-white/5 border-slate-600/30">
                <div className="flex items-center gap-1.5 group relative">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Explorer</span>
                  {/* Shortcuts hint tooltip */}
                  <div className="relative">
                    <span className="text-[9px] text-slate-600 cursor-default select-none px-1 py-0.5 rounded bg-white/5 hover:bg-white/10 hover:text-slate-400 transition-colors" title="اختصارات لوحة المفاتيح">⌨</span>
                    <div className="absolute left-0 top-5 z-50 hidden group-hover:block w-44 bg-[#1a1a2e] border border-white/10 rounded-xl shadow-2xl p-2.5 text-[10px] text-slate-400 space-y-1.5 pointer-events-none">
                      <div className="flex items-center justify-between"><span>تراجع</span><kbd className="font-mono bg-white/10 px-1.5 py-0.5 rounded text-[9px]">Ctrl+Z</kbd></div>
                      <div className="flex items-center justify-between"><span>نسخ الملف</span><kbd className="font-mono bg-white/10 px-1.5 py-0.5 rounded text-[9px]">Ctrl+C</kbd></div>
                      <div className="flex items-center justify-between"><span>قص الملف</span><kbd className="font-mono bg-white/10 px-1.5 py-0.5 rounded text-[9px]">Ctrl+X</kbd></div>
                      <div className="flex items-center justify-between"><span>لصق</span><kbd className="font-mono bg-white/10 px-1.5 py-0.5 rounded text-[9px]">Ctrl+V</kbd></div>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-0.5">
                  <button onClick={() => { setSearchOpen(o => { const next = !o; if (!o) setTimeout(() => searchInputRef.current?.focus(), 50); if (o) setFileSearch(""); return next; })}
                  } className={`p-1.5 transition-colors rounded hover:bg-white/5 ${searchOpen ? "text-violet-400" : "text-slate-500 hover:text-violet-400"}`} title="بحث عن ملف"><Search className="w-3.5 h-3.5" /></button>
                  <button onClick={() => {
                    const activeNode = activeTabId ? filesRef.current.find(f => f.id === activeTabId) : null;
                    const targetId = activeNode
                      ? (activeNode.type === "folder" ? activeNode.id : (activeNode.parentId ?? rootNodes[0]?.id ?? "root"))
                      : (rootNodes[0]?.id ?? "root");
                    triggerAddNode(targetId, "file");
                  }} className="p-1.5 hover:text-cyan-400 text-slate-500 transition-colors rounded hover:bg-white/5" title="ملف جديد"><FilePlus className="w-3.5 h-3.5" /></button>
                  <button onClick={() => {
                    const activeNode = activeTabId ? filesRef.current.find(f => f.id === activeTabId) : null;
                    const targetId = activeNode
                      ? (activeNode.type === "folder" ? activeNode.id : (activeNode.parentId ?? rootNodes[0]?.id ?? "root"))
                      : (rootNodes[0]?.id ?? "root");
                    triggerAddNode(targetId, "folder");
                  }} className="p-1.5 hover:text-amber-400 text-slate-500 transition-colors rounded hover:bg-white/5" title="مجلد جديد"><FolderPlus className="w-3.5 h-3.5" /></button>
                  {/* Workspace sync button — loads filesystem → Explorer */}
                  <button
                    onClick={handleWsSync}
                    disabled={isWsSyncing}
                    className="p-1.5 hover:text-green-400 text-slate-500 transition-colors rounded hover:bg-white/5 disabled:opacity-40 disabled:cursor-not-allowed"
                    title="مزامنة Workspace — تحميل ملفات Terminal إلى Explorer"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isWsSyncing ? "animate-spin text-green-400" : ""}`} />
                  </button>
                  {/* Mobile close sidebar button */}
                  <button onClick={() => setSidebarOpen(false)} className="md:hidden p-1.5 text-slate-500 hover:text-white transition-colors rounded hover:bg-white/5"><X className="w-3.5 h-3.5" /></button>
                </div>
              </div>

              {/* Search input */}
              {searchOpen && (
                <div className="px-2 py-1.5 border-b dark:border-white/5 border-slate-600/30 flex-shrink-0">
                  <div className="flex items-center gap-1.5 bg-white/5 border border-white/10 rounded-lg px-2 py-1">
                    <Search className="w-3 h-3 text-slate-500 flex-shrink-0" />
                    <input
                      ref={searchInputRef}
                      value={fileSearch}
                      onChange={e => setFileSearch(e.target.value)}
                      onKeyDown={e => { if (e.key === "Escape") { setFileSearch(""); setSearchOpen(false); } }}
                      placeholder="ابحث عن ملف..."
                      className="flex-1 bg-transparent outline-none text-xs text-white placeholder:text-slate-600 min-w-0"
                      dir="ltr"
                    />
                    {fileSearch && (
                      <button onClick={() => setFileSearch("")} className="text-slate-500 hover:text-white transition-colors flex-shrink-0">
                        <X className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </div>
              )}

              <div className="flex-1 overflow-y-auto py-1 px-1 flex flex-col"
                onContextMenu={e => { if ((e.target as HTMLElement).closest("[data-tree-node]") === null) openContextMenu(e, "sidebar"); }}>

                {/* ── Search results (flat list) ── */}
                {searchOpen && fileSearch.trim() ? (
                  <div className="flex-1">
                    {searchResults.length === 0 ? (
                      <div className="px-3 py-4 text-center text-[11px] text-slate-600">
                        لا توجد نتائج
                      </div>
                    ) : searchResults.map(f => {
                      const q = fileSearch.trim().toLowerCase();
                      const idx = f.name.toLowerCase().indexOf(q);
                      const before = f.name.slice(0, idx);
                      const match  = f.name.slice(idx, idx + q.length);
                      const after  = f.name.slice(idx + q.length);
                      const path   = getFilePath(f.id);
                      const isActive = f.id === activeTabId;
                      return (
                        <div key={f.id} data-tree-node
                          onClick={() => openTab(f.id)}
                          className={`group flex flex-col gap-0.5 px-2 py-1.5 rounded-lg cursor-pointer text-xs transition-all border mx-0.5 mb-0.5
                            ${isActive ? "bg-violet-500/20 border-violet-500/30 text-violet-200" : "hover:bg-white/5 border-transparent text-slate-300 hover:text-white"}`}>
                          <div className="flex items-center gap-1.5 min-w-0">
                            <span className="text-[11px] flex-shrink-0">{fileIcon(f.name)}</span>
                            <span className="font-mono truncate">
                              {before}
                              <span className="bg-yellow-400/30 text-yellow-200 rounded-sm px-0.5">{match}</span>
                              {after}
                            </span>
                          </div>
                          <span className="text-[10px] text-slate-600 truncate font-mono pl-5" dir="ltr">{path}</span>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  /* ── Normal tree view ── */
                  <div className="flex-1">
                    {rootNodes.map(node => (
                      <div key={node.id} data-tree-node>
                        <TreeNode node={node} childrenMap={childrenMap} activeId={activeTabId} depth={0}
                          onSelect={id => { openTab(id); if (isMobile) setSidebarOpen(false); }} onToggle={toggleFolder} onDelete={deleteNode} onRename={renameNode} onTriggerAdd={triggerAddNode}
                          onContextMenu={handleNodeContextMenu} onLongPress={startLongPress}
                          draggedId={draggedId} onDragStart={handleTreeDragStart} onDropInto={handleDropInto}
                          pendingNew={pendingNew} onConfirmNew={confirmAddNode} onCancelNew={cancelAddNode}
                          renameTarget={renameTarget} />
                      </div>
                    ))}
                  </div>
                )}

                {/* Root-level drop zone — visible only while dragging (tree view only) */}
                {!fileSearch.trim() && draggedId && (() => {
                  const draggedNode = files.find(f => f.id === draggedId);
                  const alreadyAtRoot = draggedNode?.parentId === null;
                  if (alreadyAtRoot) return null;
                  return (
                    <RootDropZone onDrop={() => {
                      setFiles(prev => {
                        const next = prev.map(f => f.id === draggedId ? { ...f, parentId: null } : f);
                        filesRef.current = next;
                        triggerAutoSave(next);
                        return next;
                      });
                      setDraggedId(null);
                    }} />
                  );
                })()}
              </div>

              <div className="flex-shrink-0 px-3 py-2 border-t dark:border-white/5 border-slate-600/30">
                {user ? (
                  <div className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-green-400 flex-shrink-0" />
                    <span className="text-[10px] text-slate-500 truncate">{user.name}</span>
                  </div>
                ) : (
                  <button onClick={() => setShowLoginModal(true)} className="flex items-center gap-1.5 text-[10px] text-amber-400 hover:text-amber-300 transition-colors">
                    <LogIn className="w-3 h-3" /><span>سجّل دخولك لحفظ المشروع</span>
                  </button>
                )}
              </div>
            </div>
          )}

          {/* ── Editor / Preview Pane ── */}
          <div className="flex-1 flex flex-col min-w-0 overflow-hidden"
            onContextMenu={e => { if (mode === "editor") openContextMenu(e, "editor"); }}>

            {/* Tab Bar */}
            <div className="flex-shrink-0 flex items-end dark:bg-[#1a1a2e] bg-slate-800 border-b dark:border-white/5 border-slate-600/40 overflow-x-auto scrollbar-none">
              {openTabs.map(tabId => {
                const tabFile = files.find(f => f.id === tabId);
                if (!tabFile) return null;
                const isActive = tabId === activeTabId;
                const sLang = serverLang(tabFile.name);
                const langStyle = sLang ? SERVER_LANG_LABELS[sLang] : null;
                return (
                  <div key={tabId} onClick={() => { setActiveTabId(tabId); setMode("editor"); }}
                    className={`group relative flex items-center gap-1.5 px-3 py-2 cursor-pointer flex-shrink-0 transition-all select-none border-r dark:border-white/5 border-slate-600/30 ${isActive ? "dark:bg-[#1e1e2e] bg-slate-700 text-white" : "text-slate-500 hover:text-slate-300 dark:hover:bg-white/5 hover:bg-slate-700/50"}`}>
                    {isActive && <span className="absolute top-0 left-0 right-0 h-[2px] bg-violet-500 rounded-b" />}
                    <span className="text-[11px]">{fileIcon(tabFile.name)}</span>
                    <span className="text-xs font-mono">{tabFile.name}</span>
                    {langStyle && isActive && (
                      <span className={`text-[9px] px-1 py-0.5 rounded font-bold ${langStyle.bg} ${langStyle.color} border ${langStyle.border}`}>{langStyle.label}</span>
                    )}
                    <button onClick={e => closeTab(tabId, e)} className="opacity-0 group-hover:opacity-100 w-3.5 h-3.5 flex items-center justify-center hover:text-white rounded transition-opacity">
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                );
              })}
            </div>

            {/* Editor / Preview */}
            <div className="flex-1 flex flex-col overflow-hidden">
              {mode === "editor" ? (
                <div className="flex-1 overflow-hidden">
                  {activeFile ? (
                    <MonacoEditor
                      key={activeFile.id}
                      language={langFromName(activeFile.name)}
                      value={activeFile.content}
                      theme={monacoTheme}
                      height="100%"
                      options={{
                        fontSize: 13,
                        fontFamily: "'JetBrains Mono', 'Fira Code', 'Cascadia Code', monospace",
                        fontLigatures: true,
                        minimap: { enabled: false },
                        scrollBeyondLastLine: false,
                        wordWrap: "on",
                        padding: { top: 12 },
                        smoothScrolling: true,
                        cursorBlinking: "smooth",
                        renderLineHighlight: "all",
                        bracketPairColorization: { enabled: true },
                        formatOnPaste: true,
                        formatOnType: false,
                        // ── Autocomplete / IntelliSense ──────────────────────
                        quickSuggestions: { other: true, comments: false, strings: true },
                        quickSuggestionsDelay: 80,
                        suggestOnTriggerCharacters: true,
                        acceptSuggestionOnEnter: "on",
                        tabCompletion: "on",
                        wordBasedSuggestions: "allDocuments",
                        suggest: {
                          showKeywords: true,
                          showSnippets: true,
                          showFunctions: true,
                          showVariables: true,
                          showClasses: true,
                          showModules: true,
                          showProperties: true,
                          showOperators: true,
                          showUnits: true,
                          showValues: true,
                          showConstants: true,
                          showEnums: true,
                          showEnumMembers: true,
                          showColors: true,
                          showFiles: true,
                          showReferences: true,
                          showFolders: true,
                          showTypeParameters: true,
                          showWords: true,
                          insertMode: "insert",
                          filterGraceful: true,
                          snippetsPreventQuickSuggestions: false,
                        },
                        parameterHints: { enabled: true, cycle: true },
                        inlayHints: { enabled: "on" },
                        hover: { enabled: true, delay: 300 },
                      }}
                      onChange={val => { if (val !== undefined) updateContent(activeFile.id, val); }}
                      onMount={editor => {
                        monacoRef.current = editor;
                        editor.onDidFocusEditorWidget(() => { monacoFocusedRef.current = true; });
                        editor.onDidBlurEditorWidget(() => { monacoFocusedRef.current = false; });
                      }}
                    />
                  ) : (
                    <div className="flex-1 flex items-center justify-center dark:bg-[#1e1e1e] bg-slate-900 h-full">
                      <div className="text-center">
                        <File className="w-12 h-12 text-slate-700 mx-auto mb-3" />
                        <p className="text-slate-500 text-sm">اختر ملفاً لتبدأ التعديل</p>
                        <p className="text-slate-600 text-xs mt-1">أو انقر بالزر الأيمن لإنشاء ملف جديد</p>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex-1 overflow-hidden dark:bg-[#1e1e1e] bg-slate-900">
                  <iframe ref={previewIframeRef} srcDoc={previewSrc} className="w-full h-full border-0" sandbox="allow-scripts" title="preview" />
                </div>
              )}

              {/* Language engine badge — shows which engine will run the file */}
              {activeFile && activeLang && activeLang !== "python" && (() => {
                const isJudge0 = JUDGE0_LANGS.has(activeLang);
                if (!isJudge0) return null;
                return (
                  <div className="flex-shrink-0 flex items-center gap-2 px-3 py-1.5 bg-sky-500/10 border-t border-sky-500/20 text-sky-300 text-[11px]">
                    <Cpu className="w-3.5 h-3.5 flex-shrink-0" />
                    <span>{SERVER_LANG_LABELS[activeLang]?.label ?? activeLang} — سيتم التنفيذ عبر Judge0 Cloud (تجميع + تشغيل في بيئة آمنة)</span>
                  </div>
                );
              })()}

              {/* Terminal */}
              {showTerminal && (
                <div className="flex-shrink-0 border-t dark:border-white/5 border-slate-600/40 dark:bg-[#0d0d1a] bg-slate-900 flex flex-col" style={{ height: terminalHeight }}>
                  {/* Drag/touch resize handle */}
                  <div
                    className="w-full h-2.5 cursor-row-resize flex-shrink-0 hover:bg-violet-500/20 transition-colors group touch-none"
                    onMouseDown={e => {
                      e.preventDefault();
                      termResizingRef.current = { startY: e.clientY, startH: terminalHeight };
                      const onMove = (ev: MouseEvent) => {
                        if (!termResizingRef.current) return;
                        const delta = termResizingRef.current.startY - ev.clientY;
                        const next = Math.min(600, Math.max(80, termResizingRef.current.startH + delta));
                        setTerminalHeight(next);
                      };
                      const onUp = () => {
                        termResizingRef.current = null;
                        window.removeEventListener("mousemove", onMove);
                        window.removeEventListener("mouseup", onUp);
                      };
                      window.addEventListener("mousemove", onMove);
                      window.addEventListener("mouseup", onUp);
                    }}
                    onTouchStart={e => {
                      const startY = e.touches[0].clientY;
                      const startH = terminalHeight;
                      const onMove = (ev: TouchEvent) => {
                        ev.preventDefault();
                        const delta = startY - ev.touches[0].clientY;
                        setTerminalHeight(Math.min(600, Math.max(80, startH + delta)));
                      };
                      const onEnd = () => {
                        document.removeEventListener("touchmove", onMove);
                        document.removeEventListener("touchend", onEnd);
                      };
                      document.addEventListener("touchmove", onMove, { passive: false });
                      document.addEventListener("touchend", onEnd);
                    }}
                  >
                    <div className="mx-auto mt-1 w-10 h-1 rounded-full dark:bg-white/15 bg-slate-600/50 group-hover:bg-violet-400/60 transition-colors" />
                  </div>
                  <div className="flex items-center justify-between px-3 py-1.5 border-b dark:border-white/5 border-slate-700/50 flex-shrink-0">
                    <div className="flex items-center gap-2">
                      <Terminal className="w-3 h-3 text-slate-500" />
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Terminal</span>
                      <span className="text-[9px] text-slate-600 hidden sm:inline">Ctrl+` للتبديل</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      {/* Stdin toggle button */}
                      {activeLang && activeLang !== "html" && activeLang !== "css" && activeLang !== "sql" && (
                        <button
                          onClick={() => setShowStdin(s => !s)}
                          title="مدخلات البرنامج (stdin)"
                          className={`flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded transition-colors ${
                            showStdin
                              ? "bg-cyan-500/20 text-cyan-400 border border-cyan-500/30"
                              : stdinValue.trim()
                              ? "bg-amber-500/15 text-amber-400 border border-amber-500/30"
                              : "text-slate-600 hover:text-cyan-400 border border-transparent"
                          }`}
                        >
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8h18M3 12h12M3 16h8" /></svg>
                          <span className="hidden sm:inline">stdin</span>
                          {stdinValue.trim() && <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />}
                        </button>
                      )}
                      <button onClick={clearTerminal} className="text-[10px] text-slate-600 hover:text-slate-400 transition-colors flex items-center gap-1">
                        <RotateCcw className="w-3 h-3" /> مسح
                      </button>
                      <button onClick={() => setShowTerminal(false)} className="text-slate-600 hover:text-slate-400 transition-colors ml-1"><X className="w-3 h-3" /></button>
                    </div>
                  </div>

                  {/* ── stdin input panel ── */}
                  {showStdin && (
                    <div className="flex-shrink-0 border-b dark:border-white/5 border-slate-700/50 bg-cyan-950/20 px-3 py-2 flex flex-col gap-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-semibold text-cyan-400 flex items-center gap-1.5">
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8h18M3 12h12M3 16h8" /></svg>
                          stdin — مدخلات البرنامج
                        </span>
                        <span className="text-[9px] text-slate-600">كل سطر = إجابة واحدة لـ input()</span>
                      </div>
                      <textarea
                        value={stdinValue}
                        onChange={e => setStdinValue(e.target.value)}
                        placeholder={"اكتب المدخلات هنا، كل سطر = قيمة واحدة\nمثال:\nأحمد\n25"}
                        rows={3}
                        dir="auto"
                        spellCheck={false}
                        className="w-full bg-black/30 border border-cyan-500/20 rounded-lg px-2.5 py-2 font-mono text-[11px] text-slate-200 placeholder:text-slate-600 outline-none focus:border-cyan-500/50 resize-none"
                      />
                      {stdinValue.trim() && (
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] text-slate-600">
                            {stdinValue.trim().split("\n").length} سطر{stdinValue.trim().split("\n").length > 1 ? "" : ""}
                          </span>
                          <button
                            onClick={() => setStdinValue("")}
                            className="text-[10px] text-slate-600 hover:text-red-400 transition-colors"
                          >
                            مسح
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  <div ref={termRef} className="flex-1 overflow-y-auto px-3 py-2 font-mono text-[11px] space-y-0.5 min-h-0">
                    {terminalLines.map((line, i) => (
                      line.type === "image" && line.imageData ? (
                        <div key={i} className="my-2">
                          <div className="text-[9px] text-violet-400 mb-1 select-none">📊 matplotlib output</div>
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={`data:image/png;base64,${line.imageData}`}
                            alt="matplotlib plot"
                            className="max-w-full rounded-lg border border-white/10 shadow-lg"
                            style={{ maxHeight: 400 }}
                          />
                        </div>
                      ) : (
                        <div key={i} className={`${termColor[line.type] ?? "text-slate-300"} leading-relaxed`}>
                          <span className="text-slate-600 mr-2 select-none">›</span>
                          {parseAnsi(line.text)}
                        </div>
                      )
                    ))}
                  </div>

                  {/* ── Shell input ─────────────────────────────────────────── */}
                  <div className="flex-shrink-0 border-t dark:border-white/5 border-slate-700/30 px-2 py-1.5 flex items-center gap-1.5 bg-black/20">
                    {isShellRunning ? (
                      <Loader2 className="w-3 h-3 animate-spin text-cyan-400 flex-shrink-0" />
                    ) : (
                      <span className="text-[11px] font-mono font-bold text-green-400 select-none flex-shrink-0 whitespace-nowrap">
                        {shellCwd ? `~/${shellCwd}` : "~"}$
                      </span>
                    )}
                    <input
                      ref={termInputRef}
                      type="text"
                      value={terminalCmd}
                      onChange={e => setTerminalCmd(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === "Enter" && !isShellRunning) {
                          handleShellCommand(terminalCmd);
                        } else if (e.key === "ArrowUp") {
                          e.preventDefault();
                          const next = Math.min(historyIdx + 1, cmdHistory.length - 1);
                          setHistoryIdx(next);
                          if (cmdHistory[next]) setTerminalCmd(cmdHistory[next]);
                        } else if (e.key === "ArrowDown") {
                          e.preventDefault();
                          const prev = historyIdx - 1;
                          if (prev < 0) { setHistoryIdx(-1); setTerminalCmd(""); }
                          else { setHistoryIdx(prev); setTerminalCmd(cmdHistory[prev]); }
                        } else if (e.key === "l" && e.ctrlKey) {
                          e.preventDefault();
                          clearTerminal();
                        }
                      }}
                      placeholder={isShellRunning ? "جارٍ التنفيذ..." : 'npx create-react-app my-app   |   help للأوامر'}
                      disabled={isShellRunning}
                      dir="ltr"
                      spellCheck={false}
                      autoComplete="off"
                      className="flex-1 bg-transparent font-mono text-[11px] text-slate-200 placeholder:text-slate-600 outline-none disabled:opacity-50 min-w-0"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Pyodide hidden iframe */}
        {pyodideSrc && (
          <iframe ref={pyIframeRef} key={pyodideSrc} srcDoc={pyodideSrc} sandbox="allow-scripts" className="hidden" title="pyodide-runner" />
        )}
      </div>

      {/* ── Mobile Bottom Action Bar ── */}
      <div className="sm:hidden flex items-center justify-around mt-2 px-1 py-2 rounded-xl dark:bg-[#1a1a2e] bg-slate-800 border dark:border-white/10 border-slate-300">
        {/* Files */}
        <button onClick={() => setSidebarOpen(o => !o)}
          className={`flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl transition-colors ${sidebarOpen ? "text-violet-400 bg-violet-500/15" : "text-slate-400 hover:text-white"}`}>
          <Menu className="w-5 h-5" />
          <span className="text-[9px] font-bold">الملفات</span>
        </button>

        {/* New File */}
        <button onClick={() => {
          const rootId = filesRef.current.find(f => f.parentId === null)?.id ?? "root";
          triggerAddNode(rootId, "file");
          setSidebarOpen(true);
        }} className="flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl text-slate-400 hover:text-cyan-400 transition-colors">
          <FilePlus className="w-5 h-5" />
          <span className="text-[9px] font-bold">ملف جديد</span>
        </button>

        {/* Run */}
        {(isWebProject || (activeLang && serverLangStyle)) && (
          <button
            onClick={isWebProject ? runPreview : runOnServer}
            disabled={isRunning || isServerRunning || isBundling}
            className="flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl bg-green-500/20 text-green-400 hover:bg-green-500/30 transition-colors disabled:opacity-50">
            {(isRunning || isServerRunning) ? <Loader2 className="w-5 h-5 animate-spin" /> : <Play className="w-5 h-5 fill-current" />}
            <span className="text-[9px] font-bold">تشغيل</span>
          </button>
        )}

        {/* Bundle & Preview — mobile */}
        {(isWebProject || isNpmProject) && (
          <button onClick={bundlePreview} disabled={isBundling || isRunning}
            className="flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl bg-violet-500/20 text-violet-400 hover:bg-violet-500/30 transition-colors disabled:opacity-50">
            {isBundling ? <Loader2 className="w-5 h-5 animate-spin" /> : <Package className="w-5 h-5" />}
            <span className="text-[9px] font-bold">Bundle</span>
          </button>
        )}

        {/* Terminal */}
        <button onClick={() => setShowTerminal(o => !o)}
          className={`flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl transition-colors ${showTerminal ? "text-cyan-400 bg-cyan-500/15" : "text-slate-400 hover:text-white"}`}>
          <Terminal className="w-5 h-5" />
          <span className="text-[9px] font-bold">Terminal</span>
        </button>

        {/* Fullscreen — mobile */}
        <button onClick={toggleFullscreen}
          className={`flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl transition-colors ${isFullscreen ? "text-sky-300 bg-sky-500/15" : "text-slate-400 hover:text-white"}`}>
          {isFullscreen ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
          <span className="text-[9px] font-bold">{isFullscreen ? "تصغير" : "تكبير"}</span>
        </button>

        {/* Mode toggle for web — preview */}
        {isWebProject && (
          <button onClick={() => setMode(m => m === "editor" ? "preview" : "editor")}
            className={`flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl transition-colors ${mode === "preview" ? "text-cyan-400 bg-cyan-500/15" : "text-slate-400 hover:text-white"}`}>
            <Eye className="w-5 h-5" />
            <span className="text-[9px] font-bold">معاينة</span>
          </button>
        )}

        {/* My Projects */}
        {user && (
          <button
            onClick={() => { setShowMobileProjects(true); loadMobileProjects(); }}
            className={`relative flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl transition-colors ${showMobileProjects ? "text-violet-400 bg-violet-500/15" : "text-slate-400 hover:text-white"}`}>
            <FolderOpen className="w-5 h-5" />
            <span className="text-[9px] font-bold">مشاريعي</span>
            {/* Unsaved changes badge */}
            {unsavedChanges > 0 && saveStatus !== "saved" && (
              <span className={`absolute -top-1 -right-0.5 min-w-[16px] h-[16px] px-0.5 rounded-full text-white text-[9px] font-black flex items-center justify-center shadow-md ${
                saveStatus === "error" ? "bg-red-500 shadow-red-500/40" : "bg-amber-500 shadow-amber-500/40"
              }`}>
                {saveStatus === "error" ? "!" : unsavedChanges > 9 ? "9+" : unsavedChanges}
              </span>
            )}
          </button>
        )}
      </div>

      {/* Hint for long-press — mobile only */}
      {isMobile && (
        <p className="sm:hidden text-center text-[10px] text-slate-600 mt-1.5">
          اضغط مطولاً على أي ملف أو مجلد لعرض الخيارات
        </p>
      )}

      {/* ── Mobile Projects Drawer ── */}
      {showMobileProjects && (
        <div className="fixed inset-0 z-[120] sm:hidden" onClick={() => setShowMobileProjects(false)}>
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

          {/* Sheet slides up from bottom */}
          <div
            className="absolute bottom-0 left-0 right-0 bg-[#0d1117] border-t border-violet-500/30 rounded-t-3xl shadow-2xl flex flex-col"
            style={{ maxHeight: "75vh" }}
            onClick={e => e.stopPropagation()}
          >
            {/* Handle bar */}
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 rounded-full bg-white/20" />
            </div>

            {/* Header */}
            <div className="flex items-center justify-between px-5 py-3 border-b border-white/10">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-violet-500/20 border border-violet-500/30 flex items-center justify-center">
                  <FolderOpen className="w-4 h-4 text-violet-400" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-white">مشاريعي</h3>
                  <p className="text-[10px] text-slate-500">
                    {mobileProjectsLoading ? "جاري التحميل..." : `${mobileProjects.length} مشروع`}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowMobileProjects(false)}
                className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Project list */}
            <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
              {mobileProjectsLoading ? (
                <div className="flex items-center justify-center py-10 gap-2 text-slate-500 text-sm">
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>جاري تحميل المشاريع...</span>
                </div>
              ) : !user ? (
                <div className="flex flex-col items-center justify-center py-10 gap-3 text-slate-500 text-sm">
                  <FolderOpen className="w-8 h-8 opacity-40" />
                  <p>سجّل دخولك لرؤية مشاريعك</p>
                  <button
                    onClick={() => { setShowMobileProjects(false); setShowLoginModal(true); }}
                    className="px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-xs font-bold transition-colors"
                  >
                    تسجيل الدخول
                  </button>
                </div>
              ) : mobileProjects.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 gap-3 text-slate-500 text-sm">
                  <FolderOpen className="w-8 h-8 opacity-40" />
                  <p>لا توجد مشاريع محفوظة بعد</p>
                  <p className="text-[11px] text-slate-600">اضغط "حفظ في ملفي" لحفظ مشروعك الحالي</p>
                </div>
              ) : (
                <>
                  {/* Current project highlight */}
                  {activeProjectId && (
                    <p className="text-[10px] text-slate-600 px-1 mb-1">
                      المشروع الحالي: <span className="text-violet-400 font-bold">{activeProjectName || "بدون اسم"}</span>
                    </p>
                  )}
                  {mobileProjects.map(proj => {
                    const isActive = proj.id === activeProjectId;
                    const date = new Date(proj.updatedAt).toLocaleDateString("ar-EG", { month: "short", day: "numeric" });
                    const langTags = proj.tags?.slice(0, 3) ?? [];
                    return (
                      <button
                        key={proj.id}
                        onClick={() => switchToProject(proj)}
                        className={`w-full text-right flex items-start gap-3 px-4 py-3.5 rounded-2xl border transition-all active:scale-[0.98] ${
                          isActive
                            ? "bg-violet-600/20 border-violet-500/50 ring-1 ring-violet-500/40"
                            : "bg-white/5 border-white/10 hover:bg-white/8 hover:border-white/20"
                        }`}
                      >
                        {/* Icon */}
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5 ${
                          isActive ? "bg-violet-500/30 border border-violet-500/40" : "bg-white/5 border border-white/10"
                        }`}>
                          {isActive
                            ? <Code2 className="w-4 h-4 text-violet-400" />
                            : <FolderOpen className="w-4 h-4 text-slate-400" />
                          }
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <span className={`text-sm font-bold truncate ${isActive ? "text-violet-300" : "text-white"}`}>
                              {proj.name}
                            </span>
                            {isActive && (
                              <span className="flex-shrink-0 text-[9px] bg-violet-500/30 text-violet-300 px-1.5 py-0.5 rounded-full font-bold">
                                محمّل
                              </span>
                            )}
                          </div>
                          {proj.description && (
                            <p className="text-[11px] text-slate-500 mt-0.5 truncate">{proj.description}</p>
                          )}
                          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                            <span className="text-[10px] text-slate-600 flex items-center gap-1">
                              <Clock className="w-2.5 h-2.5" />
                              {date}
                            </span>
                            {langTags.map(tag => (
                              <span key={tag} className="text-[9px] bg-slate-700/60 text-slate-400 px-1.5 py-0.5 rounded-full">
                                {tag}
                              </span>
                            ))}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </>
              )}
            </div>

            {/* Footer */}
            <div className="px-4 py-3 border-t border-white/10">
              <button
                onClick={() => { setShowMobileProjects(false); setShowSaveModal(true); }}
                className="w-full py-3 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-sm font-bold transition-colors flex items-center justify-center gap-2"
              >
                <Save className="w-4 h-4" />
                حفظ المشروع الحالي
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Overlays ── */}
      {contextMenu && (
        <ContextMenu menu={contextMenu} clipboard={clipboard} onClose={closeContextMenu}
          onRename={id => { closeContextMenu(); setRenameTarget(id); }}
          onCopy={handleCopy} onCut={handleCut} onPaste={handlePaste} onDelete={deleteNode}
          onNewFile={p => triggerAddNode(p, "file")} onNewFolder={p => triggerAddNode(p, "folder")}
          onFormatCode={handleFormatCode} onClearTerminal={clearTerminal} />
      )}

      {showSaveModal && (
        <SaveToProfileModal
          files={files}
          isForkMode={isForeignProject}
          forkedFromId={isForeignProject ? activeProjectId : null}
          onClose={() => setShowSaveModal(false)}
          onSaved={(id, name) => {
            if (isForeignProject) {
              setIsForeignProject(false);
              isForeignRef.current = false;
              setForeignProjectOwnerId(null);
            }
            handleProjectSaved(id, name);
          }}
        />
      )}

      {showLoginModal && <LoginPromptModal onClose={() => setShowLoginModal(false)} />}

      {/* ── Commit Modal ── */}
      {showCommitModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => setShowCommitModal(false)}>
          <div className="relative w-full max-w-md bg-[#0f1629] border border-white/10 rounded-2xl shadow-2xl p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <GitBranch className="w-4 h-4 text-yellow-400" />
                <h3 className="text-base font-black text-white">حفظ نقطة استرداد</h3>
              </div>
              <button onClick={() => setShowCommitModal(false)} className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/10 transition-colors"><X className="w-3.5 h-3.5" /></button>
            </div>
            <p className="text-xs text-slate-400 mb-4">تصف هذه النقطة حالة المشروع الحالية. يمكنك الرجوع إليها لاحقاً.</p>
            <input
              value={commitMsg}
              onChange={e => setCommitMsg(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); createSnapshot(commitMsg); }}}
              placeholder="مثال: أضفت ميزة التسجيل، أو أصلحت خطأ في الحساب..."
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder:text-slate-600 outline-none focus:border-yellow-500/40 transition-colors mb-4"
              dir="rtl" autoFocus
            />
            <div className="flex items-center gap-2 justify-end">
              <button onClick={() => setShowCommitModal(false)} className="px-4 py-2 text-xs text-slate-400 hover:text-white transition-colors">إلغاء</button>
              <button
                onClick={() => createSnapshot(commitMsg)}
                disabled={!commitMsg.trim() || committingInProgress}
                className="flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-yellow-500 to-amber-500 text-black disabled:opacity-40 disabled:cursor-not-allowed hover:from-yellow-400 hover:to-amber-400 transition-all">
                {committingInProgress ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <GitBranch className="w-3.5 h-3.5" />}
                حفظ النقطة
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── History Panel ── */}
      {showHistory && (
        <div className="fixed inset-0 z-50 flex" onClick={() => setShowHistory(false)}>
          {/* backdrop */}
          <div className="flex-1 bg-black/50 backdrop-blur-sm" />
          {/* drawer from right */}
          <div className="w-full max-w-sm bg-[#0d1025] border-l border-white/10 flex flex-col shadow-2xl h-full overflow-hidden" onClick={e => e.stopPropagation()}>
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/5">
              <div className="flex items-center gap-2">
                <History className="w-4 h-4 text-green-400" />
                <div>
                  <h3 className="text-sm font-black text-white">تاريخ التغييرات</h3>
                  <p className="text-[10px] text-slate-500">آخر 20 نقطة استرداد</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => { setShowHistory(false); setShowCommitModal(true); }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-yellow-500/20 text-yellow-300 border border-yellow-500/30 hover:bg-yellow-500/30 transition-colors">
                  <GitBranch className="w-3 h-3" />
                  نقطة جديدة
                </button>
                <button onClick={() => setShowHistory(false)} className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/10 transition-colors">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Snapshots list */}
            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              {snapshotsLoading ? (
                <div className="flex items-center justify-center py-10">
                  <Loader2 className="w-5 h-5 text-slate-500 animate-spin" />
                </div>
              ) : snapshots.length === 0 ? (
                <div className="text-center py-10">
                  <Clock className="w-10 h-10 text-slate-700 mx-auto mb-3" />
                  <p className="text-sm text-slate-500">لا توجد نقاط استرداد بعد</p>
                  <p className="text-xs text-slate-600 mt-1">اضغط "نقطة جديدة" لحفظ الحالة الحالية</p>
                </div>
              ) : snapshots.map((snap, i) => (
                <div key={snap.id} className="group bg-white/3 border border-white/5 rounded-xl p-3.5 hover:border-green-500/20 hover:bg-green-500/5 transition-all">
                  <div className="flex items-start gap-2.5">
                    {/* Timeline dot */}
                    <div className="flex flex-col items-center flex-shrink-0 pt-0.5">
                      <div className={`w-2.5 h-2.5 rounded-full border-2 ${i === 0 ? "bg-green-400 border-green-400" : "bg-slate-700 border-slate-600"}`} />
                      {i < snapshots.length - 1 && <div className="w-px flex-1 bg-slate-800 mt-1 min-h-[20px]" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-white truncate">{snap.message}</p>
                      <p className="text-[10px] text-slate-500 mt-0.5">
                        {new Date(snap.createdAt).toLocaleString("ar-EG", { dateStyle: "short", timeStyle: "short" })}
                        {i === 0 && <span className="mr-1.5 px-1.5 py-0.5 rounded bg-green-500/20 text-green-400 text-[9px] font-bold">الأحدث</span>}
                      </p>
                      {/* Actions */}
                      <div className="flex items-center gap-1.5 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => restoreSnapshot(snap.id)}
                          className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold bg-green-500/20 text-green-300 border border-green-500/30 hover:bg-green-500/30 transition-colors">
                          <RotateCcw className="w-2.5 h-2.5" />
                          استعادة
                        </button>
                        <button
                          onClick={() => deleteSnapshot(snap.id)}
                          className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] text-slate-500 border border-white/5 hover:border-red-500/30 hover:text-red-400 hover:bg-red-500/10 transition-colors">
                          <Trash2 className="w-2.5 h-2.5" />
                          حذف
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Footer info */}
            <div className="px-5 py-3 border-t border-white/5">
              <p className="text-[10px] text-slate-600 text-center">يتم حفظ آخر 20 نقطة استرداد لكل مشروع</p>
            </div>
          </div>
        </div>
      )}

      {/* ── Templates Modal ── */}
      {showTemplates && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => setShowTemplates(false)}>
          <div className="relative w-full max-w-2xl bg-[#0f1629] border border-white/10 rounded-2xl shadow-2xl p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <div>
                <h3 className="text-lg font-black text-white">قوالب المشاريع</h3>
                <p className="text-xs text-slate-400 mt-0.5">اختر قالباً لبدء مشروع جديد</p>
              </div>
              <button onClick={() => setShowTemplates(false)} className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/10 transition-colors"><X className="w-4 h-4" /></button>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {([
                { icon: "WEB", color: "text-cyan-400 bg-cyan-500/15", name: "HTML + CSS + JS", desc: "موقع ويب أساسي مع تنسيق وتفاعل", files: defaultFiles() },
                { icon: "JSX", color: "text-blue-400 bg-blue-500/15", name: "React (CDN)", desc: "مكوّن React بدون بيئة بناء", files: [
                  { id: "root", name: "مشروعي", type: "folder" as const, content: "", parentId: null, isOpen: true },
                  { id: "index.html", name: "index.html", type: "file" as const, parentId: "root", content: `<!DOCTYPE html>\n<html lang="ar" dir="rtl">\n<head>\n  <meta charset="UTF-8">\n  <meta name="viewport" content="width=device-width, initial-scale=1.0">\n  <title>React App</title>\n  <script src="https://unpkg.com/react@18/umd/react.development.js"></script>\n  <script src="https://unpkg.com/react-dom@18/umd/react-dom.development.js"></script>\n  <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>\n  <style>body{font-family:Tajawal,sans-serif;background:#0f1629;color:#e2e8f0;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0}</style>\n</head>\n<body>\n  <div id="root"></div>\n  <script type="text/babel">\n    function App() {\n      const [count, setCount] = React.useState(0);\n      return (\n        <div style={{textAlign:'center'}}>\n          <h1 style={{color:'#67e8f9'}}>مرحباً بك في React</h1>\n          <p>العداد: {count}</p>\n          <button onClick={() => setCount(c => c+1)}\n            style={{background:'linear-gradient(135deg,#06b6d4,#8b5cf6)',color:'white',border:'none',padding:'0.6rem 2rem',borderRadius:'12px',cursor:'pointer',fontSize:'1rem'}}>\n            اضغط هنا\n          </button>\n        </div>\n      );\n    }\n    ReactDOM.createRoot(document.getElementById('root')).render(<App/>);\n  </script>\n</body>\n</html>` },
                ]},
                { icon: "PY", color: "text-yellow-400 bg-yellow-500/15", name: "Python Script", desc: "برنامج Python يعمل في المتصفح", files: [
                  { id: "root", name: "مشروعي", type: "folder" as const, content: "", parentId: null, isOpen: true },
                  { id: "main.py", name: "main.py", type: "file" as const, parentId: "root", content: `# برنامج Python أساسي\ndef greet(name: str) -> str:\n    return f"مرحباً {name}"\n\nnames = ["أحمد", "سارة", "محمد"]\nfor name in names:\n    print(greet(name))\n\n# قائمة الأرقام\nnums = list(range(1, 11))\nprint(f"المجموع: {sum(nums)}")\nprint(f"المتوسط: {sum(nums)/len(nums):.1f}")` },
                ]},
                { icon: "JS", color: "text-amber-400 bg-amber-500/15", name: "Node.js Script", desc: "برنامج Node.js للتنفيذ على السيرفر", files: [
                  { id: "root", name: "مشروعي", type: "folder" as const, content: "", parentId: null, isOpen: true },
                  { id: "index.js", name: "index.js", type: "file" as const, parentId: "root", content: `// Node.js script\nconsole.log('Node.js', process.version);\n\n// إنشاء قائمة مهام\nconst tasks = [\n  { id: 1, title: 'تعلم JavaScript', done: true },\n  { id: 2, title: 'بناء API',       done: false },\n  { id: 3, title: 'نشر المشروع',   done: false },\n];\n\ntasks.forEach(t => {\n  const status = t.done ? '[منجز]' : '[قيد التنفيذ]';\n  console.log(\`\${status} \${t.id}. \${t.title}\`);\n});\n\nconst done = tasks.filter(t => t.done).length;\nconsole.log(\`\\nالمنجز: \${done}/\${tasks.length}\`);` },
                ]},
                { icon: "TS", color: "text-sky-400 bg-sky-500/15", name: "TypeScript", desc: "كود TypeScript مع أنواع بيانات", files: [
                  { id: "root", name: "مشروعي", type: "folder" as const, content: "", parentId: null, isOpen: true },
                  { id: "main.ts", name: "main.ts", type: "file" as const, parentId: "root", content: `// TypeScript مع أنواع بيانات\ninterface Product {\n  id: number;\n  name: string;\n  price: number;\n  inStock: boolean;\n}\n\nconst products: Product[] = [\n  { id: 1, name: 'كتاب TypeScript', price: 120, inStock: true },\n  { id: 2, name: 'دورة React',    price: 299, inStock: true },\n  { id: 3, name: 'هدسيت برمجة',  price: 450, inStock: false },\n];\n\nfunction filterAvailable(items: Product[]): Product[] {\n  return items.filter(p => p.inStock);\n}\n\nconst available = filterAvailable(products);\nconsole.log('المنتجات المتاحة:');\navailable.forEach(p => console.log(\`  - \${p.name} — \${p.price} ج.م\`));\nconsole.log(\`الإجمالي: \${available.reduce((s, p) => s + p.price, 0)} ج.م\`);` },
                ]},
                { icon: "RS", color: "text-orange-400 bg-orange-500/15", name: "Rust", desc: "برنامج Rust مع compile آمن", files: [
                  { id: "root", name: "مشروعي", type: "folder" as const, content: "", parentId: null, isOpen: true },
                  { id: "main.rs", name: "main.rs", type: "file" as const, parentId: "root", content: `// Rust — برنامج أساسي\nfn fibonacci(n: u64) -> u64 {\n    match n {\n        0 => 0,\n        1 => 1,\n        _ => fibonacci(n - 1) + fibonacci(n - 2),\n    }\n}\n\nfn main() {\n    println!("مرحباً من Rust!");\n    \n    for i in 0..=10 {\n        println!("fib({}) = {}", i, fibonacci(i));\n    }\n\n    let numbers: Vec<i32> = (1..=5).collect();\n    let sum: i32 = numbers.iter().sum();\n    println!("\\nمجموع 1..5 = {}", sum);\n}` },
                ]},
              ] as { icon: string; color: string; name: string; desc: string; files: FileNode[] }[]).map((tpl) => (
                <button
                  key={tpl.name}
                  onClick={() => {
                    if (!confirm(`سيتم استبدال الملفات الحالية بقالب "${tpl.name}". هل تريد المتابعة؟`)) return;
                    setFiles(tpl.files);
                    const firstFile = tpl.files.find(f => f.type === "file");
                    if (firstFile) setActiveTabId(firstFile.id);
                    setShowTemplates(false);
                    toast.success(`تم تحميل قالب: ${tpl.name}`);
                  }}
                  className="flex flex-col gap-2 p-4 rounded-xl bg-white/5 border border-white/10 hover:border-violet-500/40 hover:bg-violet-500/10 transition-all text-right group"
                >
                  <div className="flex items-center gap-2">
                    <span className={`text-[10px] font-black px-1.5 py-0.5 rounded-md ${tpl.color}`}>{tpl.icon}</span>
                    <span className="font-bold text-sm text-white group-hover:text-violet-300 transition-colors">{tpl.name}</span>
                  </div>
                  <p className="text-[11px] text-slate-500 leading-relaxed">{tpl.desc}</p>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
