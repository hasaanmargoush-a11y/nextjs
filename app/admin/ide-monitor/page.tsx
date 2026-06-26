"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { api } from "@/lib/api";
import {
  ShieldAlert, ShieldCheck, ShieldX, Activity, Globe,
  Clock, RefreshCw, Trash2, Filter, ChevronLeft, ChevronRight,
  Terminal, Zap, AlertTriangle, CheckCircle2, XCircle, Timer,
  BarChart3, TrendingUp, Eye, EyeOff,
} from "lucide-react";

// ── Types ─────────────────────────────────────────────────────────────────────
interface Stats {
  total24h:       number;
  total7d:        number;
  blocked24h:     number;
  rateLimited24h: number;
  uniqueIps24h:   number;
  byStatus:       { status: string; n: number }[];
  byLanguage:     { language: string; n: number }[];
  hourly:         { hour: string; n: number }[];
}

interface LogRow {
  id:          number;
  userId:      number | null;
  ip:          string;
  language:    string;
  status:      string;
  blockReason: string | null;
  codeSnippet: string | null;
  durationMs:  number | null;
  exitCode:    number | null;
  createdAt:   string;
}

// ── Status config ─────────────────────────────────────────────────────────────
const STATUS_CFG: Record<string, { label: string; color: string; bg: string; icon: React.ReactNode }> = {
  success:         { label: "ناجح",        color: "text-emerald-400", bg: "bg-emerald-500/10 border-emerald-500/20", icon: <CheckCircle2 className="w-3.5 h-3.5" /> },
  blocked_pattern: { label: "كود محظور",   color: "text-red-400",     bg: "bg-red-500/10 border-red-500/20",         icon: <XCircle className="w-3.5 h-3.5" /> },
  rate_limited:    { label: "Rate Limit",  color: "text-amber-400",   bg: "bg-amber-500/10 border-amber-500/20",     icon: <AlertTriangle className="w-3.5 h-3.5" /> },
  timeout:         { label: "Timeout",     color: "text-orange-400",  bg: "bg-orange-500/10 border-orange-500/20",   icon: <Timer className="w-3.5 h-3.5" /> },
  error:           { label: "خطأ",         color: "text-rose-400",    bg: "bg-rose-500/10 border-rose-500/20",       icon: <XCircle className="w-3.5 h-3.5" /> },
  auth_required:   { label: "غير مسجّل",  color: "text-slate-400",   bg: "bg-slate-500/10 border-slate-500/20",     icon: <ShieldX className="w-3.5 h-3.5" /> },
};

const ALL_STATUSES = ["", "success", "blocked_pattern", "rate_limited", "timeout", "error"];
const STATUS_LABELS: Record<string, string> = { "": "الكل", success: "ناجح", blocked_pattern: "محظور", rate_limited: "Rate Limit", timeout: "Timeout", error: "خطأ" };

