"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { useRouter, useParams } from "next/navigation";
import { io as socketIO, Socket } from "socket.io-client";
import { toast } from "sonner";
import Link from "next/link";

interface DuelUser { id: number; name: string; username: string; avatar?: string | null; points?: number; }
interface TestCase { input: string; output: string; }
interface Problem {
  id: number; title: string; difficulty: string; description: string;
  testCases: TestCase[]; starterCode?: string; points?: number;
}
interface Duel {
  id: number; status: string; challengerId: number; challengedId: number;
  challenger: DuelUser; challenged: DuelUser; problem: Problem;
  challengerProgress: number; challengedProgress: number;
  challengerSolvedAt?: string; challengedSolvedAt?: string;
  challengerCode?: string; challengedCode?: string;
  challengerLang: string; challengedLang: string;
  winnerId?: number; startedAt?: string; endedAt?: string; expiresAt?: string;
}

const LANGUAGES = ["python", "javascript", "cpp", "java", "go", "rust"];
const DIFFICULTY_COLOR: Record<string, string> = { easy: "text-emerald-400", medium: "text-yellow-400", hard: "text-red-400" };
const DIFFICULTY_LABEL: Record<string, string> = { easy: "سهل", medium: "متوسط", hard: "صعب" };

function getDefaultCode(lang: string): string {
  const map: Record<string, string> = {
    python: "# اكتب حلك هنا\n",
    javascript: "// اكتب حلك هنا\n",
    cpp: '#include <iostream>\nusing namespace std;\n\nint main() {\n    // اكتب حلك هنا\n    return 0;\n}\n',
    java: 'public class Solution {\n    public static void main(String[] args) {\n        // اكتب حلك هنا\n    }\n}\n',
    go: 'package main\n\nfunc main() {\n    // اكتب حلك هنا\n}\n',
    rust: 'fn main() {\n    // اكتب حلك هنا\n}\n',
  };
  return map[lang] ?? "# اكتب حلك هنا\n";
}

function ProgressRing({ pct, color }: { pct: number; color: string }) {
  const r = 36; const c = 2 * Math.PI * r;
  return (
    <svg width="88" height="88" className="rotate-[-90deg]">
      <circle cx="44" cy="44" r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="7" />
      <circle cx="44" cy="44" r={r} fill="none" stroke={color} strokeWidth="7"
        strokeDasharray={c} strokeDashoffset={c - (c * pct) / 100}
        strokeLinecap="round" style={{ transition: "stroke-dashoffset 0.6s ease" }} />
    </svg>
  );
}

