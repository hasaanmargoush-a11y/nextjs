"use client";

import {
  useState, useEffect, useCallback, useRef, useMemo,
} from "react";
import { createPortal as reactDomPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { toast } from "sonner";
import { io, Socket } from "socket.io-client";
import {
  X, Send, Smile, Reply, Paperclip, Mic, Download,
  Play, Pause, FileText, Pin, PinOff,
  Trash2, MessageCircle, Loader2, StopCircle, ChevronDown,
  MoreVertical, VolumeX, UserX, Ban, Shield, AtSign,
  Users, ImageIcon, Film, Volume2,
} from "lucide-react";

// ── Types ─────────────────────────────────────────────────────────────────────
interface ChatUser { id: number; name: string; username?: string | null; avatar?: string | null; role: string; }
interface ReactionGroup { emoji: string; count: number; users: number[]; userNames?: string[]; }
export interface ChatMessage {
  id: number; courseId: number; userId: number; content: string;
  type: "text" | "image" | "video" | "file" | "audio";
  fileUrl?: string | null; fileName?: string | null; fileSize?: number | null;
  replyToId?: number | null; isPinned: boolean; isDeleted: boolean; deletedForEveryone: boolean;
  createdAt: string; user: ChatUser; reactions: ReactionGroup[];
  replyTo?: (ChatMessage & { user: { name: string } }) | null;
}
interface CourseMember { id: number; name: string; username?: string | null; avatar?: string | null; role: string; }

const EMOJIS = ["👍", "❤️", "😂", "😮", "😢", "🔥", "👏", "🎉", "😍", "💯"];
const ADMIN_ROLES = ["admin", "super_admin", "content_admin", "users_admin", "articles_admin"];
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

function resolveUrl(url: string | null | undefined): string {
  if (!url) return "";
  if (url.startsWith("http") || url.startsWith("//") || url.startsWith("/api/")) return url;
  const p = url.startsWith("/") ? url : `/${url}`;
  return `/api/storage${p}`;
}

async function uploadChatFile(file: File): Promise<string> {
  const token = typeof window !== "undefined" ? localStorage.getItem("nouvil_token") : null;
  const formData = new FormData();
  formData.append("file", file);
  const res = await fetch("/api/chat/upload", {
    method: "POST",
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    credentials: "include",
    body: formData,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "فشل رفع الملف" }));
    throw new Error(err.error || "فشل رفع الملف");
  }
  const { fileUrl } = await res.json();
  return fileUrl as string;
}
function fmtTime(dateStr: string) {
  return new Date(dateStr).toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit" });
}
function fmtDate(dateStr: string) {
  const d = new Date(dateStr);
  const today = new Date();
  if (d.toDateString() === today.toDateString()) return "اليوم";
  const yesterday = new Date(today); yesterday.setDate(today.getDate() - 1);
  if (d.toDateString() === yesterday.toDateString()) return "أمس";
  return d.toLocaleDateString("ar-EG", { day: "numeric", month: "long" });
}
function fmtSize(bytes: number | null | undefined) {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}
function fmtDuration(secs: number) {
  if (!secs || !isFinite(secs) || isNaN(secs)) return "0:00";
  const m = Math.floor(secs / 60);
  const s = Math.floor(secs % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

// LocalStorage cache helpers
function getCachedMessages(courseId: string): ChatMessage[] | null {
  try {
    const raw = localStorage.getItem(`chat_cache_${courseId}`);
    if (!raw) return null;
    const { messages, ts } = JSON.parse(raw) as { messages: ChatMessage[]; ts: number };
    if (Date.now() - ts > CACHE_TTL) return null;
    return messages;
  } catch { return null; }
}
function setCachedMessages(courseId: string, messages: ChatMessage[]) {
  try {
    localStorage.setItem(`chat_cache_${courseId}`, JSON.stringify({ messages: messages.slice(-80), ts: Date.now() }));
  } catch { /* storage full */ }
}
function evictCache(courseId: string) {
  try { localStorage.removeItem(`chat_cache_${courseId}`); } catch { }
}

// ── Audio Player (fixed NaN duration) ────────────────────────────────────────
function AudioPlayer({ src, staticDuration }: { src: string; staticDuration?: number }) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [current, setCurrent] = useState(0);
  const [duration, setDuration] = useState(staticDuration ?? 0);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const onMeta = () => {
      const d = audio.duration;
      if (d && isFinite(d) && !isNaN(d)) setDuration(d);
      else if (staticDuration) setDuration(staticDuration);
    };
    const onDurChange = () => {
      const d = audio.duration;
      if (d && isFinite(d) && !isNaN(d)) setDuration(d);
    };
    audio.addEventListener("loadedmetadata", onMeta);
    audio.addEventListener("durationchange", onDurChange);
    // Seek-to-infinity trick for webm blobs missing duration
    const tryFix = () => {
      if (!audio.duration || !isFinite(audio.duration)) {
        audio.currentTime = 1e101;
        audio.addEventListener("timeupdate", function fix() {
          audio.removeEventListener("timeupdate", fix);
          audio.currentTime = 0;
          if (audio.duration && isFinite(audio.duration)) setDuration(audio.duration);
          else if (staticDuration) setDuration(staticDuration);
        }, { once: true });
      }
    };
    audio.addEventListener("loadedmetadata", tryFix, { once: true });
    return () => {
      audio.removeEventListener("loadedmetadata", onMeta);
      audio.removeEventListener("durationchange", onDurChange);
    };
  }, [src, staticDuration]);

  const toggle = useCallback(() => {
    const a = audioRef.current;
    if (!a) return;
    if (playing) { a.pause(); setPlaying(false); }
    else { a.play().then(() => setPlaying(true)).catch(() => {}); }
  }, [playing]);

  const progress = duration > 0 ? (current / duration) * 100 : 0;

  return (
    <div className="flex items-center gap-3 min-w-[220px] max-w-xs">
      <audio ref={audioRef} src={src} preload="metadata"
        onTimeUpdate={e => setCurrent((e.target as HTMLAudioElement).currentTime)}
        onEnded={() => { setPlaying(false); setCurrent(0); }} />
      <button onClick={toggle}
        className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0 hover:bg-white/35 transition-colors">
        {playing ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
      </button>
      <div className="flex-1">
        <div className="h-1.5 bg-white/20 rounded-full overflow-hidden cursor-pointer"
          onClick={e => {
            const audio = audioRef.current;
            if (!audio || !duration) return;
            const rect = (e.target as HTMLElement).getBoundingClientRect();
            audio.currentTime = ((e.clientX - rect.left) / rect.width) * duration;
          }}>
          <div className="h-full bg-white/80 rounded-full transition-all duration-100"
            style={{ width: `${progress}%` }} />
        </div>
        <p className="text-[11px] mt-0.5 opacity-70 font-mono">
          {fmtDuration(current)} / {fmtDuration(duration)}
        </p>
      </div>
      <a href={src} download className="opacity-60 hover:opacity-100 transition-opacity flex-shrink-0">
        <Download className="w-3.5 h-3.5" />
      </a>
    </div>
  );
}

// ── Voice Recorder ────────────────────────────────────────────────────────────
function VoiceRecorder({ onSend, onCancel }: { onSend: (blob: Blob, duration: number) => void; onCancel: () => void }) {
  const [elapsed, setElapsed] = useState(0);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const startRef = useRef<number>(Date.now());
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    let mounted = true;
    navigator.mediaDevices.getUserMedia({ audio: true }).then(stream => {
      if (!mounted) { stream.getTracks().forEach(t => t.stop()); return; }
      const mimeType =
        MediaRecorder.isTypeSupported("audio/webm;codecs=opus") ? "audio/webm;codecs=opus" :
        MediaRecorder.isTypeSupported("audio/webm") ? "audio/webm" :
        MediaRecorder.isTypeSupported("audio/ogg;codecs=opus") ? "audio/ogg;codecs=opus" :
        MediaRecorder.isTypeSupported("audio/mp4") ? "audio/mp4" : "";
      const mr = new MediaRecorder(stream, mimeType ? { mimeType } : {});
      recorderRef.current = mr;
      chunksRef.current = [];
      startRef.current = Date.now();
      mr.ondataavailable = e => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      mr.start(100);
      timerRef.current = setInterval(() => setElapsed(Math.floor((Date.now() - startRef.current) / 1000)), 500);
    }).catch(() => { toast.error("تعذر الوصول للميكروفون"); onCancel(); });
    return () => {
      mounted = false;
      if (timerRef.current) clearInterval(timerRef.current);
      const mr = recorderRef.current;
      if (mr && mr.state !== "inactive") mr.stop();
      recorderRef.current?.stream?.getTracks().forEach(t => t.stop());
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const stop = () => {
    const mr = recorderRef.current;
    if (!mr || mr.state === "inactive") return;
    const dur = Math.max(1, Math.floor((Date.now() - startRef.current) / 1000));
    const actualMime = mr.mimeType || "audio/webm";
    if (timerRef.current) clearInterval(timerRef.current);
    mr.onstop = () => {
      mr.stream.getTracks().forEach(t => t.stop());
      const blob = new Blob(chunksRef.current, { type: actualMime });
      if (blob.size === 0) { toast.error("لم يتم التقاط أي صوت"); return; }
      onSend(blob, dur);
    };
    if (mr.state === "recording") mr.requestData();
    mr.stop();
  };

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
      className="flex items-center gap-3 flex-1">
      <span className="flex items-center gap-1.5">
        <span className="w-2 h-2 rounded-full bg-red-400 animate-pulse" />
        <span className="text-red-400 font-mono text-sm font-bold tabular-nums">{fmtDuration(elapsed)}</span>
      </span>
      <span className="flex-1 text-xs dark:text-slate-400 text-slate-500 truncate">جاري التسجيل...</span>
      <button onClick={onCancel}
        className="px-3 py-1.5 rounded-xl text-xs dark:text-slate-400 text-slate-500 hover:text-red-400 dark:hover:bg-white/5 hover:bg-slate-100 transition-colors">
        إلغاء
      </button>
      <button onClick={stop}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-red-500 to-rose-500 text-white text-xs font-bold shadow-lg shadow-red-500/20 hover:opacity-90 transition-opacity">
        <StopCircle className="w-3.5 h-3.5" />إرسال
      </button>
    </motion.div>
  );
}

