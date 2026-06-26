"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { io, type Socket } from "socket.io-client";
import { toast } from "sonner";
import { ShieldAlert, ShieldX, Ban, CheckCircle, ExternalLink, ShieldCheck, ShieldOff, Eye } from "lucide-react";

interface SecurityAlert {
  id: number;
  type: string;
  severity: "critical" | "high";
  ip: string;
  email: string | null;
  userId: number | null;
  autoBanned: boolean;
  banId: number | null;
  details: { projectName?: string; summary?: string; threats?: { name: string }[]; requestsPerMinute?: number; url?: string };
  createdAt: string;
}

const SEVERITY_COLOR = {
  critical: { bg: "bg-red-500/20", icon: "text-red-400", label: "text-red-400", border: "border-red-500/30", shadow: "shadow-red-900/40" },
  high:     { bg: "bg-orange-500/20", icon: "text-orange-400", label: "text-orange-400", border: "border-orange-500/30", shadow: "shadow-orange-900/30" },
};

const TYPE_LABELS: Record<string, string> = {
  malicious_code:  "كود خبيث",
  rate_abuse:      "إفراط في الطلبات",
  code_injection:  "حقن كود",
};

// ── Toast for MANUAL threat (not auto-banned) ─────────────────────────────────
function ThreatToast({ alert, toastId, token, onNavigate }: {
  alert: SecurityAlert; toastId: string | number; token: string; onNavigate: () => void;
}) {
  const [banning, setBanning] = useState(false);
  const [banned,  setBanned]  = useState(false);
  const c = SEVERITY_COLOR[alert.severity] ?? SEVERITY_COLOR.high;

  const quickBan = useCallback(async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (banned || banning) return;
    setBanning(true);
    try {
      const r = await fetch(`/api/admin/security/events/${alert.id}/quick-ban`, {
        method: "POST", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      });
      if (r.ok) setBanned(true);
    } finally { setBanning(false); }
  }, [alert.id, banned, banning, token]);

  const name  = alert.details?.projectName ?? TYPE_LABELS[alert.type] ?? alert.type;
  const desc  = alert.details?.summary
    || (alert.details?.threats?.[0]?.name ? `تم اكتشاف: ${alert.details.threats[0].name}` : "")
    || (alert.details?.requestsPerMinute ? `${alert.details.requestsPerMinute} طلب/دقيقة` : "");

  return (
    <div className={`w-80 rounded-2xl border ${c.border} bg-[#1a0a0a] shadow-2xl ${c.shadow} overflow-hidden`}>
      <div onClick={() => { toast.dismiss(toastId); onNavigate(); }}
        className="cursor-pointer p-4 flex items-start gap-3 select-none hover:bg-white/3 transition-colors">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${c.bg}`}>
          {alert.severity === "critical"
            ? <ShieldX className={`w-5 h-5 ${c.icon}`} />
            : <ShieldAlert className={`w-5 h-5 ${c.icon}`} />}
        </div>
        <div className="flex-1 min-w-0">
          <p className={`text-xs font-bold mb-0.5 ${c.label}`}>
            {alert.severity === "critical" ? "🔴 تهديد حرج" : "🟠 تهديد عالي"}
          </p>
          <p className="text-xs text-white/80 font-medium truncate">{name}</p>
          {desc && <p className="text-xs text-white/50 mt-0.5 line-clamp-2">{desc}</p>}
          <p className="text-[10px] text-white/30 mt-1 font-mono">{alert.ip}{alert.email ? ` · ${alert.email}` : ""}</p>
        </div>
      </div>
      <div className="flex border-t border-white/5">
        <button onClick={quickBan} disabled={banned || banning}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-semibold transition-colors ${
            banned ? "text-green-400 bg-green-500/10 cursor-default"
            : banning ? "text-white/30 cursor-wait"
            : `text-red-400 hover:bg-red-500/15 cursor-pointer`}`}>
          {banned ? <><CheckCircle className="w-3.5 h-3.5" /> تم الحظر</>
            : banning ? "جاري الحظر..."
            : <><Ban className="w-3.5 h-3.5" /> حظر فوري</>}
        </button>
        <div className="w-px bg-white/5" />
        <button onClick={() => { toast.dismiss(toastId); onNavigate(); }}
          className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs text-white/40 hover:text-white/70 transition-colors">
          <ExternalLink className="w-3.5 h-3.5" /> عرض التقرير
        </button>
      </div>
    </div>
  );
}