function fmt(s: string) { return new Date(s).toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit", second: "2-digit" }); }
function fmtDate(s: string) { return new Date(s).toLocaleDateString("ar-EG", { month: "short", day: "numeric" }); }

// ── Stat Card ─────────────────────────────────────────────────────────────────
function StatCard({ label, value, sub, icon, accent }: {
  label: string; value: number | string; sub?: string;
  icon: React.ReactNode; accent: string;
}) {
  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border dark:border-white/10 border-slate-200 dark:bg-[#0d1117] bg-white p-5 flex items-start gap-4"
    >
      <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${accent}`}>
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-2xl font-black dark:text-white text-slate-900">{value.toLocaleString()}</p>
        <p className="text-sm dark:text-slate-400 text-slate-600 font-medium">{label}</p>
        {sub && <p className="text-xs dark:text-slate-500 text-slate-400 mt-0.5">{sub}</p>}
      </div>
    </motion.div>
  );
}

// ── Mini Bar Chart ─────────────────────────────────────────────────────────────
function HourlyChart({ data }: { data: { hour: string; n: number }[] }) {
  if (!data.length) return (
    <div className="h-24 flex items-center justify-center dark:text-slate-600 text-slate-400 text-sm">
      لا توجد بيانات خلال آخر 24 ساعة
    </div>
  );
  const max = Math.max(...data.map(d => d.n), 1);
  return (
    <div className="flex items-end gap-1 h-20 w-full" dir="ltr">
      {data.map((d, i) => (
        <div key={i} className="flex-1 flex flex-col items-center gap-0.5 group relative" title={`${new Date(d.hour).getHours()}:00 — ${d.n} طلب`}>
          <div
            className="w-full rounded-t transition-all bg-violet-500/60 group-hover:bg-violet-400"
            style={{ height: `${Math.max(4, (d.n / max) * 100)}%` }}
          />
        </div>
      ))}
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function IDEMonitorPage() {
  const [stats,    setStats]    = useState<Stats | null>(null);
  const [logs,     setLogs]     = useState<LogRow[]>([]);
  const [total,    setTotal]    = useState(0);
  const [page,     setPage]     = useState(1);
  const [status,   setStatus]   = useState("");
  const [loading,  setLoading]  = useState(true);
  const [logsLoading, setLogsLoading] = useState(true);
  const [countdown, setCountdown] = useState(15);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [clearing, setClearing]  = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const LIMIT = 25;

  const fetchStats = useCallback(async () => {
    try {
      const s = await api.get<Stats>("/admin/ide-monitor/stats");
      setStats(s);
    } catch {}
    setLoading(false);
  }, []);

  const fetchLogs = useCallback(async (p = page, st = status) => {
    setLogsLoading(true);
    try {
      const qs = new URLSearchParams({ page: String(p), limit: String(LIMIT) });
      if (st) qs.set("status", st);
      const d = await api.get<{ rows: LogRow[]; total: number }>(`/admin/ide-monitor/logs?${qs}`);
      setLogs(d.rows);
      setTotal(d.total);
    } catch {}
    setLogsLoading(false);
  }, [page, status]);

  const refresh = useCallback(() => {
    fetchStats();
    fetchLogs(page, status);
    setCountdown(15);
  }, [fetchStats, fetchLogs, page, status]);

  // Auto-refresh every 15 seconds
  useEffect(() => {
    refresh();
    timerRef.current = setInterval(() => {
      setCountdown(c => {
        if (c <= 1) { refresh(); return 15; }
        return c - 1;
      });
    }, 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Re-fetch logs when page or filter changes
  useEffect(() => { fetchLogs(page, status); }, [page, status]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleStatusChange = (s: string) => { setStatus(s); setPage(1); };

  const clearOldLogs = async () => {
    if (!confirm("هذا سيحذف جميع السجلات الأقدم من 30 يوم. هل تريد المتابعة؟")) return;
    setClearing(true);
    try { await api.delete("/admin/ide-monitor/logs"); refresh(); }
    catch {}
    setClearing(false);
  };

  const pages = Math.ceil(total / LIMIT);
  const blocked24h   = stats?.blocked24h    ?? 0;
  const rateLimited  = stats?.rateLimited24h ?? 0;
  const threatLevel  = blocked24h + rateLimited;
  const threatColor  = threatLevel === 0 ? "text-emerald-400" : threatLevel < 10 ? "text-amber-400" : "text-red-400";
  const threatLabel  = threatLevel === 0 ? "آمن" : threatLevel < 10 ? "تنبيه" : "خطر";

  return (
    <div className="space-y-6" dir="rtl">
      {/* ── Header ── */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-red-500/20 to-amber-500/20 border border-red-500/30 flex items-center justify-center">
            <ShieldAlert className="w-6 h-6 text-red-400" />
          </div>
          <div>
            <h1 className="text-xl font-black dark:text-white text-slate-900">مراقبة أمان IDE</h1>
            <p className="text-xs dark:text-slate-400 text-slate-500">رصد محاولات الاختراق والإساءة في الوقت الفعلي</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* Threat level badge */}
          <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border dark:border-white/10 border-slate-200 dark:bg-white/5 bg-white text-xs font-bold ${threatColor}`}>
            <ShieldCheck className="w-3.5 h-3.5" />
            {threatLabel}
          </div>
          {/* Auto-refresh countdown */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border dark:border-white/10 border-slate-200 dark:bg-white/5 bg-white text-xs dark:text-slate-400 text-slate-500">
            <Clock className="w-3 h-3" />
            تحديث في {countdown}ث
          </div>
          <button
            onClick={refresh}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-xs font-semibold transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            تحديث
          </button>
          <button
            onClick={clearOldLogs}
            disabled={clearing}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border dark:border-white/10 border-slate-200 dark:bg-white/5 bg-white dark:text-slate-400 text-slate-600 hover:text-red-400 text-xs transition-colors"
            title="حذف السجلات الأقدم من 30 يوم"
          >
            <Trash2 className="w-3.5 h-3.5" />
            تنظيف
          </button>
        </div>
      </div>

      {/* ── Stats Cards ── */}
      {loading ? (
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-24 rounded-2xl dark:bg-white/5 bg-slate-100 animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          <StatCard label="محاولات (24 ساعة)"  value={stats?.total24h ?? 0}
            sub={`${stats?.total7d ?? 0} في 7 أيام`}
            icon={<Activity className="w-5 h-5 text-violet-400" />}
            accent="bg-violet-500/15" />
          <StatCard label="كود محظور (24 ساعة)" value={blocked24h}
            icon={<ShieldX className="w-5 h-5 text-red-400" />}
            accent="bg-red-500/15" />
          <StatCard label="Rate Limit (24 ساعة)" value={rateLimited}
            icon={<AlertTriangle className="w-5 h-5 text-amber-400" />}
            accent="bg-amber-500/15" />
          <StatCard label="IPs مميزة (24 ساعة)" value={stats?.uniqueIps24h ?? 0}
            icon={<Globe className="w-5 h-5 text-cyan-400" />}
            accent="bg-cyan-500/15" />
          <StatCard label="معدل الحظر" value={stats?.total24h ? `${Math.round((blocked24h + rateLimited) / stats.total24h * 100)}%` : "0%"}
            icon={<BarChart3 className="w-5 h-5 text-rose-400" />}
            accent="bg-rose-500/15" />
        </div>
      )}

      {/* ── Charts row ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Hourly chart */}
        <div className="lg:col-span-2 rounded-2xl border dark:border-white/10 border-slate-200 dark:bg-[#0d1117] bg-white p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-violet-400" />
              <span className="text-sm font-bold dark:text-white text-slate-900">النشاط خلال آخر 24 ساعة</span>
            </div>
            <span className="text-xs dark:text-slate-500 text-slate-400">طلب / ساعة</span>
          </div>
          <HourlyChart data={stats?.hourly ?? []} />
          {/* X-axis labels */}
          {(stats?.hourly?.length ?? 0) > 0 && (
            <div className="flex justify-between mt-2 text-[10px] dark:text-slate-600 text-slate-400" dir="ltr">
              <span>{new Date(stats!.hourly[0].hour).getHours()}:00</span>
              <span>{new Date(stats!.hourly[Math.floor(stats!.hourly.length / 2)]?.hour ?? stats!.hourly[0].hour).getHours()}:00</span>
              <span>{new Date(stats!.hourly[stats!.hourly.length - 1].hour).getHours()}:00</span>
            </div>
          )}
        </div>

        {/* Status breakdown */}
        <div className="rounded-2xl border dark:border-white/10 border-slate-200 dark:bg-[#0d1117] bg-white p-5">
          <div className="flex items-center gap-2 mb-4">
            <Zap className="w-4 h-4 text-amber-400" />
            <span className="text-sm font-bold dark:text-white text-slate-900">توزيع الحالات</span>
          </div>
          <div className="space-y-2.5">
            {(stats?.byStatus ?? []).map(({ status: st, n }) => {
              const cfg = STATUS_CFG[st] ?? STATUS_CFG.error;
              const pct = stats?.total24h ? Math.round(n / stats.total24h * 100) : 0;
              return (
                <div key={st}>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className={`flex items-center gap-1 font-medium ${cfg.color}`}>{cfg.icon}{cfg.label}</span>
                    <span className="dark:text-slate-400 text-slate-500">{n} ({pct}%)</span>
                  </div>
                  <div className="h-1.5 rounded-full dark:bg-white/5 bg-slate-100 overflow-hidden">
                    <div className={`h-full rounded-full transition-all ${cfg.color.replace("text-", "bg-").replace("-400", "-500")}`} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
            {!stats?.byStatus?.length && (
              <p className="text-xs dark:text-slate-600 text-slate-400 py-4 text-center">لا يوجد نشاط خلال 24 ساعة</p>
            )}
          </div>
        </div>
      </div>

      {/* ── Logs table ── */}
      <div className="rounded-2xl border dark:border-white/10 border-slate-200 dark:bg-[#0d1117] bg-white overflow-hidden">
        {/* Table toolbar */}
        <div className="flex items-center justify-between gap-3 px-5 py-4 border-b dark:border-white/5 border-slate-100">
          <div className="flex items-center gap-2">
            <Terminal className="w-4 h-4 text-cyan-400" />
            <span className="text-sm font-bold dark:text-white text-slate-900">سجل التنفيذ</span>
            <span className="text-xs dark:text-slate-500 text-slate-400">({total.toLocaleString()} إجمالي)</span>
          </div>
          <div className="flex items-center gap-2 flex-wrap justify-end">
            <Filter className="w-3.5 h-3.5 dark:text-slate-400 text-slate-500" />
            {ALL_STATUSES.map(s => (
              <button
                key={s}
                onClick={() => handleStatusChange(s)}
                className={`px-3 py-1 rounded-lg text-xs font-medium transition-all border ${
                  status === s
                    ? "bg-violet-600 text-white border-violet-600"
                    : "dark:border-white/10 border-slate-200 dark:text-slate-400 text-slate-600 hover:border-violet-500/50"
                }`}
              >
                {STATUS_LABELS[s]}
              </button>
            ))}
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto" dir="ltr">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b dark:border-white/5 border-slate-100 text-xs dark:text-slate-500 text-slate-400">
                <th className="text-right px-4 py-3 font-medium">الوقت</th>
                <th className="text-right px-4 py-3 font-medium">IP</th>
                <th className="text-right px-4 py-3 font-medium">اللغة</th>
                <th className="text-right px-4 py-3 font-medium">الحالة</th>
                <th className="text-right px-4 py-3 font-medium">المدة</th>
                <th className="text-right px-4 py-3 font-medium">التفاصيل</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              <AnimatePresence mode="popLayout">
                {logsLoading ? (
                  [...Array(8)].map((_, i) => (
                    <tr key={i} className="border-b dark:border-white/5 border-slate-50">
                      {[...Array(7)].map((_, j) => (
                        <td key={j} className="px-4 py-3">
                          <div className="h-4 rounded dark:bg-white/5 bg-slate-100 animate-pulse" style={{ width: `${40 + j * 10}%` }} />
                        </td>
                      ))}
                    </tr>
                  ))
                ) : logs.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-16 dark:text-slate-500 text-slate-400 text-sm">
                      <ShieldCheck className="w-10 h-10 mx-auto mb-3 opacity-30" />
                      لا توجد سجلات بهذا الفلتر
                    </td>
                  </tr>
                ) : logs.map(log => {
                  const cfg  = STATUS_CFG[log.status] ?? STATUS_CFG.error;
                  const open = expandedId === log.id;
                  return (
                    <>
                      <motion.tr
                        key={log.id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className={`border-b dark:border-white/5 border-slate-50 hover:dark:bg-white/2 hover:bg-slate-50/50 transition-colors ${open ? "dark:bg-white/5 bg-slate-50" : ""}`}
                      >
                        <td className="px-4 py-3 text-xs dark:text-slate-400 text-slate-500 whitespace-nowrap font-mono" dir="rtl">
                          {fmt(log.createdAt)}
                          <span className="block text-[10px] dark:text-slate-600 text-slate-400">{fmtDate(log.createdAt)}</span>
                        </td>
                        <td className="px-4 py-3 font-mono text-xs dark:text-slate-300 text-slate-700 whitespace-nowrap">{log.ip}</td>
                        <td className="px-4 py-3">
                          <span className="text-xs font-mono dark:text-slate-300 text-slate-700 bg-white/5 px-2 py-0.5 rounded">
                            {log.language}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-lg border ${cfg.bg} ${cfg.color}`}>
                            {cfg.icon}{cfg.label}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-xs dark:text-slate-400 text-slate-500 font-mono">
                          {log.durationMs != null ? `${log.durationMs}ms` : "—"}
                        </td>
                        <td className="px-4 py-3 max-w-[240px]">
                          {log.blockReason ? (
                            <span className="text-xs text-red-400 truncate block">{log.blockReason}</span>
                          ) : log.codeSnippet ? (
                            <span className="text-xs dark:text-slate-500 text-slate-400 font-mono truncate block">{log.codeSnippet.slice(0, 60)}</span>
                          ) : <span className="text-xs dark:text-slate-600 text-slate-300">—</span>}
                        </td>
                        <td className="px-4 py-3">
                          {(log.codeSnippet || log.blockReason) && (
                            <button
                              onClick={() => setExpandedId(open ? null : log.id)}
                              className="text-xs dark:text-slate-500 text-slate-400 hover:text-violet-400 transition-colors"
                              title={open ? "إخفاء" : "عرض الكود"}
                            >
                              {open ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                            </button>
                          )}
                        </td>
                      </motion.tr>
                      {open && (
                        <motion.tr
                          key={`exp-${log.id}`}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          className="border-b dark:border-white/5 border-slate-50"
                        >
                          <td colSpan={7} className="px-4 pb-4 pt-1">
                            <div className="rounded-xl dark:bg-black/30 bg-slate-900 p-3 border dark:border-white/5 border-slate-700" dir="ltr">
                              {log.blockReason && (
                                <p className="text-xs text-red-400 mb-2 font-medium">سبب الحظر: {log.blockReason}</p>
                              )}
                              {log.codeSnippet && (
                                <pre className="text-xs text-slate-300 font-mono whitespace-pre-wrap leading-relaxed overflow-x-auto">{log.codeSnippet}</pre>
                              )}
                              <div className="flex gap-4 mt-2 text-[10px] dark:text-slate-500 text-slate-400">
                                {log.userId && <span>User ID: {log.userId}</span>}
                                {log.exitCode != null && <span>Exit: {log.exitCode}</span>}
                                <span>ID: #{log.id}</span>
                              </div>
                            </div>
                          </td>
                        </motion.tr>
                      )}
                    </>
                  );
                })}
              </AnimatePresence>
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {pages > 1 && (
          <div className="flex items-center justify-between px-5 py-3 border-t dark:border-white/5 border-slate-100">
            <span className="text-xs dark:text-slate-500 text-slate-400">
              صفحة {page} من {pages}
            </span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="w-8 h-8 rounded-lg flex items-center justify-center dark:text-slate-400 text-slate-500 hover:dark:bg-white/10 hover:bg-slate-100 disabled:opacity-30 transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
              {[...Array(Math.min(pages, 5))].map((_, i) => {
                const p = Math.max(1, Math.min(pages - 4, page - 2)) + i;
                return (
                  <button key={p} onClick={() => setPage(p)}
                    className={`w-8 h-8 rounded-lg text-xs font-medium transition-colors ${p === page ? "bg-violet-600 text-white" : "dark:text-slate-400 text-slate-500 hover:dark:bg-white/10 hover:bg-slate-100"}`}
                  >
                    {p}
                  </button>
                );
              })}
              <button
                onClick={() => setPage(p => Math.min(pages, p + 1))}
                disabled={page === pages}
                className="w-8 h-8 rounded-lg flex items-center justify-center dark:text-slate-400 text-slate-500 hover:dark:bg-white/10 hover:bg-slate-100 disabled:opacity-30 transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