// ── Reaction Bubble ───────────────────────────────────────────────────────────
function ReactionBubble({ r, currentUserId, onToggle }: { r: ReactionGroup; currentUserId: number; onToggle: (emoji: string) => void }) {
  const [showTip, setShowTip] = useState(false);
  const mine = r.users.includes(currentUserId);
  return (
    <div className="relative">
      <button onClick={() => onToggle(r.emoji)}
        onMouseEnter={() => setShowTip(true)} onMouseLeave={() => setShowTip(false)}
        className={`flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-xs border transition-all ${mine ? "border-cyan-500/50 bg-cyan-500/10 text-cyan-300" : "dark:border-white/10 border-slate-200 dark:bg-white/5 bg-slate-50 dark:text-slate-300 text-slate-600"}`}>
        {r.emoji}<span className="text-[10px] font-bold">{r.count}</span>
      </button>
      {showTip && r.userNames && r.userNames.length > 0 && (
        <div className="absolute bottom-full mb-1.5 left-1/2 -translate-x-1/2 whitespace-nowrap dark:bg-[#1a2333] bg-white border dark:border-white/10 border-slate-200 rounded-lg px-2 py-1 shadow-xl z-50 text-xs dark:text-slate-300 text-slate-700 pointer-events-none">
          {r.userNames.slice(0, 5).join("، ")}{r.userNames.length > 5 ? ` +${r.userNames.length - 5}` : ""}
        </div>
      )}
    </div>
  );
}

// ── Portal Context Menu (viewport-aware, always visible) ──────────────────────
interface MenuAction { label: string; icon: React.ReactNode; onClick: () => void; danger?: boolean; }
function PortalContextMenu({ actions, align, children }: { actions: MenuAction[]; align: "left" | "right"; children?: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [menuPos, setMenuPos] = useState({ top: 0, left: 0 });
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node) &&
          triggerRef.current && !triggerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const handleOpen = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const menuWidth = 190;
    const menuHeight = actions.length * 44 + 16;
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    let left = align === "right" ? rect.left : rect.right - menuWidth;
    let top = rect.bottom + 6;

    if (left + menuWidth > vw - 8) left = vw - menuWidth - 8;
    if (left < 8) left = 8;
    if (top + menuHeight > vh - 8) top = rect.top - menuHeight - 6;
    if (top < 8) top = 8;

    setMenuPos({ top, left });
    setOpen(o => !o);
  };

  return (
    <>
      <button ref={triggerRef} onClick={handleOpen}
        className="w-7 h-7 rounded-full dark:bg-[#111827]/90 bg-white/90 shadow-md border dark:border-white/10 border-slate-200/80 flex items-center justify-center hover:scale-110 transition-transform dark:text-slate-400 text-slate-500 hover:dark:text-white hover:text-slate-800 backdrop-blur-sm">
        <MoreVertical className="w-3.5 h-3.5" />
      </button>
      {mounted && open && reactDomPortal(
        <AnimatePresence>
          <motion.div ref={menuRef}
            initial={{ opacity: 0, scale: 0.92, y: -4 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.92 }}
            transition={{ duration: 0.12 }}
            style={{ position: "fixed", top: menuPos.top, left: menuPos.left, zIndex: 9999, minWidth: 190 }}
            className="dark:bg-[#0f1929] bg-white border dark:border-white/10 border-slate-200 rounded-2xl shadow-2xl overflow-hidden"
            onClick={e => e.stopPropagation()}>
            {actions.map((a, i) => (
              <button key={i} onClick={() => { a.onClick(); setOpen(false); }}
                className={`w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-right transition-colors hover:dark:bg-white/5 hover:bg-slate-50 ${a.danger ? "text-red-400 hover:!bg-red-500/10" : "dark:text-slate-200 text-slate-700"}`}>
                <span className="w-4 h-4 flex-shrink-0">{a.icon}</span>
                {a.label}
              </button>
            ))}
          </motion.div>
        </AnimatePresence>,
        document.body
      )}
    </>
  );
}

// ── Admin Moderation Modal ────────────────────────────────────────────────────
function AdminModerationModal({ targetUser, courseId, onClose }: { targetUser: ChatUser; courseId: string; onClose: () => void }) {
  const [loading, setLoading] = useState(false);

  const action = async (fn: () => Promise<unknown>, msg: string) => {
    setLoading(true);
    try { await fn(); toast.success(msg); onClose(); }
    catch (e) { toast.error(e instanceof Error ? e.message : "فشلت العملية"); }
    finally { setLoading(false); }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-[9998] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={onClose}>
      <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9 }}
        className="dark:bg-[#0f1929] bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm"
        onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full overflow-hidden dark:bg-slate-700 bg-slate-200 flex items-center justify-center flex-shrink-0">
              {targetUser.avatar
                ? <img src={targetUser.avatar} alt="" className="w-full h-full object-cover" />
                : <span className="font-bold dark:text-white text-slate-800 text-lg">{targetUser.name[0]?.toUpperCase()}</span>}
            </div>
            <div>
              <p className="font-bold dark:text-white text-slate-900">{targetUser.name}</p>
              <p className="text-xs dark:text-slate-400 text-slate-500">إدارة المستخدم في الشات</p>
            </div>
          </div>
          <button onClick={onClose} className="dark:text-slate-400 text-slate-500 hover:text-red-400 transition-colors"><X className="w-5 h-5" /></button>
        </div>
        <div className="space-y-2">
          {[
            { label: "كتم 10 دقائق", sub: "منع مؤقت من الإرسال", icon: <VolumeX className="w-4 h-4 text-amber-400" />, fn: () => api.post(`/chat/${courseId}/mute/${targetUser.id}`, { minutes: 10 }), msg: "تم كتم المستخدم 10 دقائق" },
            { label: "كتم ساعة كاملة", sub: "منع من الإرسال لمدة ساعة", icon: <VolumeX className="w-4 h-4 text-orange-400" />, fn: () => api.post(`/chat/${courseId}/mute/${targetUser.id}`, { minutes: 60 }), msg: "تم كتم المستخدم ساعة" },
            { label: "طرد من الشات", sub: "إخراج فوري من الغرفة", icon: <UserX className="w-4 h-4 text-red-400" />, fn: () => api.post(`/chat/${courseId}/kick/${targetUser.id}`, {}), msg: "تم طرد المستخدم" },
            { label: "حظر من الكورس 7 أيام", sub: "لا يستطيع المشاركة في هذا الكورس", icon: <Ban className="w-4 h-4 text-red-500" />, fn: () => api.post(`/chat/ban/${targetUser.id}`, { courseId: parseInt(courseId), reason: "مخالفة قواعد الشات", days: 7 }), msg: "تم حظر المستخدم من الكورس", danger: true },
            { label: "حظر كامل من الموقع", sub: "30 يوماً - محظور من كل الكورسات", icon: <Shield className="w-4 h-4 text-red-600" />, fn: () => api.post(`/chat/ban/${targetUser.id}`, { reason: "حظر كامل", days: 30 }), msg: "تم الحظر الكامل", danger: true },
          ].map((item, i) => (
            <button key={i} onClick={() => action(item.fn, item.msg)} disabled={loading}
              className={`w-full flex items-center gap-3 p-3 rounded-xl transition-colors text-right disabled:opacity-60 ${item.danger ? "dark:bg-red-500/10 bg-red-50 hover:dark:bg-red-500/20 hover:bg-red-100" : "dark:bg-white/5 bg-slate-50 hover:dark:bg-white/10 hover:bg-slate-100"}`}>
              <span className="flex-shrink-0">{item.icon}</span>
              <div><p className={`text-sm font-semibold ${item.danger ? "text-red-500" : "dark:text-slate-200 text-slate-700"}`}>{item.label}</p><p className="text-xs dark:text-slate-500 text-slate-400">{item.sub}</p></div>
            </button>
          ))}
        </div>
        {loading && <div className="flex justify-center mt-4"><Loader2 className="w-5 h-5 text-cyan-400 animate-spin" /></div>}
      </motion.div>
    </motion.div>
  );
}

