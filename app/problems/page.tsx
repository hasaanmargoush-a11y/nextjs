"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MainLayout } from "@/components/layout/MainLayout";
import { useRouteOverride } from "@/hooks/useRouteOverride";
import { BlockRenderer } from "@/components/page-builder/BlockRenderer";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import Link from "next/link";
import {
  Code2,
  Search,
  Zap,
  CheckCircle,
  ChevronRight,
  Lock,
  Target,
  Star,
  Trophy,
  Flame,
  Calendar,
  BookOpen,
  LayoutGrid,
  List,
  Filter,
  Tag,
  Building2,
  Globe,
  Award,
  TrendingUp,
  Clock,
  Users,
  Medal,
  Loader2,
} from "lucide-react";
import { ProblemRowSkeleton } from "@/components/ui/Skeleton";

interface Problem {
  id: number;
  title: string;
  difficulty: "easy" | "medium" | "hard" | "expert";
  category: string;
  language: string;
  points: number;
  solvedCount: number;
  isSolved?: boolean;
  tags: string[];
  companyTags: string[];
  packId?: number | null;
}

interface Track {
  id: number;
  title: string;
  description: string;
  language: string;
  difficulty: string;
  icon: string;
  color: string;
  totalProblems: number;
  userProgress: { solvedCount: number } | null;
}

interface DailyChallenge {
  available: boolean;
  dailyChallengeId?: number;
  bonusMultiplier?: number;
  isSolvedToday?: boolean;
  participantsCount?: number;
  problem?: {
    id: number;
    title: string;
    difficulty: string;
    points: number;
    language: string;
  };
}

interface LeaderEntry {
  rank: number;
  userId: number;
  name: string;
  username: string;
  avatar: string | null;
  points: number;
  solvedCount: number;
  streak: number;
  level: string;
  isCurrentUser: boolean;
}

const difficultyConfig = {
  easy: {
    label: "سهل",
    color: "text-green-400",
    bg: "bg-green-500/10",
    border: "border-green-500/20",
  },
  medium: {
    label: "متوسط",
    color: "text-amber-400",
    bg: "bg-amber-500/10",
    border: "border-amber-500/20",
  },
  hard: {
    label: "صعب",
    color: "text-red-400",
    bg: "bg-red-500/10",
    border: "border-red-500/20",
  },
  expert: {
    label: "خبير",
    color: "text-violet-400",
    bg: "bg-violet-500/10",
    border: "border-violet-500/20",
  },
};

const diffMap: Record<string, string> = {
  سهل: "easy",
  متوسط: "medium",
  صعب: "hard",
  خبير: "expert",
};
const languages = [
  "الكل",
  "Python",
  "JavaScript",
  "C++",
  "Java",
  "Go",
  "Rust",
  "TypeScript",
];
const difficulties = ["الكل", "سهل", "متوسط", "صعب", "خبير"];
const POPULAR_TAGS = [
  "arrays",
  "strings",
  "loops",
  "recursion",
  "sorting",
  "hash-map",
  "dynamic-programming",
  "two-pointers",
];
const COMPANIES = ["Google", "Meta", "Amazon", "Microsoft", "Apple"];

const difficultyTrackLabel: Record<string, string> = {
  beginner: "مبتدئ",
  intermediate: "متوسط",
  advanced: "متقدم",
  expert: "خبير",
};

type MainTab = "tracks" | "problems" | "leaderboard" | "daily";

interface WeakArea { tag: string; acceptanceRate: number; attempts: number; accepted: number; problemCount: number; }
interface StrongArea { tag: string; acceptanceRate: number; attempts: number; }

