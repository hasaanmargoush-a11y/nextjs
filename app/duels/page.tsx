"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { io as socketIO, Socket } from "socket.io-client";
import { toast } from "sonner";

interface DuelUser { id: number; name: string; username: string; avatar?: string | null; }
interface Problem { id: number; title: string; difficulty: string; }
interface Duel {
  id: number; status: string; challengerId: number; challengedId: number;
  challenger: DuelUser; challenged: DuelUser; problem: Problem;
  challengerProgress: number; challengedProgress: number;
  challengerSolvedAt?: string; challengedSolvedAt?: string;
  winnerId?: number; startedAt?: string; endedAt?: string;
  expiresAt?: string; createdAt: string;
}

const DIFFICULTY_COLOR: Record<string, string> = { easy: "text-emerald-400", medium: "text-yellow-400", hard: "text-red-400" };
const DIFFICULTY_LABEL: Record<string, string> = { easy: "سهل", medium: "متوسط", hard: "صعب" };
const STATUS_LABEL: Record<string, string> = {
  pending: "بانتظار القبول", active: "جارية", finished: "منتهية",
  rejected: "مرفوضة", cancelled: "ملغاة",
};
const STATUS_COLOR: Record<string, string> = {
  pending: "bg-yellow-500/20 text-yellow-300 border border-yellow-500/30",
  active: "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30",
  finished: "bg-blue-500/20 text-blue-300 border border-blue-500/30",
  rejected: "bg-red-500/20 text-red-300 border border-red-500/30",
  cancelled: "bg-zinc-500/20 text-zinc-400 border border-zinc-500/30",
};