// ── Delete Dialog ─────────────────────────────────────────────────────────────
function DeleteDialog({ msg, isOwn, isAdmin, onConfirm, onClose }: { msg: ChatMessage; isOwn: boolean; isAdmin: boolean; onConfirm: (forEveryone: boolean) => void; onClose: () => void }) {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-[9998] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={onClose}>
      <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }}
        className="dark:bg-[#0f1929] bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm"
        onClick={e => e.stopPropagation()}>
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center">
            <Trash2 className="w-5 h-5 text-red-400" />
          </div>
          <div>
            <p className="font-bold dark:text-white text-slate-900">حذف الرسالة</p>
            <p className="text-xs dark:text-slate-400 text-slate-500">اختر نوع الحذف</p>
          </div>
        </div>
        <div className="space-y-2">
          {isOwn && (
            <button onClick={() => onConfirm(false)}
              className="w-full p-3 rounded-xl dark:bg-white/5 bg-slate-50 hover:dark:bg-white/10 hover:bg-slate-100 transition-colors text-right dark:text-slate-200 text-slate-700 text-sm font-medium">
              حذف عندي فقط
            </button>
          )}
          {(isOwn || isAdmin) && (
            <button onClick={() => onConfirm(true)}
              className="w-full p-3 rounded-xl bg-red-500/10 hover:bg-red-500/20 transition-colors text-right text-red-400 text-sm font-medium">
              حذف عند الجميع
            </button>
          )}
        </div>
        <button onClick={onClose} className="w-full mt-3 p-2 rounded-xl dark:text-slate-400 text-slate-500 text-sm hover:dark:text-slate-200 hover:text-slate-700 transition-colors">
          إلغاء
        </button>
      </motion.div>
    </motion.div>
  );
}

// ── renderMentions ────────────────────────────────────────────────────────────
function renderMentions(content: string): React.ReactNode {
  const parts = content.split(/(@\S+)/g);
  return parts.map((part, i) =>
    part.startsWith("@") ? <span key={i} className="text-cyan-400 font-semibold">{part}</span> : part
  );
}

// ── Message Bubble ────────────────────────────────────────────────────────────
function MessageBubble({
  msg, isOwn, currentUserId, isAdmin,
  onReply, onReact, onDelete, onPin, onModerate, onOpenMedia, messageRef, isHighlighted,
}: {
  msg: ChatMessage; isOwn: boolean; currentUserId: number; isAdmin: boolean;
  onReply: (m: ChatMessage) => void; onReact: (id: number, emoji: string) => void;
  onDelete: (m: ChatMessage) => void; onPin: (id: number, isPinned: boolean) => void;
  onModerate: (u: ChatUser) => void; onOpenMedia: (src: string, type: "image" | "video", name?: string | null) => void;
  messageRef?: (el: HTMLDivElement | null) => void; isHighlighted?: boolean;
}) {
  const [showEmoji, setShowEmoji] = useState(false);
  const emojiRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!showEmoji) return;
    const handler = (e: MouseEvent) => { if (emojiRef.current && !emojiRef.current.contains(e.target as Node)) setShowEmoji(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showEmoji]);

  if (msg.deletedForEveryone) return (
    <div className="flex justify-center my-1" ref={messageRef}>
      <span className="text-xs dark:text-slate-600 text-slate-400 italic px-3 py-1 dark:bg-white/5 bg-slate-100 rounded-full">تم حذف هذه الرسالة</span>
    </div>
  );

  const src = resolveUrl(msg.fileUrl);

  const menuActions: MenuAction[] = [
    { label: "الرد على الرسالة", icon: <Reply className="w-4 h-4" />, onClick: () => onReply(msg) },
    { label: "تفاعل بإيموجي", icon: <Smile className="w-4 h-4" />, onClick: () => setShowEmoji(true) },
    ...(isAdmin ? [
      { label: msg.isPinned ? "إلغاء التثبيت" : "تثبيت الرسالة", icon: msg.isPinned ? <PinOff className="w-4 h-4" /> : <Pin className="w-4 h-4" />, onClick: () => onPin(msg.id, msg.isPinned) },
      ...(!isOwn ? [{ label: "إدارة المستخدم", icon: <Shield className="w-4 h-4" />, onClick: () => onModerate(msg.user) }] : []),
      { label: "حذف الرسالة", icon: <Trash2 className="w-4 h-4" />, onClick: () => onDelete(msg), danger: true },
    ] : []),
    ...(isOwn && !isAdmin ? [{ label: "حذف الرسالة", icon: <Trash2 className="w-4 h-4" />, onClick: () => onDelete(msg), danger: true }] : []),
  ];

  return (
    <div className={`group flex gap-2 mb-1.5 ${isOwn ? "flex-row-reverse" : "flex-row"}`} ref={messageRef}>
      {/* Avatar */}
      {!isOwn && (
        <div className="w-8 h-8 rounded-full flex-shrink-0 self-end overflow-hidden ring-2 ring-transparent group-hover:ring-cyan-500/20 transition-all">
          {msg.user.avatar
            ? <img src={msg.user.avatar} alt="" className="w-full h-full object-cover" />
            : <div className="w-full h-full dark:bg-gradient-to-br dark:from-cyan-600 dark:to-violet-600 bg-cyan-200 flex items-center justify-center text-xs font-bold dark:text-white text-cyan-800">{msg.user.name[0]?.toUpperCase()}</div>}
        </div>
      )}

      <div className={`flex flex-col max-w-[72%] sm:max-w-[62%] ${isOwn ? "items-end" : "items-start"}`}>
        {!isOwn && (
          <span className={`text-xs mb-0.5 px-1 font-bold ${ADMIN_ROLES.includes(msg.user.role) ? "text-violet-400" : "dark:text-slate-400 text-slate-500"}`}>
            {msg.user.name}{ADMIN_ROLES.includes(msg.user.role) ? " (admin)" : ""}
          </span>
        )}

        {/* Reply preview */}
        {msg.replyTo && !msg.replyTo.deletedForEveryone && (
          <div className={`text-xs w-full mb-0.5 px-2.5 py-1.5 rounded-t-xl border-r-2 border-cyan-400 ${isOwn ? "dark:bg-white/5 bg-slate-200" : "dark:bg-white/5 bg-slate-100"}`}>
            <span className="text-cyan-400 font-semibold block">{msg.replyTo.user.name}</span>
            <span className="dark:text-slate-400 text-slate-500 line-clamp-1">
              {msg.replyTo.type !== "text" ? `[${msg.replyTo.fileName ?? "ملف"}]` : msg.replyTo.content.slice(0, 60)}
            </span>
          </div>
        )}

        {/* Bubble + 3-dot */}
        <div className="flex items-center gap-1.5">
          {isOwn && (
            <div className="flex items-center gap-1 transition-opacity opacity-100 sm:opacity-0 sm:group-hover:opacity-100">
              <button onClick={() => setShowEmoji(v => !v)}
                className="w-6 h-6 rounded-full dark:bg-[#111827]/90 bg-white/90 shadow border dark:border-white/10 border-slate-200/80 flex items-center justify-center text-xs hover:scale-110 transition-transform dark:text-slate-400 text-slate-500">
                <Smile className="w-3 h-3" />
              </button>
              <PortalContextMenu actions={menuActions} align="right" />
            </div>
          )}

          {/* Bubble */}
          <div className={`relative rounded-2xl px-3 py-2.5 ${
            isOwn
              ? "bg-gradient-to-br from-cyan-500 to-cyan-600 text-white rounded-br-none shadow-lg shadow-cyan-500/20"
              : "dark:bg-[#1e2d40] bg-slate-100 dark:text-white text-slate-900 rounded-bl-none shadow-sm"
          } ${msg.replyTo ? "rounded-t-none" : ""} ${isHighlighted ? "ring-2 ring-amber-400 ring-offset-2 dark:ring-offset-[#070b14]" : ""} transition-all duration-500`}>

            {/* Emoji picker popup */}
            {showEmoji && (
              <div ref={emojiRef}
                className={`absolute ${isOwn ? "left-0" : "right-0"} bottom-full mb-1.5 flex gap-0.5 p-2 dark:bg-[#1a2333] bg-white rounded-2xl shadow-2xl border dark:border-white/10 border-slate-200 z-50`}
                onClick={e => e.stopPropagation()}>
                {EMOJIS.map(e => (
                  <button key={e} onClick={() => { onReact(msg.id, e); setShowEmoji(false); }}
                    className="w-8 h-8 flex items-center justify-center text-base hover:scale-125 transition-transform rounded-lg hover:dark:bg-white/10 hover:bg-slate-100">
                    {e}
                  </button>
                ))}
              </div>
            )}

            {/* Content */}
            {msg.type === "text" && (
              <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">{renderMentions(msg.content)}</p>
            )}

            {msg.type === "image" && src && (
              <div className="space-y-1">
                <div className="relative group/img cursor-pointer rounded-xl overflow-hidden" onClick={() => onOpenMedia(src, "image", msg.fileName)}>
                  <img src={src} alt="صورة" className="max-w-full max-h-64 object-cover rounded-xl hover:opacity-95 transition-opacity block" />
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover/img:opacity-100 transition-opacity bg-black/20 rounded-xl">
                    <span className="bg-black/60 text-white text-xs px-3 py-1.5 rounded-full backdrop-blur-sm flex items-center gap-1.5"><ImageIcon className="w-3 h-3" />عرض كامل</span>
                  </div>
                </div>
                {msg.content && <p className="text-xs opacity-80 mt-1 break-words">{msg.content}</p>}
              </div>
            )}

            {msg.type === "video" && src && (
              <div className="space-y-1">
                <div className="relative cursor-pointer rounded-xl overflow-hidden" onClick={() => onOpenMedia(src, "video", msg.fileName)}>
                  <video src={src} preload="metadata" playsInline muted className="max-w-full max-h-52 w-full object-cover block rounded-xl" />
                  <div className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-xl">
                    <div className="w-12 h-12 rounded-full bg-white/25 backdrop-blur-sm flex items-center justify-center border border-white/40 shadow-lg hover:bg-white/35 transition-colors">
                      <Play className="w-5 h-5 text-white ml-0.5" fill="white" />
                    </div>
                  </div>
                  <div className="absolute bottom-2 right-2 bg-black/60 text-white text-xs px-2 py-0.5 rounded-full flex items-center gap-1 backdrop-blur-sm">
                    <Film className="w-3 h-3" />فيديو
                  </div>
                </div>
                {msg.content && <p className="text-xs opacity-80 mt-1 break-words">{msg.content}</p>}
              </div>
            )}

            {msg.type === "audio" && src && (
              <div className="min-w-[220px]">
                <div className="flex items-center gap-1 mb-1 text-xs opacity-60">
                  <Volume2 className="w-3 h-3" /><span>رسالة صوتية</span>
                </div>
                <AudioPlayer src={src} staticDuration={msg.fileSize ?? undefined} />
              </div>
            )}

            {msg.type === "file" && src && (
              <a href={src} download={msg.fileName ?? true} onClick={e => e.stopPropagation()}
                className="flex items-center gap-3 p-2 rounded-xl dark:bg-white/5 bg-black/5 hover:dark:bg-white/10 hover:bg-black/10 transition-colors min-w-[180px]">
                <div className="w-9 h-9 rounded-lg dark:bg-white/10 bg-black/10 flex items-center justify-center flex-shrink-0">
                  <FileText className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold truncate">{msg.fileName ?? "ملف"}</p>
                  <p className="text-xs opacity-60">{fmtSize(msg.fileSize)}</p>
                </div>
                <Download className="w-4 h-4 opacity-70 flex-shrink-0" />
              </a>
            )}

            {msg.isPinned && (
              <div className="flex items-center gap-1 mt-1.5 text-xs opacity-50">
                <Pin className="w-2.5 h-2.5" />مثبتة
              </div>
            )}
          </div>

          {!isOwn && (
            <div className="flex items-center gap-1 transition-opacity opacity-100 sm:opacity-0 sm:group-hover:opacity-100">
              <button onClick={() => setShowEmoji(v => !v)}
                className="w-6 h-6 rounded-full dark:bg-[#111827]/90 bg-white/90 shadow border dark:border-white/10 border-slate-200/80 flex items-center justify-center hover:scale-110 transition-transform dark:text-slate-400 text-slate-500">
                <Smile className="w-3 h-3" />
              </button>
              <PortalContextMenu actions={menuActions} align="left" />
            </div>
          )}
        </div>

        {/* Reactions */}
        {msg.reactions.length > 0 && (
          <div className={`flex flex-wrap gap-1 mt-1 ${isOwn ? "justify-end" : "justify-start"}`}>
            {msg.reactions.map(r => (
              <ReactionBubble key={r.emoji} r={r} currentUserId={currentUserId} onToggle={e => onReact(msg.id, e)} />
            ))}
          </div>
        )}

        <span className="text-xs dark:text-slate-600 text-slate-400 mt-0.5 px-1 select-none">{fmtTime(msg.createdAt)}</span>
      </div>
    </div>
  );
}

