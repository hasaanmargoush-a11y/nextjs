"use client";

import { useState, useEffect, use } from "react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import {
  GitFork, Download, Code2, Clock, Tag, ChevronRight,
  File, Folder, FolderOpen, Loader2, AlertCircle, Globe,
  User, ArrowRight, ExternalLink, BookOpen, Wrench, CheckSquare,
  Copy, Check, ShieldCheck
} from "lucide-react";
import Link from "next/link";
import { MainLayout } from "@/components/layout/MainLayout";

interface FileNode {
  id: string;
  name: string;
  type: "file" | "folder";
  content: string;
  parentId: string | null;
  isOpen?: boolean;
}

interface ProjectDetail {
  id: number;
  name: string;
  description: string;
  how_it_works: string;
  requirements: string;
  files: FileNode[];
  tags: string[];
  username: string;
  author_name: string;
  avatar: string | null;
  created_at: string;
  updated_at: string;
  fork_count: number;
  forked_from: number | null;
  forked_from_name: string | null;
  owner_id: number;
}

const LANG_COLORS: Record<string, string> = {
  html: "bg-orange-500/20 text-orange-300 border-orange-500/30",
  css: "bg-blue-500/20 text-blue-300 border-blue-500/30",
  javascript: "bg-yellow-500/20 text-yellow-300 border-yellow-500/30",
  typescript: "bg-blue-600/20 text-blue-300 border-blue-500/30",
  python: "bg-green-500/20 text-green-300 border-green-500/30",
  react: "bg-cyan-500/20 text-cyan-300 border-cyan-500/30",
  node: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
};

