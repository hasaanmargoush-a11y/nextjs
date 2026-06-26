"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { MainLayout } from "@/components/layout/MainLayout";
import {
  Search, Globe, Code2, Users, GitFork, Clock, Flame,
  Tag, X, ChevronLeft, ChevronRight, Loader2, RefreshCw,
  Filter, Terminal, Share2, Check, Link2, Star, Eye, TrendingUp
} from "lucide-react";
import { toast } from "sonner";

interface CommunityProject {
  id: number;
  name: string;
  description: string;
  tags: string[];
  username: string;
  author_name: string;
  avatar: string | null;
  created_at: string;
  updated_at: string;
  fork_count: number;
  stars_count: number;
  is_starred: boolean;
  forked_from: number | null;
}

interface TrendingProject {
  id: number;
  name: string;
  description: string;
  tags: string[];
  username: string;
  author_name: string;
  avatar: string | null;
  created_at: string;
  fork_count: number;
  stars_count: number;
  views_count: number;
  trending_score: number;
  forked_from: number | null;
}

interface ApiResponse {
  projects: CommunityProject[];
  total: number;
  page: number;
  totalPages: number;
}

const LANG_COLORS: Record<string, string> = {
  html: "bg-orange-500/20 text-orange-300 border-orange-500/30",
  css: "bg-blue-500/20 text-blue-300 border-blue-500/30",
  javascript: "bg-yellow-500/20 text-yellow-300 border-yellow-500/30",
  typescript: "bg-blue-600/20 text-blue-300 border-blue-500/30",
  python: "bg-green-500/20 text-green-300 border-green-500/30",
  react: "bg-cyan-500/20 text-cyan-300 border-cyan-500/30",
  node: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
  php: "bg-indigo-500/20 text-indigo-300 border-indigo-500/30",
  sql: "bg-rose-500/20 text-rose-300 border-rose-500/30",
  go: "bg-teal-500/20 text-teal-300 border-teal-500/30",
  rust: "bg-orange-600/20 text-orange-300 border-orange-500/30",
  java: "bg-red-500/20 text-red-300 border-red-500/30",
};

const LANG_ICONS: Record<string, string> = {
  html: "HTM", css: "CSS", javascript: "JS", typescript: "TS",
  python: "PY", react: "JSX", node: "JS", php: "PHP",
  sql: "SQL", go: "GO", rust: "RS", java: "JAVA",
};

function tagColor(tag: string): string {
  return LANG_COLORS[tag.toLowerCase()] ?? "bg-violet-500/20 text-violet-300 border-violet-500/30";
}

function tagIcon(tag: string): string {
  const t = tag.toLowerCase();
  return LANG_ICONS[t] ?? tag.toUpperCase().slice(0, 4);
}

function slugify(name: string): string {
  return name.trim().toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^\u0600-\u06FFa-z0-9-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "") || "project";
}

function projectSlug(project: { id: number; name: string }): string {
  return `${slugify(project.name)}-${project.id}`;
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

function ShareButton({ project }: { project: CommunityProject }) {
  const [copied, setCopied] = useState(false);

  const handleShare = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const url = `${window.location.origin}/community-projects/${projectSlug(project)}`;

    if (navigator.share) {
      navigator.share({
        title: project.name,
        text: project.description || `مشروع ${project.name} بواسطة ${project.author_name}`,
        url,
      }).catch(() => {});
    } else {
      navigator.clipboard.writeText(url).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }).catch(() => {});
    }
  };

  return (
    <button
      onClick={handleShare}
      title="مشاركة المشروع"
      className={`relative w-7 h-7 rounded-lg flex items-center justify-center transition-all duration-200 border flex-shrink-0 ${
        copied
          ? "bg-green-500/20 border-green-500/40 text-green-400"
          : "dark:bg-white/5 bg-slate-100 dark:border-white/10 border-slate-200 dark:text-slate-500 text-slate-400 hover:bg-violet-500/15 hover:border-violet-500/40 hover:text-violet-400"
      }`}
    >
      <AnimatePresence mode="wait">
        {copied ? (
          <motion.span key="check" initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}>
            <Check className="w-3.5 h-3.5" />
          </motion.span>
        ) : (
          <motion.span key="share" initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}>
            <Share2 className="w-3.5 h-3.5" />
          </motion.span>
        )}
      </AnimatePresence>
      {copied && (
        <motion.div
          initial={{ opacity: 0, y: 4, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0 }}
          className="absolute -top-8 left-1/2 -translate-x-1/2 whitespace-nowrap bg-green-500 text-white text-[10px] font-bold px-2 py-1 rounded-lg pointer-events-none"
        >
          تم النسخ!
        </motion.div>
      )}
    </button>
  );
}