// ── Mention Autocomplete ──────────────────────────────────────────────────────
function MentionDropdown({ query, members, onSelect }: { query: string; members: CourseMember[]; onSelect: (m: CourseMember) => void }) {
  const filtered = useMemo(() =>
    members.filter(m => m.name.toLowerCase().includes(query.toLowerCase()) || (m.username ?? "").toLowerCase().includes(query.toLowerCase())).slice(0, 6),
    [query, members]
  );
  if (filtered.length === 0) return null;
  return (
    <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
      className="absolute bottom-full mb-2 right-0 left-0 dark:bg-[#0f1929] bg-white border dark:border-white/10 border-slate-200 rounded-2xl shadow-2xl overflow-hidden z-50 max-h-56 overflow-y-auto">
      <p className="text-xs dark:text-slate-500 text-slate-400 px-3 py-2 border-b dark:border-white/5 border-slate-100 flex items-center gap-1.5">
        <AtSign className="w-3 h-3" />اختر شخصاً لذكره
      </p>
      {filtered.map(m => (
        <button key={m.id} onClick={() => onSelect(m)}
          className="w-full flex items-center gap-2.5 px-3 py-2.5 hover:dark:bg-white/5 hover:bg-slate-50 transition-colors text-right">
          <div className="w-7 h-7 rounded-full overflow-hidden flex-shrink-0">
            {m.avatar
              ? <img src={m.avatar} alt="" className="w-full h-full object-cover" />
              : <div className="w-full h-full dark:bg-cyan-600 bg-cyan-200 flex items-center justify-center text-xs font-bold dark:text-white text-cyan-800">{m.name[0]?.toUpperCase()}</div>}
          </div>
          <div className="flex-1 text-right min-w-0">
            <p className="text-sm font-semibold dark:text-white text-slate-900 truncate">{m.name}</p>
            {m.username && <p className="text-xs dark:text-slate-500 text-slate-400">@{m.username}</p>}
          </div>
          {ADMIN_ROLES.includes(m.role) && <span className="text-xs text-violet-400 flex-shrink-0">(admin)</span>}
        </button>
      ))}
    </motion.div>
  );
}

// ── Media Lightbox ────────────────────────────────────────────────────────────
function MediaLightbox({ src, type, fileName, onClose }: { src: string; type: "image" | "video"; fileName?: string | null; onClose: () => void }) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/95 backdrop-blur-md"
      onClick={onClose}>
      <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }}
        className="relative flex items-center justify-center max-w-[94vw] max-h-[94vh]"
        onClick={e => e.stopPropagation()}>
        {type === "image"
          ? <img src={src} alt={fileName ?? "صورة"} className="max-w-[94vw] max-h-[90vh] object-contain rounded-2xl shadow-2xl" />
          : <video src={src} controls autoPlay playsInline className="max-w-[94vw] max-h-[90vh] rounded-2xl shadow-2xl bg-black" />
        }
        <div className="absolute top-3 left-3 right-3 flex justify-between items-center pointer-events-none">
          <a href={src} download={fileName ?? true} onClick={e => e.stopPropagation()}
            className="pointer-events-auto flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-black/60 text-white text-xs font-semibold hover:bg-black/80 transition-colors backdrop-blur-sm">
            <Download className="w-3.5 h-3.5" />تحميل
          </a>
          <button onClick={onClose}
            className="pointer-events-auto w-9 h-9 rounded-xl bg-black/60 flex items-center justify-center text-white hover:bg-black/80 transition-colors backdrop-blur-sm">
            <X className="w-4 h-4" />
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ── Date Separator ────────────────────────────────────────────────────────────
function DateSeparator({ date }: { date: string }) {
  return (
    <div className="flex items-center gap-3 my-4">
      <div className="flex-1 h-px dark:bg-white/5 bg-slate-200" />
      <span className="text-xs dark:text-slate-500 text-slate-400 px-3 py-1 dark:bg-white/5 bg-slate-100 rounded-full select-none">{fmtDate(date)}</span>
      <div className="flex-1 h-px dark:bg-white/5 bg-slate-200" />
    </div>
  );
}

