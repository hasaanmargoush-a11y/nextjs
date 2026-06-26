"use client";

import { useState, useEffect } from "react";
import { use } from "react";
import { motion } from "framer-motion";
import { MainLayout } from "@/components/layout/MainLayout";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import Link from "next/link";
import {
  ArrowRight, Code2, CheckCircle, Lock, ChevronRight,
  Star, Loader2, BookOpen, Target, Flame
} from "lucide-react";

interface Pack {
  id: number;
  title: string;
  description: string;
  order: number;
  totalProblems: number;
  isUnlocked: boolean;
  progress: { solvedCount: number; completedAt: string | null };
}

interface TrackDetail {
  id: number;
  title: string;
  description: string;
  language: string;
  difficulty: string;
  icon: string;
  color: string;
  totalProblems: number;
  packs: Pack[];
  userProgress: { solvedCount: number } | null;
}

const difficultyLabel: Record<string, string> = {
  beginner: "مبتدئ", intermediate: "متوسط", advanced: "متقدم", expert: "خبير",
};

export default function TrackDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { user } = useAuth();
  const [track, setTrack] = useState<TrackDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get<TrackDetail>(`/tracks/${id}`)
      .then(setTrack)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <MainLayout>
        <div className="min-h-screen dark:bg-[#0a0f1e] bg-slate-50 flex items-center justify-center">
          <Loader2 className="w-8 h-8 text-cyan-400 animate-spin" />
        </div>
      </MainLayout>
    );
  }

  if (!track) {
    return (
      <MainLayout>
        <div className="min-h-screen dark:bg-[#0a0f1e] bg-slate-50 flex flex-col items-center justify-center">
          <BookOpen className="w-16 h-16 dark:text-slate-700 text-slate-300 mb-4" />
          <h2 className="text-xl font-bold dark:text-white text-slate-900 mb-2">المسار غير موجود</h2>
          <Link href="/problems" className="btn-primary mt-4">
            <ArrowRight className="w-4 h-4" />
            العودة للتحديات
          </Link>
        </div>
      </MainLayout>
    );
  }

  const totalSolved = track.packs.reduce((s, p) => s + (p.progress?.solvedCount ?? 0), 0);
  const overallPct = track.totalProblems > 0 ? Math.round((totalSolved / track.totalProblems) * 100) : 0;

  return (
    <MainLayout>
      <div className="min-h-screen dark:bg-[#0a0f1e] bg-slate-50">
        {/* Header */}
        <div className="dark:bg-[#070b14] bg-white border-b dark:border-white/5 border-slate-100">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <Link href="/problems" className="flex items-center gap-1.5 text-sm dark:text-slate-400 text-slate-600 hover:text-cyan-400 transition-colors mb-6">
              <ArrowRight className="w-4 h-4" />
              المسارات
            </Link>

            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="flex items-start gap-5">
              <div
                className="w-20 h-20 rounded-3xl flex items-center justify-center text-4xl shadow-xl flex-shrink-0"
                style={{ background: `${track.color}22`, border: `2px solid ${track.color}44` }}
              >
                {track.icon}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2 flex-wrap">
                  <span className="text-xs px-3 py-1 rounded-full" style={{ background: `${track.color}20`, color: track.color, border: `1px solid ${track.color}40` }}>
                    {difficultyLabel[track.difficulty] ?? track.difficulty}
                  </span>
                  <span className="text-xs dark:text-slate-400 text-slate-600 flex items-center gap-1">
                    <Code2 className="w-3 h-3" />
                    {track.language}
                  </span>
                </div>
                <h1 className="text-2xl sm:text-3xl font-black dark:text-white text-slate-900 mb-2">{track.title}</h1>
                <p className="dark:text-slate-400 text-slate-600 text-sm mb-4">{track.description}</p>

                {/* Overall Progress */}
                {user && (
                  <div>
                    <div className="flex items-center justify-between text-sm mb-1.5">
                      <span className="dark:text-slate-400 text-slate-600">تقدمك الإجمالي</span>
                      <span className="font-bold" style={{ color: track.color }}>{totalSolved}/{track.totalProblems} مسألة ({overallPct}%)</span>
                    </div>
                    <div className="w-full dark:bg-white/10 bg-slate-200 rounded-full h-2.5">
                      <motion.div
                        className="h-2.5 rounded-full"
                        style={{ background: track.color }}
                        initial={{ width: 0 }}
                        animate={{ width: `${overallPct}%` }}
                        transition={{ duration: 1, ease: "easeOut" }}
                      />
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        </div>

        {/* Packs */}
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <h2 className="text-lg font-bold dark:text-white text-slate-900 mb-5">
            الحزم ({track.packs.length})
          </h2>

          {track.packs.length === 0 ? (
            <div className="text-center py-16">
              <Target className="w-12 h-12 dark:text-slate-700 text-slate-300 mx-auto mb-3" />
              <p className="dark:text-slate-400 text-slate-600">لا توجد حزم منشورة في هذا المسار بعد</p>
            </div>
          ) : (
            <div className="space-y-3">
              {track.packs.map((pack, i) => {
                const solved = pack.progress?.solvedCount ?? 0;
                const pct = pack.totalProblems > 0 ? Math.round((solved / pack.totalProblems) * 100) : 0;
                const isCompleted = pack.progress?.completedAt !== null && pack.progress?.completedAt !== undefined;
                const isUnlocked = pack.isUnlocked;

                return (
                  <motion.div
                    key={pack.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.06 }}
                  >
                    <Link
                      href={isUnlocked && user ? `/tracks/${id}/packs/${pack.id}` : "#"}
                      className={isUnlocked && user ? "block" : "block cursor-not-allowed"}
                    >
                      <div className={`rounded-2xl border p-5 transition-all ${
                        isCompleted
                          ? "dark:bg-green-500/5 bg-green-50 border-green-500/30"
                          : isUnlocked
                          ? "dark:bg-[#111827] bg-white dark:border-white/10 border-slate-200 hover:border-cyan-500/30 group"
                          : "dark:bg-white/3 bg-slate-100 dark:border-white/5 border-slate-200 opacity-60"
                      }`}>
                        <div className="flex items-start gap-4">
                          {/* Step indicator */}
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm flex-shrink-0 ${
                            isCompleted
                              ? "bg-green-500/20 text-green-400"
                              : isUnlocked
                              ? "dark:bg-white/10 bg-slate-200 dark:text-white text-slate-700"
                              : "dark:bg-white/5 bg-slate-200 dark:text-slate-600 text-slate-400"
                          }`}>
                            {isCompleted ? <CheckCircle className="w-5 h-5" /> : isUnlocked ? (i + 1) : <Lock className="w-4 h-4" />}
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-3 mb-1.5">
                              <h3 className={`font-bold ${
                                isCompleted ? "text-green-400" :
                                isUnlocked ? "dark:text-white text-slate-900 dark:group-hover:text-cyan-400 group-hover:text-cyan-600 transition-colors" :
                                "dark:text-slate-500 text-slate-400"
                              }`}>
                                {pack.title}
                              </h3>
                              <div className="flex items-center gap-2 flex-shrink-0">
                                <span className="text-xs dark:text-slate-400 text-slate-600">
                                  {pack.totalProblems} مسألة
                                </span>
                                {isUnlocked && !isCompleted && (
                                  <ChevronRight className="w-4 h-4 dark:text-slate-600 text-slate-300 dark:group-hover:text-cyan-400 group-hover:text-cyan-600 transition-colors" />
                                )}
                              </div>
                            </div>

                            {pack.description && (
                              <p className="text-xs dark:text-slate-400 text-slate-600 mb-3">{pack.description}</p>
                            )}

                            {isUnlocked && user && (
                              <div>
                                <div className="flex items-center justify-between text-xs mb-1">
                                  <span className="dark:text-slate-500 text-slate-400">{solved}/{pack.totalProblems} محلولة</span>
                                  <span className={isCompleted ? "text-green-400 font-semibold" : "dark:text-slate-400 text-slate-600"}>{pct}%</span>
                                </div>
                                <div className="w-full dark:bg-white/10 bg-slate-200 rounded-full h-1.5">
                                  <div
                                    className={`h-1.5 rounded-full transition-all ${isCompleted ? "bg-green-500" : ""}`}
                                    style={{ width: `${pct}%`, background: isCompleted ? undefined : track.color }}
                                  />
                                </div>
                              </div>
                            )}

                            {!isUnlocked && (
                              <p className="text-xs dark:text-slate-600 text-slate-400 mt-1">
                                أكمل الحزمة السابقة لفتح هذه الحزمة
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    </Link>
                  </motion.div>
                );
              })}
            </div>
          )}

          {!user && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-8 p-6 rounded-2xl dark:bg-gradient-to-r dark:from-cyan-900/30 dark:to-violet-900/30 bg-gradient-to-r from-cyan-50 to-violet-50 border dark:border-white/10 border-slate-200 text-center"
            >
              <Flame className="w-10 h-10 text-cyan-400 mx-auto mb-3" />
              <h3 className="font-bold dark:text-white text-slate-900 mb-2">سجل لتتبع تقدمك في المسار</h3>
              <p className="dark:text-slate-400 text-slate-600 text-sm mb-4">
                تتبع تقدمك في كل حزمة وكسب الأوسمة عند إكمال المسارات
              </p>
              <Link href="/auth/register" className="btn-primary inline-flex">
                إنشاء حساب مجاني
              </Link>
            </motion.div>
          )}
        </div>
      </div>
    </MainLayout>
  );
}
