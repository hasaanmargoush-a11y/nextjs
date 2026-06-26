"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { api, uploadFile } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { toast } from "sonner";
import {
  Send, Pin, Trash2, MoreVertical, Smile, Reply,
  Paperclip, Mic, Image as ImageIcon, FileText, Download,
  VolumeX, Ban, X, Loader2, ChevronDown, MessageCircle, AlertTriangle
} from "lucide-react";
import { io, Socket } from "socket.io-client";

interface ChatUser {
  id: number;
  name: string;
  avatar?: string | null;
  role: string;
}

interface ReactionGroup {
  emoji: string;
  count: number;
  users: number[];
}

interface ChatMessage {
  id: number;
  courseId: number;
  userId: number;
  content: string;
  type: "text" | "image" | "video" | "file" | "audio";
  fileUrl?: string | null;
  fileName?: string | null;
  fileSize?: number | null;
  replyToId?: number | null;
  isPinned: boolean;
  isDeleted: boolean;
  deletedForEveryone: boolean;
  createdAt: string;
  user: ChatUser;
  reactions: ReactionGroup[];
  replyTo?: (ChatMessage & { user: { name: string } }) | null;
}

interface MuteInfo {
  id: number;
  userId: number;
  mutedUntil: string | null;
  userName: string;
  userAvatar?: string | null;
}

interface Props {
  courseId: number;
}

const EMOJIS = ["👍", "❤️", "😂", "😮", "😢", "🔥", "👏", "🎉"];