// ── Unified Message Input ─────────────────────────────────────────────────────
function MessageInput({
  text, onChange, onSend, onMic, onAttach, onEmojiToggle,
  sending, uploading, disabled, mentionQuery, members, onSelectMention, onReplyClose,
  replyTo, pendingAttachment, onAttachmentRemove, recording, onRecordSend, onRecordCancel,
  showEmojiPicker, setShowEmojiPicker, onEmojiSelect,
}: {
  text: string;
  onChange: (val: string) => void;
  onSend: () => void;
  onMic: () => void;
  onAttach: () => void;
  onEmojiToggle: () => void;
  sending: boolean;
  uploading: boolean;
  disabled: boolean;
  mentionQuery: string | null;
  members: CourseMember[];
  onSelectMention: (m: CourseMember) => void;
  replyTo: ChatMessage | null;
  onReplyClose: () => void;
  pendingAttachment: { file: File; previewUrl: string | null; type: "image" | "video" | "audio" | "file" } | null;
  onAttachmentRemove: () => void;
  recording: boolean;
  onRecordSend: (blob: Blob, duration: number) => void;
  onRecordCancel: () => void;
  showEmojiPicker: boolean;
  setShowEmojiPicker: (v: boolean) => void;
  onEmojiSelect: (e: string) => void;
}) {
  const textRef = useRef<HTMLTextAreaElement>(null);
  const emojiPickerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!showEmojiPicker) return;
    const handler = (e: MouseEvent) => {
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(e.target as Node)) setShowEmojiPicker(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showEmojiPicker, setShowEmojiPicker]);

  const autoResize = (el: HTMLTextAreaElement) => {
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
  };

  return (
    <div className="flex-shrink-0 border-t dark:border-white/5 border-slate-200 dark:bg-[#070b14] bg-white">
      {/* Reply strip */}
      <AnimatePresence>
        {replyTo && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}
            className="flex items-center gap-3 px-4 py-2 border-b dark:border-white/5 border-slate-100 dark:bg-white/[0.03] bg-slate-50">
            <div className="w-0.5 h-8 bg-cyan-400 rounded-full flex-shrink-0" />
            <Reply className="w-3.5 h-3.5 text-cyan-400 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-xs text-cyan-400 font-bold">{replyTo.user.name}</p>
              <p className="text-xs dark:text-slate-400 text-slate-500 truncate">
                {replyTo.type !== "text" ? `[${replyTo.fileName ?? "ملف"}]` : replyTo.content.slice(0, 80)}
              </p>
            </div>
            <button onClick={onReplyClose} className="dark:text-slate-500 text-slate-400 hover:text-red-400 transition-colors flex-shrink-0">
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Attachment preview strip */}
      <AnimatePresence>
        {pendingAttachment && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}
            className="flex items-center gap-3 px-4 py-2.5 border-b dark:border-white/5 border-slate-100 dark:bg-white/[0.03] bg-slate-50">
            {pendingAttachment.type === "image" && pendingAttachment.previewUrl
              ? <img src={pendingAttachment.previewUrl} className="h-12 w-12 rounded-xl object-cover flex-shrink-0 border dark:border-white/10 border-slate-200" alt="" />
              : pendingAttachment.type === "video" && pendingAttachment.previewUrl
              ? <video src={pendingAttachment.previewUrl} className="h-12 w-12 rounded-xl object-cover flex-shrink-0 border dark:border-white/10 border-slate-200" />
              : <div className="h-12 w-12 rounded-xl dark:bg-white/10 bg-slate-200 flex items-center justify-center flex-shrink-0">
                  {pendingAttachment.type === "audio" ? <Volume2 className="w-5 h-5 dark:text-slate-400 text-slate-500" /> : <FileText className="w-5 h-5 dark:text-slate-400 text-slate-500" />}
                </div>
            }
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold dark:text-white text-slate-800 truncate">{pendingAttachment.file.name}</p>
              <p className="text-xs dark:text-slate-400 text-slate-500">{fmtSize(pendingAttachment.file.size)} · {pendingAttachment.type === "image" ? "صورة" : pendingAttachment.type === "video" ? "فيديو" : pendingAttachment.type === "audio" ? "صوت" : "ملف"}</p>
            </div>
            <button onClick={onAttachmentRemove} className="dark:text-slate-500 text-slate-400 hover:text-red-400 transition-colors flex-shrink-0">
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main input area */}
      <div className="px-3 py-3 relative">
        {/* Mention dropdown */}
        <AnimatePresence>
          {mentionQuery !== null && (
            <MentionDropdown query={mentionQuery} members={members} onSelect={onSelectMention} />
          )}
        </AnimatePresence>

        {/* Emoji picker */}
        <AnimatePresence>
          {showEmojiPicker && (
            <motion.div ref={emojiPickerRef}
              initial={{ opacity: 0, y: 8, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 8, scale: 0.95 }}
              className="absolute bottom-full mb-2 left-3 right-3 sm:left-auto sm:right-16 sm:w-auto dark:bg-[#0f1929] bg-white border dark:border-white/10 border-slate-200 rounded-2xl shadow-2xl p-3 z-50">
              <div className="flex flex-wrap gap-1 justify-center max-w-[280px]">
                {EMOJIS.map(e => (
                  <button key={e} onClick={() => { onEmojiSelect(e); setShowEmojiPicker(false); }}
                    className="w-9 h-9 flex items-center justify-center text-xl hover:scale-125 transition-transform rounded-xl hover:dark:bg-white/10 hover:bg-slate-100">
                    {e}
                  </button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence mode="wait">
          {recording ? (
            <motion.div key="recorder" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="flex items-center gap-2 min-h-[44px] px-2 py-1 rounded-2xl dark:bg-white/5 bg-slate-100 border dark:border-white/10 border-slate-200">
              <VoiceRecorder onSend={onRecordSend} onCancel={onRecordCancel} />
            </motion.div>
          ) : (
            <motion.div key="input" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="flex items-end gap-0 dark:bg-white/[0.06] bg-slate-100 rounded-2xl border dark:border-white/10 border-slate-200 overflow-hidden focus-within:dark:border-cyan-500/40 focus-within:border-cyan-400/50 transition-colors">

              {/* Left: Attachment */}
              <button onClick={onAttach} disabled={uploading || disabled}
                className="flex-shrink-0 w-11 h-11 flex items-center justify-center dark:text-slate-500 text-slate-400 hover:text-cyan-400 dark:hover:text-cyan-400 transition-colors disabled:opacity-50">
                {uploading ? <Loader2 className="w-4.5 h-4.5 animate-spin text-cyan-400" /> : <Paperclip className="w-[18px] h-[18px]" />}
              </button>

              {/* Center: Textarea */}
              <textarea
                ref={textRef}
                value={text}
                onChange={e => {
                  onChange(e.target.value);
                  autoResize(e.target);
                }}
                onKeyDown={e => {
                  if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); if (mentionQuery !== null) return; onSend(); }
                  if (e.key === "Escape") { /* handled by parent */ }
                }}
                placeholder="اكتب رسالتك... (Shift+Enter للسطر الجديد)"
                dir="rtl"
                rows={1}
                disabled={disabled}
                className="flex-1 resize-none bg-transparent dark:text-white text-slate-900 outline-none placeholder:dark:text-slate-500 placeholder:text-slate-400 text-sm leading-relaxed py-3 px-1 max-h-[120px] disabled:opacity-50"
                style={{ fontSize: "16px", minHeight: "44px" }}
              />

              {/* Right: Emoji + Mic/Send */}
              <div className="flex items-center flex-shrink-0 pr-1 pb-1">
                <button onClick={onEmojiToggle} disabled={disabled}
                  className="w-9 h-9 flex items-center justify-center dark:text-slate-500 text-slate-400 hover:text-cyan-400 dark:hover:text-cyan-400 transition-colors rounded-xl hover:dark:bg-white/5 hover:bg-white/50">
                  <Smile className="w-[18px] h-[18px]" />
                </button>

                <AnimatePresence mode="wait">
                  {(text.trim() || pendingAttachment) ? (
                    <motion.button key="send"
                      initial={{ scale: 0.7, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.7, opacity: 0 }}
                      transition={{ duration: 0.12 }}
                      onClick={onSend} disabled={sending || uploading || disabled}
                      className="w-9 h-9 flex items-center justify-center rounded-xl bg-gradient-to-br from-cyan-500 to-violet-600 text-white shadow-lg shadow-cyan-500/25 hover:opacity-90 disabled:opacity-60 transition-opacity">
                      {(sending || uploading) ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                    </motion.button>
                  ) : (
                    <motion.button key="mic"
                      initial={{ scale: 0.7, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.7, opacity: 0 }}
                      transition={{ duration: 0.12 }}
                      onClick={onMic} disabled={disabled}
                      className="w-9 h-9 flex items-center justify-center rounded-xl bg-gradient-to-br from-rose-500 to-pink-600 text-white shadow-lg shadow-rose-500/25 hover:opacity-90 transition-opacity disabled:opacity-50">
                      <Mic className="w-4 h-4" />
                    </motion.button>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

// ── Main Chat Component ───────────────────────────────────────────────────────
export default function CourseChat({ courseId, courseTitle, onClose }: { courseId: string; courseTitle?: string; onClose: () => void }) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [replyTo, setReplyTo] = useState<ChatMessage | null>(null);
  const [recording, setRecording] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [connected, setConnected] = useState(false);
  const [userNames, setUserNames] = useState<Record<number, string>>({});
  const [deleteTarget, setDeleteTarget] = useState<ChatMessage | null>(null);
  const [moderateTarget, setModerateTarget] = useState<ChatUser | null>(null);
  const [pinnedMessages, setPinnedMessages] = useState<ChatMessage[]>([]);
  const [showPinned, setShowPinned] = useState(false);
  const [members, setMembers] = useState<CourseMember[]>([]);
  const [mentionQuery, setMentionQuery] = useState<string | null>(null);
  const [mentionedUsers, setMentionedUsers] = useState<Record<string, number>>({});
  const [highlightedMsgId, setHighlightedMsgId] = useState<number | null>(null);
  const [typingUsers, setTypingUsers] = useState<{ userId: number; name: string }[]>([]);
  const [showScrollBtn, setShowScrollBtn] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [lightbox, setLightbox] = useState<{ src: string; type: "image" | "video"; fileName?: string | null } | null>(null);
  const [pendingAttachment, setPendingAttachment] = useState<{ file: File; previewUrl: string | null; type: "image" | "video" | "audio" | "file" } | null>(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  const bottomRef = useRef<HTMLDivElement>(null);
  const socketRef = useRef<Socket | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const messageRefs = useRef<Record<number, HTMLDivElement | null>>({});
  const typingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isAdmin = user ? ADMIN_ROLES.includes(user.role ?? "") : false;

  const isNearBottom = useCallback(() => {
    const el = messagesContainerRef.current;
    if (!el) return true;
    return el.scrollHeight - el.scrollTop - el.clientHeight < 150;
  }, []);

  const scrollToBottom = useCallback((smooth = true) => {
    bottomRef.current?.scrollIntoView({ behavior: smooth ? "smooth" : "instant" });
    setUnreadCount(0);
    setShowScrollBtn(false);
  }, []);

  const scrollToMessage = useCallback((msgId: number) => {
    const el = messageRefs.current[msgId];
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "center" });
    setHighlightedMsgId(msgId);
    setTimeout(() => setHighlightedMsgId(null), 2500);
  }, []);

  // Group messages by date
  const groupedMessages = useMemo(() => {
    const groups: { date: string; messages: ChatMessage[] }[] = [];
    for (const msg of messages) {
      const date = new Date(msg.createdAt).toDateString();
      const last = groups[groups.length - 1];
      if (last && last.date === date) last.messages.push(msg);
      else groups.push({ date, messages: [msg] });
    }
    return groups;
  }, [messages]);

  // Load members
  useEffect(() => {
    api.get<CourseMember[]>(`/chat/${courseId}/members`).then(setMembers).catch(() => {});
  }, [courseId]);

  // Load pinned messages
  useEffect(() => {
    api.get<ChatMessage[]>(`/chat/${courseId}/pinned`).then(setPinnedMessages).catch(() => {});
  }, [courseId]);

  // Handle ?msg= URL param
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const msgId = params.get("msg");
    if (msgId) {
      const id = parseInt(msgId, 10);
      const tryScroll = () => {
        if (messageRefs.current[id]) scrollToMessage(id);
        else setTimeout(tryScroll, 500);
      };
      setTimeout(tryScroll, 1000);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Load initial messages: check localStorage cache first, then fetch fresh
  useEffect(() => {
    const cached = getCachedMessages(courseId);
    if (cached && cached.length > 0) {
      // Show cached immediately — no spinner
      setMessages(cached);
      setLoading(false);
      setHasMore(cached.length >= 50);
      const names: Record<number, string> = {};
      cached.forEach(m => { names[m.userId] = m.user.name; });
      setUserNames(names);
      setTimeout(() => scrollToBottom(false), 50);
      // Refresh in background silently
      api.get<ChatMessage[]>(`/chat/${courseId}/messages?limit=50`)
        .then(msgs => {
          setMessages(msgs);
          setHasMore(msgs.length === 50);
          setCachedMessages(courseId, msgs);
          const n: Record<number, string> = {};
          msgs.forEach(m => { n[m.userId] = m.user.name; });
          setUserNames(n);
        })
        .catch(() => {});
    } else {
      // No cache — show spinner and fetch
      setLoading(true);
      api.get<ChatMessage[]>(`/chat/${courseId}/messages?limit=50`)
        .then(msgs => {
          setMessages(msgs);
          setHasMore(msgs.length === 50);
          setCachedMessages(courseId, msgs);
          const n: Record<number, string> = {};
          msgs.forEach(m => { n[m.userId] = m.user.name; });
          setUserNames(n);
          setTimeout(() => scrollToBottom(false), 100);
        })
        .catch(() => toast.error("تعذّر تحميل الشات"))
        .finally(() => setLoading(false));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [courseId]);

  // Socket.io connection
  useEffect(() => {
    const token = typeof window !== "undefined" ? localStorage.getItem("nouvil_token") : null;
    const socket = io("", {
      path: "/api/socket.io",
      auth: { token: token ? `Bearer ${token}` : undefined },
      transports: ["polling", "websocket"],
    });
    socketRef.current = socket;

    socket.on("connect", () => {
      setConnected(true);
      socket.emit("join_course", parseInt(courseId, 10));
    });
    socket.on("disconnect", () => setConnected(false));
    socket.on("connect_error", () => setConnected(false));

    socket.on("new_message", (msg: ChatMessage) => {
      setMessages(prev => {
        const next = [...prev, msg];
        setCachedMessages(courseId, next);
        return next;
      });
      setUserNames(prev => ({ ...prev, [msg.userId]: msg.user.name }));
      if (isNearBottom()) scrollToBottom();
      else { setUnreadCount(c => c + 1); setShowScrollBtn(true); }
    });

    socket.on("message_deleted", ({ id, forEveryone }: { id: number; forEveryone: boolean; userId?: number }) => {
      setMessages(prev => {
        const next = forEveryone
          ? prev.map(m => m.id === id ? { ...m, deletedForEveryone: true, content: "", type: "text" as const } : m)
          : prev.filter(m => m.id !== id);
        setCachedMessages(courseId, next);
        return next;
      });
    });

    socket.on("message_pinned", ({ id, isPinned }: { id: number; isPinned: boolean }) => {
      setMessages(prev => prev.map(m => m.id === id ? { ...m, isPinned } : m));
      api.get<ChatMessage[]>(`/chat/${courseId}/pinned`).then(setPinnedMessages).catch(() => {});
    });

    socket.on("reaction_added", ({ messageId, userId: uid, emoji }: { messageId: number; userId: number; emoji: string }) => {
      setMessages(prev => prev.map(m => {
        if (m.id !== messageId) return m;
        const uName = userNames[uid] ?? "";
        const existing = m.reactions.find(r => r.emoji === emoji);
        if (existing) return { ...m, reactions: m.reactions.map(r => r.emoji === emoji ? { ...r, count: r.count + 1, users: [...r.users, uid], userNames: [...(r.userNames ?? []), uName] } : r) };
        return { ...m, reactions: [...m.reactions, { emoji, count: 1, users: [uid], userNames: [uName] }] };
      }));
    });

    socket.on("reaction_removed", ({ messageId, userId: uid, emoji }: { messageId: number; userId: number; emoji: string }) => {
      setMessages(prev => prev.map(m => m.id !== messageId ? m : {
        ...m,
        reactions: m.reactions.map(r => r.emoji === emoji ? { ...r, count: r.count - 1, users: r.users.filter(u => u !== uid), userNames: (r.userNames ?? []).filter(n => n !== userNames[uid]) } : r).filter(r => r.count > 0),
      }));
    });

    socket.on("user_typing", ({ userId: uid, name }: { userId: number; name: string }) => {
      setTypingUsers(prev => prev.find(u => u.userId === uid) ? prev : [...prev, { userId: uid, name }]);
      setTimeout(() => setTypingUsers(prev => prev.filter(u => u.userId !== uid)), 3000);
    });

    socket.on("kicked", () => { toast.error("تم طردك من شات هذا الكورس"); onClose(); });
    socket.on("user_muted", ({ userId: uid }: { userId: number }) => { if (uid === user?.id) toast.warning("تم كتمك في هذا الكورس"); });
    socket.on("user_banned", ({ userId: uid }: { userId: number }) => { if (uid === user?.id) { toast.error("تم حظرك من هذا الكورس"); onClose(); } });
    socket.on("user_unmuted", ({ userId: uid }: { userId: number }) => { if (uid === user?.id) toast.success("تم رفع الكتم عنك"); });

    return () => {
      socket.emit("leave_course", parseInt(courseId, 10));
      socket.disconnect();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [courseId]);

  // Load older messages (lazy loading)
  const loadMore = useCallback(async () => {
    if (!hasMore || loadingMore || messages.length === 0) return;
    const oldestId = messages[0]?.id;
    const container = messagesContainerRef.current;
    const prevScrollHeight = container?.scrollHeight ?? 0;
    setLoadingMore(true);
    try {
      const older = await api.get<ChatMessage[]>(`/chat/${courseId}/messages?limit=50&before=${oldestId}`);
      if (older.length === 0) { setHasMore(false); return; }
      older.forEach(m => { setUserNames(prev => ({ ...prev, [m.userId]: m.user.name })); });
      setMessages(prev => [...older, ...prev]);
      setHasMore(older.length === 50);
      requestAnimationFrame(() => { if (container) container.scrollTop = container.scrollHeight - prevScrollHeight; });
    } catch { /* ignore */ }
    finally { setLoadingMore(false); }
  }, [courseId, hasMore, loadingMore, messages]);

  const handleScroll = useCallback(() => {
    const el = messagesContainerRef.current;
    if (!el) return;
    if (el.scrollTop < 100 && hasMore && !loadingMore) loadMore();
    if (isNearBottom()) { setShowScrollBtn(false); setUnreadCount(0); }
    else if (!showScrollBtn && !isNearBottom()) setShowScrollBtn(true);
  }, [loadMore, hasMore, loadingMore, isNearBottom, showScrollBtn]);

  // Text change & @mention detection
  const textRef2 = useRef<HTMLTextAreaElement | null>(null);
  const handleTextChange = (val: string) => {
    setText(val);
    const el = document.querySelector("textarea[placeholder*='اكتب']") as HTMLTextAreaElement | null;
    const cursorPos = el?.selectionStart ?? val.length;
    const before = val.slice(0, cursorPos);
    const match = before.match(/@(\w*)$/);
    if (match) setMentionQuery(match[1] ?? "");
    else setMentionQuery(null);
  };

  const selectMention = (member: CourseMember) => {
    const el = document.querySelector("textarea[placeholder*='اكتب']") as HTMLTextAreaElement | null;
    const cursorPos = el?.selectionStart ?? text.length;
    const before = text.slice(0, cursorPos).replace(/@\w*$/, `@${member.name} `);
    const after = text.slice(cursorPos);
    setText(before + after);
    setMentionedUsers(prev => ({ ...prev, [member.name]: member.id }));
    setMentionQuery(null);
    el?.focus();
  };

  const extractMentionIds = (content: string): number[] => {
    const matches = content.match(/@(\S+)/g) ?? [];
    const ids: number[] = [];
    for (const m of matches) {
      const name = m.slice(1);
      const id = mentionedUsers[name] ?? members.find(mb => mb.name === name || mb.username === name)?.id;
      if (id && !ids.includes(id)) ids.push(id);
    }
    return ids;
  };

  const emitTyping = useCallback(() => {
    if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
    socketRef.current?.emit("typing", parseInt(courseId, 10));
  }, [courseId]);

  // Send handlers
  const handleSend = useCallback(async () => {
    if (sending || uploading) return;
    if (pendingAttachment) {
      await sendFile(pendingAttachment.file, text.trim());
      return;
    }
    if (!text.trim()) return;
    setSending(true);
    const mentions = extractMentionIds(text);
    try {
      await api.post(`/chat/${courseId}/messages`, { content: text, type: "text", replyToId: replyTo?.id ?? null, mentions });
      setText(""); setReplyTo(null); setMentionedUsers({});
      const el = document.querySelector("textarea[placeholder*='اكتب']") as HTMLTextAreaElement | null;
      if (el) { el.style.height = "auto"; }
    } catch (e) { toast.error(e instanceof Error ? e.message : "فشل الإرسال"); }
    finally { setSending(false); }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text, sending, uploading, pendingAttachment, replyTo, courseId, mentionedUsers, members]);

  const sendFile = async (file: File, caption = "") => {
    setUploading(true);
    const type: "image" | "video" | "audio" | "file" =
      file.type.startsWith("image/") ? "image" :
      file.type.startsWith("video/") ? "video" :
      file.type.startsWith("audio/") ? "audio" : "file";
    try {
      const url = await uploadChatFile(file);
      await api.post(`/chat/${courseId}/messages`, {
        content: caption, type, fileUrl: url, fileName: file.name,
        fileSize: file.size, replyToId: replyTo?.id ?? null,
      });
      setText(""); setReplyTo(null); setPendingAttachment(null);
    } catch (e) { toast.error(e instanceof Error ? e.message : "فشل الرفع"); }
    finally { setUploading(false); }
  };

  const sendVoice = async (blob: Blob, duration: number) => {
    setRecording(false);
    setUploading(true);
    try {
      const ext = blob.type.includes("ogg") ? "ogg" : blob.type.includes("mp4") ? "m4a" : "webm";
      const file = new File([blob], `voice_${Date.now()}.${ext}`, { type: blob.type });
      const url = await uploadChatFile(file);
      await api.post(`/chat/${courseId}/messages`, {
        content: "", type: "audio", fileUrl: url, fileName: file.name,
        fileSize: duration,
        replyToId: replyTo?.id ?? null,
      });
      setReplyTo(null);
    } catch (e) { toast.error(e instanceof Error ? e.message : "فشل إرسال الرسالة الصوتية"); }
    finally { setUploading(false); }
  };

  const reactTo = useCallback(async (msgId: number, emoji: string) => {
    try { await api.post(`/chat/messages/${msgId}/react`, { emoji }); }
    catch { toast.error("فشل التفاعل"); }
  }, []);

  const deleteMsg = useCallback(async (msg: ChatMessage, forEveryone: boolean) => {
    setDeleteTarget(null);
    try { await api.delete(`/chat/messages/${msg.id}?forEveryone=${forEveryone}`); }
    catch { toast.error("فشل الحذف"); }
  }, []);

  const pinMsg = useCallback(async (msgId: number, isPinned: boolean) => {
    try {
      await api.put(`/chat/messages/${msgId}/pin`, {});
      toast.success(isPinned ? "تم إلغاء التثبيت" : "تم تثبيت الرسالة");
    } catch { toast.error("فشل التثبيت"); }
  }, []);

  const handleEmojiSelect = (emoji: string) => {
    setText(prev => prev + emoji);
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}
      transition={{ duration: 0.2 }}
      className="flex flex-col h-full dark:bg-[#080e1a] bg-white overflow-hidden rounded-2xl"
    >
      {/* File input */}
      <input ref={fileRef} type="file" className="hidden"
        accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.txt,.zip,.rar"
        onChange={e => {
          const file = e.target.files?.[0];
          e.target.value = "";
          if (!file) return;
          const type: "image" | "video" | "audio" | "file" =
            file.type.startsWith("image/") ? "image" :
            file.type.startsWith("video/") ? "video" :
            file.type.startsWith("audio/") ? "audio" : "file";
          const previewUrl = (type === "image" || type === "video") ? URL.createObjectURL(file) : null;
          setPendingAttachment({ file, previewUrl, type });
        }} />

      {/* ── Header ── */}
      <div className="flex items-center justify-between px-4 py-3 border-b dark:border-white/5 border-slate-200 dark:bg-[#060c18] bg-white flex-shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-cyan-500 to-violet-500 flex items-center justify-center shadow-lg shadow-cyan-500/20 flex-shrink-0">
            <MessageCircle className="w-4.5 h-4.5 text-white" />
          </div>
          <div className="min-w-0">
            <p className="font-black dark:text-white text-slate-900 text-sm leading-tight">شات الكورس</p>
            {courseTitle && <p className="text-xs dark:text-slate-500 text-slate-400 truncate max-w-[130px]">{courseTitle}</p>}
          </div>
          <div className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold flex-shrink-0 ${connected ? "dark:bg-green-500/10 bg-green-50 text-green-400 border dark:border-green-500/20 border-green-200" : "dark:bg-slate-700/50 bg-slate-100 dark:text-slate-500 text-slate-400"}`}>
            <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${connected ? "bg-green-400 animate-pulse" : "bg-slate-400"}`} />
            {connected ? "متصل" : "غير متصل"}
          </div>
        </div>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          {pinnedMessages.length > 0 && (
            <button onClick={() => setShowPinned(o => !o)}
              className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-semibold transition-colors ${showPinned ? "bg-amber-500/15 text-amber-400 border border-amber-500/25" : "dark:bg-white/5 bg-slate-100 dark:text-slate-400 text-slate-500 hover:dark:bg-white/10 hover:bg-slate-200"}`}>
              <Pin className="w-3 h-3" />{pinnedMessages.length}
            </button>
          )}
          {members.length > 0 && (
            <div className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs dark:bg-white/5 bg-slate-100 dark:text-slate-400 text-slate-500">
              <Users className="w-3 h-3" />{members.length}
            </div>
          )}
          <button onClick={onClose}
            className="w-9 h-9 flex items-center justify-center rounded-xl dark:bg-white/5 bg-slate-100 dark:hover:bg-white/10 hover:bg-slate-200 transition-colors dark:text-slate-400 text-slate-500 hover:text-red-400 dark:hover:text-red-400">
            <X className="w-4.5 h-4.5" />
          </button>
        </div>
      </div>

      {/* ── Pinned Panel ── */}
      <AnimatePresence>
        {showPinned && pinnedMessages.length > 0 && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}
            className="border-b dark:border-white/5 border-slate-200 dark:bg-[#0a1220] bg-slate-50 overflow-hidden">
            <div className="p-3 space-y-1.5 max-h-48 overflow-y-auto">
              <p className="text-xs font-bold text-amber-400 flex items-center gap-1.5 mb-2">
                <Pin className="w-3 h-3" />الرسائل المثبتة ({pinnedMessages.length})
              </p>
              {pinnedMessages.map(pm => (
                <button key={pm.id} onClick={() => { scrollToMessage(pm.id); setShowPinned(false); }}
                  className="w-full text-right p-2.5 rounded-xl dark:bg-white/5 bg-white hover:dark:bg-white/10 hover:bg-slate-100 transition-colors border dark:border-white/5 border-slate-200">
                  <p className="text-xs text-amber-400 font-semibold mb-0.5">{pm.user.name}</p>
                  <p className="text-xs dark:text-slate-300 text-slate-600 line-clamp-2">
                    {pm.type !== "text" ? `[${pm.fileName ?? "ملف"}]` : pm.content.slice(0, 100)}
                  </p>
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Messages ── */}
      <div ref={messagesContainerRef} onScroll={handleScroll}
        className="flex-1 overflow-y-auto px-3 py-3 relative scroll-smooth">
        {loadingMore && (
          <div className="flex justify-center py-3"><Loader2 className="w-5 h-5 text-cyan-400 animate-spin" /></div>
        )}
        {hasMore && !loadingMore && messages.length > 0 && (
          <div className="flex justify-center py-2">
            <button onClick={loadMore}
              className="flex items-center gap-1.5 text-xs dark:text-slate-500 text-slate-400 hover:text-cyan-400 transition-colors dark:bg-white/5 bg-slate-100 px-3 py-1.5 rounded-full">
              <ChevronDown className="w-3.5 h-3.5 rotate-180" />تحميل رسائل أقدم
            </button>
          </div>
        )}

        {loading ? (
          <div className="flex flex-col items-center justify-center h-64">
            <Loader2 className="w-8 h-8 text-cyan-400 animate-spin mb-3" />
            <p className="dark:text-slate-400 text-slate-500 text-sm">جاري التحميل...</p>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64">
            <div className="w-16 h-16 rounded-2xl dark:bg-white/5 bg-slate-100 flex items-center justify-center mb-4">
              <MessageCircle className="w-8 h-8 dark:text-slate-600 text-slate-300" />
            </div>
            <p className="dark:text-slate-400 text-slate-600 font-bold">لا توجد رسائل بعد</p>
            <p className="dark:text-slate-500 text-slate-400 text-sm mt-1">كن أول من يبدأ المحادثة!</p>
          </div>
        ) : (
          <AnimatePresence initial={false}>
            {groupedMessages.map(group => (
              <div key={group.date}>
                <DateSeparator date={group.messages[0]!.createdAt} />
                {group.messages.map(msg => (
                  <motion.div key={msg.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.15 }}>
                    <MessageBubble
                      msg={msg}
                      isOwn={msg.userId === user?.id}
                      currentUserId={user?.id ?? 0}
                      isAdmin={isAdmin}
                      onReply={setReplyTo}
                      onReact={reactTo}
                      onDelete={setDeleteTarget}
                      onPin={pinMsg}
                      onModerate={setModerateTarget}
                      onOpenMedia={(src, type, fileName) => setLightbox({ src, type, fileName })}
                      isHighlighted={highlightedMsgId === msg.id}
                      messageRef={el => { messageRefs.current[msg.id] = el; }}
                    />
                  </motion.div>
                ))}
              </div>
            ))}
          </AnimatePresence>
        )}

        {/* Typing indicator */}
        <AnimatePresence>
          {typingUsers.filter(u => u.userId !== user?.id).length > 0 && (
            <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 5 }}
              className="flex items-center gap-2 px-2 py-1">
              <div className="flex gap-1">
                {[0, 1, 2].map(i => (
                  <span key={i} className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
                ))}
              </div>
              <span className="text-xs dark:text-slate-500 text-slate-400">
                {typingUsers.filter(u => u.userId !== user?.id).map(u => u.name).join("، ")} يكتب...
              </span>
            </motion.div>
          )}
        </AnimatePresence>

        <div ref={bottomRef} />
      </div>

      {/* Scroll to bottom FAB */}
      <AnimatePresence>
        {showScrollBtn && (
          <motion.button initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8 }}
            onClick={() => scrollToBottom()}
            className="absolute bottom-28 left-1/2 -translate-x-1/2 z-40 flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-cyan-500 to-violet-600 text-white text-xs font-bold shadow-lg hover:opacity-90 transition-opacity">
            <ChevronDown className="w-3.5 h-3.5" />
            {unreadCount > 0 ? `${unreadCount} رسالة جديدة` : "للأسفل"}
          </motion.button>
        )}
      </AnimatePresence>

      {/* ── Input ── */}
      <MessageInput
        text={text}
        onChange={val => { handleTextChange(val); emitTyping(); }}
        onSend={handleSend}
        onMic={() => setRecording(true)}
        onAttach={() => fileRef.current?.click()}
        onEmojiToggle={() => setShowEmojiPicker(v => !v)}
        sending={sending}
        uploading={uploading}
        disabled={!user}
        mentionQuery={mentionQuery}
        members={members}
        onSelectMention={selectMention}
        replyTo={replyTo}
        onReplyClose={() => setReplyTo(null)}
        pendingAttachment={pendingAttachment}
        onAttachmentRemove={() => {
          if (pendingAttachment?.previewUrl) URL.revokeObjectURL(pendingAttachment.previewUrl);
          setPendingAttachment(null);
        }}
        recording={recording}
        onRecordSend={sendVoice}
        onRecordCancel={() => setRecording(false)}
        showEmojiPicker={showEmojiPicker}
        setShowEmojiPicker={setShowEmojiPicker}
        onEmojiSelect={handleEmojiSelect}
      />

      {/* ── Modals ── */}
      <AnimatePresence>
        {deleteTarget && (
          <DeleteDialog
            msg={deleteTarget}
            isOwn={deleteTarget.userId === user?.id}
            isAdmin={isAdmin}
            onConfirm={fe => deleteMsg(deleteTarget, fe)}
            onClose={() => setDeleteTarget(null)}
          />
        )}
        {moderateTarget && (
          <AdminModerationModal targetUser={moderateTarget} courseId={courseId} onClose={() => setModerateTarget(null)} />
        )}
        {lightbox && (
          <MediaLightbox src={lightbox.src} type={lightbox.type} fileName={lightbox.fileName} onClose={() => setLightbox(null)} />
        )}
      </AnimatePresence>
    </motion.div>
  );
}