function StarButton({ projectId, initialStarred, initialCount }: {
  projectId: number;
  initialStarred: boolean;
  initialCount: number;
}) {
  const [starred, setStarred] = useState(initialStarred);
  const [count, setCount]     = useState(initialCount);
  const [loading, setLoading] = useState(false);
  const [burst, setBurst]     = useState(false);

  const toggle = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (loading) return;
    setLoading(true);
    // Optimistic update
    const wasStarred = starred;
    setStarred(!wasStarred);
    setCount(c => wasStarred ? c - 1 : c + 1);
    if (!wasStarred) { setBurst(true); setTimeout(() => setBurst(false), 600); }
    try {
      const res = await fetch(`/api/projects/${projectId}/star`, { method: "POST", credentials: "include" });
      if (res.status === 401) {
        // Revert + prompt login
        setStarred(wasStarred);
        setCount(c => wasStarred ? c + 1 : c - 1);
        toast.info("سجل الدخول لتقييم المشاريع");
        return;
      }
      if (!res.ok) throw new Error();
      const json = await res.json() as { starred: boolean; starsCount: number };
      setStarred(json.starred);
      setCount(json.starsCount);
    } catch {
      // Revert on error
      setStarred(wasStarred);
      setCount(c => wasStarred ? c + 1 : c - 1);
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={toggle}
      title={starred ? "إلغاء التقييم" : "تقييم المشروع"}
      className={`relative flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold transition-all duration-200 border flex-shrink-0 ${
        starred
          ? "bg-amber-500/20 border-amber-500/40 text-amber-400"
          : "dark:bg-white/5 bg-slate-100 dark:border-white/10 border-slate-200 dark:text-slate-500 text-slate-400 hover:bg-amber-500/10 hover:border-amber-500/30 hover:text-amber-400"
      }`}
    >
      {/* Burst ring animation */}
      {burst && (
        <motion.span
          initial={{ scale: 1, opacity: 0.8 }}
          animate={{ scale: 2.4, opacity: 0 }}
          transition={{ duration: 0.5 }}
          className="absolute inset-0 rounded-lg bg-amber-400/30 pointer-events-none"
        />
      )}
      <motion.span
        animate={burst ? { scale: [1, 1.5, 1] } : { scale: 1 }}
        transition={{ duration: 0.35 }}
        className="flex items-center"
      >
        <Star className={`w-3 h-3 ${starred ? "fill-amber-400" : ""}`} />
      </motion.span>
      <motion.span
        key={count}
        initial={{ y: starred ? -6 : 6, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.2 }}
      >
        {count}
      </motion.span>
    </button>
  );
}

const RANK_GRADIENTS = [
  "from-amber-400 to-orange-500",
  "from-slate-300 to-slate-400",
  "from-amber-600 to-amber-700",
  "from-violet-400 to-violet-600",
  "from-cyan-400 to-cyan-600",
  "from-emerald-400 to-emerald-600",
];

