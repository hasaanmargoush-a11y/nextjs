"use client";

import { useState, useEffect, useCallback, use } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MainLayout } from "@/components/layout/MainLayout";
import { useAuth } from "@/lib/auth-context";
import { toast } from "sonner";
import Link from "next/link";
import {
  Star, Award, BookOpen, Code2, MapPin, Phone,
  Twitter, Facebook, Github, Linkedin, Loader2,
  Medal, CheckCircle, Shield, ExternalLink, Copy,
  Calendar, User, ChevronRight, Trophy, Zap,
  GraduationCap, Clock, BarChart3, Globe, Settings, Flame,
  FolderOpen, Tag, Edit3, Clock3, CheckCircle2, Download,
} from "lucide-react";

interface ProfileUser {
  id: number; name: string; username: string; role: string;
  avatar: string | null; bio: string | null; phone: string | null;
  address: string | null; age: number | null; facebook: string | null;
  twitter: string | null; linkedin: string | null; github: string | null;
  points: number; level: string; streak: number; maxStreak: number;
  createdAt: string; completedCourses: number; enrolledCourses: number;
  solvedProblems: number; rank: number;
}

interface EnrolledCourse {
  id: number; title: string; thumbnail: string | null;
  category: string; level: string; progress: number;
  completedLessons: number; totalLessons: number;
  enrolledAt: string; completedAt: string | null;
}

interface UserCertificate {
  id: number; uniqueCode: string; issuedAt: string;
  courseTitle: string; certTitle: string; certType: string;
}

interface PublicProject {
  id: number; name: string; description: string;
  tags: string[]; created_at: string; updated_at: string;
}

interface UserBadge {
  id: number; key: string; name: string; description: string;
  icon: string; color: string; rarity: string; awardedAt: string;
}

type Tab = "about" | "courses" | "certs" | "projects" | "badges";

const LEVEL_CONFIG: Record<string, { color: string; bg: string; border: string; icon: string }> = {
  "مبتدئ": { color: "text-slate-500 dark:text-slate-400",   bg: "bg-slate-100 dark:bg-slate-800",       border: "border-slate-300 dark:border-slate-600", icon: "Lv.1" },
  "متوسط": { color: "text-blue-600 dark:text-blue-400",     bg: "bg-blue-50 dark:bg-blue-950/60",       border: "border-blue-200 dark:border-blue-700",   icon: "Lv.2" },
  "متقدم": { color: "text-violet-600 dark:text-violet-400", bg: "bg-violet-50 dark:bg-violet-950/60",   border: "border-violet-200 dark:border-violet-700", icon: "Lv.3" },
  "خبير":  { color: "text-amber-600 dark:text-amber-400",   bg: "bg-amber-50 dark:bg-amber-950/60",     border: "border-amber-200 dark:border-amber-700",  icon: "Lv.4" },
};

const LEVEL_POINTS: Record<string, number> = {
  "مبتدئ": 500, "متوسط": 2000, "متقدم": 5000, "خبير": 10000,
};

const CATEGORY_COLORS: Record<string, string> = {
  "برمجة": "from-cyan-500 to-blue-600",
  "ويب":   "from-blue-500 to-indigo-600",
  "تصميم": "from-pink-500 to-rose-600",
  "قواعد بيانات": "from-green-500 to-emerald-600",
  "ذكاء اصطناعي": "from-violet-500 to-purple-600",
  "أمن":   "from-red-500 to-orange-600",
};

function getCategoryGradient(cat: string) {
  for (const [k, v] of Object.entries(CATEGORY_COLORS)) {
    if (cat.includes(k)) return v;
  }
  return "from-cyan-500 to-violet-600";
}

