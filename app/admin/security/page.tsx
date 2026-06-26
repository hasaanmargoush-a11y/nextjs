"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  Shield, AlertTriangle, Ban, CheckCircle, Eye, X, RefreshCw,
  UserX, Wifi, Mail, ChevronLeft, ChevronRight, Globe,
  Clock, Activity, Bell, BellOff, Unlock, Info, ListChecks, Plus, Trash2,
  FlaskConical, Timer, PowerOff, Settings2, Save,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { io as socketIO, type Socket } from "socket.io-client";

const API = (path: string) => `/api${path}`;

// ── Arabic labels ─────────────────────────────────────────────────────────────
const SEVERITY_CONFIG = {
  critical: { label: "حرج جداً", color: "bg-red-500/15 text-red-400 border-red-500/30",       dot: "bg-red-500",    ring: "ring-red-500/30" },
  high:     { label: "عالي",     color: "bg-orange-500/15 text-orange-400 border-orange-500/30", dot: "bg-orange-500", ring: "ring-orange-500/30" },
  medium:   { label: "متوسط",    color: "bg-yellow-500/15 text-yellow-400 border-yellow-500/30", dot: "bg-yellow-500", ring: "ring-yellow-500/30" },
  low:      { label: "منخفض",    color: "bg-blue-500/15 text-blue-400 border-blue-500/30",      dot: "bg-blue-500",   ring: "ring-blue-500/30" },
};

const ATTACK_TYPE_AR: Record<string, { label: string; icon: string; desc: string; advice: string }> = {
  intrusion_attempt:     { label: "محاولة اختراق",           icon: "🔓", desc: "تم اكتشاف أنماط XSS أو SQL Injection في الـ URL المطلوب", advice: "راجع الـ IP وإذا تكررت المحاولة فعّل الحظر اليدوي." },
  api_injection_attempt: { label: "حقن عبر الـ API",         icon: "💉", desc: "طلب API يحتوي على كود خبيث في الـ body (XSS / SQLi / SSTI)", advice: "هجوم مباشر على الـ API — يُنصح بحظر الـ IP فوراً." },
  rate_abuse:            { label: "إساءة معدل الطلبات",      icon: "⚡", desc: "تجاوز الحد المسموح به من الطلبات في الدقيقة الواحدة", advice: "قد يكون bot أو DDoS — راقب النمط وفعّل الحظر إذا استمر." },
  failed_login:          { label: "تسجيل دخول فاشل متكرر",  icon: "🔐", desc: "عدة محاولات تسجيل دخول فاشلة من نفس الـ IP أو الحساب", advice: "قد يكون هجوم Brute Force — ادرس تفعيل CAPTCHA أو حظر مؤقت." },
  suspicious_code:       { label: "كود مشبوه في IDE",        icon: "🦠", desc: "مشروع في Cloud IDE يحتوي على أنماط كود خطيرة أو ضارة", advice: "راجع الكود المرفق في تفاصيل الحادثة وأوقف المشروع إذا لزم." },
  brute_force:           { label: "هجوم القوة الغاشمة",      icon: "🔨", desc: "محاولات متكررة لتخمين كلمة المرور أو المفتاح السري", advice: "حظر فوري مطلوب — هذا النوع يدمر حسابات المستخدمين." },
  xss_attempt:           { label: "هجوم XSS",                icon: "📜", desc: "محاولة حقن سكريبت JavaScript ضار في الصفحة", advice: "يهدف لسرقة الـ cookies أو جلسات المستخدمين — حظر فوري." },
  sql_injection:         { label: "هجوم SQL Injection",      icon: "🗄️", desc: "محاولة حقن أوامر SQL للوصول أو تعديل قاعدة البيانات", advice: "خطر بالغ — يهدف لسرقة أو حذف بيانات المستخدمين." },
  path_traversal:        { label: "اجتياز المسار",           icon: "📂", desc: "محاولة الوصول لملفات النظام عبر ../ أو /etc/passwd", advice: "يهدف لسرقة ملفات النظام والإعدادات الحساسة." },
  ssti_attempt:          { label: "حقن القالب (SSTI)",       icon: "🧩", desc: "محاولة حقن قالب عبر {{}} أو ${} لتنفيذ كود على السيرفر", advice: "خطر جداً — قد يؤدي لتنفيذ أوامر على السيرفر (RCE)." },
};

function getTypeInfo(type: string) {
  return ATTACK_TYPE_AR[type] ?? { label: type, icon: "⚠️", desc: "نوع تهديد غير معروف", advice: "راجع التفاصيل واتخذ الإجراء المناسب." };
}

// ── Types ─────────────────────────────────────────────────────────────────────
interface LiveAlert {
  id: number; type: string; severity: string; ip: string;
  email: string | null; userId: number | null; autoBanned: boolean;
  details: Record<string, unknown>; createdAt: string;
}

interface SecurityEvent {
  id: number; userId: number | null; ip: string; email: string | null;
  type: string; severity: "critical" | "high" | "medium" | "low";
  autoBanned: boolean; resolved: boolean; createdAt: string;
  userName: string | null; userEmail: string | null;
}

interface SecurityEventDetail extends SecurityEvent {
  details: Record<string, unknown>;
  resolvedBy: number | null;
}

interface BanRecord {
  id: number; ip: string | null; email: string | null; userId: number | null;
  reason: string; active: boolean; eventId: number | null;
  createdAt: string; expiresAt: string | null; userName: string | null;
  isAutoban?: boolean;
}

interface Stats {
  totalEvents: number; openEvents: number; activeBans: number; criticalOpen: number;
}

interface WhitelistEntry {
  id: number; ip: string; label: string;
  addedBy: number | null; addedByName: string | null; createdAt: string;
}

interface TestingModeState {
  active: boolean; expiresAt: number | null;
  activatedBy: number | null; durationLabel: string; remainingMs: number | null;
}

interface BanSettings {
  defaultMinutes: number;
  perSeverity: { critical: number; high: number; medium: number; low: number };
}

// ── Sub-components ────────────────────────────────────────────────────────────
function SeverityBadge({ severity }: { severity: string }) {
  const cfg = SEVERITY_CONFIG[severity as keyof typeof SEVERITY_CONFIG] ?? SEVERITY_CONFIG.medium;
  return (
    <span className={cn("inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-semibold border", cfg.color)}>
      <span className={cn("w-1.5 h-1.5 rounded-full", cfg.dot)} />
      {cfg.label}
    </span>
  );
}

function StatCard({ label, value, icon, color, pulse }: { label: string; value: number; icon: React.ReactNode; color: string; pulse?: boolean }) {
  return (
    <div className={cn("rounded-2xl border p-5 dark:bg-white/3 bg-white relative overflow-hidden", color)}>
      {pulse && value > 0 && <div className="absolute inset-0 bg-red-500/5 animate-pulse rounded-2xl" />}
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm dark:text-slate-400 text-slate-500">{label}</span>
        <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-current/10">{icon}</div>
      </div>
      <p className="text-3xl font-bold dark:text-white text-slate-900">{value}</p>
    </div>
  );
}