function TrendingSection({ projects }: { projects: TrendingProject[] }) {
  const scrollRef = useRef<HTMLDivElement>(null);

  if (projects.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.15, duration: 0.4 }}
      className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-10"
    >
      {/* Section header */}
      <div className="flex items-center gap-3 mb-5">
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-gradient-to-r from-orange-500/20 to-amber-500/20 border border-orange-500/30">
          <TrendingUp className="w-4 h-4 text-orange-400" />
          <span className="text-sm font-black text-orange-400">الأكثر انتشاراً</span>
        </div>
        <div className="flex-1 h-px dark:bg-white/5 bg-slate-200" />
        <span className="text-xs dark:text-slate-500 text-slate-400">مرتبة حسب الشعبية</span>
      </div>

      {/* Horizontal scroll container */}
      <div
        ref={scrollRef}
        className="flex gap-4 overflow-x-auto pb-3 scrollbar-none"
        style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
      >
        {projects.map((project, index) => (
          <Link
            key={project.id}
            href={`/community-projects/${projectSlug(project)}`}
            className="flex-shrink-0 w-72 group"
          >
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.07, duration: 0.3 }}
              className="relative h-full dark:bg-[#12122a]/80 bg-white border dark:border-white/8 border-slate-200 rounded-2xl p-4 hover:dark:border-violet-500/40 hover:border-violet-300 transition-all duration-300 hover:shadow-xl hover:shadow-violet-500/10 hover:-translate-y-1 cursor-pointer overflow-hidden"
            >
              {/* Hover glow */}
              <div className="absolute inset-0 bg-gradient-to-br from-violet-500/0 to-cyan-500/0 group-hover:from-violet-500/5 group-hover:to-cyan-500/5 transition-all duration-500 rounded-2xl pointer-events-none" />

              {/* Rank badge */}
              <div className={`absolute top-3 right-3 w-7 h-7 rounded-xl bg-gradient-to-br ${RANK_GRADIENTS[index] ?? "from-slate-400 to-slate-500"} flex items-center justify-center shadow-md`}>
                <span className="text-white font-black text-[11px] leading-none">#{index + 1}</span>
              </div>

              {/* Author row */}
              <div className="flex items-center gap-2 mb-3 pr-9">
                <div className="w-7 h-7 rounded-full dark:bg-white/10 bg-slate-200 flex items-center justify-center text-[11px] font-black overflow-hidden flex-shrink-0">
                  {project.avatar
                    ? <img src={project.avatar} alt={project.author_name} className="w-full h-full object-cover" />
                    : (project.author_name?.charAt(0) || "م")}
                </div>
                <span className="text-[11px] dark:text-slate-400 text-slate-500 font-medium truncate">
                  {project.author_name?.split(" ")[0] || project.username}
                </span>
              </div>

              {/* Title */}
              <h3 className="font-black dark:text-white text-slate-900 text-sm leading-snug mb-1.5 line-clamp-1 group-hover:text-violet-400 transition-colors">
                {project.name}
              </h3>

              {/* Description */}
              {project.description && (
                <p className="text-[11px] dark:text-slate-500 text-slate-400 leading-relaxed line-clamp-2 mb-3">
                  {project.description}
                </p>
              )}

              {/* Tags */}
              {project.tags.length > 0 && (
                <div className="flex flex-wrap gap-1 mb-3">
                  {project.tags.slice(0, 3).map(tag => (
                    <span key={tag} className={`px-1.5 py-0.5 rounded-md text-[9px] font-bold border ${tagColor(tag)}`}>
                      {tag}
                    </span>
                  ))}
                </div>
              )}

              {/* Stats row */}
              <div className="flex items-center gap-2 text-[10px] dark:text-slate-500 text-slate-400 border-t dark:border-white/5 border-slate-100 pt-2.5 mt-auto">
                {project.fork_count > 0 && (
                  <span className="flex items-center gap-1">
                    <GitFork className="w-3 h-3" /> {project.fork_count}
                  </span>
                )}
                {project.views_count > 0 && (
                  <span className="flex items-center gap-1">
                    <Eye className="w-3 h-3" /> {project.views_count}
                  </span>
                )}
                <span className="flex items-center gap-1 mr-auto">
                  <Clock className="w-3 h-3" /> {timeAgo(project.created_at)}
                </span>
                <StarButton
                  projectId={project.id}
                  initialStarred={false}
                  initialCount={project.stars_count}
                />
              </div>
            </motion.div>
          </Link>
        ))}
      </div>
    </motion.div>
  );
}