function WeaknessPanel() {
  const [open, setOpen] = useState(false);
  const [data, setData] = useState<{ ready: boolean; message?: string; totalAttempts: number; weakAreas: WeakArea[]; strongAreas: StrongArea[] } | null>(null);
  const [loading, setLoading] = useState(false);

  const load = () => {
    if (data) { setOpen((v) => !v); return; }
    setLoading(true);
    setOpen(true);
    api.get<typeof data>("/users/analysis/weakness")
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  return (
    <div className="mb-5">
      <button
        onClick={load}
        className="flex items-center gap-2 text-sm px-4 py-2.5 rounded-xl dark:bg-white/5 bg-white border dark:border-white/10 border-slate-200 dark:text-slate-300 text-slate-600 hover:text-violet-400 hover:border-violet-500/30 transition-all font-medium w-full"
      >
        <TrendingUp className="w-4 h-4 text-violet-400" />
        <span>تحليل نقاط ضعفك وقوتك</span>
        {data && !loading && <ChevronRight className={`w-4 h-4 mr-auto transition-transform ${open ? "rotate-90" : ""}`} />}
        {loading && <Loader2 className="w-4 h-4 mr-auto animate-spin text-violet-400" />}
      </button>

      <AnimatePresence>
        {open && data && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="mt-3 dark:bg-white/5 bg-white rounded-2xl border dark:border-white/10 border-slate-200 p-4">
              {!data.ready ? (
                <div className="text-center py-2">
                  <p className="dark:text-slate-400 text-slate-600 text-sm">{data.message}</p>
                  <p className="dark:text-slate-500 text-slate-400 text-xs mt-1">اجتزت {data.totalAttempts} تحدٍّ حتى الآن</p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold dark:text-white text-slate-900">التحليل الشخصي ({data.totalAttempts} محاولة)</h3>
                  </div>

                  {data.weakAreas.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-red-400 mb-2 flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-red-400 inline-block" />
                        نقاط تحتاج تحسين
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {data.weakAreas.map((area) => (
                          <div
                            key={area.tag}
                            className="flex items-center gap-2 px-3 py-1.5 rounded-full dark:bg-red-500/10 bg-red-50 border dark:border-red-500/20 border-red-200"
                          >
                            <span className="text-xs font-mono text-red-400 font-semibold">{area.tag}</span>
                            <span className="text-xs text-red-400/70">{area.acceptanceRate}%</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {data.strongAreas.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-green-400 mb-2 flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-green-400 inline-block" />
                        نقاط قوتك
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {data.strongAreas.map((area) => (
                          <div
                            key={area.tag}
                            className="flex items-center gap-2 px-3 py-1.5 rounded-full dark:bg-green-500/10 bg-green-50 border dark:border-green-500/20 border-green-200"
                          >
                            <span className="text-xs font-mono text-green-400 font-semibold">{area.tag}</span>
                            <span className="text-xs text-green-400/70">{area.acceptanceRate}%</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {data.weakAreas.length === 0 && data.strongAreas.length === 0 && (
                    <p className="text-sm dark:text-slate-400 text-slate-600 text-center py-2">أكمل المزيد من التحديات لرؤية نقاط قوتك وضعفك</p>
                  )}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function ProblemsPageDefault() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<MainTab>("tracks");
  const [problems, setProblems] = useState<Problem[]>([]);
  const [tracks, setTracks] = useState<Track[]>([]);
  const [daily, setDaily] = useState<DailyChallenge | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderEntry[]>([]);
  const [lbPeriod, setLbPeriod] = useState<"weekly" | "monthly" | "all">(
    "weekly",
  );
  const [search, setSearch] = useState("");
  const [language, setLanguage] = useState("الكل");
  const [difficulty, setDifficulty] = useState("الكل");
  const [selectedTag, setSelectedTag] = useState("");
  const [selectedCompany, setSelectedCompany] = useState("");
  const [loading, setLoading] = useState(true);
  const [lbLoading, setLbLoading] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [challengeStats, setChallengeStats] = useState<{
    totalProblems: number;
    totalDailyChallenges: number;
    totalParticipants: number;
    totalBadges: number;
  } | null>(null);

  useEffect(() => {
    api.get<Track[]>("/tracks").then(setTracks).catch(() => {});
    api.get<DailyChallenge>("/daily-challenge").then(setDaily).catch(() => {});
    api.get<{ totalProblems: number; totalDailyChallenges: number; totalParticipants: number; totalBadges?: number }>(
      "/stats/challenges"
    ).then(data => setChallengeStats({ totalBadges: 0, ...data })).catch(() => {});
  }, []);

  useEffect(() => {
    if (activeTab === "problems") {
      const params = new URLSearchParams();
      params.set("mode", "free");
      if (search) params.set("search", search);
      if (difficulty !== "الكل")
        params.set("difficulty", diffMap[difficulty] || difficulty);
      if (language !== "الكل") params.set("language", language);
      if (selectedTag) params.set("tag", selectedTag);
      if (selectedCompany) params.set("company", selectedCompany);
      setLoading(true);
      api
        .get<Problem[]>(`/problems?${params.toString()}`)
        .then(setProblems)
        .catch(() => {})
        .finally(() => setLoading(false));
    }
  }, [activeTab, search, language, difficulty, selectedTag, selectedCompany]);

  useEffect(() => {
    if (activeTab === "leaderboard") {
      setLbLoading(true);
      api
        .get<{ period: string; entries: LeaderEntry[] }>(
          `/leaderboard?period=${lbPeriod}`,
        )
        .then((d) => setLeaderboard(d.entries))
        .catch(() => {})
        .finally(() => setLbLoading(false));
    }
  }, [activeTab, lbPeriod]);

  const stats = {
    total: problems.length,
    solved: problems.filter((p) => p.isSolved).length,
    easy: problems.filter((p) => p.difficulty === "easy").length,
    medium: problems.filter((p) => p.difficulty === "medium").length,
    hard: problems.filter((p) => p.difficulty === "hard").length,
    expert: problems.filter((p) => p.difficulty === "expert").length,
  };

  const tabs: { id: MainTab; label: string; icon: React.ReactNode }[] = [
    {
      id: "tracks",
      label: "مسارات التعلم",
      icon: <BookOpen className="w-4 h-4" />,
    },
    {
      id: "problems",
      label: "تحديات حرة",
      icon: <Code2 className="w-4 h-4" />,
    },
    {
      id: "daily",
      label: "التحدي اليومي",
      icon: <Calendar className="w-4 h-4" />,
    },
    {
      id: "leaderboard",
      label: "لوحة الصدارة",
      icon: <Trophy className="w-4 h-4" />,
    },
  ];

  return (
    <MainLayout>
      <div className="min-h-screen dark:bg-[#0a0f1e] bg-slate-50">
        {/* Hero Header */}
        <div className="dark:bg-[#070b14] bg-white border-b dark:border-white/5 border-slate-100 py-10">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <div className="flex items-center gap-3 mb-3">
                <span className="badge badge-cyan">التحديات البرمجية</span>
                {daily?.available && !daily.isSolvedToday && (
                  <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-medium animate-pulse">
                    <Flame className="w-3.5 h-3.5" />
                    تحدي اليوم متاح!
                  </span>
                )}
              </div>
              <h1 className="text-3xl sm:text-4xl font-black dark:text-white text-slate-900 mb-2">
                أفضل منصة تحديات برمجية عربية
              </h1>
              <p className="dark:text-slate-400 text-slate-600 mb-6 max-w-2xl">
                تعلم من خلال المسارات المنظمة، حل التحديات اليومية، وتنافس مع
                المبرمجين العرب في لوحة الصدارة
              </p>

              <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
                {[
                  { label: "مسار تعليمي", value: tracks.length, icon: "" },
                  { label: "تحدي برمجي", value: challengeStats?.totalProblems ?? "...", icon: "" },
                  { label: "محلولة", value: stats.solved, icon: "" },
                  { label: "شارة", value: challengeStats?.totalBadges ?? "...", icon: "" },
                  { label: "تحديات يومية", value: challengeStats?.totalDailyChallenges ?? "...", icon: "" },
                  { label: "مشارك", value: challengeStats?.totalParticipants ?? "...", icon: "" },
                ].map((s, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: i * 0.06 }}
                    className="dark:bg-white/5 bg-slate-100 rounded-xl p-3 text-center"
                  >
                    <div className="text-xl mb-0.5">{s.icon}</div>
                    <div className="text-lg font-black dark:text-white text-slate-900">
                      {s.value}
                    </div>
                    <div className="text-xs dark:text-slate-500 text-slate-500">
                      {s.label}
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          </div>
        </div>

        {/* Main Tab Navigation */}
        <div className="dark:bg-[#070b14] bg-white border-b dark:border-white/5 border-slate-100 sticky top-0 z-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex overflow-x-auto">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-5 py-3.5 text-sm font-semibold whitespace-nowrap border-b-2 transition-all ${
                    activeTab === tab.id
                      ? "border-cyan-500 text-cyan-400"
                      : "border-transparent dark:text-slate-400 text-slate-600 hover:text-cyan-400"
                  }`}
                >
                  {tab.icon}
                  {tab.label}
                  {tab.id === "daily" &&
                    daily?.available &&
                    !daily.isSolvedToday && (
                      <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                    )}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <AnimatePresence mode="wait">
            {/* ── Tracks Tab ─────────────────────────────────────────────── */}
            {activeTab === "tracks" && (
              <motion.div
                key="tracks"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <div className="mb-6">
                  <h2 className="text-xl font-bold dark:text-white text-slate-900 mb-1">
                    مسارات التعلم
                  </h2>
                  <p className="dark:text-slate-400 text-slate-600 text-sm">
                    كل مسار رحلة منظمة من المستوى المبتدئ للخبير — تتبع تقدمك
                    خطوة بخطوة
                  </p>
                </div>

                {tracks.length === 0 ? (
                  <div className="text-center py-20">
                    <BookOpen className="w-16 h-16 dark:text-slate-700 text-slate-300 mx-auto mb-4" />
                    <h3 className="text-lg font-bold dark:text-white text-slate-900 mb-2">
                      المسارات قادمة قريباً
                    </h3>
                    <p className="dark:text-slate-400 text-slate-600 text-sm mb-4">
                      ابدأ بالتحديات الحرة في هذه الأثناء
                    </p>
                    <button
                      onClick={() => setActiveTab("problems")}
                      className="btn-primary"
                    >
                      <Code2 className="w-4 h-4" />
                      التحديات الحرة
                    </button>
                  </div>
                ) : (
                  <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
                    {tracks.map((track, i) => {
                      const solved = track.userProgress?.solvedCount ?? 0;
                      const pct =
                        track.totalProblems > 0
                          ? Math.round((solved / track.totalProblems) * 100)
                          : 0;
                      return (
                        <motion.div
                          key={track.id}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: i * 0.06 }}
                          whileHover={{ y: -4 }}
                        >
                          <Link
                            href={user ? `/tracks/${track.id}` : "/auth/login"}
                          >
                            <div className="dark:bg-[#111827] bg-white rounded-2xl border dark:border-white/10 border-slate-200 p-5 hover:border-cyan-500/40 transition-all h-full group">
                              <div className="flex items-start justify-between mb-4">
                                <div
                                  className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl shadow-lg"
                                  style={{
                                    background: `${track.color}22`,
                                    border: `2px solid ${track.color}44`,
                                  }}
                                >
                                  {track.icon}
                                </div>
                                <span className="text-xs px-2.5 py-1 rounded-full dark:bg-white/5 bg-slate-100 dark:text-slate-400 text-slate-600">
                                  {difficultyTrackLabel[track.difficulty] ??
                                    track.difficulty}
                                </span>
                              </div>

                              <h3 className="font-bold dark:text-white text-slate-900 mb-1.5 group-hover:text-cyan-400 transition-colors">
                                {track.title}
                              </h3>
                              <p className="text-xs dark:text-slate-400 text-slate-600 mb-4 line-clamp-2">
                                {track.description}
                              </p>

                              <div className="flex items-center justify-between text-xs dark:text-slate-500 text-slate-400 mb-3">
                                <span className="flex items-center gap-1">
                                  <Code2 className="w-3 h-3" />
                                  {track.language}
                                </span>
                                <span>
                                  {solved}/{track.totalProblems} مسألة
                                </span>
                              </div>

                              <div className="w-full bg-white/10 dark:bg-white/5 rounded-full h-1.5">
                                <div
                                  className="h-1.5 rounded-full transition-all duration-700"
                                  style={{
                                    width: `${pct}%`,
                                    background: track.color,
                                  }}
                                />
                              </div>
                              {pct > 0 && (
                                <p
                                  className="text-xs mt-1.5"
                                  style={{ color: track.color }}
                                >
                                  {pct}% مكتمل
                                </p>
                              )}
                            </div>
                          </Link>
                        </motion.div>
                      );
                    })}
                  </div>
                )}
              </motion.div>
            )}

            {/* ── Problems Tab ───────────────────────────────────────────── */}
            {activeTab === "problems" && (
              <motion.div
                key="problems"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                {/* Weakness Analysis Panel */}
                {user && <WeaknessPanel />}

                {/* Stats Bar */}
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 mb-5">
                  {[
                    {
                      label: "الكل",
                      value: stats.total,
                      color: "text-slate-400",
                    },
                    {
                      label: "محلولة",
                      value: stats.solved,
                      color: "text-cyan-400",
                    },
                    {
                      label: "سهل",
                      value: stats.easy,
                      color: "text-green-400",
                    },
                    {
                      label: "متوسط",
                      value: stats.medium,
                      color: "text-amber-400",
                    },
                    { label: "صعب", value: stats.hard, color: "text-red-400" },
                    {
                      label: "خبير",
                      value: stats.expert,
                      color: "text-violet-400",
                    },
                  ].map((s, i) => (
                    <div
                      key={i}
                      className="dark:bg-white/5 bg-white rounded-xl p-2 text-center border dark:border-white/5 border-slate-200"
                    >
                      <div className={`text-xl font-black ${s.color}`}>
                        {s.value}
                      </div>
                      <div className="text-xs dark:text-slate-500 text-slate-500">
                        {s.label}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Search + Filters */}
                <div className="flex flex-col gap-3 mb-5">
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 dark:text-slate-400 text-slate-400" />
                      <input
                        type="text"
                        placeholder="ابحث عن مسألة..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full py-2.5 pr-10 pl-4 rounded-xl dark:bg-white/5 bg-white border dark:border-white/10 border-slate-200 dark:text-white text-slate-900 outline-none focus:border-cyan-500 transition-colors text-sm"
                      />
                    </div>
                    <button
                      onClick={() => setShowFilters(!showFilters)}
                      className={`px-3 py-2.5 rounded-xl border text-sm flex items-center gap-2 transition-all ${
                        showFilters ||
                        selectedTag ||
                        selectedCompany ||
                        language !== "الكل"
                          ? "bg-cyan-500/10 border-cyan-500/30 text-cyan-400"
                          : "dark:bg-white/5 bg-white dark:border-white/10 border-slate-200 dark:text-slate-300 text-slate-600"
                      }`}
                    >
                      <Filter className="w-4 h-4" />
                      <span className="hidden sm:inline">فلاتر</span>
                    </button>
                  </div>

                  {/* Difficulty Tabs */}
                  <div className="flex gap-2 overflow-x-auto pb-1">
                    {difficulties.map((d) => (
                      <button
                        key={d}
                        onClick={() => setDifficulty(d)}
                        className={`px-4 py-1.5 rounded-xl text-sm font-medium whitespace-nowrap transition-all ${
                          difficulty === d
                            ? "gradient-bg text-white"
                            : "dark:bg-white/5 bg-white dark:text-slate-300 text-slate-600 hover:text-cyan-400 border dark:border-white/10 border-slate-200"
                        }`}
                      >
                        {d}
                      </button>
                    ))}
                  </div>

                  {/* Advanced Filters */}
                  <AnimatePresence>
                    {showFilters && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                      >
                        <div className="dark:bg-white/5 bg-white rounded-xl border dark:border-white/10 border-slate-200 p-4 space-y-3">
                          <div>
                            <p className="text-xs font-semibold dark:text-slate-400 text-slate-600 mb-2 flex items-center gap-1.5">
                              <Globe className="w-3.5 h-3.5" /> اللغة
                            </p>
                            <div className="flex flex-wrap gap-2">
                              {languages.map((l) => (
                                <button
                                  key={l}
                                  onClick={() => setLanguage(l)}
                                  className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${
                                    language === l
                                      ? "bg-cyan-500/20 border border-cyan-500/40 text-cyan-400"
                                      : "dark:bg-white/5 bg-slate-100 dark:text-slate-400 text-slate-600 hover:text-cyan-400"
                                  }`}
                                >
                                  {l}
                                </button>
                              ))}
                            </div>
                          </div>

                          <div>
                            <p className="text-xs font-semibold dark:text-slate-400 text-slate-600 mb-2 flex items-center gap-1.5">
                              <Tag className="w-3.5 h-3.5" /> الوسوم
                            </p>
                            <div className="flex flex-wrap gap-2">
                              {POPULAR_TAGS.map((t) => (
                                <button
                                  key={t}
                                  onClick={() =>
                                    setSelectedTag(selectedTag === t ? "" : t)
                                  }
                                  className={`px-3 py-1 rounded-lg text-xs font-medium font-mono transition-all ${
                                    selectedTag === t
                                      ? "bg-violet-500/20 border border-violet-500/40 text-violet-400"
                                      : "dark:bg-white/5 bg-slate-100 dark:text-slate-400 text-slate-600 hover:text-violet-400"
                                  }`}
                                >
                                  {t}
                                </button>
                              ))}
                            </div>
                          </div>

                          <div>
                            <p className="text-xs font-semibold dark:text-slate-400 text-slate-600 mb-2 flex items-center gap-1.5">
                              <Building2 className="w-3.5 h-3.5" /> أسئلة
                              الشركات
                            </p>
                            <div className="flex flex-wrap gap-2">
                              {COMPANIES.map((c) => (
                                <button
                                  key={c}
                                  onClick={() =>
                                    setSelectedCompany(
                                      selectedCompany === c ? "" : c,
                                    )
                                  }
                                  className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${
                                    selectedCompany === c
                                      ? "bg-amber-500/20 border border-amber-500/40 text-amber-400"
                                      : "dark:bg-white/5 bg-slate-100 dark:text-slate-400 text-slate-600 hover:text-amber-400"
                                  }`}
                                >
                                  {c}
                                </button>
                              ))}
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Problems List */}
                {loading ? (
                  <div className="space-y-2">
                    {[...Array(8)].map((_, i) => (
                      <ProblemRowSkeleton key={i} />
                    ))}
                  </div>
                ) : problems.length === 0 ? (
                  <div className="text-center py-16">
                    <Target className="w-12 h-12 dark:text-slate-700 text-slate-300 mx-auto mb-3" />
                    <p className="dark:text-slate-400 text-slate-600">
                      لا توجد مسائل مطابقة
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {problems.map((problem, i) => {
                      const diff =
                        difficultyConfig[problem.difficulty] ??
                        difficultyConfig.easy;
                      return (
                        <motion.div
                          key={problem.id}
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: i * 0.03 }}
                          whileHover={{ x: -4 }}
                        >
                          <Link
                            href={
                              user ? `/problems/${problem.id}` : "/auth/login"
                            }
                          >
                            <div className="dark:bg-[#111827] bg-white rounded-xl border dark:border-white/10 border-slate-200 p-4 hover:border-cyan-500/30 transition-all group flex items-center gap-4">
                              <div className="w-8 h-8 rounded-lg dark:bg-white/5 bg-slate-100 flex items-center justify-center text-sm font-bold dark:text-slate-500 text-slate-400 flex-shrink-0">
                                {problem.isSolved ? (
                                  <CheckCircle className="w-5 h-5 text-green-400" />
                                ) : (
                                  problem.id
                                )}
                              </div>

                              <div className="flex-1 min-w-0">
                                <p className="font-semibold dark:text-white text-slate-900 group-hover:text-cyan-400 transition-colors truncate mb-1">
                                  {problem.title}
                                </p>
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span
                                    className={`text-xs font-medium px-2 py-0.5 rounded-full ${diff.bg} ${diff.border} border ${diff.color}`}
                                  >
                                    {diff.label}
                                  </span>
                                  <span className="text-xs dark:text-slate-500 text-slate-400">
                                    {problem.category}
                                  </span>
                                  <span className="text-xs dark:text-slate-500 text-slate-400">
                                    •
                                  </span>
                                  <span className="text-xs dark:text-slate-400 text-slate-500">
                                    {problem.language}
                                  </span>
                                  {(problem.tags as string[])
                                    .slice(0, 2)
                                    .map((t) => (
                                      <span
                                        key={t}
                                        className="text-xs px-2 py-0.5 rounded-full dark:bg-violet-500/10 bg-violet-50 dark:text-violet-400 text-violet-700 font-mono hidden sm:inline"
                                      >
                                        {t}
                                      </span>
                                    ))}
                                  {(problem.companyTags as string[])
                                    .slice(0, 1)
                                    .map((c) => (
                                      <span
                                        key={c}
                                        className="text-xs px-2 py-0.5 rounded-full dark:bg-amber-500/10 bg-amber-50 dark:text-amber-400 text-amber-700 hidden sm:inline"
                                      >
                                        {c}
                                      </span>
                                    ))}
                                </div>
                              </div>

                              <div className="flex items-center gap-3 flex-shrink-0">
                                <div className="text-center hidden sm:block">
                                  <p className="text-xs dark:text-slate-500 text-slate-400">
                                    حُلّت
                                  </p>
                                  <p className="text-sm font-bold dark:text-slate-300 text-slate-700">
                                    {problem.solvedCount.toLocaleString(
                                      "ar-EG",
                                    )}
                                  </p>
                                </div>
                                <div
                                  className={`flex items-center gap-1 px-2.5 py-1 rounded-lg ${diff.bg} ${diff.border} border`}
                                >
                                  <Star className={`w-3 h-3 ${diff.color}`} />
                                  <span
                                    className={`text-xs font-bold ${diff.color}`}
                                  >
                                    {problem.points}
                                  </span>
                                </div>
                                {!user && (
                                  <Lock className="w-4 h-4 dark:text-slate-600 text-slate-300" />
                                )}
                                <ChevronRight className="w-4 h-4 dark:text-slate-600 text-slate-300 group-hover:text-cyan-400 transition-colors" />
                              </div>
                            </div>
                          </Link>
                        </motion.div>
                      );
                    })}
                  </div>
                )}
              </motion.div>
            )}

            {/* ── Daily Challenge Tab ────────────────────────────────────── */}
            {activeTab === "daily" && (
              <motion.div
                key="daily"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                {!daily?.available ? (
                  <div className="text-center py-20">
                    <Calendar className="w-16 h-16 dark:text-slate-700 text-slate-300 mx-auto mb-4" />
                    <h3 className="text-xl font-bold dark:text-white text-slate-900 mb-2">
                      لا يوجد تحدٍ يومي اليوم
                    </h3>
                    <p className="dark:text-slate-400 text-slate-600">
                      تابعنا، يصدر التحدي اليومي كل يوم!
                    </p>
                  </div>
                ) : (
                  <div className="max-w-2xl mx-auto">
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="dark:bg-gradient-to-br dark:from-amber-900/30 dark:to-orange-900/20 bg-gradient-to-br from-amber-50 to-orange-50 rounded-2xl border dark:border-amber-500/20 border-amber-200 p-6 mb-6"
                    >
                      <div className="flex items-center gap-3 mb-4">
                        <div className="w-12 h-12 rounded-2xl bg-amber-500/20 flex items-center justify-center">
                          <Flame className="w-7 h-7 text-amber-400" />
                        </div>
                        <div>
                          <h2 className="text-xl font-bold dark:text-white text-slate-900">
                            التحدي اليومي
                          </h2>
                          <p className="text-sm text-amber-500">
                            نقاط مضاعفة ×{daily.bonusMultiplier}
                          </p>
                        </div>
                        {daily.isSolvedToday && (
                          <span className="mr-auto flex items-center gap-1.5 text-green-400 text-sm font-semibold">
                            <CheckCircle className="w-4 h-4" />
                            تم الحل!
                          </span>
                        )}
                      </div>

                      {daily.problem && (
                        <div className="dark:bg-black/20 bg-white/60 rounded-xl p-4 mb-4">
                          <h3 className="font-bold dark:text-white text-slate-900 mb-2">
                            {daily.problem.title}
                          </h3>
                          <div className="flex items-center gap-3 text-sm">
                            <span
                              className={`${difficultyConfig[daily.problem.difficulty as keyof typeof difficultyConfig]?.color ?? "text-slate-400"}`}
                            >
                              {
                                difficultyConfig[
                                  daily.problem
                                    .difficulty as keyof typeof difficultyConfig
                                ]?.label
                              }
                            </span>
                            <span className="dark:text-slate-400 text-slate-600">
                              {daily.problem.language}
                            </span>
                            <span className="flex items-center gap-1 text-amber-400 font-bold">
                              <Star className="w-4 h-4" />
                              {(
                                daily.problem.points *
                                (daily.bonusMultiplier ?? 2)
                              ).toLocaleString("ar-EG")}{" "}
                              نقطة
                            </span>
                          </div>
                        </div>
                      )}

                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5 text-sm dark:text-slate-400 text-slate-600">
                          <Users className="w-4 h-4" />
                          {daily.participantsCount?.toLocaleString("ar-EG") ??
                            0}{" "}
                          مشارك
                        </div>
                        <Link
                          href={
                            daily.problem
                              ? `/problems/${daily.problem.id}`
                              : "/problems"
                          }
                          className="btn-primary text-sm"
                        >
                          {daily.isSolvedToday ? "مراجعة الحل" : "ابدأ التحدي"}
                          <ChevronRight className="w-4 h-4" />
                        </Link>
                      </div>
                    </motion.div>

                    <div className="dark:bg-[#111827] bg-white rounded-2xl border dark:border-white/10 border-slate-200 p-5">
                      <h3 className="font-bold dark:text-white text-slate-900 mb-4 flex items-center gap-2">
                        <Award className="w-5 h-5 text-amber-400" />
                        مميزات التحدي اليومي
                      </h3>
                      <div className="space-y-3">
                        {[
                          {
                            icon: "⚡",
                            text: `نقاط مضاعفة ×${daily.bonusMultiplier ?? 2} على كل تحدٍ يومي`,
                          },
                          {
                            icon: "🔥",
                            text: "حافظ على سلسلتك اليومية للحصول على أوسمة خاصة",
                          },
                          {
                            icon: "🏆",
                            text: "تنافس مع المجتمع — كل يوم تحدٍ واحد للجميع",
                          },
                          {
                            icon: "📅",
                            text: "يصدر تحدٍ جديد كل يوم في منتصف الليل",
                          },
                        ].map((item, i) => (
                          <div
                            key={i}
                            className="flex items-center gap-3 text-sm dark:text-slate-300 text-slate-700"
                          >
                            <span className="text-lg">{item.icon}</span>
                            <span>{item.text}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </motion.div>
            )}

            {/* ── Leaderboard Tab ────────────────────────────────────────── */}
            {activeTab === "leaderboard" && (
              <motion.div
                key="leaderboard"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
                  <div>
                    <h2 className="text-xl font-bold dark:text-white text-slate-900 mb-1">
                      لوحة الصدارة
                    </h2>
                    <p className="dark:text-slate-400 text-slate-600 text-sm">
                      أفضل المبرمجين العرب
                    </p>
                  </div>
                  <div className="flex gap-2">
                    {(["weekly", "monthly", "all"] as const).map((p) => (
                      <button
                        key={p}
                        onClick={() => setLbPeriod(p)}
                        className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                          lbPeriod === p
                            ? "gradient-bg text-white"
                            : "dark:bg-white/5 bg-white border dark:border-white/10 border-slate-200 dark:text-slate-300 text-slate-600 hover:text-cyan-400"
                        }`}
                      >
                        {p === "weekly"
                          ? "أسبوعي"
                          : p === "monthly"
                            ? "شهري"
                            : "كل الوقت"}
                      </button>
                    ))}
                  </div>
                </div>

                {lbLoading ? (
                  <div className="space-y-3">
                    {[...Array(10)].map((_, i) => (
                      <div
                        key={i}
                        className="h-16 rounded-xl dark:bg-white/5 bg-white animate-pulse"
                      />
                    ))}
                  </div>
                ) : leaderboard.length === 0 ? (
                  <div className="text-center py-16">
                    <Trophy className="w-12 h-12 dark:text-slate-700 text-slate-300 mx-auto mb-3" />
                    <p className="dark:text-slate-400 text-slate-600">
                      لا توجد بيانات لهذه الفترة بعد
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {leaderboard.map((entry, i) => (
                      <motion.div
                        key={entry.userId}
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.03 }}
                        className={`dark:bg-[#111827] bg-white rounded-xl border transition-all ${
                          entry.isCurrentUser
                            ? "border-cyan-500/40 dark:bg-cyan-500/5"
                            : "dark:border-white/10 border-slate-200"
                        }`}
                      >
                        <div className="flex items-center gap-4 p-4">
                          <div
                            className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-lg flex-shrink-0 ${
                              i === 0
                                ? "bg-amber-500/20 text-amber-400"
                                : i === 1
                                  ? "bg-slate-400/20 text-slate-400"
                                  : i === 2
                                    ? "bg-amber-700/20 text-amber-700"
                                    : "dark:bg-white/5 bg-slate-100 dark:text-slate-500 text-slate-400"
                            }`}
                          >
                            {i < 3 ? ["🥇", "🥈", "🥉"][i] : entry.rank}
                          </div>

                          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-cyan-500 to-violet-500 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                            {entry.avatar ? (
                              <img
                                src={entry.avatar}
                                alt=""
                                className="w-full h-full rounded-full object-cover"
                              />
                            ) : (
                              entry.name.charAt(0)
                            )}
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="font-semibold dark:text-white text-slate-900 truncate">
                                {entry.name}
                              </p>
                              {entry.isCurrentUser && (
                                <span className="text-xs text-cyan-400 font-medium">
                                  (أنت)
                                </span>
                              )}
                              {entry.streak > 0 && (
                                <span className="text-xs text-orange-400 flex items-center gap-0.5">
                                  <Flame className="w-3 h-3" />
                                  {entry.streak}
                                </span>
                              )}
                            </div>
                            <p className="text-xs dark:text-slate-400 text-slate-600">
                              @{entry.username} • {entry.level}
                            </p>
                          </div>

                          <div className="flex items-center gap-4 flex-shrink-0">
                            <div className="text-center hidden sm:block">
                              <p className="text-xs dark:text-slate-500 text-slate-400">
                                محلولة
                              </p>
                              <p className="text-sm font-bold dark:text-white text-slate-900">
                                {entry.solvedCount}
                              </p>
                            </div>
                            <div className="text-center">
                              <p className="text-xs dark:text-slate-500 text-slate-400">
                                نقطة
                              </p>
                              <p className="text-sm font-bold text-amber-400">
                                {entry.points.toLocaleString("ar-EG")}
                              </p>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}

                <div className="text-center mt-6">
                  <Link href="/leaderboard" className="btn-secondary text-sm">
                    عرض الصدارة الكاملة
                    <ChevronRight className="w-4 h-4" />
                  </Link>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Login CTA */}
        {!user && (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-12">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-6 rounded-2xl dark:bg-gradient-to-r dark:from-cyan-900/30 dark:to-violet-900/30 bg-gradient-to-r from-cyan-50 to-violet-50 border dark:border-white/10 border-slate-200 text-center"
            >
              <Trophy className="w-10 h-10 text-cyan-400 mx-auto mb-3" />
              <h3 className="font-bold dark:text-white text-slate-900 mb-2">
                سجل دخولك لتتبع تقدمك وكسب النقاط
              </h3>
              <p className="dark:text-slate-400 text-slate-600 text-sm mb-4">
                حساب مجاني يتيح لك حل التحديات وكسب الأوسمة والمنافسة في لوحة
                الصدارة
              </p>
              <Link href="/auth/register" className="btn-primary inline-flex">
                <Zap className="w-4 h-4" />
                إنشاء حساب مجاني
              </Link>
            </motion.div>
          </div>
        )}
      </div>
    </MainLayout>
  );
}

export default function ProblemsPage() {
  const { checking, blocks } = useRouteOverride("problems");
  if (checking)
    return (
      <MainLayout>
        <div className="min-h-[80vh] dark:bg-[#0a0f1e] bg-slate-50" />
      </MainLayout>
    );
  if (blocks)
    return (
      <MainLayout>
        <BlockRenderer blocks={blocks} />
      </MainLayout>
    );
  return <ProblemsPageDefault />;
}