export default function ProfilePage({ params }: { params: Promise<{ username: string }> }) {
  const { username } = use(params);
  const { user: currentUser } = useAuth();

  const [profile, setProfile]             = useState<ProfileUser | null>(null);
  const [courses, setCourses]             = useState<EnrolledCourse[]>([]);
  const [certs, setCerts]                 = useState<UserCertificate[]>([]);
  const [publicProjects, setPublicProjects] = useState<PublicProject[]>([]);
  const [badges, setBadges]               = useState<UserBadge[]>([]);
  const [loading, setLoading]             = useState(true);
  const [activeTab, setActiveTab]         = useState<Tab>("about");
  const [copiedId, setCopiedId]           = useState<number | null>(null);

  const isOwner = currentUser?.username === username;

  useEffect(() => {
    setLoading(true);
    const base = `/api/users/profile/${username}`;
    Promise.all([
      fetch(base).then(r => r.json()),
      fetch(`${base}/courses`).then(r => r.json()),
      fetch(`${base}/certificates`).then(r => r.json()),
      fetch(`/api/projects/public/${username}`).then(r => r.json()),
      fetch(`${base}/badges`).then(r => r.ok ? r.json() : []).catch(() => []),
    ]).then(([profileData, coursesData, certsData, projectsData, badgesData]) => {
      if (profileData?.user) setProfile(profileData.user);
      setCourses(Array.isArray(coursesData) ? coursesData : []);
      setCerts(Array.isArray(certsData) ? certsData : []);
      setPublicProjects(Array.isArray(projectsData) ? projectsData : []);
      setBadges(Array.isArray(badgesData) ? badgesData : []);
    }).catch(() => toast.error("حدث خطأ في تحميل البيانات"))
      .finally(() => setLoading(false));
  }, [username]);

  const copyVerifyLink = useCallback((cert: UserCertificate) => {
    const url = `${window.location.origin}/verify/${cert.uniqueCode}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopiedId(cert.id);
      setTimeout(() => setCopiedId(null), 2000);
    });
  }, []);

  if (loading) return (
    <MainLayout>
      <div className="min-h-screen flex items-center justify-center dark:bg-[#0a0f1e] bg-slate-50">
        <Loader2 className="w-7 h-7 text-cyan-500 animate-spin" />
      </div>
    </MainLayout>
  );

  if (!profile) return (
    <MainLayout>
      <div className="min-h-screen flex items-center justify-center dark:bg-[#0a0f1e] bg-slate-50 px-4">
        <div className="text-center">
          <div className="w-16 h-16 rounded-2xl dark:bg-white/5 bg-slate-100 border dark:border-white/10 border-slate-200 flex items-center justify-center mx-auto mb-4">
            <User className="w-8 h-8 dark:text-slate-500 text-slate-300" />
          </div>
          <h2 className="text-lg font-bold dark:text-white text-slate-900 mb-2">المستخدم غير موجود</h2>
          <p className="dark:text-slate-400 text-slate-500 text-sm mb-5">لا يوجد حساب بهذا الاسم</p>
          <Link href="/" className="btn-primary text-sm">العودة للرئيسية</Link>
        </div>
      </div>
    </MainLayout>
  );

  const levelCfg  = LEVEL_CONFIG[profile.level] ?? LEVEL_CONFIG["مبتدئ"];
  const levelMax  = LEVEL_POINTS[profile.level] ?? 500;
  const levelPct  = Math.min(100, Math.round((profile.points / levelMax) * 100));
  const joinDate  = new Date(profile.createdAt).toLocaleDateString("ar-EG", { year: "numeric", month: "long" });

  const socials = [
    { icon: <Github className="w-4 h-4" />,   href: profile.github,   label: "GitHub",   color: "hover:bg-slate-700 hover:text-white dark:hover:border-slate-600" },
    { icon: <Twitter className="w-4 h-4" />,  href: profile.twitter,  label: "Twitter",  color: "hover:bg-sky-500 hover:text-white dark:hover:border-sky-500" },
    { icon: <Linkedin className="w-4 h-4" />, href: profile.linkedin, label: "LinkedIn", color: "hover:bg-blue-600 hover:text-white dark:hover:border-blue-600" },
    { icon: <Facebook className="w-4 h-4" />, href: profile.facebook, label: "Facebook", color: "hover:bg-blue-700 hover:text-white dark:hover:border-blue-700" },
  ].filter(s => s.href);

  const tabs: { id: Tab; label: string; icon: React.ReactNode; count?: number }[] = [
    { id: "about",   label: "عنه",       icon: <User className="w-3.5 h-3.5" /> },
    { id: "courses", label: "الكورسات",  icon: <BookOpen className="w-3.5 h-3.5" />, count: courses.length },
    { id: "certs",   label: "الشهادات",  icon: <Medal className="w-3.5 h-3.5" />,    count: certs.length },
    ...(badges.length > 0
      ? [{ id: "badges" as Tab, label: "الأوسمة", icon: <Award className="w-3.5 h-3.5" />, count: badges.length }]
      : []),
    ...(publicProjects.length > 0 || isOwner
      ? [{ id: "projects" as Tab, label: "المشاريع", icon: <FolderOpen className="w-3.5 h-3.5" />, count: publicProjects.length }]
      : []),
  ];

  const STATS = [
    { icon: <Star className="w-4 h-4" />,     label: "النقاط",     value: profile.points.toLocaleString("ar-EG"), color: "text-amber-500",  bg: "dark:bg-amber-500/10 bg-amber-50",  border: "dark:border-amber-500/20 border-amber-100" },
    { icon: <Trophy className="w-4 h-4" />,   label: "الترتيب",    value: `#${profile.rank}`,                     color: "text-cyan-500",   bg: "dark:bg-cyan-500/10 bg-cyan-50",    border: "dark:border-cyan-500/20 border-cyan-100" },
    { icon: <Flame className="w-4 h-4" />,    label: "Streak",      value: `${profile.streak} يوم`,               color: "text-orange-500", bg: "dark:bg-orange-500/10 bg-orange-50", border: "dark:border-orange-500/20 border-orange-100" },
    { icon: <BookOpen className="w-4 h-4" />, label: "الكورسات",   value: profile.completedCourses,              color: "text-violet-500", bg: "dark:bg-violet-500/10 bg-violet-50", border: "dark:border-violet-500/20 border-violet-100" },
    { icon: <Code2 className="w-4 h-4" />,    label: "المسائل",    value: profile.solvedProblems,                color: "text-green-500",  bg: "dark:bg-green-500/10 bg-green-50",  border: "dark:border-green-500/20 border-green-100" },
    { icon: <Medal className="w-4 h-4" />,    label: "الشهادات",   value: certs.length,                          color: "text-rose-500",   bg: "dark:bg-rose-500/10 bg-rose-50",    border: "dark:border-rose-500/20 border-rose-100" },
  ];

  return (
    <MainLayout>
      <div className="min-h-screen dark:bg-[#0a0f1e] bg-slate-50">

        {/* ── Hero Card ─────────────────────────────────────── */}
        <div className="dark:bg-[#070b14] bg-white border-b dark:border-white/5 border-slate-200">
          <div className="max-w-3xl mx-auto px-4 sm:px-6 pt-6 sm:pt-10 pb-0">

            {/* Avatar + Name row */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-start gap-4"
            >
              {/* Avatar */}
              <div className="relative flex-shrink-0">
                <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl overflow-hidden bg-gradient-to-br from-cyan-400 via-violet-500 to-fuchsia-500 flex items-center justify-center text-white text-2xl sm:text-3xl font-black shadow-lg shadow-violet-500/20">
                  {profile.avatar
                    ? <img src={profile.avatar} alt={profile.name} className="w-full h-full object-cover" />
                    : profile.name?.charAt(0) ?? "م"
                  }
                </div>
                <div className="absolute -bottom-1 -left-1 w-4 h-4 sm:w-5 sm:h-5 rounded-full bg-green-400 border-2 dark:border-[#070b14] border-white shadow-sm" />
              </div>

              {/* Name + badges */}
              <div className="flex-1 min-w-0 pt-0.5">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h1 className="text-lg sm:text-2xl font-black dark:text-white text-slate-900 leading-tight truncate">
                      {profile.name}
                    </h1>
                    <p className="text-sm dark:text-slate-400 text-slate-500 mt-0.5">@{profile.username}</p>
                  </div>
                  {/* Edit button — owner only, desktop */}
                  {isOwner && (
                    <Link
                      href="/dashboard/settings"
                      className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl dark:bg-white/5 bg-slate-100 border dark:border-white/10 border-slate-200 text-xs font-bold dark:text-slate-300 text-slate-600 hover:dark:bg-white/10 hover:bg-slate-200 transition-colors whitespace-nowrap flex-shrink-0"
                    >
                      <Settings className="w-3.5 h-3.5" /> تعديل الملف
                    </Link>
                  )}
                </div>

                {/* Badges row */}
                <div className="flex flex-wrap items-center gap-1.5 mt-2">
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[11px] font-bold border ${levelCfg.bg} ${levelCfg.color} ${levelCfg.border}`}>
                    {levelCfg.icon} {profile.level}
                  </span>
                  {profile.streak > 0 && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-orange-50 dark:bg-orange-950/50 text-orange-600 dark:text-orange-400 text-[11px] font-bold border border-orange-200 dark:border-orange-800/60">
                      <Flame className="w-3 h-3" /> {profile.streak}d
                    </span>
                  )}
                  {profile.role === "admin" && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 text-[11px] font-bold border border-rose-200 dark:border-rose-800/60">
                      <Shield className="w-3 h-3" /> مشرف
                    </span>
                  )}
                </div>
              </div>
            </motion.div>

            {/* Edit button — mobile only */}
            {isOwner && (
              <Link
                href="/dashboard/settings"
                className="sm:hidden mt-4 flex items-center justify-center gap-2 w-full py-2.5 rounded-xl dark:bg-white/5 bg-slate-100 border dark:border-white/10 border-slate-200 text-sm font-bold dark:text-slate-300 text-slate-600 hover:dark:bg-white/10 transition-colors"
              >
                <Settings className="w-4 h-4" /> تعديل الملف الشخصي
              </Link>
            )}

            {/* Bio */}
            {profile.bio && (
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.1 }}
                className="mt-4 text-sm dark:text-slate-300 text-slate-600 leading-relaxed"
              >
                {profile.bio}
              </motion.p>
            )}

            {/* Meta row */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.12 }}
              className="flex flex-wrap gap-x-4 gap-y-1.5 mt-3 text-xs dark:text-slate-400 text-slate-500"
            >
              {profile.address && (
                <span className="flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-cyan-500 flex-shrink-0" /> {profile.address}
                </span>
              )}
              <span className="flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-violet-500 flex-shrink-0" /> انضم {joinDate}
              </span>
              {profile.age && (
                <span className="flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" /> {profile.age} سنة
                </span>
              )}
            </motion.div>

            {/* Socials */}
            {socials.length > 0 && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.15 }}
                className="flex gap-2 mt-4"
              >
                {socials.map((s, i) => (
                  <a
                    key={i}
                    href={s.href!}
                    target="_blank"
                    rel="noopener noreferrer"
                    title={s.label}
                    className={`w-8 h-8 rounded-lg dark:bg-white/5 bg-slate-100 border dark:border-white/10 border-slate-200 flex items-center justify-center dark:text-slate-400 text-slate-500 transition-all ${s.color}`}
                  >
                    {s.icon}
                  </a>
                ))}
              </motion.div>
            )}

            {/* Level progress bar */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="mt-5 mb-5"
            >
              <div className="flex items-center justify-between text-[11px] mb-1.5">
                <span className={`font-bold ${levelCfg.color}`}>{levelCfg.icon} {profile.level}</span>
                <span className="dark:text-slate-500 text-slate-400">
                  {profile.points.toLocaleString("ar-EG")} / {levelMax.toLocaleString("ar-EG")} نقطة
                </span>
              </div>
              <div className="h-2 rounded-full dark:bg-white/5 bg-slate-200 overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${levelPct}%` }}
                  transition={{ duration: 1, delay: 0.4 }}
                  className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-violet-500"
                />
              </div>
            </motion.div>
          </div>

          {/* ── Stats strip ── */}
          <div className="max-w-3xl mx-auto px-4 sm:px-6">
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 pb-5 pt-1">
              {STATS.map((s, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.15 + i * 0.04 }}
                  className={`flex flex-col items-center justify-center p-3 rounded-2xl border ${s.bg} ${s.border}`}
                >
                  <div className={`${s.color} mb-1`}>{s.icon}</div>
                  <div className={`text-sm sm:text-base font-black ${s.color} leading-none mb-0.5`}>
                    {s.value}
                  </div>
                  <div className="text-[10px] dark:text-slate-500 text-slate-400 text-center leading-tight">
                    {s.label}
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </div>

        {/* ── Content ─────────────────────────────────────── */}
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-5">

          {/* Tabs — full-width scrollable on mobile */}
          <div className="flex gap-1 p-1 dark:bg-white/5 bg-white rounded-2xl border dark:border-white/10 border-slate-200 mb-5 overflow-x-auto no-scrollbar">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 min-w-0 flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all whitespace-nowrap ${
                  activeTab === tab.id
                    ? "gradient-bg text-white shadow-sm"
                    : "dark:text-slate-400 text-slate-500 hover:dark:text-white hover:text-slate-700"
                }`}
              >
                {tab.icon}
                <span className="hidden xs:inline sm:inline">{tab.label}</span>
                <span className="xs:hidden sm:hidden">{tab.label.split("ال").pop() ?? tab.label}</span>
                {tab.count !== undefined && tab.count > 0 && (
                  <span className={`text-[10px] font-black px-1.5 py-0.5 rounded-full min-w-[18px] text-center ${
                    activeTab === tab.id
                      ? "bg-white/25 text-white"
                      : "dark:bg-white/10 bg-slate-100 dark:text-slate-400 text-slate-500"
                  }`}>
                    {tab.count}
                  </span>
                )}
              </button>
            ))}
          </div>

          <AnimatePresence mode="wait">

            {/* ── About ── */}
            {activeTab === "about" && (
              <motion.div key="about" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
                className="space-y-4">

                {/* Personal info card */}
                <div className="dark:bg-[#111827] bg-white rounded-2xl border dark:border-white/10 border-slate-200 p-4 sm:p-5">
                  <h3 className="font-bold dark:text-white text-slate-900 mb-4 flex items-center gap-2 text-sm">
                    <User className="w-4 h-4 text-cyan-500" /> المعلومات الشخصية
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {[
                      { icon: <User className="w-3.5 h-3.5 text-cyan-500" />,     label: "الاسم",            value: profile.name },
                      { icon: <Globe className="w-3.5 h-3.5 text-violet-500" />,  label: "اسم المستخدم",     value: `@${profile.username}` },
                      { icon: <MapPin className="w-3.5 h-3.5 text-rose-500" />,   label: "الموقع",           value: profile.address },
                      { icon: <Phone className="w-3.5 h-3.5 text-green-500" />,   label: "الهاتف",           value: profile.phone },
                      { icon: <Zap className="w-3.5 h-3.5 text-amber-500" />,     label: "العمر",            value: profile.age ? `${profile.age} سنة` : null },
                      { icon: <Calendar className="w-3.5 h-3.5 text-blue-500" />, label: "تاريخ الانضمام",   value: joinDate },
                    ].filter(item => item.value).map((item, i) => (
                      <div key={i} className="flex items-center gap-3">
                        <div className="w-7 h-7 rounded-lg dark:bg-white/5 bg-slate-50 border dark:border-white/10 border-slate-100 flex items-center justify-center flex-shrink-0">
                          {item.icon}
                        </div>
                        <div className="min-w-0">
                          <p className="text-[10px] dark:text-slate-500 text-slate-400">{item.label}</p>
                          <p className="text-sm font-medium dark:text-slate-200 text-slate-700 truncate">{item.value}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Bio card */}
                {profile.bio && (
                  <div className="dark:bg-[#111827] bg-white rounded-2xl border dark:border-white/10 border-slate-200 p-4 sm:p-5">
                    <h3 className="font-bold dark:text-white text-slate-900 mb-3 text-sm">نبذة</h3>
                    <p className="dark:text-slate-300 text-slate-600 leading-relaxed text-sm">{profile.bio}</p>
                  </div>
                )}

                {/* Achievements */}
                <div className="dark:bg-[#111827] bg-white rounded-2xl border dark:border-white/10 border-slate-200 p-4 sm:p-5">
                  <h3 className="font-bold dark:text-white text-slate-900 mb-4 flex items-center gap-2 text-sm">
                    <Trophy className="w-4 h-4 text-amber-500" /> الإنجازات
                  </h3>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                    {[
                      { label: "كورس مكتمل",  value: profile.completedCourses, color: "text-violet-500", bg: "dark:bg-violet-500/10 bg-violet-50", border: "dark:border-violet-500/20 border-violet-100" },
                      { label: "مسألة محلولة", value: profile.solvedProblems,   color: "text-green-500",  bg: "dark:bg-green-500/10 bg-green-50",   border: "dark:border-green-500/20 border-green-100" },
                      { label: "شهادة",        value: certs.length,             color: "text-amber-500",  bg: "dark:bg-amber-500/10 bg-amber-50",   border: "dark:border-amber-500/20 border-amber-100" },
                      { label: "نقطة",         value: profile.points,           color: "text-cyan-500",   bg: "dark:bg-cyan-500/10 bg-cyan-50",     border: "dark:border-cyan-500/20 border-cyan-100" },
                    ].map((a, i) => (
                      <div key={i} className={`text-center p-3 sm:p-4 rounded-xl border ${a.bg} ${a.border}`}>
                        <div className={`font-black ${a.color} text-lg sm:text-xl leading-none mb-0.5`}>
                          {a.value.toLocaleString("ar-EG")}
                        </div>
                        <div className="text-[11px] dark:text-slate-500 text-slate-500">{a.label}</div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Socials card */}
                {socials.length > 0 && (
                  <div className="dark:bg-[#111827] bg-white rounded-2xl border dark:border-white/10 border-slate-200 p-4 sm:p-5">
                    <h3 className="font-bold dark:text-white text-slate-900 mb-3 text-sm">روابط التواصل</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {socials.map((s, i) => (
                        <a
                          key={i}
                          href={s.href!}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-3 p-3 rounded-xl dark:bg-white/5 bg-slate-50 dark:text-slate-300 text-slate-600 hover:dark:bg-white/10 hover:bg-slate-100 transition-colors group border dark:border-white/5 border-slate-100"
                        >
                          <div className="w-8 h-8 rounded-lg dark:bg-white/10 bg-white border dark:border-white/10 border-slate-200 flex items-center justify-center flex-shrink-0">
                            {s.icon}
                          </div>
                          <span className="text-sm font-medium flex-1">{s.label}</span>
                          <ExternalLink className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity dark:text-slate-400" />
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </motion.div>
            )}

            {/* ── Courses ── */}
            {activeTab === "courses" && (
              <motion.div key="courses" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
                {courses.length === 0 ? (
                  <div className="text-center py-16">
                    <div className="w-16 h-16 rounded-2xl dark:bg-white/5 bg-white border dark:border-white/10 border-slate-200 flex items-center justify-center mx-auto mb-4">
                      <BookOpen className="w-8 h-8 dark:text-slate-500 text-slate-300" />
                    </div>
                    <p className="font-semibold dark:text-slate-300 text-slate-700 mb-1.5 text-sm">
                      {isOwner ? "لم تنضم لأي كورس بعد" : "لم ينضم لأي كورس بعد"}
                    </p>
                    {isOwner && (
                      <Link href="/courses" className="btn-primary mt-4 text-sm">استعرض الكورسات</Link>
                    )}
                  </div>
                ) : (
                  <div className="space-y-3">
                    {courses.map((course, i) => {
                      const grad = getCategoryGradient(course.category);
                      const isCompleted = course.completedAt !== null;
                      return (
                        <motion.div
                          key={course.id}
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: i * 0.04 }}
                          className="dark:bg-[#111827] bg-white rounded-2xl border dark:border-white/10 border-slate-200 overflow-hidden"
                        >
                          <div className={`h-1 bg-gradient-to-r ${grad}`} />
                          <div className="p-4">
                            <div className="flex items-start gap-3">
                              <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${grad} flex items-center justify-center flex-shrink-0 shadow-md`}>
                                <GraduationCap className="w-5 h-5 text-white" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <h4 className="font-bold dark:text-white text-slate-900 text-sm mb-1 leading-snug line-clamp-2">
                                  {course.title}
                                </h4>
                                <div className="flex items-center justify-between gap-2">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    {course.category && (
                                      <span className="text-[10px] dark:text-slate-400 text-slate-500">{course.category}</span>
                                    )}
                                    {isCompleted && (
                                      <span className="text-[10px] flex items-center gap-0.5 text-green-500 font-semibold">
                                        <CheckCircle2 className="w-3 h-3" /> مكتمل
                                      </span>
                                    )}
                                  </div>
                                  <Link
                                    href={`/courses/${course.id}`}
                                    className="text-xs font-bold text-cyan-500 hover:text-cyan-400 flex items-center gap-0.5 flex-shrink-0"
                                  >
                                    {isOwner ? "تابع" : "عرض"} <ChevronRight className="w-3.5 h-3.5" />
                                  </Link>
                                </div>
                              </div>
                            </div>

                            <div className="mt-3">
                              <div className="flex items-center justify-between mb-1.5">
                                <span className="text-[11px] dark:text-slate-400 text-slate-500 flex items-center gap-1">
                                  <BarChart3 className="w-3 h-3" />
                                  {course.completedLessons}/{course.totalLessons} درس
                                </span>
                                <span className={`text-xs font-bold ${isCompleted ? "text-green-500" : "text-cyan-500"}`}>
                                  {course.progress}%
                                </span>
                              </div>
                              <div className="h-2 rounded-full dark:bg-white/5 bg-slate-100 overflow-hidden">
                                <motion.div
                                  initial={{ width: 0 }}
                                  animate={{ width: `${course.progress}%` }}
                                  transition={{ duration: 0.7, delay: i * 0.04 + 0.2 }}
                                  className={`h-full rounded-full ${isCompleted ? "bg-gradient-to-r from-green-400 to-emerald-500" : `bg-gradient-to-r ${grad}`}`}
                                />
                              </div>
                            </div>
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                )}
              </motion.div>
            )}

            {/* ── Projects ── */}
            {activeTab === "projects" && (
              <motion.div key="projects" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
                {publicProjects.length === 0 ? (
                  <div className="text-center py-16">
                    <div className="w-16 h-16 rounded-2xl dark:bg-white/5 bg-white border dark:border-white/10 border-slate-200 flex items-center justify-center mx-auto mb-4">
                      <FolderOpen className="w-8 h-8 dark:text-slate-500 text-slate-300" />
                    </div>
                    <p className="font-semibold dark:text-slate-300 text-slate-700 mb-1 text-sm">
                      {isOwner ? "لم تنشر أي مشاريع بعد" : "لا توجد مشاريع منشورة"}
                    </p>
                    {isOwner && (
                      <>
                        <p className="text-xs dark:text-slate-500 text-slate-400 mb-5">
                          افتح المحرر واحفظ مشروعاً كـ «عام» ليظهر هنا
                        </p>
                        <Link href="/cloud-ide"
                          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-sm font-bold transition-colors">
                          <Code2 className="w-4 h-4" /> افتح المحرر
                        </Link>
                      </>
                    )}
                  </div>
                ) : (
                  <div className="space-y-3">
                    {publicProjects.map((proj, i) => {
                      const updatedDate = new Date(proj.updated_at).toLocaleDateString("ar-EG", { month: "short", day: "numeric" });
                      return (
                        <motion.div
                          key={proj.id}
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: i * 0.05 }}
                          className="dark:bg-[#111827] bg-white rounded-2xl border dark:border-white/10 border-slate-200 overflow-hidden hover:dark:border-violet-500/30 hover:border-violet-300 transition-all group"
                        >
                          <div className="h-1 bg-gradient-to-r from-cyan-500 via-violet-500 to-fuchsia-500" />
                          <div className="p-4">
                            <div className="flex items-start gap-3">
                              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-cyan-500 flex items-center justify-center flex-shrink-0 shadow-md shadow-violet-500/20">
                                <Code2 className="w-5 h-5 text-white" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-start justify-between gap-2">
                                  <h4 className="font-bold dark:text-white text-slate-900 text-sm truncate">{proj.name}</h4>
                                  {isOwner && (
                                    <Link href={`/cloud-ide?projectId=${proj.id}`}
                                      className="flex-shrink-0 flex items-center gap-1 text-xs font-bold text-violet-400 hover:text-violet-300 transition-colors">
                                      <Edit3 className="w-3.5 h-3.5" /> تعديل
                                    </Link>
                                  )}
                                </div>
                                {proj.description && (
                                  <p className="text-xs dark:text-slate-400 text-slate-500 mt-0.5 line-clamp-2">{proj.description}</p>
                                )}
                              </div>
                            </div>

                            {proj.tags.length > 0 && (
                              <div className="flex flex-wrap gap-1.5 mt-3">
                                {proj.tags.slice(0, 4).map((tag, ti) => (
                                  <span key={ti} className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full dark:bg-white/5 bg-slate-100 dark:text-slate-400 text-slate-500 border dark:border-white/5 border-slate-200">
                                    <Tag className="w-2.5 h-2.5" /> {tag}
                                  </span>
                                ))}
                              </div>
                            )}

                            <div className="flex items-center justify-between mt-3 pt-3 border-t dark:border-white/5 border-slate-100">
                              <span className="flex items-center gap-1.5 text-[11px] dark:text-slate-500 text-slate-400">
                                <Clock3 className="w-3 h-3" /> {updatedDate}
                              </span>
                              <Link href={`/community-projects/${proj.id}`}
                                className="flex items-center gap-1 text-xs font-bold text-cyan-500 hover:text-cyan-400 transition-colors">
                                عرض <ChevronRight className="w-3.5 h-3.5" />
                              </Link>
                            </div>
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                )}
              </motion.div>
            )}

            {/* ── Certs ── */}
            {activeTab === "certs" && (
              <motion.div key="certs" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
                {certs.length === 0 ? (
                  <div className="text-center py-16">
                    <div className="w-16 h-16 rounded-2xl dark:bg-white/5 bg-white border dark:border-white/10 border-slate-200 flex items-center justify-center mx-auto mb-4">
                      <Award className="w-8 h-8 dark:text-slate-500 text-slate-300" />
                    </div>
                    <p className="font-semibold dark:text-slate-300 text-slate-700 mb-1 text-sm">
                      {isOwner ? "لم تحصل على شهادات بعد" : "لم يحصل على شهادات بعد"}
                    </p>
                    <p className="text-xs dark:text-slate-500 text-slate-400">
                      {isOwner ? "أكمل الكورسات للحصول على شهاداتك" : ""}
                    </p>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center gap-2 mb-4 px-1">
                      <Shield className="w-3.5 h-3.5 text-green-500 flex-shrink-0" />
                      <p className="text-xs dark:text-slate-400 text-slate-500">
                        جميع الشهادات موثقة رقمياً وقابلة للتحقق
                      </p>
                      <Link href="/verify" className="mr-auto text-xs text-cyan-500 hover:text-cyan-400 font-medium flex items-center gap-1 whitespace-nowrap">
                        التحقق <ExternalLink className="w-3 h-3" />
                      </Link>
                    </div>

                    <div className="space-y-3">
                      {certs.map((cert, i) => {
                        const date = new Date(cert.issuedAt).toLocaleDateString("ar-EG", { year: "numeric", month: "long", day: "numeric" });
                        const isCopied = copiedId === cert.id;
                        return (
                          <motion.div
                            key={cert.id}
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.05 }}
                            className="dark:bg-[#111827] bg-white rounded-2xl border dark:border-amber-400/20 border-amber-200 overflow-hidden"
                          >
                            <div className="h-1 bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-500" />
                            <div className="p-4">
                              <div className="flex items-start gap-3">
                                <div className="relative flex-shrink-0">
                                  <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center shadow-md shadow-amber-500/20">
                                    <Award className="w-5 h-5 text-white" />
                                  </div>
                                  <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-green-400 border-2 dark:border-[#111827] border-white flex items-center justify-center">
                                    <CheckCircle className="w-2.5 h-2.5 text-white" />
                                  </div>
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-start justify-between gap-2">
                                    <div className="min-w-0">
                                      <h4 className="font-bold dark:text-amber-300 text-amber-700 text-sm truncate">{cert.certTitle}</h4>
                                      <p className="text-xs dark:text-slate-400 text-slate-500 mt-0.5 truncate">{cert.courseTitle}</p>
                                    </div>
                                    <span className="flex-shrink-0 text-[10px] font-semibold text-green-500 bg-green-500/10 px-1.5 py-0.5 rounded-full">موثقة</span>
                                  </div>
                                  <span className="text-[11px] dark:text-slate-500 text-slate-400 flex items-center gap-1 mt-1">
                                    <Calendar className="w-3 h-3" /> {date}
                                  </span>
                                </div>
                              </div>

                              <div className="mt-3 flex items-center justify-between gap-2 pt-3 border-t dark:border-white/5 border-slate-100">
                                <code className="text-[10px] font-mono dark:text-slate-500 text-slate-400 dark:bg-white/5 bg-slate-100 px-2 py-1 rounded-lg truncate max-w-[110px] sm:max-w-[160px]">
                                  {cert.uniqueCode}
                                </code>
                                <div className="flex items-center gap-1.5 flex-shrink-0">
                                  <button
                                    onClick={() => copyVerifyLink(cert)}
                                    title={isCopied ? "تم النسخ!" : "نسخ رابط التحقق"}
                                    className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                                      isCopied
                                        ? "bg-green-500 text-white"
                                        : "dark:bg-white/5 bg-slate-100 dark:text-slate-400 text-slate-500 hover:text-green-500 border dark:border-white/10 border-slate-200"
                                    }`}
                                  >
                                    {isCopied ? <CheckCircle className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                                    <span className="hidden sm:inline">{isCopied ? "تم!" : "نسخ"}</span>
                                  </button>
                                  <Link
                                    href={`/verify/${cert.uniqueCode}`}
                                    className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl dark:bg-white/5 bg-slate-100 border dark:border-white/10 border-slate-200 text-xs font-bold dark:text-slate-400 text-slate-500 hover:text-cyan-500 transition-colors"
                                    title="عرض الشهادة"
                                  >
                                    <ExternalLink className="w-3.5 h-3.5" />
                                    <span className="hidden sm:inline">عرض</span>
                                  </Link>
                                  <Link
                                    href={`/certificates/${cert.uniqueCode}`}
                                    className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 text-white text-xs font-bold hover:opacity-90 transition-opacity shadow-sm shadow-amber-500/20"
                                    title="تحميل الشهادة PDF"
                                  >
                                    <Download className="w-3.5 h-3.5" />
                                    <span className="hidden sm:inline">تحميل PDF</span>
                                  </Link>
                                </div>
                              </div>
                            </div>
                          </motion.div>
                        );
                      })}
                    </div>
                  </>
                )}
              </motion.div>
            )}
            {/* ── Badges ── */}
            {activeTab === "badges" && (
              <motion.div key="badges" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
                {badges.length === 0 ? (
                  <div className="text-center py-16">
                    <div className="w-16 h-16 rounded-2xl dark:bg-white/5 bg-white border dark:border-white/10 border-slate-200 flex items-center justify-center mx-auto mb-4">
                      <Trophy className="w-8 h-8 dark:text-slate-500 text-slate-300" />
                    </div>
                    <p className="font-semibold dark:text-slate-300 text-slate-700 mb-1 text-sm">
                      لا توجد أوسمة بعد
                    </p>
                    <p className="text-xs dark:text-slate-500 text-slate-400">حلّ المسائل وأكمل التحديات للحصول على أوسمة</p>
                  </div>
                ) : (
                  <div>
                    <p className="text-xs dark:text-slate-400 text-slate-500 mb-4 px-1">{badges.length} وسام مكتسب</p>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      {badges.map((badge, i) => {
                        const rarityStyle: Record<string, string> = {
                          common: "dark:border-slate-600 border-slate-200",
                          uncommon: "dark:border-green-500/40 border-green-300",
                          rare: "dark:border-blue-500/40 border-blue-300",
                          epic: "dark:border-violet-500/40 border-violet-300",
                          legendary: "dark:border-amber-500/40 border-amber-300",
                        };
                        const rarityLabel: Record<string, string> = {
                          common: "عادي", uncommon: "غير شائع", rare: "نادر",
                          epic: "ملحمي", legendary: "أسطوري",
                        };
                        const rarityColor: Record<string, string> = {
                          common: "dark:text-slate-400 text-slate-500",
                          uncommon: "text-green-500", rare: "text-blue-500",
                          epic: "text-violet-500", legendary: "text-amber-500",
                        };
                        const awardedDate = new Date(badge.awardedAt).toLocaleDateString("ar-EG", { year: "numeric", month: "short" });
                        return (
                          <motion.div key={badge.id}
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: i * 0.04 }}
                            className={`dark:bg-[#111827] bg-white rounded-2xl border ${rarityStyle[badge.rarity] ?? rarityStyle.common} p-4 text-center`}>
                            <div className="w-14 h-14 rounded-2xl mx-auto mb-3 flex items-center justify-center text-3xl"
                              style={{ background: `${badge.color}22`, border: `2px solid ${badge.color}40` }}>
                              {badge.icon}
                            </div>
                            <h4 className="font-bold dark:text-white text-slate-900 text-xs leading-tight mb-1">{badge.name}</h4>
                            <p className="text-[10px] dark:text-slate-500 text-slate-400 mb-2 leading-snug line-clamp-2">{badge.description}</p>
                            <div className="flex items-center justify-between">
                              <span className={`text-[10px] font-bold ${rarityColor[badge.rarity] ?? rarityColor.common}`}>
                                {rarityLabel[badge.rarity] ?? badge.rarity}
                              </span>
                              <span className="text-[10px] dark:text-slate-600 text-slate-400">{awardedDate}</span>
                            </div>
                          </motion.div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </MainLayout>
  );
}
