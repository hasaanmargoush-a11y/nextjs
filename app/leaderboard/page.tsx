"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { MainLayout } from "@/components/layout/MainLayout";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import Link from "next/link";
import {
  Trophy, Flame, TrendingUp, ChevronRight, Loader2
} from "lucide-react";

interface LeaderEntry {
  rank: number;
  userId: number;
  name: string;
  username: string;
  avatar: string | null;
  points: number;
  solvedCount: number;
  streak: number;
  maxStreak: number;
  level: string;
  isCurrentUser: boolean;
}

interface MyRank {
  rank: number;
  points: number;
  streak: number;
  maxStreak: number;
  solvedCount: number;
}

type Period = "weekly" | "monthly" | "all";

const periodLabels: Record<Period, string> = {
  weekly: "هذا الأسبوع",
  monthly: "هذا الشهر",
  all: "كل الوقت",
};

export default function LeaderboardPage() {
  const { user } = useAuth();
  const [period, setPeriod] = useState<Period>("weekly");
  const [entries, setEntries] = useState<LeaderEntry[]>([]);
  const [myRank, setMyRank] = useState<MyRank | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api.get<{ period: string; entries: LeaderEntry[] }>(`/leaderboard?period=${period}&limit=100`)
      .then((d) => setEntries(d.entries))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [period]);

  useEffect(() => {
    if (user) {
      api.get<MyRank>("/leaderboard/me").then(setMyRank).catch(() => {});
    }
  }, [user]);

  const top3 = entries.slice(0, 3);
  const rest = entries.slice(3);

  return (
    <MainLayout>
      <div className="min-h-screen dark:bg-[#0a0f1e] bg-slate-50">
        <div className="dark:bg-[#070b14] bg-white border-b dark:border-white/5 border-slate-100 py-10">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
              <div className="flex items-center gap-3 mb-4">
                <span className="badge badge-cyan">الصدارة</span>
              </div>
              <h1 className="text-3xl font-black dark:text-white text-slate-900 mb-2">لوحة الصدارة</h1>
              <p className="dark:text-slate-400 text-slate-600 mb-6">أفضل المبرمجين العرب — تنافس وأثبت نفسك</p>

              {user && myRank && (
                <div className="dark:bg-gradient-to-r dark:from-cyan-900/30 dark:to-violet-900/20 bg-gradient-to-r from-cyan-50 to-violet-50 rounded-2xl border dark:border-cyan-500/20 border-cyan-200 p-4">
                  <p className="text-xs dark:text-slate-400 text-slate-600 mb-3 font-semibold">ترتيبك الحالي</p>
                  <div className="grid grid-cols-4 gap-4">
                    {[
                      { label: "ترتيبك", value: `#${myRank.rank}`, color: "text-cyan-400" },
                      { label: "نقطة", value: myRank.points.toLocaleString("ar-EG"), color: "text-amber-400" },
                      { label: "محلولة", value: myRank.solvedCount, color: "dark:text-white text-slate-900" },
                      { label: "سلسلة", value: myRank.streak, color: "text-orange-400", icon: "🔥" },
                    ].map((s, i) => (
                      <div key={i} className="text-center">
                        <div className={`text-2xl font-black ${s.color}`}>{s.icon}{s.value}</div>
                        <div className="text-xs dark:text-slate-400 text-slate-600">{s.label}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </motion.div>
          </div>
        </div>

        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex gap-2 mb-8">
            {(["weekly", "monthly", "all"] as Period[]).map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`px-5 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                  period === p
                    ? "gradient-bg text-white shadow-lg shadow-cyan-500/20"
                    : "dark:bg-white/5 bg-white border dark:border-white/10 border-slate-200 dark:text-slate-300 text-slate-600 hover:text-cyan-400"
                }`}
              >
                {periodLabels[p]}
              </button>
            ))}
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-8 h-8 text-cyan-400 animate-spin" />
            </div>
          ) : entries.length === 0 ? (
            <div className="text-center py-20">
              <Trophy className="w-16 h-16 dark:text-slate-700 text-slate-300 mx-auto mb-4" />
              <h3 className="text-lg font-bold dark:text-white text-slate-900 mb-2">لا توجد بيانات بعد</h3>
              <p className="dark:text-slate-400 text-slate-600 text-sm mb-4">حل أولى مسائلك لتظهر في الصدارة!</p>
              <Link href="/problems" className="btn-primary inline-flex">
                <TrendingUp className="w-4 h-4" />
                ابدأ الآن
              </Link>
            </div>
          ) : (
            <>
              {top3.length === 3 && (
                <div className="flex items-end justify-center gap-4 mb-10">
                  {[top3[1], top3[0], top3[2]].map((entry, pos) => {
                    const isCenter = pos === 1;
                    const medals = ["🥈", "🥇", "🥉"];
                    return (
                      <motion.div
                        key={entry.userId}
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: pos * 0.1 }}
                        className={`text-center ${isCenter ? "flex-1 max-w-[160px]" : "flex-1 max-w-[130px]"}`}
                      >
                        <Link href={`/profile/${entry.username}`}>
                          <div className={`rounded-t-2xl px-3 pb-4 border cursor-pointer transition-all hover:border-cyan-500/30 ${
                            isCenter
                              ? "dark:bg-gradient-to-b dark:from-amber-900/40 dark:to-amber-900/20 bg-gradient-to-b from-amber-50 to-amber-100 dark:border-amber-500/30 border-amber-300 pt-6 shadow-lg shadow-amber-500/10"
                              : "dark:bg-white/5 bg-slate-100 dark:border-white/10 border-slate-200 pt-5"
                          }`}>
                            <div className={`${isCenter ? "text-4xl" : "text-3xl"} mb-2`}>{medals[pos]}</div>
                            <div className={`${isCenter ? "w-14 h-14" : "w-11 h-11"} rounded-full bg-gradient-to-br from-cyan-500 to-violet-500 flex items-center justify-center text-white font-bold mx-auto mb-2 ${isCenter ? "ring-4 ring-amber-500/30" : ""}`}>
                              {entry.avatar
                                ? <img src={entry.avatar} alt="" className="w-full h-full rounded-full object-cover" />
                                : entry.name.charAt(0)
                              }
                            </div>
                            <p className={`font-bold dark:text-white text-slate-900 truncate ${isCenter ? "text-sm" : "text-xs"}`}>{entry.name}</p>
                            <p className={`text-amber-400 font-black mt-1 ${isCenter ? "text-sm" : "text-xs"}`}>{entry.points.toLocaleString("ar-EG")}</p>
                            <p className="text-xs dark:text-slate-400 text-slate-600">{entry.solvedCount} مسألة</p>
                            {entry.streak > 0 && isCenter && (
                              <p className="text-xs text-orange-400 flex items-center justify-center gap-0.5 mt-1">
                                <Flame className="w-3 h-3" />{entry.streak}
                              </p>
                            )}
                          </div>
                        </Link>
                      </motion.div>
                    );
                  })}
                </div>
              )}

              <div className="space-y-2">
                {rest.map((entry, i) => (
                  <motion.div
                    key={entry.userId}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.025 }}
                  >
                    <Link href={`/profile/${entry.username}`}>
                      <div className={`rounded-xl border p-4 transition-all flex items-center gap-4 group hover:border-cyan-500/30 ${
                        entry.isCurrentUser
                          ? "dark:bg-cyan-500/5 bg-cyan-50 border-cyan-500/30"
                          : "dark:bg-[#111827] bg-white dark:border-white/10 border-slate-200"
                      }`}>
                        <div className="w-9 h-9 rounded-xl dark:bg-white/5 bg-slate-100 flex items-center justify-center font-black dark:text-slate-400 text-slate-600 text-sm flex-shrink-0">
                          {entry.rank}
                        </div>
                        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-cyan-500 to-violet-500 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                          {entry.avatar ? <img src={entry.avatar} alt="" className="w-full h-full rounded-full object-cover" /> : entry.name.charAt(0)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="font-semibold dark:text-white text-slate-900 truncate group-hover:text-cyan-400 transition-colors">{entry.name}</p>
                            {entry.isCurrentUser && <span className="text-xs text-cyan-400">(أنت)</span>}
                            {entry.streak >= 3 && <span className="text-xs text-orange-400 flex items-center gap-0.5"><Flame className="w-3 h-3" />{entry.streak}</span>}
                          </div>
                          <p className="text-xs dark:text-slate-400 text-slate-600">@{entry.username} • {entry.level}</p>
                        </div>
                        <div className="flex items-center gap-4 flex-shrink-0">
                          <div className="text-center hidden sm:block">
                            <p className="text-xs dark:text-slate-500 text-slate-400">محلولة</p>
                            <p className="text-sm font-bold dark:text-white text-slate-900">{entry.solvedCount}</p>
                          </div>
                          <div className="text-center">
                            <p className="text-xs dark:text-slate-500 text-slate-400">نقطة</p>
                            <p className="text-sm font-bold text-amber-400">{entry.points.toLocaleString("ar-EG")}</p>
                          </div>
                          <ChevronRight className="w-4 h-4 dark:text-slate-600 text-slate-300 group-hover:text-cyan-400 hidden sm:block" />
                        </div>
                      </div>
                    </Link>
                  </motion.div>
                ))}
              </div>

              {!user && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-8 p-6 rounded-2xl dark:bg-gradient-to-r dark:from-cyan-900/30 dark:to-violet-900/30 bg-gradient-to-r from-cyan-50 to-violet-50 border dark:border-white/10 border-slate-200 text-center"
                >
                  <Trophy className="w-10 h-10 text-amber-400 mx-auto mb-3" />
                  <h3 className="font-bold dark:text-white text-slate-900 mb-2">انضم للمتنافسين!</h3>
                  <p className="dark:text-slate-400 text-slate-600 text-sm mb-4">سجل وابدأ حل التحديات لتظهر في لوحة الصدارة</p>
                  <Link href="/auth/register" className="btn-primary inline-flex">إنشاء حساب مجاني</Link>
                </motion.div>
              )}
            </>
          )}
        </div>
      </div>
    </MainLayout>
  );
}