export default function DuelsPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [duels, setDuels] = useState<Duel[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"active" | "history">("active");
  const [showChallenge, setShowChallenge] = useState(false);
  const [problems, setProblems] = useState<Problem[]>([]);
  const [challengeUsername, setChallengeUsername] = useState("");
  const [challengeProblemId, setChallengeProblemId] = useState<number | "">("");
  const [challenging, setChallenging] = useState(false);
  const socketRef = useRef<Socket | null>(null);

  const fetchDuels = useCallback(async () => {
    try {
      const data = await api.get<Duel[]>(`/duels?status=${tab}`);
      setDuels(data);
    } catch { /* ignore */ }
    setLoading(false);
  }, [tab]);

  useEffect(() => { fetchDuels(); }, [fetchDuels]);

  useEffect(() => {
    if (!showChallenge || problems.length > 0) return;
    api.get<{ problems: Problem[] }>("/problems?mode=free&limit=50")
      .then(d => setProblems(Array.isArray(d) ? d : d.problems ?? []))
      .catch(() => {});
  }, [showChallenge, problems.length]);

  // Socket for live duel invites
  useEffect(() => {
    if (!user) return;
    const token = localStorage.getItem("nouvil_token");
    const socket = socketIO("/", { path: "/api/socket.io", auth: { token: `Bearer ${token}` }, transports: ["websocket", "polling"] });
    socketRef.current = socket;

    socket.on("duel_invite", (data: { duelId: number; challenger: DuelUser; problem: Problem; expiresAt: string }) => {
      toast.custom((toastId) => (
        <div className="flex flex-col gap-2 text-right p-4 rounded-xl shadow-xl"
          dir="rtl"
          style={{ background: "#1e1b4b", border: "1px solid #6366f1", color: "#e2e8f0", minWidth: 280 }}>
          <div className="font-bold text-base">⚔️ تحدي جديد!</div>
          <div className="text-sm" style={{ color: "#cbd5e1" }}>
            {data.challenger.name} يتحداك في: <span style={{ color: "#fde68a" }}>{data.problem.title}</span>
          </div>
          <div className="flex gap-2 justify-end mt-1">
            <button onClick={() => { toast.dismiss(toastId); router.push(`/duels/${data.duelId}`); }}
              className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 rounded-lg text-white text-sm font-medium">قبول</button>
            <button onClick={() => { toast.dismiss(toastId); api.patch(`/duels/${data.duelId}/reject`, {}).catch(() => {}); }}
              className="px-3 py-1 bg-red-600/80 hover:bg-red-500/80 rounded-lg text-white text-sm font-medium">رفض</button>
          </div>
        </div>
      ), { duration: 30000 });
      fetchDuels();
    });

    socket.on("duel_accepted", (data: { duelId: number }) => {
      toast.success("قبل التحدي! اذهب للمبارزة →");
      fetchDuels();
      router.push(`/duels/${data.duelId}`);
    });

    socket.on("duel_rejected", () => {
      toast.error("رفض التحدي للأسف");
      fetchDuels();
    });

    return () => { socket.disconnect(); };
  }, [user, fetchDuels, router]);

  const sendChallenge = async () => {
    if (!challengeUsername || !challengeProblemId) { toast.error("اختر المستخدم والمسألة"); return; }
    setChallenging(true);
    try {
      await api.post("/duels", { challengedUsername: challengeUsername, problemId: challengeProblemId });
      toast.success("تم إرسال التحدي! بانتظار القبول");
      setShowChallenge(false);
      setChallengeUsername("");
      setChallengeProblemId("");
      fetchDuels();
    } catch (e: unknown) {
      const err = e as { message?: string };
      toast.error(err?.message ?? "فشل إرسال التحدي");
    } finally { setChallenging(false); }
  };

  const cancelDuel = async (id: number) => {
    try {
      await api.patch(`/duels/${id}/cancel`, {});
      fetchDuels();
    } catch { toast.error("فشل الإلغاء"); }
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center" dir="rtl">
        <div className="text-center">
          <p className="text-xl text-zinc-400 mb-4">يجب تسجيل الدخول للمشاركة في المبارزات</p>
          <Link href="/auth/login" className="px-6 py-2 bg-violet-600 hover:bg-violet-500 rounded-xl text-white font-medium">تسجيل الدخول</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-zinc-950 via-indigo-950/20 to-zinc-950 pt-20 pb-16" dir="rtl">
      <div className="max-w-5xl mx-auto px-4">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-10">
          <div className="inline-flex items-center gap-3 mb-4">
            <div className="text-5xl">⚔️</div>
            <div>
              <h1 className="text-4xl font-black text-white">وضع المبارزة</h1>
              <p className="text-zinc-400 mt-1">تحدَّ أصدقاءك في حل المسائل البرمجية بشكل مباشر</p>
            </div>
          </div>
          <motion.button
            whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}
            onClick={() => setShowChallenge(true)}
            className="mt-4 px-8 py-3 bg-gradient-to-l from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 rounded-2xl text-white font-bold text-lg shadow-lg shadow-violet-900/30"
          >
            ⚔️ تحدِّ لاعباً
          </motion.button>
        </motion.div>

        {/* Tabs */}
        <div className="flex gap-3 mb-6 justify-center">
          {[{ key: "active", label: "المبارزات النشطة" }, { key: "history", label: "السجل" }].map(t => (
            <button key={t.key} onClick={() => setTab(t.key as "active" | "history")}
              className={`px-5 py-2 rounded-xl font-medium text-sm transition-all ${tab === t.key ? "bg-violet-600 text-white shadow-lg" : "bg-white/5 text-zinc-400 hover:bg-white/10"}`}>
              {t.label}
            </button>
          ))}
        </div>

        {/* Duels List */}
        {loading ? (
          <div className="flex justify-center py-16"><div className="w-8 h-8 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" /></div>
        ) : duels.length === 0 ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-16">
            <div className="text-5xl mb-4">🛡️</div>
            <p className="text-zinc-400 text-lg">لا توجد مبارزات {tab === "active" ? "نشطة" : "سابقة"}</p>
            <button onClick={() => setShowChallenge(true)} className="mt-4 px-6 py-2 bg-violet-600/80 hover:bg-violet-500/80 rounded-xl text-white font-medium text-sm">ابدأ مبارزتك الأولى</button>
          </motion.div>
        ) : (
          <div className="space-y-3">
            {duels.map((d, i) => {
              const isChallenger = d.challengerId === user.id;
              const me = isChallenger ? d.challenger : d.challenged;
              const opp = isChallenger ? d.challenged : d.challenger;
              const myProgress = isChallenger ? d.challengerProgress : d.challengedProgress;
              const oppProgress = isChallenger ? d.challengedProgress : d.challengerProgress;
              const iWon = d.winnerId === user.id;

              return (
                <motion.div key={d.id} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.04 }}
                  className="bg-white/4 backdrop-blur-sm border border-white/10 rounded-2xl p-5 hover:border-violet-500/30 transition-all">
                  <div className="flex items-center justify-between flex-wrap gap-4">
                    {/* Players */}
                    <div className="flex items-center gap-4">
                      <div className="text-center">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center text-white font-bold">
                          {me.name[0]}
                        </div>
                        <p className="text-xs text-zinc-400 mt-1">أنا</p>
                      </div>
                      <div className="text-2xl font-black text-zinc-500">VS</div>
                      <div className="text-center">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-rose-600 to-orange-600 flex items-center justify-center text-white font-bold">
                          {opp.name[0]}
                        </div>
                        <p className="text-xs text-zinc-400 mt-1">{opp.name}</p>
                      </div>
                    </div>

                    {/* Problem */}
                    <div className="flex-1 min-w-48">
                      <p className="text-zinc-300 font-semibold text-sm">{d.problem?.title}</p>
                      <span className={`text-xs font-medium ${DIFFICULTY_COLOR[d.problem?.difficulty]}`}>{DIFFICULTY_LABEL[d.problem?.difficulty]}</span>
                    </div>

                    {/* Progress bars for active */}
                    {d.status === "active" && (
                      <div className="flex-1 min-w-40 space-y-1">
                        <div className="flex justify-between text-xs text-zinc-500 mb-1">
                          <span>أنا: {myProgress}%</span>
                          <span>{opp.name}: {oppProgress}%</span>
                        </div>
                        <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                          <div className="h-full bg-violet-500 rounded-full transition-all" style={{ width: `${myProgress}%` }} />
                        </div>
                        <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                          <div className="h-full bg-rose-500 rounded-full transition-all" style={{ width: `${oppProgress}%` }} />
                        </div>
                      </div>
                    )}

                    {/* Winner badge */}
                    {d.status === "finished" && (
                      <div className={`px-3 py-1.5 rounded-xl font-bold text-sm ${iWon ? "bg-yellow-500/20 text-yellow-300 border border-yellow-500/30" : "bg-zinc-500/20 text-zinc-400 border border-zinc-500/30"}`}>
                        {iWon ? "🏆 فزت!" : "😔 خسرت"}
                      </div>
                    )}

                    {/* Status + Actions */}
                    <div className="flex flex-col items-end gap-2">
                      <span className={`px-2.5 py-1 rounded-lg text-xs font-medium ${STATUS_COLOR[d.status]}`}>{STATUS_LABEL[d.status]}</span>
                      <div className="flex gap-2">
                        {(d.status === "active" || d.status === "pending") && (
                          <Link href={`/duels/${d.id}`}
                            className="px-3 py-1.5 bg-violet-600 hover:bg-violet-500 rounded-lg text-white text-xs font-medium">
                            {d.status === "active" ? "⚔️ انضم" : "👁️ عرض"}
                          </Link>
                        )}
                        {d.status === "pending" && d.challengedId === user.id && (
                          <button onClick={() => router.push(`/duels/${d.id}`)}
                            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 rounded-lg text-white text-xs font-medium">
                            ✅ اقبل
                          </button>
                        )}
                        {(d.status === "pending" || d.status === "active") && d.challengerId === user.id && (
                          <button onClick={() => cancelDuel(d.id)}
                            className="px-3 py-1.5 bg-red-600/60 hover:bg-red-500/60 rounded-lg text-white text-xs font-medium">
                            إلغاء
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

      {/* Challenge Modal */}
      <AnimatePresence>
        {showChallenge && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowChallenge(false)}>
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
              onClick={e => e.stopPropagation()}
              className="bg-zinc-900 border border-violet-500/30 rounded-2xl p-6 w-full max-w-md shadow-2xl" dir="rtl">
              <h2 className="text-xl font-bold text-white mb-5 flex items-center gap-2">⚔️ تحدِّ لاعباً</h2>

              <div className="space-y-4">
                <div>
                  <label className="text-sm text-zinc-400 mb-1.5 block">اسم المستخدم للمنافس</label>
                  <input
                    value={challengeUsername}
                    onChange={e => setChallengeUsername(e.target.value)}
                    placeholder="username"
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white placeholder-zinc-500 focus:outline-none focus:border-violet-500 text-sm"
                  />
                </div>

                <div>
                  <label className="text-sm text-zinc-400 mb-1.5 block">اختر المسألة</label>
                  <select value={challengeProblemId} onChange={e => setChallengeProblemId(Number(e.target.value))}
                    className="w-full bg-zinc-800 border border-white/10 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-violet-500 text-sm">
                    <option value="">-- اختر مسألة --</option>
                    {problems.map(p => (
                      <option key={p.id} value={p.id}>{p.title} ({DIFFICULTY_LABEL[p.difficulty] ?? p.difficulty})</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
                  onClick={sendChallenge} disabled={challenging}
                  className="flex-1 py-2.5 bg-gradient-to-l from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 rounded-xl text-white font-bold disabled:opacity-50">
                  {challenging ? "يتم الإرسال..." : "⚔️ أرسل التحدي"}
                </motion.button>
                <button onClick={() => setShowChallenge(false)}
                  className="px-4 py-2.5 bg-white/5 hover:bg-white/10 rounded-xl text-zinc-400 font-medium">
                  إلغاء
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