function ProjectCard({ project, index }: { project: CommunityProject; index: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: index * 0.04 }}
    >
      <Link href={`/community-projects/${projectSlug(project)}`} className="block group">
        <div className="relative h-full dark:bg-[#12122a]/80 bg-white border dark:border-white/8 border-slate-200 rounded-2xl p-5 hover:dark:border-violet-500/40 hover:border-violet-300 transition-all duration-300 hover:shadow-xl hover:shadow-violet-500/10 hover:-translate-y-1 cursor-pointer overflow-hidden">
          {/* Gradient glow on hover */}
          <div className="absolute inset-0 bg-gradient-to-br from-violet-500/0 to-cyan-500/0 group-hover:from-violet-500/5 group-hover:to-cyan-500/5 transition-all duration-500 rounded-2xl" />

          {/* Fork badge */}
          {project.forked_from && (
            <div className="absolute top-3 left-3 flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-300 text-[10px] font-bold">
              <GitFork className="w-2.5 h-2.5" /> مُستنسخ
            </div>
          )}

          {/* Header */}
          <div className="flex items-start justify-between gap-3 mb-3">
            <div className="flex-1 min-w-0">
              <h3 className="font-black dark:text-white text-slate-900 text-sm leading-tight truncate group-hover:text-violet-400 transition-colors">
                {project.name}
              </h3>
              {project.description && (
                <p className="text-xs dark:text-slate-400 text-slate-500 mt-1 line-clamp-2 leading-relaxed">
                  {project.description}
                </p>
              )}
            </div>
          </div>

          {/* Tags */}
          {project.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-4">
              {project.tags.slice(0, 4).map(tag => (
                <span key={tag} className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${tagColor(tag)}`}>
                  {tag}
                </span>
              ))}
              {project.tags.length > 4 && (
                <span className="text-[10px] dark:text-slate-500 text-slate-400">+{project.tags.length - 4}</span>
              )}
            </div>
          )}

          {/* Footer */}
          <div className="flex items-center justify-between mt-auto pt-3 border-t dark:border-white/5 border-slate-100">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full dark:bg-white/10 bg-slate-200 flex items-center justify-center text-[10px] font-bold overflow-hidden flex-shrink-0">
                {project.avatar
                  ? <img src={project.avatar} alt={project.author_name} className="w-full h-full object-cover" />
                  : (project.author_name?.charAt(0) || "م")}
              </div>
              <span className="text-[11px] dark:text-slate-400 text-slate-500 font-medium truncate max-w-[80px]">
                {project.author_name?.split(" ")[0] || project.username}
              </span>
            </div>
            <div className="flex items-center gap-2 text-[10px] dark:text-slate-500 text-slate-400">
              {project.fork_count > 0 && (
                <span className="flex items-center gap-1">
                  <GitFork className="w-3 h-3" /> {project.fork_count}
                </span>
              )}
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" /> {timeAgo(project.created_at)}
              </span>
              <StarButton
                projectId={project.id}
                initialStarred={project.is_starred}
                initialCount={project.stars_count}
              />
              <ShareButton project={project} />
            </div>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}

const ALL_LANGS = ["html", "css", "javascript", "typescript", "python", "react", "node", "php", "sql", "go", "rust", "java"];

export default function CommunityProjectsPage() {
  const [data, setData] = useState<ApiResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedTag, setSelectedTag] = useState("");
  const [sort, setSort] = useState<"latest" | "oldest" | "stars">("latest");
  const [page, setPage] = useState(1);
  const [filterOpen, setFilterOpen] = useState(false);
  const [trending, setTrending] = useState<TrendingProject[]>([]);
  const searchRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    fetch("/api/projects/trending")
      .then(r => r.ok ? r.json() : [])
      .then((rows: TrendingProject[]) => setTrending(rows))
      .catch(() => {});
  }, []);

  const fetchProjects = useCallback(async (params: { search: string; tag: string; sort: string; page: number }) => {
    setLoading(true);
    try {
      const q = new URLSearchParams({
        search: params.search,
        tag: params.tag,
        sort: params.sort,
        page: String(params.page),
      });
      const res = await fetch(`/api/projects/community?${q}`);
      if (!res.ok) throw new Error("فشل التحميل");
      const json = await res.json() as ApiResponse;
      setData(json);
    } catch {
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (searchRef.current) clearTimeout(searchRef.current);
    searchRef.current = setTimeout(() => {
      setPage(1);
      fetchProjects({ search, tag: selectedTag, sort, page: 1 });
    }, 350);
  }, [search, selectedTag, sort]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    fetchProjects({ search, tag: selectedTag, sort, page });
  }, [page]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleTagClick = (tag: string) => {
    setSelectedTag(prev => prev === tag ? "" : tag);
    setPage(1);
  };

  return (
    <MainLayout>
    <div className="pb-16" dir="rtl">
      {/* ── Hero Header ── */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-violet-900/20 via-transparent to-cyan-900/20 pointer-events-none" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14 text-center relative z-10">
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full dark:bg-violet-500/15 bg-violet-100 border dark:border-violet-500/30 border-violet-200 mb-6">
              <Users className="w-4 h-4 text-violet-400" />
              <span className="text-xs font-bold text-violet-400">مجتمع المطورين</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-black dark:text-white text-slate-900 mb-4 leading-tight">
              مشاريع <span className="bg-gradient-to-r from-violet-400 to-cyan-400 bg-clip-text text-transparent">المجتمع</span>
            </h1>
            <p className="text-lg dark:text-slate-400 text-slate-500 max-w-2xl mx-auto leading-relaxed">
              اكتشف مشاريع المطورين، تعلم من أكوادهم، واستنسخ ما يعجبك لتطويره بنفسك
            </p>
          </motion.div>

          {/* Stats */}
          {data && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="flex justify-center gap-8 mt-8"
            >
              <div className="text-center">
                <p className="text-2xl font-black dark:text-white text-slate-900">{data.total}</p>
                <p className="text-xs dark:text-slate-500 text-slate-400">مشروع عام</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-black dark:text-white text-slate-900">{ALL_LANGS.length}+</p>
                <p className="text-xs dark:text-slate-500 text-slate-400">لغة برمجة</p>
              </div>
            </motion.div>
          )}
        </div>
      </div>

      {/* ── Trending Section ── */}
      {trending.length > 0 && <TrendingSection projects={trending} />}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* ── Search & Controls ── */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <div className="flex flex-col sm:flex-row gap-3 mb-6">
            {/* Search */}
            <div className="relative flex-1">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 dark:text-slate-500 text-slate-400 pointer-events-none" />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="ابحث عن مشروع..."
                className="w-full dark:bg-[#12122a] bg-white border dark:border-white/10 border-slate-200 rounded-xl px-4 py-3 pr-10 text-sm dark:text-white text-slate-900 dark:placeholder:text-slate-600 placeholder:text-slate-400 outline-none focus:border-violet-500/60 transition-colors"
                dir="rtl"
              />
              {search && (
                <button onClick={() => setSearch("")} className="absolute left-3 top-1/2 -translate-y-1/2 dark:text-slate-500 text-slate-400 hover:text-red-400 transition-colors">
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Sort */}
            <div className="flex items-center gap-2">
              {/* Sort pill group */}
              <div className="flex items-stretch rounded-xl border dark:border-white/10 border-slate-200 overflow-hidden">
                {([
                  { key: "latest", label: "الأحدث",    icon: <Flame className="w-3.5 h-3.5 shrink-0" /> },
                  { key: "stars",  label: "الأعلى",    icon: <Star  className="w-3.5 h-3.5 shrink-0" /> },
                  { key: "oldest", label: "الأقدم",    icon: <Clock className="w-3.5 h-3.5 shrink-0" /> },
                ] as const).map(({ key, label, icon }, i) => (
                  <button
                    key={key}
                    onClick={() => { setSort(key); setPage(1); }}
                    className={`relative flex items-center justify-center gap-1.5 w-24 py-2.5 text-xs font-bold transition-all duration-200
                      ${i > 0 ? "border-r dark:border-white/10 border-slate-200" : ""}
                      ${sort === key
                        ? key === "stars"
                          ? "dark:bg-amber-500/20 bg-amber-50 text-amber-500"
                          : "dark:bg-violet-500/20 bg-violet-50 text-violet-500"
                        : "dark:bg-[#0e0e20] bg-white dark:text-slate-400 text-slate-500 dark:hover:text-slate-200 hover:text-slate-700 dark:hover:bg-white/5 hover:bg-slate-50"
                      }`}
                  >
                    {icon}
                    <span>{label}</span>
                  </button>
                ))}
              </div>

              <button
                onClick={() => setFilterOpen(o => !o)}
                className={`flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-bold transition-all border ${
                  filterOpen || selectedTag
                    ? "dark:bg-cyan-500/20 bg-cyan-50 text-cyan-400 dark:border-cyan-500/40 border-cyan-300"
                    : "dark:bg-white/5 bg-white dark:border-white/10 border-slate-200 dark:text-slate-300 text-slate-600"
                }`}
              >
                <Filter className="w-4 h-4" />
                فلتر {selectedTag && <span className="bg-cyan-500 text-white text-[10px] rounded-full w-4 h-4 flex items-center justify-center">1</span>}
              </button>

              <button
                onClick={() => fetchProjects({ search, tag: selectedTag, sort, page })}
                className="w-11 h-11 flex items-center justify-center rounded-xl dark:bg-white/5 bg-white dark:border-white/10 border-slate-200 border dark:text-slate-400 text-slate-500 hover:text-violet-400 transition-colors"
                title="تحديث"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
              </button>
            </div>
          </div>

          {/* Language filter panel */}
          <AnimatePresence>
            {filterOpen && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.25 }}
                className="overflow-hidden mb-6"
              >
                <div className="dark:bg-[#12122a] bg-white border dark:border-white/10 border-slate-200 rounded-2xl p-4">
                  <p className="text-xs font-bold dark:text-slate-400 text-slate-500 mb-3 flex items-center gap-2">
                    <Tag className="w-3.5 h-3.5" /> فلترة حسب اللغة
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {ALL_LANGS.map(lang => (
                      <button
                        key={lang}
                        onClick={() => handleTagClick(lang)}
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition-all ${
                          selectedTag === lang
                            ? `${tagColor(lang)} ring-2 ring-offset-1 dark:ring-offset-[#12122a] ring-current`
                            : `${tagColor(lang)} opacity-60 hover:opacity-100`
                        }`}
                      >
                        {tagIcon(lang)} {lang}
                      </button>
                    ))}
                    {selectedTag && (
                      <button
                        onClick={() => setSelectedTag("")}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border dark:border-white/10 border-slate-200 dark:text-slate-400 text-slate-500 hover:text-red-400 transition-colors"
                      >
                        <X className="w-3 h-3" /> إزالة الفلتر
                      </button>
                    )}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Active filter badge */}
          {(search || selectedTag) && !filterOpen && (
            <div className="flex items-center gap-2 mb-4 flex-wrap">
              {search && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-violet-500/20 text-violet-300 border border-violet-500/30">
                  <Search className="w-3 h-3" /> "{search}"
                  <button onClick={() => setSearch("")}><X className="w-3 h-3 hover:text-red-400" /></button>
                </span>
              )}
              {selectedTag && (
                <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${tagColor(selectedTag)}`}>
                  {tagIcon(selectedTag)} {selectedTag}
                  <button onClick={() => setSelectedTag("")}><X className="w-3 h-3 hover:text-red-400" /></button>
                </span>
              )}
            </div>
          )}
        </motion.div>

        {/* ── Results ── */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-24 gap-4">
            <Loader2 className="w-10 h-10 text-violet-400 animate-spin" />
            <p className="dark:text-slate-400 text-slate-500 text-sm">جاري تحميل المشاريع...</p>
          </div>
        ) : !data || data.projects.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center justify-center py-24 gap-4 text-center"
          >
            <div className="w-20 h-20 rounded-2xl dark:bg-white/5 bg-slate-100 flex items-center justify-center">
              <Terminal className="w-10 h-10 dark:text-slate-600 text-slate-300" />
            </div>
            <p className="dark:text-white text-slate-800 font-bold text-lg">لا توجد مشاريع</p>
            <p className="dark:text-slate-500 text-slate-400 text-sm max-w-sm">
              {search || selectedTag
                ? "لم يتطابق أي مشروع مع بحثك. جرب كلمات مختلفة."
                : "لم يشارك أحد مشروعاً بعد. كن الأول!"}
            </p>
            {(search || selectedTag) && (
              <button
                onClick={() => { setSearch(""); setSelectedTag(""); }}
                className="mt-2 px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-sm font-bold transition-colors"
              >
                مسح البحث
              </button>
            )}
          </motion.div>
        ) : (
          <>
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm dark:text-slate-500 text-slate-400">
                {data.total} مشروع {data.totalPages > 1 && `· صفحة ${data.page} من ${data.totalPages}`}
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5 mb-10">
              {data.projects.map((project, i) => (
                <ProjectCard key={project.id} project={project} index={i} />
              ))}
            </div>

            {/* Pagination */}
            {data.totalPages > 1 && (
              <div className="flex items-center justify-center gap-3">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="w-10 h-10 rounded-xl dark:bg-white/5 bg-white dark:border-white/10 border-slate-200 border flex items-center justify-center dark:text-slate-400 text-slate-500 hover:text-violet-400 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>

                {Array.from({ length: Math.min(data.totalPages, 7) }, (_, i) => {
                  let p: number;
                  if (data.totalPages <= 7) {
                    p = i + 1;
                  } else if (page <= 4) {
                    p = i + 1;
                  } else if (page >= data.totalPages - 3) {
                    p = data.totalPages - 6 + i;
                  } else {
                    p = page - 3 + i;
                  }
                  return (
                    <button
                      key={p}
                      onClick={() => setPage(p)}
                      className={`w-10 h-10 rounded-xl text-sm font-bold transition-all border ${
                        page === p
                          ? "bg-violet-600 text-white border-violet-500 shadow-lg shadow-violet-500/30"
                          : "dark:bg-white/5 bg-white dark:border-white/10 border-slate-200 dark:text-slate-400 text-slate-500 hover:text-violet-400"
                      }`}
                    >
                      {p}
                    </button>
                  );
                })}

                <button
                  onClick={() => setPage(p => Math.min(data.totalPages, p + 1))}
                  disabled={page === data.totalPages}
                  className="w-10 h-10 rounded-xl dark:bg-white/5 bg-white dark:border-white/10 border-slate-200 border flex items-center justify-center dark:text-slate-400 text-slate-500 hover:text-violet-400 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
    </MainLayout>
  );
}