// ── Toast for AUTO-BAN — requires admin review ────────────────────────────────
function AutoBanReviewToast({ alert, toastId, token, onNavigate }: {
  alert: SecurityAlert; toastId: string | number; token: string; onNavigate: () => void;
}) {
  const [decision, setDecision] = useState<"kept" | "lifted" | null>(null);
  const [loading,  setLoading]  = useState(false);

  const keepBan = useCallback(async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (decision || loading) return;
    setLoading(true);
    // Just resolve the event (mark as reviewed), keep the ban active
    await fetch(`/api/admin/security/events/${alert.id}/resolve`, {
      method: "POST", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    }).catch(() => {});
    setDecision("kept");
    setLoading(false);
    setTimeout(() => toast.dismiss(toastId), 1500);
  }, [alert.id, decision, loading, toastId, token]);

  const liftBan = useCallback(async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (decision || loading) return;
    setLoading(true);
    await fetch(`/api/admin/security/events/${alert.id}/lift-ban`, {
      method: "POST", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    }).catch(() => {});
    setDecision("lifted");
    setLoading(false);
    setTimeout(() => toast.dismiss(toastId), 1500);
  }, [alert.id, decision, loading, toastId, token]);

  const name  = alert.details?.projectName ?? TYPE_LABELS[alert.type] ?? alert.type;
  const threats = alert.details?.threats?.map(t => t.name).join("، ") ?? "";
  const desc  = alert.details?.summary ?? (threats ? `المشكلات: ${threats}` : "");

  return (
    <div className="w-80 rounded-2xl border border-yellow-500/40 bg-[#151200] shadow-2xl shadow-yellow-900/30 overflow-hidden">
      {/* Header */}
      <div className="px-4 pt-4 pb-3 border-b border-white/5">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-yellow-500/15 flex items-center justify-center flex-shrink-0">
            <ShieldOff className="w-5 h-5 text-yellow-400" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold text-yellow-400 mb-0.5">⚠️ حظر تلقائي — يحتاج مراجعة</p>
            <p className="text-xs text-white/80 font-semibold truncate">{name}</p>
            {desc && <p className="text-xs text-white/50 mt-0.5 line-clamp-2">{desc}</p>}
          </div>
        </div>

        {/* Details grid */}
        <div className="mt-3 rounded-xl bg-white/3 border border-white/5 divide-y divide-white/5 text-[11px]">
          {alert.email && (
            <div className="flex items-center gap-2 px-3 py-2">
              <span className="text-white/30 w-14 flex-shrink-0">البريد</span>
              <span className="text-white/70 font-mono truncate">{alert.email}</span>
            </div>
          )}
          <div className="flex items-center gap-2 px-3 py-2">
            <span className="text-white/30 w-14 flex-shrink-0">IP</span>
            <span className="text-white/70 font-mono">{alert.ip}</span>
          </div>
          <div className="flex items-center gap-2 px-3 py-2">
            <span className="text-white/30 w-14 flex-shrink-0">النوع</span>
            <span className={`font-medium ${alert.severity === "critical" ? "text-red-400" : "text-orange-400"}`}>
              {alert.severity === "critical" ? "حرج" : "عالي"}
            </span>
          </div>
        </div>
      </div>

      {/* Decision area */}
      {decision ? (
        <div className={`px-4 py-3 flex items-center justify-center gap-2 text-sm font-semibold ${
          decision === "kept" ? "text-green-400" : "text-blue-400"}`}>
          <CheckCircle className="w-4 h-4" />
          {decision === "kept" ? "تم إبقاء الحظر ✓" : "تم فك الحظر ✓"}
        </div>
      ) : (
        <div>
          <p className="text-[10px] text-white/30 text-center pt-3 px-4">اتخذ قرارك — هل الحظر صحيح؟</p>
          <div className="flex p-3 gap-2">
            <button onClick={keepBan} disabled={loading}
              className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-semibold bg-green-500/15 text-green-400 hover:bg-green-500/25 transition-colors disabled:opacity-40 cursor-pointer">
              <ShieldCheck className="w-3.5 h-3.5" />
              إبقاء الحظر
            </button>
            <button onClick={liftBan} disabled={loading}
              className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-semibold bg-blue-500/15 text-blue-400 hover:bg-blue-500/25 transition-colors disabled:opacity-40 cursor-pointer">
              <ShieldOff className="w-3.5 h-3.5" />
              فك الحظر
            </button>
          </div>
          <button onClick={() => { onNavigate(); }}
            className="w-full flex items-center justify-center gap-1.5 pb-3 text-[11px] text-white/25 hover:text-white/50 transition-colors">
            <Eye className="w-3 h-3" /> عرض التفاصيل الكاملة
          </button>
        </div>
      )}
    </div>
  );
}

// ── Main listener component ───────────────────────────────────────────────────
export default function SecurityAlertListener() {
  const socketRef = useRef<Socket | null>(null);
  const router    = useRouter();

  useEffect(() => {
    const token = localStorage.getItem("nouvil_token");
    if (!token) return;

    const socket = io(window.location.origin, {
      path:       "/api/socket.io",
      auth:       { token: `Bearer ${token}` },
      transports: ["polling", "websocket"],
    });
    socketRef.current = socket;

    socket.on("security_alert", (alert: SecurityAlert) => {
      const toastId = `sec-${alert.id}`;

      if (alert.autoBanned) {
        // Auto-ban → review toast (duration infinite until admin decides)
        toast.custom(
          (t) => (
            <AutoBanReviewToast
              alert={alert}
              toastId={t}
              token={token}
              onNavigate={() => router.push("/admin/security")}
            />
          ),
          { id: toastId, duration: Infinity, position: "top-left" },
        );
      } else {
        // Manual threat (not yet banned) → action toast
        toast.custom(
          (t) => (
            <ThreatToast
              alert={alert}
              toastId={t}
              token={token}
              onNavigate={() => router.push("/admin/security")}
            />
          ),
          {
            id:       toastId,
            duration: alert.severity === "critical" ? Infinity : 15000,
            position: "top-left",
          },
        );
      }
    });

    // Force logout if this admin's own account is banned somehow
    socket.on("force_logout", ({ reason }: { reason: string }) => {
      localStorage.removeItem("nouvil_token");
      localStorage.removeItem("nouvil_user");
      toast.error(reason ?? "تم تسجيل خروجك من النظام", { duration: Infinity });
      setTimeout(() => router.replace("/auth/login"), 1500);
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [router]);

  return null;
}