function tagColor(tag: string): string {
  return LANG_COLORS[tag.toLowerCase()] ?? "bg-violet-500/20 text-violet-300 border-violet-500/30";
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  const h = Math.floor(m / 60);
  const d = Math.floor(h / 24);
  if (d > 30) return new Date(dateStr).toLocaleDateString("ar-EG");
  if (d > 0) return `منذ ${d} يوم${d > 1 ? "" : ""}`;
  if (h > 0) return `منذ ${h} ساعة`;
  if (m > 0) return `منذ ${m} دقيقة`;
  return "الآن";
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

function authHeaders(): Record<string, string> {
  if (typeof window === "undefined") return {};
  const token = localStorage.getItem("nouvil_token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

// ── Read-only File Tree ────────────────────────────────────────────────────────
function ReadonlyTreeNode({
  node, files, depth,
}: { node: FileNode; files: FileNode[]; depth: number }) {
  const [open, setOpen] = useState(depth === 0 || node.isOpen);
  const children = files.filter(f => f.parentId === node.id);

  if (node.type === "folder") {
    return (
      <div>
        <button
          onClick={() => setOpen(o => !o)}
          className="flex items-center gap-1.5 w-full text-right px-2 py-1 rounded-lg hover:dark:bg-white/5 hover:bg-slate-100 transition-colors text-sm dark:text-slate-300 text-slate-600 group"
          style={{ paddingRight: `${8 + depth * 16}px` }}
        >
          {open ? <FolderOpen className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" /> : <Folder className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />}
          <span className="truncate font-medium text-xs">{node.name}</span>
          {children.length > 0 && (
            <span className="mr-auto text-[10px] dark:text-slate-600 text-slate-400">{children.length}</span>
          )}
        </button>
        {open && (
          <div>
            {children.map(child => (
              <ReadonlyTreeNode key={child.id} node={child} files={files} depth={depth + 1} />
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div
      className="flex items-center gap-1.5 px-2 py-1 text-xs dark:text-slate-400 text-slate-500 rounded-lg"
      style={{ paddingRight: `${8 + depth * 16}px` }}
    >
      <span className="text-[11px] flex-shrink-0">{fileIcon(node.name)}</span>
      <span className="truncate font-mono">{node.name}</span>
    </div>
  );
}

function FileTree({ files }: { files: FileNode[] }) {
  const roots = files.filter(f => f.parentId === null);
  const rootFiles = files.filter(f => f.parentId === "root");
  const displayRoots = roots.length > 0 ? roots : rootFiles;

  if (displayRoots.length === 0) {
    return (
      <div className="text-center py-4 text-xs dark:text-slate-600 text-slate-400">
        لا توجد ملفات
      </div>
    );
  }

  return (
    <div className="space-y-0.5">
      {displayRoots.map(node => (
        <ReadonlyTreeNode key={node.id} node={node} files={files} depth={0} />
      ))}
    </div>
  );
}

// ── Copied indicator ──────────────────────────────────────────────────────────
function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
      className="p-1.5 rounded-lg dark:bg-white/5 bg-slate-100 dark:text-slate-500 text-slate-400 hover:text-violet-400 transition-colors"
      title="نسخ"
    >
      {copied ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
    </button>
  );
}

function extractNumericId(slug: string): string {
  const match = slug.match(/(\d+)$/);
  return match ? match[1] : slug;
}

export default function ProjectDetailPage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = use(params);
  const numericId = extractNumericId(projectId);
  const router = useRouter();
  const { user } = useAuth();
  const [project, setProject] = useState<ProjectDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [forking, setForking] = useState(false);
  const [forkDone, setForkDone] = useState<number | null>(null);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    fetch(`/api/projects/community/${numericId}`)
      .then(r => r.ok ? r.json() : Promise.reject(r.status))
      .then(data => setProject(data as ProjectDetail))
      .catch(() => setError("المشروع غير موجود أو تم حذفه"))
      .finally(() => setLoading(false));
  }, [numericId]);

  const handleOpenInIDE = async () => {
    if (!user) { router.push("/auth/login"); return; }

    if (!project) return;
    const isOwner = user.id === project.owner_id;

    if (isOwner) {
      router.push(`/cloud-ide?projectId=${project.id}`);
      return;
    }

    // Fork first, then open
    setForking(true);
    try {
      const res = await fetch(`/api/projects/${project.id}/fork`, {
        method: "POST",
        headers: { ...authHeaders(), "Content-Type": "application/json" },
        credentials: "include",
      });
      const data = await res.json() as { ok?: boolean; id?: number; error?: string };
      if (!res.ok) { alert(data.error ?? "فشل النسخ"); return; }
      setForkDone(data.id!);
      setTimeout(() => {
        router.push(`/cloud-ide?projectId=${data.id}`);
      }, 1500);
    } catch {
      alert("فشل الاتصال بالسيرفر");
    } finally {
      setForking(false);
    }
  };

  const handleDownload = async () => {
    if (!project?.files) return;
    setDownloading(true);
    try {
      const JSZip = (await import("jszip")).default;
      const zip = new JSZip();
      const addToZip = (folder: InstanceType<typeof JSZip>, parentId: string | null) => {
        project.files.filter(f => f.parentId === parentId || (parentId === null && f.parentId === "root")).forEach(f => {
          if (f.type === "file") folder.file(f.name, f.content ?? "");
          else addToZip(folder.folder(f.name)!, f.id);
        });
      };
      addToZip(zip, null);
      if (zip.files && Object.keys(zip.files).length === 0) addToZip(zip, "root");
      const blob = await zip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = `${project.name}.zip`; a.click();
      URL.revokeObjectURL(url);
    } catch {
      alert("فشل تحميل المشروع");
    } finally {
      setDownloading(false);
    }
  };

  if (loading) {
    return (
      <MainLayout>
        <div className="min-h-[60vh] flex items-center justify-center" dir="rtl">
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="w-10 h-10 text-violet-400 animate-spin" />
            <p className="dark:text-slate-400 text-slate-500 text-sm">جاري تحميل المشروع...</p>
          </div>
        </div>
      </MainLayout>
    );
  }

  if (error || !project) {
    return (
      <MainLayout>
        <div className="min-h-[60vh] flex items-center justify-center" dir="rtl">
          <div className="text-center">
            <AlertCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />
            <h2 className="text-xl font-black dark:text-white text-slate-900 mb-2">المشروع غير موجود</h2>
            <p className="dark:text-slate-400 text-slate-500 text-sm mb-6">{error}</p>
            <Link href="/community-projects" className="px-6 py-3 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-bold text-sm transition-colors">
              العودة للمجتمع
            </Link>
          </div>
        </div>
      </MainLayout>
    );
  }

  const isOwner = user?.id === project.owner_id;
  const fileCount = project.files?.filter(f => f.type === "file").length ?? 0;
  const folderCount = project.files?.filter(f => f.type === "folder").length ?? 0;

  return (
    <MainLayout>
    <div className="pb-16" dir="rtl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Breadcrumb */}
        <motion.nav initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center gap-2 text-sm dark:text-slate-500 text-slate-400 mb-6">
          <Link href="/community-projects" className="hover:text-violet-400 transition-colors flex items-center gap-1">
            <Globe className="w-3.5 h-3.5" /> مجتمع المطورين
          </Link>
          <ChevronRight className="w-3.5 h-3.5 rotate-180" />
          <span className="dark:text-slate-300 text-slate-600 font-medium truncate max-w-[200px]">{project.name}</span>
        </motion.nav>

        {/* Fork success banner */}
        {forkDone && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 flex items-center gap-3 bg-green-500/15 border border-green-500/30 rounded-2xl px-5 py-3 text-green-300"
          >
            <GitFork className="w-5 h-5 flex-shrink-0" />
            <div>
              <p className="font-bold text-sm">تم نسخ المشروع بنجاح!</p>
              <p className="text-xs opacity-70">جاري فتح المحرر...</p>
            </div>
          </motion.div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* ── Left Column: Metadata ── */}
          <div className="lg:col-span-2 space-y-6">
            {/* Project header */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
              <div className="dark:bg-[#12122a]/80 bg-white border dark:border-white/10 border-slate-200 rounded-2xl p-6">
                {/* Fork notice */}
                {project.forked_from && (
                  <div className="flex items-center gap-2 text-xs text-amber-300 bg-amber-500/10 border border-amber-500/20 rounded-xl px-3 py-2 mb-4">
                    <GitFork className="w-3.5 h-3.5 flex-shrink-0" />
                    <span>هذا المشروع مُستنسَخ من {project.forked_from_name ? `"${project.forked_from_name}"` : `#${project.forked_from}`}</span>
                  </div>
                )}

                <div className="flex items-start justify-between gap-4 mb-4">
                  <div className="flex-1 min-w-0">
                    <h1 className="text-2xl font-black dark:text-white text-slate-900 leading-tight mb-2">
                      {project.name}
                    </h1>
                    {project.description && (
                      <p className="dark:text-slate-400 text-slate-500 leading-relaxed">
                        {project.description}
                      </p>
                    )}
                  </div>
                  {/* Author */}
                  <Link href={`/profile/${project.username}`} className="flex flex-col items-center gap-1.5 flex-shrink-0 group">
                    <div className="w-12 h-12 rounded-xl dark:bg-white/10 bg-slate-200 flex items-center justify-center text-base font-bold overflow-hidden border dark:border-white/10 border-slate-200 group-hover:border-violet-400 transition-colors">
                      {project.avatar
                        ? <img src={project.avatar} alt={project.author_name} className="w-full h-full object-cover" />
                        : (project.author_name?.charAt(0) || "م")}
                    </div>
                    <span className="text-[11px] dark:text-slate-400 text-slate-500 group-hover:text-violet-400 transition-colors">
                      {project.author_name?.split(" ")[0] || project.username}
                    </span>
                  </Link>
                </div>

                {/* Tags */}
                {project.tags.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-4">
                    {project.tags.map(tag => (
                      <Link
                        key={tag}
                        href={`/community-projects?tag=${tag}`}
                        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border transition-all hover:scale-105 ${tagColor(tag)}`}
                      >
                        <Tag className="w-3 h-3" /> {tag}
                      </Link>
                    ))}
                  </div>
                )}

                {/* Meta */}
                <div className="flex items-center gap-4 text-xs dark:text-slate-500 text-slate-400 pt-4 border-t dark:border-white/5 border-slate-100">
                  <span className="flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5" /> {timeAgo(project.created_at)}
                  </span>
                  {project.fork_count > 0 && (
                    <span className="flex items-center gap-1.5">
                      <GitFork className="w-3.5 h-3.5" /> {project.fork_count} نسخة
                    </span>
                  )}
                  <span className="flex items-center gap-1.5">
                    <File className="w-3.5 h-3.5" /> {fileCount} ملف
                  </span>
                  {folderCount > 0 && (
                    <span className="flex items-center gap-1.5">
                      <Folder className="w-3.5 h-3.5" /> {folderCount} مجلد
                    </span>
                  )}
                </div>
              </div>
            </motion.div>

            {/* How it works */}
            {project.how_it_works && (
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
                <div className="dark:bg-[#12122a]/80 bg-white border dark:border-white/10 border-slate-200 rounded-2xl p-6">
                  <h2 className="flex items-center gap-2 font-black dark:text-white text-slate-900 mb-4">
                    <div className="w-7 h-7 rounded-lg bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center">
                      <BookOpen className="w-4 h-4 text-cyan-400" />
                    </div>
                    كيف يعمل المشروع؟
                  </h2>
                  <div className="prose prose-sm dark:prose-invert max-w-none">
                    <p className="dark:text-slate-300 text-slate-600 leading-relaxed whitespace-pre-wrap">
                      {project.how_it_works}
                    </p>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Requirements */}
            {project.requirements && (
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
                <div className="dark:bg-[#12122a]/80 bg-white border dark:border-white/10 border-slate-200 rounded-2xl p-6">
                  <h2 className="flex items-center gap-2 font-black dark:text-white text-slate-900 mb-4">
                    <div className="w-7 h-7 rounded-lg bg-amber-500/20 border border-amber-500/30 flex items-center justify-center">
                      <CheckSquare className="w-4 h-4 text-amber-400" />
                    </div>
                    المتطلبات
                  </h2>
                  <div className="space-y-2">
                    {project.requirements.split("\n").filter(Boolean).map((req, i) => (
                      <div key={i} className="flex items-start gap-2.5 text-sm dark:text-slate-300 text-slate-600">
                        <div className="w-5 h-5 rounded-full bg-amber-500/20 border border-amber-500/30 flex items-center justify-center flex-shrink-0 mt-0.5">
                          <span className="text-[10px] font-bold text-amber-400">{i + 1}</span>
                        </div>
                        {req.replace(/^[-•*]\s*/, "")}
                      </div>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}
          </div>

          {/* ── Right Column: File Tree + Actions ── */}
          <div className="space-y-5">
            {/* Action Buttons */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
              <div className="dark:bg-[#12122a]/80 bg-white border dark:border-white/10 border-slate-200 rounded-2xl p-5 space-y-3">
                <h3 className="text-sm font-black dark:text-white text-slate-900 mb-4">الإجراءات</h3>

                {/* Open in IDE */}
                <button
                  onClick={handleOpenInIDE}
                  disabled={forking}
                  className="w-full flex items-center gap-3 px-4 py-3.5 rounded-xl bg-gradient-to-r from-violet-600 to-violet-500 hover:from-violet-500 hover:to-violet-400 text-white font-bold text-sm transition-all shadow-lg shadow-violet-500/30 disabled:opacity-70 disabled:cursor-not-allowed group"
                >
                  {forking ? (
                    <Loader2 className="w-5 h-5 animate-spin flex-shrink-0" />
                  ) : (
                    <Code2 className="w-5 h-5 flex-shrink-0 group-hover:rotate-3 transition-transform" />
                  )}
                  <div className="text-right flex-1">
                    <p className="font-black">{forking ? "جاري النسخ..." : isOwner ? "فتح في المحرر" : "فتح في محرر الأكواد"}</p>
                    {!isOwner && !forking && (
                      <p className="text-[11px] opacity-70 font-normal">سيتم نسخ المشروع لملفك الشخصي</p>
                    )}
                  </div>
                  <ArrowRight className="w-4 h-4 opacity-60" />
                </button>

                {/* Download ZIP */}
                <button
                  onClick={handleDownload}
                  disabled={downloading}
                  className="w-full flex items-center gap-3 px-4 py-3.5 rounded-xl dark:bg-white/5 bg-slate-50 hover:dark:bg-white/10 hover:bg-slate-100 dark:border-white/10 border-slate-200 border dark:text-slate-300 text-slate-600 font-bold text-sm transition-all disabled:opacity-70"
                >
                  {downloading ? (
                    <Loader2 className="w-5 h-5 animate-spin flex-shrink-0" />
                  ) : (
                    <Download className="w-5 h-5 flex-shrink-0" />
                  )}
                  <div className="text-right flex-1">
                    <p className="font-black">تحميل كـ ZIP</p>
                    <p className="text-[11px] opacity-60 font-normal">{fileCount} ملف</p>
                  </div>
                </button>

                {/* View Profile */}
                <Link
                  href={`/profile/${project.username}`}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-xl dark:bg-white/5 bg-slate-50 hover:dark:bg-white/10 hover:bg-slate-100 dark:border-white/10 border-slate-200 border dark:text-slate-400 text-slate-500 font-medium text-sm transition-all"
                >
                  <User className="w-4 h-4 flex-shrink-0" />
                  <span className="flex-1 text-right">ملف {project.author_name?.split(" ")[0] || project.username}</span>
                  <ExternalLink className="w-3.5 h-3.5 opacity-50" />
                </Link>
              </div>
            </motion.div>

            {/* Security Banner */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }}>
              <div className="rounded-2xl border border-emerald-500/25 bg-emerald-500/8 dark:bg-emerald-500/5 p-4">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-black text-emerald-400 mb-1.5">بيئة معزولة آمنة</p>
                    <ul className="space-y-1">
                      {[
                        "الكود يعمل داخل صندوق حماية معزول",
                        "لا يمكنه الوصول لحسابك أو جلستك",
                        "لا يستطيع قراءة الـ cookies أو الـ token",
                        "ملفاتك الشخصية محمية بالكامل",
                      ].map((item, i) => (
                        <li key={i} className="flex items-start gap-1.5 text-[11px] dark:text-emerald-300/70 text-emerald-700">
                          <span className="text-emerald-400 mt-0.5 flex-shrink-0">✓</span>
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* File Tree */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
              <div className="dark:bg-[#12122a]/80 bg-white border dark:border-white/10 border-slate-200 rounded-2xl overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3 border-b dark:border-white/5 border-slate-100">
                  <div className="flex items-center gap-2">
                    <Folder className="w-4 h-4 text-amber-400" />
                    <span className="text-xs font-bold dark:text-slate-300 text-slate-600 uppercase tracking-wider">
                      ملفات المشروع
                    </span>
                  </div>
                  <span className="text-[10px] dark:text-slate-600 text-slate-400">
                    {fileCount} ملف {folderCount > 0 && `· ${folderCount} مجلد`}
                  </span>
                </div>
                <div className="p-3 max-h-80 overflow-y-auto">
                  {project.files && project.files.length > 0 ? (
                    <FileTree files={project.files} />
                  ) : (
                    <p className="text-xs dark:text-slate-600 text-slate-400 text-center py-4">لا توجد ملفات</p>
                  )}
                </div>
              </div>
            </motion.div>

            {/* Author Card */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
              <div className="dark:bg-[#12122a]/80 bg-white border dark:border-white/10 border-slate-200 rounded-2xl p-4">
                <p className="text-xs font-bold dark:text-slate-500 text-slate-400 uppercase tracking-wider mb-3">المطور</p>
                <Link href={`/profile/${project.username}`} className="flex items-center gap-3 group">
                  <div className="w-10 h-10 rounded-xl dark:bg-white/10 bg-slate-100 flex items-center justify-center font-bold text-sm overflow-hidden flex-shrink-0 border dark:border-white/10 border-slate-200 group-hover:border-violet-400 transition-colors">
                    {project.avatar
                      ? <img src={project.avatar} alt={project.author_name} className="w-full h-full object-cover" />
                      : (project.author_name?.charAt(0) || "م")}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-sm dark:text-white text-slate-900 truncate group-hover:text-violet-400 transition-colors">
                      {project.author_name}
                    </p>
                    <p className="text-xs dark:text-slate-500 text-slate-400">@{project.username}</p>
                  </div>
                  <ExternalLink className="w-4 h-4 dark:text-slate-600 text-slate-300 group-hover:text-violet-400 transition-colors" />
                </Link>
              </div>
            </motion.div>

            {/* Fork stats */}
            {project.fork_count > 0 && (
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
                <div className="dark:bg-[#12122a]/80 bg-white border dark:border-white/10 border-slate-200 rounded-2xl p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-violet-500/15 border border-violet-500/30 flex items-center justify-center">
                      <GitFork className="w-5 h-5 text-violet-400" />
                    </div>
                    <div>
                      <p className="font-black dark:text-white text-slate-900">{project.fork_count} مطور</p>
                      <p className="text-xs dark:text-slate-500 text-slate-400">استنسخوا هذا المشروع</p>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </div>
        </div>
      </div>
    </div>
    </MainLayout>
  );
}
