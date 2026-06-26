"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import {
  Bell, Megaphone, Send, Users, User, Loader2,
  CheckCircle, Link2, ChevronRight,
} from "lucide-react";
import Link from "next/link";

type AdminNotif = {
  id: number; userId: number; type: string;
  title: string; body: string; link: string | null;
  isRead: boolean; createdAt: string;
};

type AdminUser = { id: number; name: string; email: string; username: string | null };

export default function AdminNotificationsPage() {
  const [title, setTitle]     = useState("");
  const [body, setBody]       = useState("");
  const [link, setLink]       = useState("");
  const [target, setTarget]   = useState<"all" | "select">("all");
  const [users, setUsers]     = useState<AdminUser[]>([]);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [sending, setSending] = useState(false);
  const [recentNotifs, setRecentNotifs] = useState<AdminNotif[]>([]);
  const [loadingRecent, setLoadingRecent] = useState(true);
  const [search, setSearch]   = useState("");

  const token = typeof window !== "undefined" ? localStorage.getItem("nouvil_token") : null;
  const headers = { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) };

  useEffect(() => {
    fetch("/api/admin/users?limit=100", { credentials: "include", headers })
      .then(r => r.json())
      .then((d: { users: AdminUser[] }) => setUsers(d.users ?? []))
      .catch(() => {});

    fetch("/api/admin/notifications", { credentials: "include", headers })
      .then(r => r.json())
      .then((d: AdminNotif[]) => { setRecentNotifs(d); setLoadingRecent(false); })
      .catch(() => setLoadingRecent(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toggleUser = (id: number) => {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const send = async () => {
    if (!title.trim() || !body.trim()) { toast.error("العنوان والنص مطلوبان"); return; }
    if (target === "select" && selected.size === 0) { toast.error("اختر مستخدماً واحداً على الأقل"); return; }
    setSending(true);
    try {
      const payload = {
        title: title.trim(),
        body: body.trim(),
        link: link.trim() || null,
        userIds: target === "select" ? Array.from(selected) : [],
      };
      const res = await fetch("/api/admin/notifications/broadcast", {
        method: "POST", credentials: "include",
        headers,
        body: JSON.stringify(payload),
      });
      const json = await res.json() as { sent?: number; error?: string };
      if (!res.ok) throw new Error(json.error ?? "حدث خطأ");
      toast.success(`تم إرسال الإشعار لـ ${json.sent} مستخدم`);
      setTitle(""); setBody(""); setLink(""); setSelected(new Set()); setTarget("all");
      // Refresh recent
      fetch("/api/admin/notifications", { credentials: "include", headers })
        .then(r => r.json()).then((d: AdminNotif[]) => setRecentNotifs(d)).catch(() => {});
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "فشل الإرسال");
    } finally {
      setSending(false);
    }
  };

  const filteredUsers = users.filter(u =>
    u.name.toLowerCase().includes(search.toLowerCase()) ||
    u.email.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 text-sm dark:text-slate-400 text-slate-500">
          <Link href="/admin" className="hover:text-cyan-500 transition-colors">الإدارة</Link>
          <ChevronRight className="w-3.5 h-3.5" />
          <span>الإشعارات</span>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-2xl gradient-bg flex items-center justify-center shadow-lg shadow-cyan-500/20">
          <Bell className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="text-xl font-black dark:text-white text-slate-900">إدارة الإشعارات</h1>
          <p className="text-xs dark:text-slate-400 text-slate-500">أرسل إشعارات فورية للمستخدمين</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Compose */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="dark:bg-[#111827] bg-white rounded-2xl border dark:border-white/10 border-slate-200 p-5 space-y-4"
        >
          <div className="flex items-center gap-2 mb-2">
            <Megaphone className="w-4 h-4 text-pink-400" />
            <h2 className="font-bold dark:text-white text-slate-900 text-sm">إنشاء إشعار</h2>
          </div>

          {/* Title */}
          <div>
            <label className="block text-xs font-medium dark:text-slate-400 text-slate-600 mb-1.5">العنوان *</label>
            <input
              value={title}
              onChange={e => setTitle(e.target.value)}
              maxLength={100}
              placeholder="مثال: 🎉 كورس جديد متاح!"
              className="w-full px-3 py-2.5 rounded-xl dark:bg-white/5 bg-slate-50 border dark:border-white/10 border-slate-200 dark:text-white text-slate-900 text-sm focus:outline-none focus:border-cyan-500/50 transition-colors placeholder:dark:text-slate-600 placeholder:text-slate-400"
            />
            <p className="text-[10px] dark:text-slate-600 text-slate-400 mt-1 text-left">{title.length}/100</p>
          </div>

          {/* Body */}
          <div>
            <label className="block text-xs font-medium dark:text-slate-400 text-slate-600 mb-1.5">النص *</label>
            <textarea
              value={body}
              onChange={e => setBody(e.target.value)}
              maxLength={500}
              rows={3}
              placeholder="اكتب نص الإشعار هنا..."
              className="w-full px-3 py-2.5 rounded-xl dark:bg-white/5 bg-slate-50 border dark:border-white/10 border-slate-200 dark:text-white text-slate-900 text-sm focus:outline-none focus:border-cyan-500/50 transition-colors resize-none placeholder:dark:text-slate-600 placeholder:text-slate-400"
            />
            <p className="text-[10px] dark:text-slate-600 text-slate-400 mt-1 text-left">{body.length}/500</p>
          </div>

          {/* Link */}
          <div>
            <label className="block text-xs font-medium dark:text-slate-400 text-slate-600 mb-1.5">
              <Link2 className="w-3 h-3 inline ml-1" />
              رابط اختياري
            </label>
            <input
              value={link}
              onChange={e => setLink(e.target.value)}
              placeholder="/leaderboard أو /courses/18"
              className="w-full px-3 py-2.5 rounded-xl dark:bg-white/5 bg-slate-50 border dark:border-white/10 border-slate-200 dark:text-white text-slate-900 text-sm focus:outline-none focus:border-cyan-500/50 transition-colors placeholder:dark:text-slate-600 placeholder:text-slate-400"
              dir="ltr"
            />
          </div>

          {/* Target */}
          <div>
            <label className="block text-xs font-medium dark:text-slate-400 text-slate-600 mb-2">الجمهور المستهدف</label>
            <div className="flex gap-2">
              {[
                { id: "all",    icon: <Users className="w-3.5 h-3.5" />, label: "جميع المستخدمين" },
                { id: "select", icon: <User  className="w-3.5 h-3.5" />, label: "مستخدمون محددون" },
              ].map(t => (
                <button
                  key={t.id}
                  onClick={() => setTarget(t.id as "all" | "select")}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-medium transition-all border ${
                    target === t.id
                      ? "gradient-bg text-white border-transparent shadow-md"
                      : "dark:bg-white/5 bg-slate-50 dark:border-white/10 border-slate-200 dark:text-slate-400 text-slate-600 hover:border-cyan-500/30"
                  }`}
                >
                  {t.icon}{t.label}
                </button>
              ))}
            </div>
          </div>

          {/* User selector */}
          {target === "select" && (
            <div className="space-y-2">
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="ابحث عن مستخدم..."
                className="w-full px-3 py-2 rounded-xl dark:bg-white/5 bg-slate-50 border dark:border-white/10 border-slate-200 dark:text-white text-slate-900 text-sm focus:outline-none focus:border-cyan-500/50 transition-colors"
              />
              <div className="max-h-44 overflow-y-auto space-y-1 rounded-xl border dark:border-white/8 border-slate-200 p-1">
                {filteredUsers.map(u => (
                  <label key={u.id} className="flex items-center gap-2.5 p-2 rounded-lg hover:dark:bg-white/5 hover:bg-slate-50 cursor-pointer transition-colors">
                    <input
                      type="checkbox"
                      checked={selected.has(u.id)}
                      onChange={() => toggleUser(u.id)}
                      className="accent-cyan-500 w-3.5 h-3.5"
                    />
                    <div className="w-6 h-6 rounded-full gradient-bg flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0">
                      {u.name.charAt(0)}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-medium dark:text-white text-slate-900 truncate">{u.name}</p>
                      <p className="text-[10px] dark:text-slate-500 text-slate-400 truncate">{u.email}</p>
                    </div>
                  </label>
                ))}
                {filteredUsers.length === 0 && (
                  <p className="text-center py-4 text-xs dark:text-slate-500 text-slate-400">لا نتائج</p>
                )}
              </div>
              {selected.size > 0 && (
                <p className="text-xs text-cyan-500 font-medium">تم تحديد {selected.size} مستخدم</p>
              )}
            </div>
          )}

          {/* Send button */}
          <button
            onClick={send}
            disabled={sending || !title.trim() || !body.trim()}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl gradient-bg text-white text-sm font-bold disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-90 transition-all shadow-md shadow-cyan-500/20"
          >
            {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            {sending ? "جاري الإرسال..." : target === "all" ? "إرسال للجميع" : `إرسال لـ ${selected.size} مستخدم`}
          </button>
        </motion.div>

        {/* Recent */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.08 }}
          className="dark:bg-[#111827] bg-white rounded-2xl border dark:border-white/10 border-slate-200 p-5"
        >
          <div className="flex items-center gap-2 mb-4">
            <CheckCircle className="w-4 h-4 text-emerald-400" />
            <h2 className="font-bold dark:text-white text-slate-900 text-sm">آخر الإشعارات المُرسلة</h2>
          </div>

          {loadingRecent ? (
            <div className="space-y-2">
              {[1,2,3].map(i => (
                <div key={i} className="h-14 rounded-xl dark:bg-white/5 bg-slate-100 animate-pulse" />
              ))}
            </div>
          ) : recentNotifs.length === 0 ? (
            <div className="flex flex-col items-center py-10 gap-2 dark:text-slate-500 text-slate-400">
              <Bell className="w-8 h-8 opacity-30" />
              <p className="text-sm">لم يُرسل أي إشعار بعد</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-[500px] overflow-y-auto">
              {recentNotifs.slice(0, 50).map(n => (
                <div key={n.id} className="flex gap-3 p-3 rounded-xl dark:bg-white/5 bg-slate-50 border dark:border-white/8 border-slate-100">
                  <div className="w-8 h-8 rounded-xl dark:bg-pink-500/10 bg-pink-50 flex items-center justify-center flex-shrink-0">
                    <Megaphone className="w-4 h-4 text-pink-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold dark:text-white text-slate-900 truncate">{n.title}</p>
                    <p className="text-[11px] dark:text-slate-400 text-slate-500 truncate mt-0.5">{n.body}</p>
                    <p className="text-[10px] dark:text-slate-600 text-slate-400 mt-1">
                      {new Date(n.createdAt).toLocaleDateString("ar-EG", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                    </p>
                  </div>
                  {n.isRead
                    ? <CheckCircle className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0 mt-0.5" />
                    : <div className="w-2 h-2 rounded-full bg-cyan-400 flex-shrink-0 mt-1.5" />
                  }
                </div>
              ))}
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}