// ── Ban Countdown ─────────────────────────────────────────────────────────────
function BanCountdown({ expiresAt }: { expiresAt: string | null }) {
  const [label, setLabel] = useState("");
  useEffect(() => {
    if (!expiresAt) { setLabel("دائم"); return; }
    const tick = () => {
      const rem = new Date(expiresAt).getTime() - Date.now();
      if (rem <= 0) { setLabel("انتهى"); return; }
      const h = Math.floor(rem / 3600000);
      const m = Math.floor((rem % 3600000) / 60000);
      const s = Math.floor((rem % 60000) / 1000);
      if (h > 23) {
        const d = Math.floor(h / 24);
        setLabel(`${d} يوم ${h % 24} ساعة`);
      } else if (h > 0) {
        setLabel(`${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`);
      } else {
        setLabel(`${m}:${String(s).padStart(2, "0")}`);
      }
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [expiresAt]);
  if (!expiresAt) return null;
  const expired = new Date(expiresAt).getTime() < Date.now();
  return (
    <span className={cn(
      "inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full font-mono tabular-nums border",
      expired
        ? "text-slate-400 bg-slate-500/10 border-slate-500/20"
        : "text-emerald-400 bg-emerald-500/10 border-emerald-500/20"
    )}>
      <Timer className="w-2.5 h-2.5 flex-shrink-0" />
      {expired ? "انتهى" : `${label} متبقي`}
    </span>
  );
}

// ── Live Feed Panel ───────────────────────────────────────────────────────────
function LiveFeedPanel({ alerts, connected }: { alerts: LiveAlert[]; connected: boolean }) {
  if (alerts.length === 0 && !connected) return null;
  return (
    <div className="rounded-2xl border dark:border-red-500/20 border-red-200 dark:bg-red-500/3 bg-red-50 overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b dark:border-red-500/15 border-red-100">
        <div className="flex items-center gap-2">
          <div className={cn("w-2 h-2 rounded-full", connected ? "bg-green-400 animate-pulse" : "bg-slate-400")} />
          <span className="text-sm font-semibold dark:text-red-300 text-red-700">
            {connected ? "البث المباشر للهجمات" : "غير متصل بالبث"}
          </span>
          <Activity className="w-3.5 h-3.5 dark:text-red-400 text-red-500" />
        </div>
        <span className="text-xs dark:text-slate-500 text-slate-400">آخر {alerts.length} حدث</span>
      </div>
      {alerts.length === 0 ? (
        <div className="px-4 py-6 text-center text-sm dark:text-slate-500 text-slate-400">
          لا يوجد هجمات نشطة — النظام آمن ✅
        </div>
      ) : (
        <div className="divide-y dark:divide-red-500/10 divide-red-100 max-h-64 overflow-y-auto">
          {alerts.map((alert, i) => {
            const info = getTypeInfo(alert.type);
            const cfg = SEVERITY_CONFIG[alert.severity as keyof typeof SEVERITY_CONFIG] ?? SEVERITY_CONFIG.medium;
            return (
              <div key={`${alert.id}-${i}`} className={cn("px-4 py-3 flex items-start gap-3 transition-all", i === 0 ? "dark:bg-red-500/8 bg-red-100/50" : "")}>
                <span className="text-lg mt-0.5 flex-shrink-0">{info.icon}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className="text-xs font-bold dark:text-white text-slate-900">{info.label}</span>
                    <SeverityBadge severity={alert.severity} />
                    {alert.autoBanned && (
                      <span className="inline-flex items-center gap-1 text-[10px] text-red-400 bg-red-500/10 px-2 py-0.5 rounded-full border border-red-500/20">
                        <Ban className="w-2.5 h-2.5" /> حُظر تلقائياً
                      </span>
                    )}
                  </div>
                  <p className="text-xs dark:text-slate-400 text-slate-500 mb-1">{info.desc}</p>
                  <div className="flex items-center gap-3 text-[10px] dark:text-slate-500 text-slate-400">
                    <span dir="ltr" className="font-mono">{alert.ip}</span>
                    {(alert.details["path"] as string | undefined) && <span dir="ltr" className="font-mono truncate max-w-32">{String(alert.details["path"])}</span>}
                    <span className="mr-auto">{new Date(alert.createdAt).toLocaleTimeString("ar-EG")}</span>
                  </div>
                </div>
                <div className={cn("w-1.5 h-full min-h-8 rounded-full flex-shrink-0", cfg.dot)} />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function SecurityPage() {
  const [tab, setTab]             = useState<"events" | "bans" | "whitelist">("events");
  const [stats, setStats]         = useState<Stats | null>(null);
  const [events, setEvents]       = useState<SecurityEvent[]>([]);
  const [bans, setBans]           = useState<BanRecord[]>([]);
  const [whitelist, setWhitelist] = useState<WhitelistEntry[]>([]);
  const [wlForm, setWlForm]       = useState({ show: false, ip: "", label: "" });
  const [wlLoading, setWlLoading] = useState(false);
  const [wlError, setWlError]     = useState("");
  const [testMode, setTestMode]   = useState<TestingModeState | null>(null);
  const [tmCountdown, setTmCountdown] = useState<string>("");
  const [tmActivating, setTmActivating] = useState(false);
  const [total, setTotal]         = useState(0);
  const [page, setPage]           = useState(1);
  const [pages, setPages]         = useState(1);
  const [loading, setLoading]     = useState(false);
  const [detail, setDetail]       = useState<SecurityEventDetail | null>(null);
  const [filterSev, setFilterSev] = useState("");
  const [filterResolved, setFilterResolved] = useState("false");
  const [banForm, setBanForm]     = useState({ show: false, ip: "", email: "", reason: "", eventId: 0 });
  const [banSettings, setBanSettings] = useState<BanSettings>({ defaultMinutes: 60, perSeverity: { critical: 1440, high: 240, medium: 60, low: 30 } });
  const [banSettingsDraft, setBanSettingsDraft] = useState<BanSettings | null>(null);
  const [banSettingsOpen, setBanSettingsOpen] = useState(false);
  const [banSettingsSaving, setBanSettingsSaving] = useState(false);
  const [liveAlerts, setLiveAlerts] = useState<LiveAlert[]>([]);
  const [socketConnected, setSocketConnected] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [liftingBan, setLiftingBan] = useState<number | null>(null);
  const socketRef = useRef<Socket | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);

  const token = typeof window !== "undefined" ? localStorage.getItem("nouvil_token") : null;
  const headers: HeadersInit = token ? { Authorization: `Bearer ${token}`, "Content-Type": "application/json" } : { "Content-Type": "application/json" };

  // ── Alert beep ─────────────────────────────────────────────────────────────
  const playBeep = useCallback(() => {
    if (!soundEnabled) return;
    try {
      if (!audioCtxRef.current) audioCtxRef.current = new AudioContext();
      const ctx = audioCtxRef.current;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain); gain.connect(ctx.destination);
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(440, ctx.currentTime + 0.2);
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
      osc.start(); osc.stop(ctx.currentTime + 0.3);
    } catch { /* ignore */ }
  }, [soundEnabled]);

  // ── Socket.io live feed ────────────────────────────────────────────────────
  useEffect(() => {
    if (!token) return;
    const socket = socketIO({ path: "/api/socket.io", auth: { token: `Bearer ${token}` }, transports: ["polling", "websocket"] });
    socketRef.current = socket;
    socket.on("connect", () => setSocketConnected(true));
    socket.on("disconnect", () => setSocketConnected(false));
    socket.on("security_alert", (data: LiveAlert) => {
      setLiveAlerts(prev => [data, ...prev].slice(0, 20));
      playBeep();
      // Auto-refresh stats & events
      loadStats();
      if (tab === "events") loadEvents();
      if (tab === "bans" && data.autoBanned) loadBans();
    });
    return () => { socket.disconnect(); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  // ── Data loaders ────────────────────────────────────────────────────────────
  const loadStats = useCallback(async () => {
    try {
      const r = await fetch(API("/admin/security/stats"), { headers });
      if (r.ok) setStats(await r.json());
    } catch { /* ignore */ }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadEvents = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page) });
      if (filterSev)      params.set("severity", filterSev);
      if (filterResolved) params.set("resolved", filterResolved);
      const r = await fetch(API(`/admin/security/events?${params}`), { headers });
      if (r.ok) {
        const d = await r.json();
        setEvents(d.events); setTotal(d.total); setPages(d.pages);
      }
    } finally { setLoading(false); }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, filterSev, filterResolved]);

  const loadBans = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch(API("/admin/security/bans"), { headers });
      if (r.ok) {
        const data: BanRecord[] = await r.json();
        setBans(data.map(b => ({ ...b, isAutoban: !b.userId || b.reason.includes("تلقائي") })));
      }
    } finally { setLoading(false); }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadWhitelist = useCallback(async () => {
    try {
      const r = await fetch(API("/admin/security/whitelist"), { headers });
      if (r.ok) setWhitelist(await r.json());
    } catch { /* ignore */ }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadTestMode = useCallback(async () => {
    try {
      const r = await fetch(API("/admin/security/testing-mode"), { headers });
      if (r.ok) setTestMode(await r.json());
    } catch { /* ignore */ }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadBanSettings = useCallback(async () => {
    try {
      const r = await fetch(API("/admin/security/ban-settings"), { headers });
      if (r.ok) setBanSettings(await r.json());
    } catch { /* ignore */ }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const saveBanSettings = async () => {
    if (!banSettingsDraft) return;
    setBanSettingsSaving(true);
    try {
      const r = await fetch(API("/admin/security/ban-settings"), {
        method: "POST", headers,
        body: JSON.stringify(banSettingsDraft),
      });
      if (r.ok) { setBanSettings(await r.json()); setBanSettingsOpen(false); setBanSettingsDraft(null); }
    } finally { setBanSettingsSaving(false); }
  };

  const activateTestMode = async (minutes: number, label: string) => {
    setTmActivating(true);
    try {
      const r = await fetch(API("/admin/security/testing-mode"), {
        method: "POST", headers,
        body: JSON.stringify({ durationMinutes: minutes, label }),
      });
      if (r.ok) setTestMode(await r.json());
    } finally { setTmActivating(false); }
  };

  const deactivateTestMode = async () => {
    await fetch(API("/admin/security/testing-mode"), { method: "DELETE", headers });
    setTestMode(s => s ? { ...s, active: false, remainingMs: null } : s);
  };

  // Countdown ticker
  useEffect(() => {
    if (!testMode?.active || !testMode.expiresAt) { setTmCountdown(""); return; }
    const tick = () => {
      const rem = testMode.expiresAt! - Date.now();
      if (rem <= 0) { setTmCountdown(""); loadTestMode(); return; }
      const h = Math.floor(rem / 3600000);
      const m = Math.floor((rem % 3600000) / 60000);
      const s = Math.floor((rem % 60000) / 1000);
      setTmCountdown(h > 0 ? `${h}:${String(m).padStart(2,"0")}:${String(s).padStart(2,"0")}` : `${m}:${String(s).padStart(2,"0")}`);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [testMode?.active, testMode?.expiresAt, loadTestMode]);

  useEffect(() => { loadStats(); loadWhitelist(); loadTestMode(); loadBanSettings(); }, [loadStats, loadWhitelist, loadTestMode, loadBanSettings]);
  useEffect(() => {
    if (tab === "events") loadEvents();
    else if (tab === "bans") loadBans();
    else loadWhitelist();
  }, [tab, loadEvents, loadBans, loadWhitelist]);

  const loadDetail = async (id: number) => {
    try {
      const r = await fetch(API(`/admin/security/events/${id}`), { headers });
      if (r.ok) setDetail(await r.json());
    } catch { /* ignore */ }
  };

  const resolve = async (id: number) => {
    await fetch(API(`/admin/security/events/${id}/resolve`), { method: "POST", headers });
    setDetail(null); loadEvents(); loadStats();
  };

  const quickBan = async (eventId: number) => {
    await fetch(API(`/admin/security/events/${eventId}/quick-ban`), { method: "POST", headers });
    setDetail(null); loadEvents(); loadBans(); loadStats();
  };

  const liftBan = async (banId: number) => {
    setLiftingBan(banId);
    try {
      await fetch(API(`/admin/security/bans/${banId}`), { method: "DELETE", headers });
      loadBans(); loadStats();
    } finally { setLiftingBan(null); }
  };

  const liftBanByEvent = async (eventId: number) => {
    await fetch(API(`/admin/security/events/${eventId}/lift-ban`), { method: "POST", headers });
    setDetail(null); loadBans(); loadStats(); loadEvents();
  };

  const submitBan = async () => {
    const { ip, email, reason, eventId } = banForm;
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString(); // 1 hour max
    await fetch(API("/admin/security/bans"), {
      method: "POST", headers,
      body: JSON.stringify({ ip: ip || undefined, email: email || undefined, reason, eventId: eventId || undefined, expiresAt }),
    });
    setBanForm({ show: false, ip: "", email: "", reason: "", eventId: 0 });
    loadBans(); loadStats();
  };

  const openBanFromEvent = (evt: SecurityEvent) => {
    setBanForm({ show: true, ip: evt.ip, email: evt.userEmail ?? "", reason: `حظر يدوي — ${getTypeInfo(evt.type).label}`, eventId: evt.id });
    setTab("bans");
  };

  const addToWhitelist = async () => {
    if (!wlForm.ip.trim()) return;
    setWlLoading(true); setWlError("");
    try {
      const r = await fetch(API("/admin/security/whitelist"), {
        method: "POST", headers,
        body: JSON.stringify({ ip: wlForm.ip.trim(), label: wlForm.label.trim() }),
      });
      if (!r.ok) { const d = await r.json(); setWlError(d.error ?? "خطأ غير معروف"); }
      else { setWlForm({ show: false, ip: "", label: "" }); loadWhitelist(); }
    } finally { setWlLoading(false); }
  };

  const removeFromWhitelist = async (id: number) => {
    await fetch(API(`/admin/security/whitelist/${id}`), { method: "DELETE", headers });
    loadWhitelist();
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl gradient-bg flex items-center justify-center shadow-lg shadow-cyan-500/20">
            <Shield className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold dark:text-white text-slate-900">مركز الأمان</h1>
            <p className="text-xs dark:text-slate-400 text-slate-500">مراقبة التهديدات والحظر — تحديث فوري</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setSoundEnabled(s => !s)}
            className={cn("p-2 rounded-xl text-sm transition-colors", soundEnabled ? "dark:bg-green-500/15 bg-green-100 text-green-500" : "dark:bg-white/5 bg-slate-100 dark:text-slate-400 text-slate-500")}>
            {soundEnabled ? <Bell className="w-4 h-4" /> : <BellOff className="w-4 h-4" />}
          </button>
          <button onClick={() => { loadStats(); if (tab === "events") loadEvents(); else loadBans(); }}
            className="flex items-center gap-2 px-3 py-2 rounded-xl dark:bg-white/5 bg-slate-100 text-sm dark:text-slate-300 text-slate-600 hover:text-cyan-400 transition-colors">
            <RefreshCw className="w-4 h-4" /> تحديث
          </button>
        </div>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard label="إجمالي الأحداث"  value={stats.totalEvents}  icon={<AlertTriangle className="w-4 h-4 text-yellow-400" />} color="border-yellow-500/20" />
          <StatCard label="أحداث مفتوحة"    value={stats.openEvents}   icon={<Eye className="w-4 h-4 text-blue-400" />}            color="border-blue-500/20"   />
          <StatCard label="حظر نشط"         value={stats.activeBans}   icon={<Ban className="w-4 h-4 text-red-400" />}             color="border-red-500/20"    />
          <StatCard label="تهديدات حرجة"    value={stats.criticalOpen} icon={<Shield className="w-4 h-4 text-orange-400" />}       color="border-orange-500/20" pulse />
        </div>
      )}

      {/* Live Feed */}
      <LiveFeedPanel alerts={liveAlerts} connected={socketConnected} />

      {/* ── Testing Mode Banner ── */}
      {testMode?.active ? (
        <div className="rounded-2xl border border-amber-500/40 dark:bg-amber-500/8 bg-amber-50 p-5">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center flex-shrink-0">
                <FlaskConical className="w-5 h-5 text-amber-400" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-bold dark:text-amber-300 text-amber-700">وضع الاختبار نشط</span>
                  <span className="inline-flex items-center gap-1 text-[10px] bg-amber-500/20 text-amber-400 px-2 py-0.5 rounded-full border border-amber-500/30">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                    الحظر التلقائي معطّل
                  </span>
                </div>
                <p className="text-xs dark:text-amber-400/70 text-amber-600 mt-0.5">
                  {testMode.durationLabel} — لن يُحظر أي IP تلقائياً حتى تنتهي المدة
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3 flex-shrink-0">
              {tmCountdown && (
                <div className="text-center">
                  <div className="text-2xl font-black text-amber-400 font-mono tabular-nums" dir="ltr">{tmCountdown}</div>
                  <div className="text-[10px] dark:text-amber-500 text-amber-600">متبقي</div>
                </div>
              )}
              <button onClick={deactivateTestMode}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30 hover:bg-amber-500/30 text-sm font-medium transition-colors">
                <PowerOff className="w-4 h-4" /> إيقاف
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="rounded-2xl border dark:border-white/8 border-slate-200 dark:bg-[#111827] bg-white p-5">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl dark:bg-white/5 bg-slate-100 flex items-center justify-center flex-shrink-0">
                <FlaskConical className="w-5 h-5 dark:text-slate-400 text-slate-500" />
              </div>
              <div>
                <p className="font-semibold dark:text-white text-slate-900">وضع الاختبار</p>
                <p className="text-xs dark:text-slate-500 text-slate-400 mt-0.5">يوقف الحظر التلقائي مؤقتاً — اختبر الموقع بحرية دون خوف من الحظر</p>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              {[
                { min: 30,  label: "٣٠ دقيقة" },
                { min: 60,  label: "ساعة" },
                { min: 120, label: "ساعتين" },
                { min: 240, label: "٤ ساعات" },
              ].map(({ min, label }) => (
                <button key={min} onClick={() => activateTestMode(min, label)} disabled={tmActivating}
                  className="px-4 py-2 rounded-xl text-sm font-medium dark:bg-white/5 bg-slate-100 dark:text-slate-300 text-slate-700 hover:dark:bg-amber-500/15 hover:text-amber-400 hover:border-amber-500/30 border border-transparent transition-all disabled:opacity-50 flex items-center gap-1.5">
                  <Timer className="w-3.5 h-3.5" />
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Auto-ban Duration Settings ── */}
      <div className="rounded-2xl border dark:border-white/8 border-slate-200 dark:bg-[#111827] bg-white p-5">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl dark:bg-violet-500/15 bg-violet-100 flex items-center justify-center flex-shrink-0">
              <Settings2 className="w-5 h-5 text-violet-400" />
            </div>
            <div>
              <p className="font-semibold dark:text-white text-slate-900">مدة الحظر التلقائي</p>
              <p className="text-xs dark:text-slate-500 text-slate-400 mt-0.5">
                حرج: <span className="text-violet-400 font-mono">{banSettings.perSeverity.critical >= 1440 ? `${Math.round(banSettings.perSeverity.critical/1440)} يوم` : `${banSettings.perSeverity.critical} دقيقة`}</span>
                {" · "}عالي: <span className="text-orange-400 font-mono">{banSettings.perSeverity.high >= 60 ? `${Math.round(banSettings.perSeverity.high/60)} ساعة` : `${banSettings.perSeverity.high} دقيقة`}</span>
                {" · "}متوسط: <span className="text-yellow-400 font-mono">{banSettings.perSeverity.medium >= 60 ? `${Math.round(banSettings.perSeverity.medium/60)} ساعة` : `${banSettings.perSeverity.medium} دقيقة`}</span>
                {" · "}منخفض: <span className="text-blue-400 font-mono">{banSettings.perSeverity.low} دقيقة</span>
              </p>
            </div>
          </div>
          <button onClick={() => { setBanSettingsDraft({ ...banSettings, perSeverity: { ...banSettings.perSeverity } }); setBanSettingsOpen(s => !s); }}
            className="flex items-center gap-2 px-4 py-2 rounded-xl dark:bg-white/5 bg-slate-100 text-sm dark:text-slate-300 text-slate-600 hover:text-violet-400 border border-transparent hover:border-violet-500/30 transition-all">
            <Settings2 className="w-3.5 h-3.5" /> تعديل
          </button>
        </div>

        {banSettingsOpen && banSettingsDraft && (
          <div className="mt-5 pt-5 border-t dark:border-white/8 border-slate-100 space-y-4">
            <p className="text-xs dark:text-slate-400 text-slate-500">الحظر التلقائي ينتهي تلقائياً بعد المدة المحددة — المستخدمون الشرعيون يُفكّ حظرهم بدون تدخل يدوي.</p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {(["critical", "high", "medium", "low"] as const).map(sev => {
                const labels: Record<string, string> = { critical: "🔴 حرج جداً", high: "🟠 عالي", medium: "🟡 متوسط", low: "🟢 منخفض" };
                const colors: Record<string, string> = { critical: "focus:ring-red-500/50", high: "focus:ring-orange-500/50", medium: "focus:ring-yellow-500/50", low: "focus:ring-blue-500/50" };
                return (
                  <div key={sev}>
                    <label className="text-xs dark:text-slate-400 text-slate-500 mb-1.5 block">{labels[sev]}</label>
                    <div className="relative">
                      <input
                        type="number" min={1} max={10080}
                        value={banSettingsDraft.perSeverity[sev]}
                        onChange={e => setBanSettingsDraft(d => d ? { ...d, perSeverity: { ...d.perSeverity, [sev]: Math.max(1, parseInt(e.target.value) || 1) } } : d)}
                        className={cn("w-full rounded-xl border dark:border-white/10 border-slate-200 dark:bg-white/5 bg-slate-50 px-3 py-2 text-sm dark:text-slate-200 text-slate-700 focus:outline-none focus:ring-2 pr-12", colors[sev])}
                        dir="ltr"
                      />
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[10px] dark:text-slate-500 text-slate-400">دقيقة</span>
                    </div>
                    <p className="text-[10px] dark:text-slate-600 text-slate-400 mt-1">
                      {banSettingsDraft.perSeverity[sev] >= 1440
                        ? `≈ ${(banSettingsDraft.perSeverity[sev] / 1440).toFixed(1)} يوم`
                        : banSettingsDraft.perSeverity[sev] >= 60
                        ? `≈ ${(banSettingsDraft.perSeverity[sev] / 60).toFixed(1)} ساعة`
                        : `${banSettingsDraft.perSeverity[sev]} دقيقة`}
                    </p>
                  </div>
                );
              })}
            </div>
            <div className="flex gap-3 pt-1">
              <button onClick={saveBanSettings} disabled={banSettingsSaving}
                className="flex items-center gap-2 px-5 py-2 rounded-xl gradient-bg text-white text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50">
                <Save className="w-4 h-4" /> {banSettingsSaving ? "جاري الحفظ..." : "حفظ الإعدادات"}
              </button>
              <button onClick={() => { setBanSettingsOpen(false); setBanSettingsDraft(null); }}
                className="px-4 py-2 rounded-xl dark:bg-white/5 bg-slate-100 text-sm dark:text-slate-300 text-slate-600">إلغاء</button>
            </div>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 rounded-xl dark:bg-white/5 bg-slate-100 w-fit">
        <button onClick={() => setTab("events")}
          className={cn("px-4 py-2 rounded-lg text-sm font-medium transition-all", tab === "events" ? "gradient-bg text-white shadow" : "dark:text-slate-400 text-slate-600 hover:text-cyan-400")}>
          الأحداث {total > 0 ? `(${total})` : ""}
        </button>
        <button onClick={() => setTab("bans")}
          className={cn("px-4 py-2 rounded-lg text-sm font-medium transition-all", tab === "bans" ? "gradient-bg text-white shadow" : "dark:text-slate-400 text-slate-600 hover:text-cyan-400")}>
          الحظر {bans.length > 0 ? `(${bans.length})` : ""}
        </button>
        <button onClick={() => setTab("whitelist")}
          className={cn("flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all", tab === "whitelist" ? "gradient-bg text-white shadow" : "dark:text-slate-400 text-slate-600 hover:text-cyan-400")}>
          <ListChecks className="w-3.5 h-3.5" />
          القائمة البيضاء {whitelist.length > 0 ? `(${whitelist.length})` : ""}
        </button>
      </div>

      {/* ── Events Tab ── */}
      {tab === "events" && (
        <div className="space-y-4">
          <div className="flex flex-wrap gap-3 items-center">
            <select value={filterSev} onChange={e => { setFilterSev(e.target.value); setPage(1); }}
              className="rounded-xl border dark:border-white/10 border-slate-200 dark:bg-white/5 bg-white px-3 py-2 text-sm dark:text-slate-200 text-slate-700 focus:outline-none focus:ring-2 focus:ring-violet-500/50">
              <option value="">كل مستويات الخطورة</option>
              <option value="critical">🔴 حرج جداً</option>
              <option value="high">🟠 عالي</option>
              <option value="medium">🟡 متوسط</option>
              <option value="low">🟢 منخفض</option>
            </select>
            <select value={filterResolved} onChange={e => { setFilterResolved(e.target.value); setPage(1); }}
              className="rounded-xl border dark:border-white/10 border-slate-200 dark:bg-white/5 bg-white px-3 py-2 text-sm dark:text-slate-200 text-slate-700 focus:outline-none focus:ring-2 focus:ring-violet-500/50">
              <option value="">الكل</option>
              <option value="false">⚠️ مفتوح</option>
              <option value="true">✅ محلول</option>
            </select>
            <span className="text-sm dark:text-slate-400 text-slate-500 mr-auto">{total} حدث</span>
          </div>

          {loading ? (
            <div className="text-center py-16 dark:text-slate-400 text-slate-500">جاري التحميل...</div>
          ) : events.length === 0 ? (
            <div className="text-center py-16">
              <Shield className="w-12 h-12 mx-auto mb-3 dark:text-slate-600 text-slate-300" />
              <p className="dark:text-slate-400 text-slate-500">لا توجد أحداث أمنية بهذه الفلاتر</p>
            </div>
          ) : (
            <div className="rounded-2xl border dark:border-white/10 border-slate-200 overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="dark:bg-white/3 bg-slate-50 border-b dark:border-white/5 border-slate-100">
                    <th className="text-right px-4 py-3 font-semibold dark:text-slate-300 text-slate-600">الخطورة</th>
                    <th className="text-right px-4 py-3 font-semibold dark:text-slate-300 text-slate-600">نوع الهجوم</th>
                    <th className="text-right px-4 py-3 font-semibold dark:text-slate-300 text-slate-600 hidden md:table-cell">المصدر</th>
                    <th className="text-right px-4 py-3 font-semibold dark:text-slate-300 text-slate-600 hidden lg:table-cell">التاريخ</th>
                    <th className="text-right px-4 py-3 font-semibold dark:text-slate-300 text-slate-600">الحالة</th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody>
                  {events.map((evt, i) => {
                    const info = getTypeInfo(evt.type);
                    return (
                      <tr key={evt.id} className={cn("border-b dark:border-white/5 border-slate-100 transition-colors hover:dark:bg-white/3 hover:bg-slate-50", i % 2 === 0 ? "" : "dark:bg-white/1")}>
                        <td className="px-4 py-3"><SeverityBadge severity={evt.severity} /></td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <span className="text-base">{info.icon}</span>
                            <div>
                              <p className="dark:text-slate-200 text-slate-800 font-medium text-xs">{info.label}</p>
                              <p className="dark:text-slate-500 text-slate-400 text-[10px] leading-tight max-w-40 truncate">{info.desc}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 hidden md:table-cell">
                          <div className="text-xs">
                            <p className="font-mono dark:text-slate-300 text-slate-600">{evt.ip}</p>
                            <p className="dark:text-slate-500 text-slate-400">{evt.userEmail ?? evt.email ?? evt.userName ?? "—"}</p>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-xs dark:text-slate-400 text-slate-500 hidden lg:table-cell">
                          {new Date(evt.createdAt).toLocaleString("ar-EG")}
                        </td>
                        <td className="px-4 py-3">
                          {evt.autoBanned && !evt.resolved && (
                            <span className="inline-flex items-center gap-1 text-[10px] text-red-400 bg-red-500/10 px-2 py-0.5 rounded-full border border-red-500/20">
                              <Ban className="w-2.5 h-2.5" /> حظر تلقائي
                            </span>
                          )}
                          {evt.resolved && (
                            <span className="inline-flex items-center gap-1 text-[10px] text-green-400 bg-green-500/10 px-2 py-0.5 rounded-full border border-green-500/20">
                              <CheckCircle className="w-2.5 h-2.5" /> محلول
                            </span>
                          )}
                          {!evt.autoBanned && !evt.resolved && (
                            <span className="text-[10px] dark:text-slate-500 text-slate-400">⚠️ مفتوح</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <button onClick={() => loadDetail(evt.id)}
                            className="p-1.5 rounded-lg dark:hover:bg-white/10 hover:bg-slate-100 dark:text-slate-400 text-slate-500 hover:text-cyan-400 transition-colors">
                            <Eye className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {pages > 1 && (
            <div className="flex items-center justify-center gap-3">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                className="p-2 rounded-lg dark:bg-white/5 bg-slate-100 disabled:opacity-40 dark:text-slate-300 text-slate-600 hover:text-cyan-400 transition-colors">
                <ChevronRight className="w-4 h-4" />
              </button>
              <span className="text-sm dark:text-slate-400 text-slate-500">{page} / {pages}</span>
              <button onClick={() => setPage(p => Math.min(pages, p + 1))} disabled={page === pages}
                className="p-2 rounded-lg dark:bg-white/5 bg-slate-100 disabled:opacity-40 dark:text-slate-300 text-slate-600 hover:text-cyan-400 transition-colors">
                <ChevronLeft className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── Bans Tab ── */}
      {tab === "bans" && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <span className="text-sm dark:text-slate-300 text-slate-700 font-medium">{bans.length} حظر نشط</span>
              <p className="text-xs dark:text-slate-500 text-slate-400 mt-0.5">الحظر التلقائي يتم مراجعته من هنا — يمكنك إلغاؤه في أي وقت</p>
            </div>
            <button onClick={() => setBanForm({ show: true, ip: "", email: "", reason: "", eventId: 0 })}
              className="flex items-center gap-2 px-4 py-2 rounded-xl gradient-bg text-white text-sm font-medium shadow hover:opacity-90 transition-opacity">
              <Ban className="w-4 h-4" /> حظر يدوي جديد
            </button>
          </div>

          {banForm.show && (
            <div className="rounded-2xl border dark:border-white/10 border-slate-200 dark:bg-[#0d1220] bg-white p-5 space-y-4">
              <h3 className="font-semibold dark:text-white text-slate-900">إضافة حظر يدوي</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs dark:text-slate-400 text-slate-500 mb-1 block">عنوان IP</label>
                  <input value={banForm.ip} onChange={e => setBanForm(b => ({ ...b, ip: e.target.value }))} placeholder="192.168.1.1"
                    className="w-full rounded-xl border dark:border-white/10 border-slate-200 dark:bg-white/5 bg-slate-50 px-3 py-2 text-sm dark:text-slate-200 text-slate-700 focus:outline-none focus:ring-2 focus:ring-violet-500/50" dir="ltr" />
                </div>
                <div>
                  <label className="text-xs dark:text-slate-400 text-slate-500 mb-1 block">البريد الإلكتروني</label>
                  <input value={banForm.email} onChange={e => setBanForm(b => ({ ...b, email: e.target.value }))} placeholder="user@example.com"
                    className="w-full rounded-xl border dark:border-white/10 border-slate-200 dark:bg-white/5 bg-slate-50 px-3 py-2 text-sm dark:text-slate-200 text-slate-700 focus:outline-none focus:ring-2 focus:ring-violet-500/50" dir="ltr" />
                </div>
              </div>
              <div>
                <label className="text-xs dark:text-slate-400 text-slate-500 mb-1 block">سبب الحظر *</label>
                <input value={banForm.reason} onChange={e => setBanForm(b => ({ ...b, reason: e.target.value }))} placeholder="سبب الحظر..."
                  className="w-full rounded-xl border dark:border-white/10 border-slate-200 dark:bg-white/5 bg-slate-50 px-3 py-2 text-sm dark:text-slate-200 text-slate-700 focus:outline-none focus:ring-2 focus:ring-violet-500/50" />
              </div>
              <div className="flex gap-3">
                <button onClick={submitBan} className="px-4 py-2 rounded-xl gradient-bg text-white text-sm font-medium">تأكيد الحظر</button>
                <button onClick={() => setBanForm({ show: false, ip: "", email: "", reason: "", eventId: 0 })}
                  className="px-4 py-2 rounded-xl dark:bg-white/5 bg-slate-100 text-sm dark:text-slate-300 text-slate-600">إلغاء</button>
              </div>
            </div>
          )}

          {/* Auto-ban info */}
          <div className="rounded-xl dark:bg-blue-500/5 bg-blue-50 border dark:border-blue-500/20 border-blue-200 p-3 flex items-start gap-2">
            <Info className="w-4 h-4 text-blue-400 flex-shrink-0 mt-0.5" />
            <p className="text-xs dark:text-blue-300 text-blue-700">
              الحظر التلقائي يتم فوراً عند اكتشاف هجوم. يمكنك رفع الحظر إذا تأكدت أن الشخص تم حظره بالخطأ. كل حظر مرتبط بحادثة أمنية يمكنك مراجعتها.
            </p>
          </div>

          {loading ? (
            <div className="text-center py-16 dark:text-slate-400 text-slate-500">جاري التحميل...</div>
          ) : bans.length === 0 ? (
            <div className="text-center py-16">
              <CheckCircle className="w-12 h-12 mx-auto mb-3 dark:text-slate-600 text-slate-300" />
              <p className="dark:text-slate-400 text-slate-500">لا يوجد حظر نشط حالياً</p>
            </div>
          ) : (
            <div className="space-y-3">
              {bans.map(ban => (
                <div key={ban.id} className="rounded-xl border dark:border-white/10 border-slate-200 dark:bg-white/2 bg-white p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 text-sm",
                        ban.reason.includes("تلقائي") ? "bg-red-500/15" : "bg-orange-500/15")}>
                        {ban.reason.includes("تلقائي") ? "🤖" : "🛡️"}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <span className={cn("text-[10px] px-2 py-0.5 rounded-full font-semibold",
                            ban.reason.includes("تلقائي")
                              ? "bg-red-500/15 text-red-400 border border-red-500/20"
                              : "bg-orange-500/15 text-orange-400 border border-orange-500/20")}>
                            {ban.reason.includes("تلقائي") ? "حظر تلقائي" : "حظر يدوي"}
                          </span>
                          {ban.eventId && (
                            <span className="text-[10px] dark:text-slate-500 text-slate-400">
                              حادثة #{ban.eventId}
                            </span>
                          )}
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mt-2">
                          {ban.ip && (
                            <div className="flex items-center gap-1.5 text-xs dark:text-slate-300 text-slate-700">
                              <Wifi className="w-3 h-3 dark:text-slate-500 text-slate-400 flex-shrink-0" />
                              <span dir="ltr" className="font-mono">{ban.ip}</span>
                            </div>
                          )}
                          {ban.email && (
                            <div className="flex items-center gap-1.5 text-xs dark:text-slate-400 text-slate-500">
                              <Mail className="w-3 h-3 flex-shrink-0" />
                              <span className="truncate">{ban.email}</span>
                            </div>
                          )}
                          {ban.userName && (
                            <div className="flex items-center gap-1.5 text-xs dark:text-slate-400 text-slate-500">
                              <UserX className="w-3 h-3 flex-shrink-0" />
                              <span>{ban.userName}</span>
                            </div>
                          )}
                        </div>
                        <p className="text-xs dark:text-slate-500 text-slate-400 mt-1.5 leading-relaxed">{ban.reason}</p>
                        <div className="flex items-center gap-3 mt-1 flex-wrap">
                          <span className="text-[10px] dark:text-slate-600 text-slate-400 flex items-center gap-1">
                            <Clock className="w-2.5 h-2.5" /> {new Date(ban.createdAt).toLocaleString("ar-EG")}
                          </span>
                          <BanCountdown expiresAt={ban.expiresAt} />
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-col gap-2 flex-shrink-0">
                      <button onClick={() => liftBan(ban.id)} disabled={liftingBan === ban.id}
                        className="flex items-center gap-1.5 text-xs text-green-400 hover:text-green-300 bg-green-500/10 hover:bg-green-500/20 px-3 py-1.5 rounded-lg transition-colors border border-green-500/20 disabled:opacity-50">
                        <Unlock className="w-3 h-3" />
                        {liftingBan === ban.id ? "جاري الرفع..." : "رفع الحظر"}
                      </button>
                      {ban.eventId && (
                        <button onClick={() => loadDetail(ban.eventId!)}
                          className="flex items-center gap-1.5 text-xs dark:text-slate-400 text-slate-500 hover:text-cyan-400 bg-transparent hover:dark:bg-white/5 hover:bg-slate-100 px-3 py-1.5 rounded-lg transition-colors">
                          <Eye className="w-3 h-3" /> عرض الحادثة
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Whitelist Tab ── */}
      {tab === "whitelist" && (
        <div className="space-y-4">
          <div className="flex justify-between items-start">
            <div>
              <span className="text-sm dark:text-slate-300 text-slate-700 font-medium">{whitelist.length} عنوان IP محمي</span>
              <p className="text-xs dark:text-slate-500 text-slate-400 mt-0.5">
                الـ IPs في هذه القائمة لن تُحظر تلقائياً أبداً — حتى لو أطلقت تنبيهات أمنية
              </p>
            </div>
            <button onClick={() => { setWlError(""); setWlForm({ show: true, ip: "", label: "" }); }}
              className="flex items-center gap-2 px-4 py-2 rounded-xl gradient-bg text-white text-sm font-medium shadow hover:opacity-90 transition-opacity">
              <Plus className="w-4 h-4" /> إضافة IP
            </button>
          </div>

          {/* Add form */}
          {wlForm.show && (
            <div className="rounded-2xl border dark:border-green-500/20 border-green-200 dark:bg-green-500/3 bg-green-50 p-5 space-y-4">
              <h3 className="font-semibold dark:text-white text-slate-900 flex items-center gap-2">
                <ListChecks className="w-4 h-4 text-green-400" /> إضافة إلى القائمة البيضاء
              </h3>
              {wlError && (
                <div className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-2">{wlError}</div>
              )}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs dark:text-slate-400 text-slate-500 mb-1 block">عنوان IP <span className="text-red-400">*</span></label>
                  <input value={wlForm.ip} onChange={e => setWlForm(f => ({ ...f, ip: e.target.value }))}
                    placeholder="مثال: 196.128.243.103"
                    dir="ltr"
                    className="w-full rounded-xl border dark:border-white/10 border-slate-200 dark:bg-white/5 bg-white px-3 py-2 text-sm dark:text-slate-200 text-slate-800 focus:outline-none focus:ring-2 focus:ring-green-500/50 font-mono" />
                </div>
                <div>
                  <label className="text-xs dark:text-slate-400 text-slate-500 mb-1 block">وصف (اختياري)</label>
                  <input value={wlForm.label} onChange={e => setWlForm(f => ({ ...f, label: e.target.value }))}
                    placeholder="مثال: IP مشرف الموقع للاختبار"
                    className="w-full rounded-xl border dark:border-white/10 border-slate-200 dark:bg-white/5 bg-white px-3 py-2 text-sm dark:text-slate-200 text-slate-800 focus:outline-none focus:ring-2 focus:ring-green-500/50" />
                </div>
              </div>
              <div className="flex gap-3">
                <button onClick={addToWhitelist} disabled={wlLoading || !wlForm.ip.trim()}
                  className="flex items-center gap-2 px-5 py-2 rounded-xl bg-green-500 text-white text-sm font-medium hover:bg-green-600 transition-colors disabled:opacity-50">
                  <CheckCircle className="w-4 h-4" />
                  {wlLoading ? "جاري الإضافة..." : "إضافة للقائمة"}
                </button>
                <button onClick={() => { setWlForm({ show: false, ip: "", label: "" }); setWlError(""); }}
                  className="px-4 py-2 rounded-xl dark:bg-white/5 bg-slate-100 text-sm dark:text-slate-300 text-slate-600">
                  إلغاء
                </button>
              </div>
            </div>
          )}

          {whitelist.length === 0 ? (
            <div className="text-center py-16 rounded-2xl border dark:border-white/8 border-slate-200">
              <ListChecks className="w-12 h-12 mx-auto mb-3 dark:text-slate-600 text-slate-300" />
              <p className="dark:text-slate-400 text-slate-500 font-medium mb-1">القائمة البيضاء فارغة</p>
              <p className="text-xs dark:text-slate-600 text-slate-400">أضف عناوين IP المعتمدة لتجنب حظرها تلقائياً</p>
            </div>
          ) : (
            <div className="rounded-2xl border dark:border-white/10 border-slate-200 overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="dark:bg-white/3 bg-slate-50 border-b dark:border-white/5 border-slate-100">
                    <th className="text-right px-4 py-3 font-semibold dark:text-slate-300 text-slate-600">عنوان IP</th>
                    <th className="text-right px-4 py-3 font-semibold dark:text-slate-300 text-slate-600 hidden md:table-cell">الوصف</th>
                    <th className="text-right px-4 py-3 font-semibold dark:text-slate-300 text-slate-600 hidden lg:table-cell">أضيف بواسطة</th>
                    <th className="text-right px-4 py-3 font-semibold dark:text-slate-300 text-slate-600 hidden lg:table-cell">التاريخ</th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody>
                  {whitelist.map((entry, i) => (
                    <tr key={entry.id} className={cn("border-b dark:border-white/5 border-slate-100 hover:dark:bg-white/3 hover:bg-slate-50 transition-colors", i % 2 === 0 ? "" : "dark:bg-white/1")}>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-green-400 flex-shrink-0" />
                          <span className="font-mono text-sm dark:text-green-300 text-green-700" dir="ltr">{entry.ip}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-xs dark:text-slate-400 text-slate-500 hidden md:table-cell">
                        {entry.label || <span className="dark:text-slate-600 text-slate-300">—</span>}
                      </td>
                      <td className="px-4 py-3 text-xs dark:text-slate-400 text-slate-500 hidden lg:table-cell">
                        {entry.addedByName ?? "النظام"}
                      </td>
                      <td className="px-4 py-3 text-xs dark:text-slate-500 text-slate-400 hidden lg:table-cell">
                        {new Date(entry.createdAt).toLocaleDateString("ar-EG")}
                      </td>
                      <td className="px-4 py-3">
                        <button onClick={() => removeFromWhitelist(entry.id)}
                          className="p-1.5 rounded-lg text-red-400 hover:bg-red-500/10 transition-colors" title="إزالة من القائمة البيضاء">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── Event Detail Modal ── */}
      {detail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => setDetail(null)}>
          <div className="w-full max-w-2xl rounded-2xl dark:bg-[#0d1220] bg-white border dark:border-white/10 border-slate-200 shadow-2xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            {/* Modal Header */}
            <div className="flex items-center justify-between p-5 border-b dark:border-white/10 border-slate-100">
              <div className="flex items-center gap-3">
                <span className="text-2xl">{getTypeInfo(detail.type).icon}</span>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="font-bold dark:text-white text-slate-900">حادثة #{detail.id}</h2>
                    <SeverityBadge severity={detail.severity} />
                  </div>
                  <p className="text-xs dark:text-slate-400 text-slate-500">{getTypeInfo(detail.type).label}</p>
                </div>
              </div>
              <button onClick={() => setDetail(null)} className="p-1.5 rounded-lg dark:hover:bg-white/10 hover:bg-slate-100 dark:text-slate-400 text-slate-500 transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-5">
              {/* Attack description */}
              <div className="rounded-xl border dark:border-orange-500/20 border-orange-200 dark:bg-orange-500/5 bg-orange-50 p-4">
                <p className="text-xs font-semibold text-orange-500 mb-1.5">⚠️ ما الذي حدث؟</p>
                <p className="text-sm dark:text-orange-200 text-orange-900 leading-relaxed">{getTypeInfo(detail.type).desc}</p>
              </div>

              {/* Advice */}
              <div className="rounded-xl border dark:border-blue-500/20 border-blue-200 dark:bg-blue-500/5 bg-blue-50 p-4">
                <p className="text-xs font-semibold dark:text-blue-400 text-blue-600 mb-1.5">💡 ماذا تفعل؟</p>
                <p className="text-sm dark:text-blue-200 text-blue-900 leading-relaxed">{getTypeInfo(detail.type).advice}</p>
              </div>

              {/* Meta Grid */}
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: "عنوان IP المهاجم",  value: detail.ip,                                           mono: true },
                  { label: "المستخدم",           value: detail.userName ?? "غير مسجّل",                    mono: false },
                  { label: "البريد الإلكتروني",  value: detail.userEmail ?? detail.email ?? "—",            mono: false },
                  { label: "وقت الهجوم",         value: new Date(detail.createdAt).toLocaleString("ar-EG"), mono: false },
                  { label: "حظر تلقائي",         value: detail.autoBanned ? "✅ نعم — الـ IP محظور" : "❌ لا", mono: false },
                  { label: "الحالة",             value: detail.resolved ? "✅ محلول" : "⚠️ مفتوح",         mono: false },
                ].map(({ label, value, mono }) => (
                  <div key={label} className="rounded-xl dark:bg-white/5 bg-slate-50 p-3">
                    <p className="text-xs dark:text-slate-500 text-slate-400 mb-1">{label}</p>
                    <p className={cn("text-sm dark:text-slate-200 text-slate-800 font-medium break-all", mono && "font-mono dir-ltr text-left")} dir={mono ? "ltr" : undefined}>{value}</p>
                  </div>
                ))}
              </div>

              {/* Technical Details */}
              {detail.details && Object.keys(detail.details).length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold dark:text-slate-300 text-slate-600 mb-2 flex items-center gap-2">
                    <Globe className="w-4 h-4" /> التفاصيل التقنية
                  </h3>
                  <div className="rounded-xl dark:bg-black/30 bg-slate-100 p-4 space-y-2">
                    {Object.entries(detail.details).map(([key, val]) => {
                      const labelsAr: Record<string, string> = {
                        path: "المسار المطلوب", query: "معاملات الـ URL", url: "الرابط الكامل",
                        userAgent: "المتصفح / الأداة", method: "نوع الطلب", source: "مصدر الكشف",
                        summary: "ملخص الفحص", score: "درجة الخطر",
                      };
                      if (key === "threats") return null;
                      return (
                        <div key={key} className="flex gap-3 text-xs">
                          <span className="dark:text-slate-500 text-slate-400 flex-shrink-0 w-28">{labelsAr[key] ?? key}</span>
                          <span className="dark:text-slate-200 text-slate-800 font-mono break-all" dir="ltr">{String(val ?? "—").slice(0, 200)}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Threats list (from IDE scanner) */}
              {Array.isArray((detail.details as Record<string, unknown>)["threats"]) && ((detail.details as Record<string, unknown>)["threats"] as unknown[]).length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold dark:text-slate-300 text-slate-600 mb-2">التهديدات المكتشفة تفصيلياً</h3>
                  <div className="space-y-2">
                    {((detail.details as Record<string, unknown>)["threats"] as Array<Record<string, unknown>>).map((t, i) => (
                      <div key={i} className="rounded-xl dark:bg-white/3 bg-slate-50 border dark:border-white/5 border-slate-200 p-3">
                        <div className="flex items-center gap-2 mb-1">
                          <SeverityBadge severity={String(t["severity"] ?? "medium")} />
                          <span className="text-sm font-medium dark:text-slate-200 text-slate-800">{String(t["name"] ?? "")}</span>
                        </div>
                        <p className="text-xs dark:text-slate-400 text-slate-500 mb-2">{String(t["description"] ?? "")}</p>
                        {(t["evidence"] as string | undefined) && (
                          <pre className="text-xs dark:bg-black/40 bg-slate-100 rounded-lg p-2 overflow-x-auto dark:text-red-300 text-red-700 whitespace-pre-wrap break-all">
                            {String(t["evidence"]).slice(0, 300)}
                          </pre>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex flex-wrap gap-3 pt-2 border-t dark:border-white/10 border-slate-100">
                {!detail.resolved && (
                  <button onClick={() => resolve(detail.id)}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-green-500/15 text-green-400 border border-green-500/30 hover:bg-green-500/25 text-sm font-medium transition-colors">
                    <CheckCircle className="w-4 h-4" /> تحديد كـ محلول
                  </button>
                )}
                {!detail.autoBanned && !detail.resolved && (
                  <button onClick={() => quickBan(detail.id)}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-red-500/15 text-red-400 border border-red-500/30 hover:bg-red-500/25 text-sm font-medium transition-colors">
                    <Ban className="w-4 h-4" /> حظر فوري
                  </button>
                )}
                {detail.autoBanned && (
                  <button onClick={() => liftBanByEvent(detail.id)}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/25 text-sm font-medium transition-colors">
                    <Unlock className="w-4 h-4" /> رفع الحظر التلقائي
                  </button>
                )}
                <button onClick={() => setDetail(null)}
                  className="px-4 py-2 rounded-xl dark:bg-white/5 bg-slate-100 text-sm dark:text-slate-300 text-slate-600">
                  إغلاق
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