function formatTime(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit" });
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  const today = new Date();
  if (d.toDateString() === today.toDateString()) return "اليوم";
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  if (d.toDateString() === yesterday.toDateString()) return "أمس";
  return d.toLocaleDateString("ar-EG", { day: "numeric", month: "long" });
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function CourseChatTab({ courseId }: Props) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [pinnedMessages, setPinnedMessages] = useState<ChatMessage[]>([]);
  const [muteList, setMuteList] = useState<MuteInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [text, setText] = useState("");
  const [replyTo, setReplyTo] = useState<ChatMessage | null>(null);
  const [activeMenu, setActiveMenu] = useState<number | null>(null);
  const [emojiPickerFor, setEmojiPickerFor] = useState<number | null>(null);
  const [showPinned, setShowPinned] = useState(false);
  const [showMutes, setShowMutes] = useState(false);
  const [banModal, setBanModal] = useState<{ userId: number; name: string } | null>(null);
  const [banReason, setBanReason] = useState("");
  const [banDays, setBanDays] = useState("");
  const [banSitewide, setBanSitewide] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [socketConnected, setSocketConnected] = useState(false);

  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const audioRef = useRef<HTMLInputElement>(null);
  const socketRef = useRef<Socket | null>(null);

  const scrollToBottom = useCallback(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  const loadMessages = useCallback(async () => {
    setLoading(true);
    try {
      const [msgs, pinned, mutes] = await Promise.all([
        api.get<ChatMessage[]>(`/chat/${courseId}/messages?limit=50`),
        api.get<ChatMessage[]>(`/chat/${courseId}/pinned`),
        api.get<MuteInfo[]>(`/chat/${courseId}/mutes`),
      ]);
      setMessages(msgs);
      setPinnedMessages(pinned);
      setMuteList(mutes);
    } catch { toast.error("تعذّر تحميل الشات"); }
    finally { setLoading(false); }
  }, [courseId]);

  useEffect(() => {
    loadMessages();
  }, [loadMessages]);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

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
      setSocketConnected(true);
      socket.emit("join_course", courseId);
    });
    socket.on("disconnect", () => setSocketConnected(false));

    socket.on("new_message", (msg: ChatMessage) => {
      setMessages(prev => [...prev, msg]);
    });
    socket.on("message_deleted", ({ id, forEveryone }: { id: number; forEveryone: boolean }) => {
      if (forEveryone) {
        setMessages(prev => prev.map(m => m.id === id ? { ...m, deletedForEveryone: true, content: "" } : m));
      } else {
        setMessages(prev => prev.filter(m => m.id !== id));
      }
    });
    socket.on("message_pinned", ({ id, isPinned }: { id: number; isPinned: boolean }) => {
      setMessages(prev => prev.map(m => m.id === id ? { ...m, isPinned } : m));
      loadMessages();
    });
    socket.on("reaction_added", ({ messageId, userId: uid, emoji }: { messageId: number; userId: number; emoji: string }) => {
      setMessages(prev => prev.map(m => {
        if (m.id !== messageId) return m;
        const existing = m.reactions.find(r => r.emoji === emoji);
        if (existing) {
          return { ...m, reactions: m.reactions.map(r => r.emoji === emoji ? { ...r, count: r.count + 1, users: [...r.users, uid] } : r) };
        }
        return { ...m, reactions: [...m.reactions, { emoji, count: 1, users: [uid] }] };
      }));
    });
    socket.on("reaction_removed", ({ messageId, userId: uid, emoji }: { messageId: number; userId: number; emoji: string }) => {
      setMessages(prev => prev.map(m => {
        if (m.id !== messageId) return m;
        return { ...m, reactions: m.reactions.map(r => r.emoji === emoji ? { ...r, count: r.count - 1, users: r.users.filter(u => u !== uid) } : r).filter(r => r.count > 0) };
      }));
    });
    socket.on("user_muted", () => loadMessages());
    socket.on("user_banned", () => loadMessages());

    return () => {
      socket.emit("leave_course", courseId);
      socket.disconnect();
    };
  }, [courseId, loadMessages]);

  const sendMessage = async (type: "text" | "image" | "video" | "file" | "audio" = "text", fileData?: { fileUrl: string; fileName: string; fileSize: number }) => {
    if (type === "text" && !text.trim()) return;
    setSending(true);
    try {
      const mentions: number[] = [];
      const mentionRegex = /@(\w+)/g;
      let match;
      while ((match = mentionRegex.exec(text)) !== null) {
        mentions.push(0);
      }
      const payload: Record<string, unknown> = {
        content: type === "text" ? text : "",
        type,
        replyToId: replyTo?.id ?? null,
        mentions,
        ...(fileData ?? {}),
      };
      await api.post<ChatMessage>(`/chat/${courseId}/messages`, payload);
      setText("");
      setReplyTo(null);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "فشل الإرسال");
    } finally {
      setSending(false);
    }
  };

  const handleFileUpload = async (file: File, type: "image" | "video" | "file" | "audio") => {
    setUploading(true);
    try {
      const fileUrl = await uploadFile(file);
      await sendMessage(type, { fileUrl, fileName: file.name, fileSize: file.size });
      toast.success("تم إرسال الملف");
    } catch { toast.error("فشل رفع الملف"); }
    finally { setUploading(false); }
  };

  const deleteMessage = async (msg: ChatMessage, forEveryone: boolean) => {
    try {
      await api.delete(`/chat/messages/${msg.id}?forEveryone=${forEveryone}`);
    } catch (e) { toast.error(e instanceof Error ? e.message : "خطأ"); }
    setActiveMenu(null);
  };

  const pinMessage = async (msg: ChatMessage) => {
    try {
      await api.put(`/chat/messages/${msg.id}/pin`, {});
      toast.success(msg.isPinned ? "تم فك التثبيت" : "تم تثبيت الرسالة");
    } catch (e) { toast.error(e instanceof Error ? e.message : "خطأ"); }
    setActiveMenu(null);
  };

  const reactToMessage = async (msgId: number, emoji: string) => {
    try {
      await api.post(`/chat/messages/${msgId}/react`, { emoji });
    } catch (e) { toast.error(e instanceof Error ? e.message : "خطأ"); }
    setEmojiPickerFor(null);
  };

  const muteUser = async (userId: number, minutes?: number) => {
    try {
      await api.post(`/chat/${courseId}/mute/${userId}`, { minutes });
      toast.success("تم كتم المستخدم");
      loadMessages();
    } catch (e) { toast.error(e instanceof Error ? e.message : "خطأ"); }
    setActiveMenu(null);
  };

  const unmuteUser = async (userId: number) => {
    try {
      await api.delete(`/chat/${courseId}/mute/${userId}`);
      toast.success("تم رفع الكتم");
      loadMessages();
    } catch (e) { toast.error(e instanceof Error ? e.message : "خطأ"); }
  };

  const banUser = async () => {
    if (!banModal) return;
    try {
      await api.post(`/chat/ban/${banModal.userId}`, {
        courseId: banSitewide ? null : courseId,
        reason: banReason || null,
        days: banDays ? parseInt(banDays) : null,
      });
      toast.success("تم الحظر");
      setBanModal(null);
      setBanReason("");
      setBanDays("");
    } catch (e) { toast.error(e instanceof Error ? e.message : "خطأ"); }
  };

  const isAdmin = user?.role && ["admin", "super_admin", "content_admin"].includes(user.role);
  const isUserMuted = (userId: number) => muteList.some(m => m.userId === userId);

  // Group messages by date
  const groupedMessages: { date: string; messages: ChatMessage[] }[] = [];
  for (const msg of messages) {
    const date = formatDate(msg.createdAt);
    const group = groupedMessages.find(g => g.date === date);
    if (group) group.messages.push(msg);
    else groupedMessages.push({ date, messages: [msg] });
  }

  return (
    <div className="flex flex-col h-[calc(100vh-240px)] min-h-[500px] dark:bg-[#111827] bg-white rounded-2xl border dark:border-white/10 border-slate-200 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b dark:border-white/10 border-slate-200 flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-cyan-500/20 flex items-center justify-center">
            <MessageCircle className="w-4 h-4 text-cyan-400" />
          </div>
          <div>
            <h3 className="font-bold dark:text-white text-slate-900 text-sm">شات الكورس</h3>
            <div className="flex items-center gap-1.5">
              <div className={`w-2 h-2 rounded-full ${socketConnected ? "bg-emerald-400" : "bg-slate-400"}`} />
              <span className="text-xs dark:text-slate-400 text-slate-500">{socketConnected ? "متصل" : "غير متصل"}</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setShowMutes(!showMutes)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs transition-colors ${showMutes ? "bg-amber-500/20 text-amber-400" : "dark:bg-white/5 bg-slate-100 dark:text-slate-400 text-slate-500"}`}>
            <VolumeX className="w-3.5 h-3.5" />المكتومون ({muteList.length})
          </button>
          <button onClick={() => setShowPinned(!showPinned)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs transition-colors ${showPinned ? "bg-violet-500/20 text-violet-400" : "dark:bg-white/5 bg-slate-100 dark:text-slate-400 text-slate-500"}`}>
            <Pin className="w-3.5 h-3.5" />المثبتة ({pinnedMessages.length})
          </button>
        </div>
      </div>

      {/* Pinned Messages Panel */}
      <AnimatePresence>
        {showPinned && pinnedMessages.length > 0 && (
          <motion.div initial={{ height: 0 }} animate={{ height: "auto" }} exit={{ height: 0 }}
            className="border-b dark:border-white/10 border-slate-200 overflow-hidden flex-shrink-0">
            <div className="p-3 space-y-2 max-h-40 overflow-y-auto">
              <p className="text-xs font-bold dark:text-slate-400 text-slate-500">الرسائل المثبتة</p>
              {pinnedMessages.map(msg => (
                <div key={msg.id} className="flex items-start gap-2 p-2 rounded-lg dark:bg-violet-500/10 bg-violet-50">
                  <Pin className="w-3.5 h-3.5 text-violet-400 flex-shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium dark:text-violet-300 text-violet-700">{msg.user.name}</p>
                    <p className="text-xs dark:text-slate-300 text-slate-700 truncate">{msg.content}</p>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Muted Users Panel */}
      <AnimatePresence>
        {showMutes && (
          <motion.div initial={{ height: 0 }} animate={{ height: "auto" }} exit={{ height: 0 }}
            className="border-b dark:border-white/10 border-slate-200 overflow-hidden flex-shrink-0">
            <div className="p-3 space-y-2 max-h-40 overflow-y-auto">
              <p className="text-xs font-bold dark:text-slate-400 text-slate-500">المستخدمون المكتومون</p>
              {muteList.length === 0 ? (
                <p className="text-xs dark:text-slate-500 text-slate-400">لا يوجد مكتومون</p>
              ) : muteList.map(m => (
                <div key={m.id} className="flex items-center gap-2 p-2 rounded-lg dark:bg-amber-500/10 bg-amber-50">
                  <div className="w-6 h-6 rounded-full dark:bg-white/10 bg-slate-200 flex items-center justify-center flex-shrink-0 text-xs font-bold dark:text-white text-slate-700">
                    {m.userName[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium dark:text-amber-300 text-amber-700">{m.userName}</p>
                    {m.mutedUntil && <p className="text-xs dark:text-slate-400 text-slate-500">حتى {new Date(m.mutedUntil).toLocaleDateString("ar-EG")}</p>}
                  </div>
                  <button onClick={() => unmuteUser(m.userId)} className="text-xs text-emerald-400 hover:text-emerald-300 transition-colors">رفع الكتم</button>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-1" onClick={() => { setActiveMenu(null); setEmojiPickerFor(null); }}>
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="w-8 h-8 animate-spin text-cyan-400" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full dark:text-slate-500 text-slate-400">
            <MessageCircle className="w-12 h-12 mb-3 opacity-30" />
            <p>لا توجد رسائل بعد</p>
            <p className="text-sm mt-1">كن أول من يبدأ المحادثة!</p>
          </div>
        ) : (
          groupedMessages.map(group => (
            <div key={group.date}>
              {/* Date separator */}
              <div className="flex items-center gap-3 my-4">
                <div className="flex-1 h-px dark:bg-white/10 bg-slate-200" />
                <span className="text-xs dark:text-slate-500 text-slate-400 px-2">{group.date}</span>
                <div className="flex-1 h-px dark:bg-white/10 bg-slate-200" />
              </div>

              {group.messages.map(msg => {
                const isOwn = msg.userId === user?.id;
                const isMuted = isUserMuted(msg.userId);

                if (msg.deletedForEveryone) {
                  return (
                    <div key={msg.id} className="flex justify-center my-1">
                      <span className="text-xs dark:text-slate-600 text-slate-400 italic">تم حذف هذه الرسالة</span>
                    </div>
                  );
                }

                return (
                  <div key={msg.id} className={`group flex items-end gap-2 mb-1 ${isOwn ? "flex-row-reverse" : "flex-row"}`}>
                    {/* Avatar */}
                    {!isOwn && (
                      <div className="w-7 h-7 rounded-full flex-shrink-0 mb-1 overflow-hidden">
                        {msg.user.avatar ? (
                          <img src={msg.user.avatar} alt={msg.user.name} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full dark:bg-white/10 bg-slate-200 flex items-center justify-center text-xs font-bold dark:text-white text-slate-700">
                            {msg.user.name[0]}
                          </div>
                        )}
                      </div>
                    )}

                    <div className={`flex flex-col ${isOwn ? "items-end" : "items-start"} max-w-[70%]`}>
                      {/* Sender name */}
                      {!isOwn && (
                        <span className="text-xs dark:text-slate-400 text-slate-500 mb-1 px-1">
                          {msg.user.name}
                          {msg.user.role !== "user" && <span className="mr-1 text-cyan-400 text-xs">({msg.user.role})</span>}
                          {isMuted && <VolumeX className="inline w-3 h-3 text-amber-400 mr-1" />}
                        </span>
                      )}

                      {/* Reply preview */}
                      {msg.replyTo && (
                        <div className={`text-xs dark:bg-white/5 bg-slate-100 rounded-t-lg px-2 py-1 mb-0 border-r-2 border-cyan-400 w-full ${isOwn ? "text-right" : "text-right"}`}>
                          <span className="text-cyan-400 font-medium">{msg.replyTo.user.name}</span>
                          <span className="dark:text-slate-400 text-slate-500 mr-1 truncate block">{msg.replyTo.content.slice(0, 50)}</span>
                        </div>
                      )}

                      {/* Message bubble */}
                      <div className={`relative px-3 py-2 rounded-2xl ${isOwn ? "bg-cyan-500 text-white rounded-br-sm" : "dark:bg-white/10 bg-slate-100 dark:text-white text-slate-900 rounded-bl-sm"} ${msg.replyTo ? "rounded-t-none" : ""}`}>
                        {msg.type === "text" && <p className="text-sm leading-relaxed break-words">{msg.content}</p>}
                        {msg.type === "image" && msg.fileUrl && (
                          <div>
                            <img src={msg.fileUrl.startsWith("/") ? `/api/storage/objects${msg.fileUrl}` : msg.fileUrl}
                              alt="صورة" className="rounded-xl max-w-full max-h-60 cursor-pointer" />
                            {msg.content && <p className="text-sm mt-1">{msg.content}</p>}
                          </div>
                        )}
                        {(msg.type === "file" || msg.type === "audio") && msg.fileUrl && (
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center flex-shrink-0">
                              {msg.type === "audio" ? <Mic className="w-4 h-4" /> : <FileText className="w-4 h-4" />}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-medium truncate">{msg.fileName ?? "ملف"}</p>
                              {msg.fileSize && <p className="text-xs opacity-70">{formatFileSize(msg.fileSize)}</p>}
                            </div>
                            <a href={msg.fileUrl.startsWith("/") ? `/api/storage/objects${msg.fileUrl}` : msg.fileUrl}
                              download={msg.fileName ?? true} className="flex-shrink-0 opacity-70 hover:opacity-100 transition-opacity">
                              <Download className="w-4 h-4" />
                            </a>
                          </div>
                        )}
                        {msg.isPinned && <Pin className="absolute -top-2 -left-2 w-3.5 h-3.5 text-violet-400" />}

                        {/* Message actions (show on hover) */}
                        <div className={`absolute ${isOwn ? "left-0 -translate-x-full" : "right-0 translate-x-full"} top-0 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity px-1`}>
                          <button onClick={e => { e.stopPropagation(); setEmojiPickerFor(msg.id); }}
                            className="w-6 h-6 rounded-full dark:bg-[#111827] bg-white shadow flex items-center justify-center text-xs hover:scale-110 transition-transform">
                            <Smile className="w-3.5 h-3.5 dark:text-slate-400 text-slate-500" />
                          </button>
                          <button onClick={e => { e.stopPropagation(); setReplyTo(msg); inputRef.current?.focus(); }}
                            className="w-6 h-6 rounded-full dark:bg-[#111827] bg-white shadow flex items-center justify-center text-xs hover:scale-110 transition-transform">
                            <Reply className="w-3.5 h-3.5 dark:text-slate-400 text-slate-500" />
                          </button>
                          {isAdmin && (
                            <button onClick={e => { e.stopPropagation(); setActiveMenu(activeMenu === msg.id ? null : msg.id); }}
                              className="w-6 h-6 rounded-full dark:bg-[#111827] bg-white shadow flex items-center justify-center text-xs hover:scale-110 transition-transform">
                              <MoreVertical className="w-3.5 h-3.5 dark:text-slate-400 text-slate-500" />
                            </button>
                          )}
                          {isOwn && (
                            <button onClick={() => deleteMessage(msg, false)}
                              className="w-6 h-6 rounded-full dark:bg-[#111827] bg-white shadow flex items-center justify-center text-xs hover:scale-110 transition-transform">
                              <Trash2 className="w-3.5 h-3.5 text-red-400" />
                            </button>
                          )}
                        </div>

                        {/* Admin context menu */}
                        {activeMenu === msg.id && (
                          <div className={`absolute ${isOwn ? "left-0" : "right-0"} top-8 z-20 dark:bg-[#1a2333] bg-white rounded-xl shadow-xl border dark:border-white/10 border-slate-200 min-w-44 overflow-hidden`}
                            onClick={e => e.stopPropagation()}>
                            <button onClick={() => pinMessage(msg)} className="w-full flex items-center gap-2 px-3 py-2 text-xs dark:text-slate-300 text-slate-700 dark:hover:bg-white/5 hover:bg-slate-50 transition-colors">
                              <Pin className="w-3.5 h-3.5 text-violet-400" />{msg.isPinned ? "فك التثبيت" : "تثبيت الرسالة"}
                            </button>
                            <button onClick={() => deleteMessage(msg, true)} className="w-full flex items-center gap-2 px-3 py-2 text-xs text-red-400 dark:hover:bg-white/5 hover:bg-slate-50 transition-colors">
                              <Trash2 className="w-3.5 h-3.5" />حذف للجميع
                            </button>
                            {msg.userId !== user?.id && (
                              <>
                                <div className="h-px dark:bg-white/10 bg-slate-100" />
                                {isUserMuted(msg.userId) ? (
                                  <button onClick={() => unmuteUser(msg.userId)} className="w-full flex items-center gap-2 px-3 py-2 text-xs text-emerald-400 dark:hover:bg-white/5 hover:bg-slate-50 transition-colors">
                                    <VolumeX className="w-3.5 h-3.5" />رفع الكتم
                                  </button>
                                ) : (
                                  <>
                                    <button onClick={() => muteUser(msg.userId, 60)} className="w-full flex items-center gap-2 px-3 py-2 text-xs text-amber-400 dark:hover:bg-white/5 hover:bg-slate-50 transition-colors">
                                      <VolumeX className="w-3.5 h-3.5" />كتم ساعة
                                    </button>
                                    <button onClick={() => muteUser(msg.userId)} className="w-full flex items-center gap-2 px-3 py-2 text-xs text-amber-400 dark:hover:bg-white/5 hover:bg-slate-50 transition-colors">
                                      <VolumeX className="w-3.5 h-3.5" />كتم دائم
                                    </button>
                                  </>
                                )}
                                <button onClick={() => { setBanModal({ userId: msg.userId, name: msg.user.name }); setActiveMenu(null); }}
                                  className="w-full flex items-center gap-2 px-3 py-2 text-xs text-red-400 dark:hover:bg-white/5 hover:bg-slate-50 transition-colors">
                                  <Ban className="w-3.5 h-3.5" />حظر المستخدم
                                </button>
                              </>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Reactions */}
                      {msg.reactions.length > 0 && (
                        <div className={`flex flex-wrap gap-1 mt-1 ${isOwn ? "justify-end" : "justify-start"}`}>
                          {msg.reactions.map(r => (
                            <button key={r.emoji} onClick={() => reactToMessage(msg.id, r.emoji)}
                              className={`flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-xs border transition-colors ${r.users.includes(user?.id ?? 0) ? "dark:border-cyan-500/50 border-cyan-400 dark:bg-cyan-500/10 bg-cyan-50" : "dark:border-white/10 border-slate-200 dark:bg-white/5 bg-slate-50"}`}>
                              <span>{r.emoji}</span>
                              <span className="dark:text-slate-300 text-slate-600">{r.count}</span>
                            </button>
                          ))}
                        </div>
                      )}

                      {/* Emoji picker */}
                      {emojiPickerFor === msg.id && (
                        <div className="flex gap-1 mt-1 p-1.5 dark:bg-[#1a2333] bg-white rounded-xl shadow-xl border dark:border-white/10 border-slate-200" onClick={e => e.stopPropagation()}>
                          {EMOJIS.map(emoji => (
                            <button key={emoji} onClick={() => reactToMessage(msg.id, emoji)}
                              className="w-7 h-7 flex items-center justify-center text-base hover:scale-125 transition-transform rounded-lg hover:bg-white/10">
                              {emoji}
                            </button>
                          ))}
                        </div>
                      )}

                      {/* Timestamp */}
                      <span className="text-xs dark:text-slate-600 text-slate-400 mt-0.5 px-1">{formatTime(msg.createdAt)}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          ))
        )}
        <div ref={bottomRef} />
      </div>

      {/* Reply preview */}
      <AnimatePresence>
        {replyTo && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}
            className="flex items-center gap-2 px-4 py-2 border-t dark:border-white/10 border-slate-200 dark:bg-white/5 bg-slate-50 flex-shrink-0">
            <Reply className="w-4 h-4 text-cyan-400 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-xs text-cyan-400 font-medium">{replyTo.user.name}</p>
              <p className="text-xs dark:text-slate-400 text-slate-500 truncate">{replyTo.content}</p>
            </div>
            <button onClick={() => setReplyTo(null)} className="flex-shrink-0 text-red-400"><X className="w-4 h-4" /></button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Input Area */}
      <div className="p-3 border-t dark:border-white/10 border-slate-200 flex-shrink-0">
        <div className="flex items-end gap-2">
          {/* File attachments */}
          <div className="flex gap-1 flex-shrink-0">
            <input ref={fileRef} type="file" className="hidden"
              onChange={e => e.target.files?.[0] && handleFileUpload(e.target.files[0], e.target.files[0].type.startsWith("image/") ? "image" : "file")} />
            <button onClick={() => fileRef.current?.click()} disabled={uploading}
              className="w-8 h-8 flex items-center justify-center rounded-lg dark:hover:bg-white/10 hover:bg-slate-100 transition-colors dark:text-slate-400 text-slate-500 disabled:opacity-50">
              <Paperclip className="w-4 h-4" />
            </button>
            <button onClick={() => { if (fileRef.current) { fileRef.current.accept = "image/*"; fileRef.current.click(); } }} disabled={uploading}
              className="w-8 h-8 flex items-center justify-center rounded-lg dark:hover:bg-white/10 hover:bg-slate-100 transition-colors dark:text-slate-400 text-slate-500 disabled:opacity-50">
              <ImageIcon className="w-4 h-4" />
            </button>
          </div>

          {/* Text input */}
          <div className="flex-1 relative">
            <input ref={inputRef} value={text} onChange={e => setText(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
              placeholder="اكتب رسالتك... (@ للمنشن)"
              className="w-full px-4 py-2.5 rounded-xl dark:bg-white/10 bg-slate-100 dark:text-white text-slate-900 placeholder:dark:text-slate-500 placeholder:text-slate-400 text-sm outline-none dark:focus:bg-white/15 focus:bg-slate-200 transition-colors" />
          </div>

          {/* Send button */}
          <button onClick={() => sendMessage()} disabled={!text.trim() || sending || uploading}
            className="w-10 h-10 flex items-center justify-center rounded-xl bg-cyan-500 text-white hover:bg-cyan-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex-shrink-0">
            {sending || uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Ban Modal */}
      {banModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
            className="dark:bg-[#111827] bg-white rounded-2xl border dark:border-white/10 border-slate-200 p-6 w-full max-w-md shadow-2xl">
            <div className="flex items-center gap-2 mb-5">
              <Ban className="w-5 h-5 text-red-400" />
              <h3 className="font-bold dark:text-white text-slate-900">حظر {banModal.name}</h3>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm dark:text-slate-300 text-slate-700 mb-1">سبب الحظر (اختياري)</label>
                <input value={banReason} onChange={e => setBanReason(e.target.value)}
                  className="input-field dark:bg-white/5 bg-slate-50 dark:border-white/10 border-slate-200 dark:text-white text-slate-900 text-sm w-full"
                  placeholder="مثال: مخالفة القواعد" />
              </div>
              <div>
                <label className="block text-sm dark:text-slate-300 text-slate-700 mb-1">مدة الحظر (بالأيام، فارغ = دائم)</label>
                <input type="number" min={1} value={banDays} onChange={e => setBanDays(e.target.value)}
                  className="input-field dark:bg-white/5 bg-slate-50 dark:border-white/10 border-slate-200 dark:text-white text-slate-900 text-sm w-full"
                  placeholder="مثال: 7" />
              </div>
              <label className="flex items-center gap-2 cursor-pointer p-3 rounded-xl dark:bg-red-500/10 bg-red-50 dark:border dark:border-red-500/20 border-red-100">
                <input type="checkbox" checked={banSitewide} onChange={e => setBanSitewide(e.target.checked)} className="w-4 h-4 accent-red-400" />
                <div>
                  <p className="text-sm text-red-400 font-medium flex items-center gap-1"><AlertTriangle className="w-4 h-4" />حظر من الموقع كله</p>
                  <p className="text-xs dark:text-slate-400 text-slate-500">وليس فقط من هذا الكورس</p>
                </div>
              </label>
              <div className="flex gap-2">
                <button onClick={banUser} className="flex-1 py-2.5 rounded-xl bg-red-500 text-white text-sm font-medium hover:bg-red-600 transition-colors flex items-center justify-center gap-1.5">
                  <Ban className="w-4 h-4" />تأكيد الحظر
                </button>
                <button onClick={() => setBanModal(null)} className="flex-1 btn-secondary justify-center py-2.5">إلغاء</button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