export default function DuelArenaPage() {
  const { user } = useAuth();
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const duelId = parseInt(params.id, 10);

  const [duel, setDuel] = useState<Duel | null>(null);
  const [loading, setLoading] = useState(true);
  const [code, setCode] = useState("");
  const [lang, setLang] = useState("python");
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ passed: number; total: number; pct: number; solved: boolean; finished: boolean; winnerId?: number } | null>(null);
  const [myProgress, setMyProgress] = useState(0);
  const [oppProgress, setOppProgress] = useState(0);
  const [opponentOnline, setOpponentOnline] = useState(false);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [accepted, setAccepted] = useState(false);
  const [rejecting, setRejecting] = useState(false);
  const socketRef = useRef<Socket | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchDuel = useCallback(async () => {
    try {
      const d = await api.get<Duel>(`/duels/${duelId}`);
      setDuel(d);
      if (d.problem?.starterCode) setCode(d.problem.starterCode);
      else setCode(getDefaultCode(lang));
      const isChallenger = user?.id === d.challengerId;
      setMyProgress(isChallenger ? d.challengerProgress : d.challengedProgress);
      setOppProgress(isChallenger ? d.challengedProgress : d.challengerProgress);
      // If challenge already accepted, start timer
      if (d.status === "active" && d.startedAt) {
        const elapsed = Math.floor((Date.now() - new Date(d.startedAt).getTime()) / 1000);
        const remaining = Math.max(0, 30 * 60 - elapsed); // 30 min
        setTimeLeft(remaining);
      }
    } catch { toast.error("المبارزة غير موجودة أو غير مصرح"); router.push("/duels"); }
    setLoading(false);
  }, [duelId, user, lang, router]);

  useEffect(() => { if (user) fetchDuel(); }, [user, fetchDuel]);

  // Socket connection
  useEffect(() => {
    if (!user) return;
    const token = localStorage.getItem("nouvil_token");
    const socket = socketIO("/", { path: "/api/socket.io", auth: { token: `Bearer ${token}` }, transports: ["websocket", "polling"] });
    socketRef.current = socket;

    socket.emit("join_duel", duelId);

    socket.on("duel_opponent_online", () => setOpponentOnline(true));

    socket.on("duel_state", (data: { status: string; startedAt?: string }) => {
      if (data.status === "active" && data.startedAt) {
        setDuel(prev => prev ? { ...prev, status: "active", startedAt: data.startedAt } : prev);
        const remaining = Math.max(0, 30 * 60 - Math.floor((Date.now() - new Date(data.startedAt!).getTime()) / 1000));
        setTimeLeft(remaining);
      }
      if (data.status === "cancelled") { toast.error("تم إلغاء المبارزة"); router.push("/duels"); }
    });

    socket.on("duel_progress", (data: {
      duelId: number; userId: number; isChallenger: boolean;
      progress: number; passed: number; total: number; solved: boolean;
      finished: boolean; winnerId?: number;
    }) => {
      if (data.userId === user.id) {
        setMyProgress(data.progress);
        setResult({ passed: data.passed, total: data.total, pct: data.progress, solved: data.solved, finished: data.finished, winnerId: data.winnerId });
      } else {
        setOppProgress(data.progress);
        if (data.solved) toast("🏁 المنافس حل المسألة!", { icon: "⚡" });
      }
      if (data.finished) {
        const iWon = data.winnerId === user.id;
        if (iWon) { toast.success("🏆 أنت الفائز! عظيم جداً!"); } else { toast.error("انتهت المبارزة. حاول مجدداً!"); }
        setDuel(prev => prev ? { ...prev, status: "finished", winnerId: data.winnerId } : prev);
        if (timerRef.current) clearInterval(timerRef.current);
      }
    });

    socket.on("duel_accepted", () => {
      toast.success("قُبِل التحدي! المبارزة بدأت");
      fetchDuel();
    });

    return () => {
      socket.emit("leave_duel", duelId);
      socket.disconnect();
    };
  }, [user, duelId, router, fetchDuel]);

  // Countdown timer
  useEffect(() => {
    if (timeLeft === null || duel?.status !== "active") return;
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev === null || prev <= 0) { clearInterval(timerRef.current!); return 0; }
        return prev - 1;
      });
    }, 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [timeLeft, duel?.status]);

  const formatTime = (s: number) => `${Math.floor(s / 60).toString().padStart(2, "0")}:${(s % 60).toString().padStart(2, "0")}`;

  const handleTab = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key !== "Tab") return;
    e.preventDefault();
    const ta = e.currentTarget;
    const s = ta.selectionStart; const en = ta.selectionEnd;
    const newVal = code.substring(0, s) + "    " + code.substring(en);
    setCode(newVal);
    requestAnimationFrame(() => { ta.selectionStart = ta.selectionEnd = s + 4; });
  };

  const handleAccept = async () => {
    setAccepted(true);
    try {
      await api.patch(`/duels/${duelId}/accept`, {});
      toast.success("قبلت التحدي! المبارزة بدأت ⚔️");
      fetchDuel();
    } catch (e: unknown) {
      const err = e as { message?: string };
      toast.error(err?.message ?? "فشل القبول");
      setAccepted(false);
    }
  };

  const handleReject = async () => {
    setRejecting(true);
    try {
      await api.patch(`/duels/${duelId}/reject`, {});
      toast("رفضت التحدي");
      router.push("/duels");
    } catch { setRejecting(false); }
  };

  const handleSubmit = async () => {
    if (!code.trim()) { toast.error("اكتب الكود أولاً"); return; }
    if (duel?.status !== "active") { toast.error("المبارزة لم تبدأ بعد"); return; }
    setSubmitting(true);
    try {
      const r = await api.post<typeof result>(`/duels/${duelId}/submit`, { code, language: lang });
      setResult(r);
      if (r?.solved) toast.success("🎉 أحسنت! حللت المسألة!");
      else toast.error(`اجتزت ${r?.passed}/${r?.total} حالات اختبار`);
    } catch (e: unknown) {
      const err = e as { message?: string };
      toast.error(err?.message ?? "خطأ في الإرسال");
    } finally { setSubmitting(false); }
  };

  if (!user) return (
    <div className="min-h-screen flex items-center justify-center" dir="rtl">
      <div className="text-center">
        <p className="text-xl text-zinc-400 mb-4">يجب تسجيل الدخول</p>
        <Link href="/auth/login" className="px-6 py-2 bg-violet-600 hover:bg-violet-500 rounded-xl text-white font-medium">تسجيل الدخول</Link>
      </div>
    </div>
  );

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-10 h-10 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (!duel) return null;

  const isChallenger = user.id === duel.challengerId;
  const me = isChallenger ? duel.challenger : duel.challenged;
  const opp = isChallenger ? duel.challenged : duel.challenger;
  const iWon = duel.winnerId === user.id;
  const finished = duel.status === "finished";
  const pending = duel.status === "pending";
  const iAmChallenged = duel.challengedId === user.id;

  return (
    <div className="min-h-screen bg-gradient-to-br from-zinc-950 via-indigo-950/20 to-zinc-950 pt-18 pb-10" dir="rtl">
      {/* Header arena bar */}
      <div className="bg-zinc-900/80 backdrop-blur-md border-b border-white/8 sticky top-16 z-30">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <Link href="/duels" className="text-zinc-500 hover:text-zinc-300 text-sm">← المبارزات</Link>
            <span className="text-zinc-700">|</span>
            <span className="text-zinc-300 font-semibold text-sm">⚔️ {duel.problem?.title}</span>
            <span className={`text-xs font-medium ${DIFFICULTY_COLOR[duel.problem?.difficulty]}`}>{DIFFICULTY_LABEL[duel.problem?.difficulty]}</span>
          </div>

          {/* Timer */}
          {duel.status === "active" && timeLeft !== null && (
            <motion.div animate={{ scale: timeLeft < 60 ? [1, 1.05, 1] : 1 }} transition={{ repeat: timeLeft < 60 ? Infinity : 0, duration: 0.5 }}
              className={`font-mono text-xl font-black ${timeLeft < 60 ? "text-red-400" : timeLeft < 300 ? "text-yellow-400" : "text-emerald-400"}`}>
              ⏱ {formatTime(timeLeft)}
            </motion.div>
          )}

          {/* Players */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-full bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center text-white text-xs font-bold">{me.name[0]}</div>
              <span className="text-violet-300 text-sm font-medium">{me.name}</span>
              {opponentOnline && <span className="w-2 h-2 bg-emerald-400 rounded-full" />}
            </div>
            <span className="text-zinc-600 font-black">VS</span>
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-full bg-gradient-to-br from-rose-600 to-orange-600 flex items-center justify-center text-white text-xs font-bold">{opp.name[0]}</div>
              <span className="text-rose-300 text-sm font-medium">{opp.name}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 mt-4">
        {/* Pending — invite state */}
        <AnimatePresence>
          {pending && (
            <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              className="mb-6 bg-yellow-500/10 border border-yellow-500/30 rounded-2xl p-5 text-center">
              {iAmChallenged ? (
                <>
                  <p className="text-yellow-300 font-bold text-lg mb-1">⚔️ {duel.challenger.name} يتحداك!</p>
                  <p className="text-zinc-400 text-sm mb-4">المسألة: <span className="text-white">{duel.problem?.title}</span></p>
                  <div className="flex gap-3 justify-center">
                    <motion.button whileTap={{ scale: 0.95 }} onClick={handleAccept} disabled={accepted}
                      className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 rounded-xl text-white font-bold disabled:opacity-50">
                      {accepted ? "جاري القبول..." : "✅ قبول التحدي"}
                    </motion.button>
                    <motion.button whileTap={{ scale: 0.95 }} onClick={handleReject} disabled={rejecting}
                      className="px-6 py-2.5 bg-red-600/80 hover:bg-red-500/80 rounded-xl text-white font-bold disabled:opacity-50">
                      رفض
                    </motion.button>
                  </div>
                </>
              ) : (
                <p className="text-yellow-300 font-semibold">⏳ بانتظار قبول <span className="text-white">{duel.challenged.name}</span> للتحدي...</p>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Finished banner */}
        <AnimatePresence>
          {finished && (
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
              className={`mb-6 rounded-2xl p-6 text-center border ${iWon ? "bg-yellow-500/10 border-yellow-500/30" : "bg-zinc-800/80 border-zinc-700/50"}`}>
              <div className="text-4xl mb-2">{iWon ? "🏆" : "🛡️"}</div>
              <p className={`text-2xl font-black ${iWon ? "text-yellow-300" : "text-zinc-400"}`}>{iWon ? "أنت الفائز!" : "انتهت المبارزة"}</p>
              {!iWon && duel.winnerId && <p className="text-zinc-400 mt-1">الفائز: <span className="text-white font-semibold">{duel.winnerId === duel.challengerId ? duel.challenger.name : duel.challenged.name}</span></p>}
              <Link href="/duels" className="inline-block mt-4 px-6 py-2 bg-violet-600 hover:bg-violet-500 rounded-xl text-white font-medium text-sm">مبارزة جديدة</Link>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Progress rings */}
        <div className="flex items-center justify-center gap-8 mb-6">
          {/* Me */}
          <div className="text-center">
            <div className="relative inline-block">
              <ProgressRing pct={myProgress} color="#8b5cf6" />
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-sm font-bold text-violet-300">{myProgress}%</span>
              </div>
            </div>
            <p className="text-xs text-violet-400 mt-1 font-medium">أنت</p>
          </div>
          <div className="text-2xl font-black text-zinc-600">VS</div>
          {/* Opponent */}
          <div className="text-center">
            <div className="relative inline-block">
              <ProgressRing pct={oppProgress} color="#f43f5e" />
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-sm font-bold text-rose-300">{oppProgress}%</span>
              </div>
            </div>
            <p className="text-xs text-rose-400 mt-1 font-medium">{opp.name}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Problem panel */}
          <div className="bg-white/4 backdrop-blur-sm border border-white/10 rounded-2xl p-5 space-y-4 overflow-y-auto max-h-[70vh]">
            <h2 className="text-xl font-bold text-white">{duel.problem?.title}</h2>
            <p className="text-zinc-300 text-sm leading-relaxed whitespace-pre-wrap">{duel.problem?.description}</p>

            {duel.problem?.testCases?.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-zinc-400 mb-2">أمثلة:</h3>
                <div className="space-y-3">
                  {duel.problem.testCases.slice(0, 2).map((tc, i) => (
                    <div key={i} className="bg-black/30 rounded-xl p-3 text-xs font-mono" dir="ltr">
                      <div className="text-zinc-500 mb-0.5">Input:</div>
                      <div className="text-cyan-300 whitespace-pre-wrap">{tc.input}</div>
                      <div className="text-zinc-500 mt-2 mb-0.5">Output:</div>
                      <div className="text-emerald-300 whitespace-pre-wrap">{tc.output}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Code editor panel */}
          <div className="flex flex-col gap-3">
            {/* Language selector */}
            <div className="flex items-center gap-2">
              <select value={lang} onChange={e => { setLang(e.target.value); setCode(getDefaultCode(e.target.value)); }}
                className="bg-zinc-800 border border-white/10 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-violet-500">
                {LANGUAGES.map(l => <option key={l} value={l}>{l}</option>)}
              </select>
              <span className="text-xs text-zinc-500 mr-auto">{code.length} حرف</span>
            </div>

            {/* Textarea editor */}
            <textarea
              ref={textareaRef}
              value={code}
              onChange={e => setCode(e.target.value)}
              onKeyDown={handleTab}
              spellCheck={false}
              disabled={finished || pending}
              dir="ltr"
              className="flex-1 min-h-72 bg-zinc-950 border border-white/10 rounded-xl p-4 text-sm text-emerald-300 font-mono resize-y focus:outline-none focus:border-violet-500 placeholder-zinc-600 disabled:opacity-50"
              placeholder="// اكتب حلك هنا..."
            />

            {/* Submit button */}
            <motion.button
              whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
              onClick={handleSubmit}
              disabled={submitting || finished || pending}
              className="w-full py-3 bg-gradient-to-l from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 rounded-xl text-white font-bold text-base shadow-lg shadow-violet-900/30 disabled:opacity-50 transition-all"
            >
              {submitting ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  جاري التحقق...
                </span>
              ) : "⚔️ أرسل الحل"}
            </motion.button>

            {/* Result panel */}
            <AnimatePresence>
              {result && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                  className={`rounded-xl p-4 border ${result.solved ? "bg-emerald-500/10 border-emerald-500/30" : "bg-red-500/10 border-red-500/30"}`}>
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{result.solved ? "✅" : "❌"}</span>
                    <div>
                      <p className={`font-bold ${result.solved ? "text-emerald-300" : "text-red-300"}`}>
                        {result.solved ? "ممتاز! حللت المسألة!" : `${result.passed}/${result.total} حالات اختبار`}
                      </p>
                      <div className="h-2 bg-white/10 rounded-full mt-1.5 w-40 overflow-hidden">
                        <div className={`h-full rounded-full transition-all ${result.solved ? "bg-emerald-500" : "bg-red-500"}`}
                          style={{ width: `${result.pct}%` }} />
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
}
