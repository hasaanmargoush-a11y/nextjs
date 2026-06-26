"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { MainLayout } from "@/components/layout/MainLayout";
import { useAuth } from "@/lib/auth-context";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { useRef } from "react";
import {
  User, Shield, Share2, Bell, ChevronRight, Loader2, Save,
  Eye, EyeOff, Github, Linkedin, Twitter, Facebook,
  Phone, MapPin, Calendar, FileText, AtSign, Mail,
  CheckCircle, ArrowLeft, Camera,
} from "lucide-react";

type Tab = "profile" | "security" | "social" | "notifications";

const TABS: { id: Tab; label: string; icon: React.ReactNode; desc: string }[] = [
  { id: "profile",       label: "الملف الشخصي",   icon: <User className="w-4 h-4" />,    desc: "الاسم والبيو والمعلومات" },
  { id: "security",      label: "الأمان",          icon: <Shield className="w-4 h-4" />,   desc: "كلمة المرور والحساب" },
  { id: "social",        label: "روابط التواصل",   icon: <Share2 className="w-4 h-4" />,   desc: "GitHub وLinkedIn وغيرها" },
  { id: "notifications", label: "الإشعارات",        icon: <Bell className="w-4 h-4" />,     desc: "ما تريد أن يُشعرك به" },
];

export default function SettingsPage() {
  const { user, loading: authLoading, updateUser } = useAuth();
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("profile");
  const [saving, setSaving] = useState(false);
  const [savedTab, setSavedTab] = useState<Tab | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  const [name, setName]       = useState("");
  const [username, setUsername] = useState("");
  const [bio, setBio]         = useState("");
  const [phone, setPhone]     = useState("");
  const [address, setAddress] = useState("");
  const [age, setAge]         = useState("");

  const [currentPassword, setCurrentPassword]   = useState("");
  const [newPassword, setNewPassword]           = useState("");
  const [confirmPassword, setConfirmPassword]   = useState("");
  const [showCurrentPw, setShowCurrentPw]       = useState(false);
  const [showNewPw, setShowNewPw]               = useState(false);
  const [showConfirmPw, setShowConfirmPw]       = useState(false);

  const [github, setGithub]     = useState("");
  const [linkedin, setLinkedin] = useState("");
  const [twitter, setTwitter]   = useState("");
  const [facebook, setFacebook] = useState("");

  const [notifCourses, setNotifCourses]     = useState(true);
  const [notifProblems, setNotifProblems]   = useState(true);
  const [notifMarketing, setNotifMarketing] = useState(false);

  const [pwStep, setPwStep]           = useState<"form" | "otp">("form");
  const [pwOtp, setPwOtp]             = useState("");
  const [emailStep, setEmailStep]     = useState<"form" | "otp">("form");
  const [newEmailVal, setNewEmailVal] = useState("");
  const [emailOtp, setEmailOtp]       = useState("");

  useEffect(() => {
    if (!authLoading && !user) router.push("/auth/login");
  }, [user, authLoading, router]);

  useEffect(() => {
    if (user) {
      setName(user.name || "");
      setUsername(user.username || "");
      setBio(user.bio || "");
      setPhone(user.phone || "");
      setAddress(user.address || "");
      setAge(user.age ? String(user.age) : "");
      setGithub(user.github || "");
      setLinkedin(user.linkedin || "");
      setTwitter(user.twitter || "");
      setFacebook(user.facebook || "");
    }
  }, [user]);

  if (authLoading || !user) {
    return (
      <MainLayout>
        <div className="min-h-screen flex items-center justify-center dark:bg-[#0a0f1e] bg-slate-50">
          <Loader2 className="w-7 h-7 text-cyan-500 animate-spin" />
        </div>
      </MainLayout>
    );
  }

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { toast.error("الحد الأقصى لحجم الصورة 5 ميجا"); return; }
    setAvatarPreview(URL.createObjectURL(file));
    setUploadingAvatar(true);
    try {
      const token = typeof window !== "undefined" ? localStorage.getItem("nouvil_token") : null;
      const formData = new FormData();
      formData.append("avatar", file);
      const res = await fetch("/api/users/me/avatar", {
        method: "POST",
        credentials: "include",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: formData,
      });
      const json = await res.json() as { user?: typeof user; error?: string };
      if (!res.ok) throw new Error(json.error ?? "فشل رفع الصورة");
      if (json.user) updateUser(json.user as typeof user);
      toast.success("تم تحديث صورة البروفايل");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "حدث خطأ في الرفع");
      setAvatarPreview(null);
    } finally {
      setUploadingAvatar(false);
      if (avatarInputRef.current) avatarInputRef.current.value = "";
    }
  };

  const flashSaved = (t: Tab) => {
    setSavedTab(t);
    setTimeout(() => setSavedTab(null), 2500);
  };

  const handleSaveProfile = async () => {
    if (!name.trim()) { toast.error("الاسم مطلوب"); return; }
    setSaving(true);
    try {
      const res = await api.patch<{ user: typeof user }>("/users/me", {
        name: name.trim(),
        username: username.trim() || undefined,
        bio: bio.trim() || undefined,
        phone: phone.trim() || undefined,
        address: address.trim() || undefined,
        age: age ? parseInt(age, 10) : undefined,
      });
      updateUser(res.user as typeof user);
      toast.success("تم حفظ الملف الشخصي");
      flashSaved("profile");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "حدث خطأ في الحفظ");
    } finally {
      setSaving(false);
    }
  };

  const handleSaveSocial = async () => {
    setSaving(true);
    try {
      const res = await api.patch<{ user: typeof user }>("/users/me", {
        github:   github.trim()   || undefined,
        linkedin: linkedin.trim() || undefined,
        twitter:  twitter.trim()  || undefined,
        facebook: facebook.trim() || undefined,
      });
      updateUser(res.user as typeof user);
      toast.success("تم حفظ روابط التواصل");
      flashSaved("social");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "حدث خطأ في الحفظ");
    } finally {
      setSaving(false);
    }
  };

  const handleChangePasswordRequest = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      toast.error("يرجى ملء جميع الحقول"); return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("كلمة المرور الجديدة غير متطابقة"); return;
    }
    if (newPassword.length < 8) {
      toast.error("كلمة المرور يجب أن تكون 8 أحرف على الأقل"); return;
    }
    setSaving(true);
    try {
      await api.post("/auth/change-password-request", { currentPassword, newPassword });
      toast.success("تم إرسال كود التحقق إلى بريدك الإلكتروني");
      setPwStep("otp"); setPwOtp("");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "حدث خطأ");
    } finally {
      setSaving(false);
    }
  };

  const handleChangePasswordConfirm = async () => {
    if (!pwOtp.trim()) { toast.error("أدخل كود التحقق"); return; }
    setSaving(true);
    try {
      await api.post("/auth/change-password-confirm", { otp: pwOtp.trim() });
      toast.success("✅ تم تغيير كلمة المرور بنجاح");
      setCurrentPassword(""); setNewPassword(""); setConfirmPassword("");
      setPwStep("form"); setPwOtp("");
      flashSaved("security");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "كود التحقق غير صحيح");
    } finally {
      setSaving(false);
    }
  };

  const handleChangeEmailRequest = async () => {
    if (!newEmailVal.trim() || !newEmailVal.includes("@")) {
      toast.error("أدخل بريداً إلكترونياً صحيحاً"); return;
    }
    if (newEmailVal.toLowerCase() === user?.email?.toLowerCase()) {
      toast.error("البريد الجديد مطابق للحالي"); return;
    }
    setSaving(true);
    try {
      await api.post("/auth/change-email-request", { newEmail: newEmailVal.trim().toLowerCase() });
      toast.success("تم إرسال كود التحقق إلى بريدك الحالي");
      setEmailStep("otp"); setEmailOtp("");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "حدث خطأ");
    } finally {
      setSaving(false);
    }
  };

  const handleChangeEmailConfirm = async () => {
    if (!emailOtp.trim()) { toast.error("أدخل كود التحقق"); return; }
    setSaving(true);
    try {
      const res = await api.post<{ user: typeof user }>("/auth/change-email-confirm", { otp: emailOtp.trim() });
      if (res.user) updateUser(res.user as typeof user);
      toast.success("✅ تم تغيير البريد الإلكتروني بنجاح");
      setEmailStep("form"); setNewEmailVal(""); setEmailOtp("");
      flashSaved("security");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "كود التحقق غير صحيح");
    } finally {
      setSaving(false);
    }
  };

  const input = "w-full px-4 py-2.5 rounded-xl dark:bg-white/5 bg-slate-50 border dark:border-white/10 border-slate-200 dark:text-white text-slate-900 outline-none focus:border-cyan-500 transition-colors text-sm placeholder:dark:text-slate-600 placeholder:text-slate-400";
  const label = "block text-sm font-medium dark:text-slate-300 text-slate-700 mb-1.5";

  const pwStrength = newPassword.length === 0 ? 0 : newPassword.length < 6 ? 1 : newPassword.length < 10 ? 2 : newPassword.length < 14 ? 3 : 4;
  const pwLabel = ["", "ضعيفة", "مقبولة", "جيدة", "قوية"][pwStrength];
  const pwColor = ["", "bg-red-500", "bg-amber-500", "bg-green-400", "bg-green-500"][pwStrength];

  return (
    <MainLayout>
      <div className="min-h-screen dark:bg-[#0a0f1e] bg-slate-50">

        {/* Header */}
        <div className="dark:bg-[#070b14] bg-white border-b dark:border-white/5 border-slate-200 sticky top-0 z-10">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex items-center gap-3">
              <Link href="/dashboard" className="p-1.5 rounded-lg dark:hover:bg-white/5 hover:bg-slate-100 transition-colors">
                <ArrowLeft className="w-4 h-4 dark:text-slate-400 text-slate-500" />
              </Link>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 text-xs dark:text-slate-500 text-slate-400 mb-0.5">
                  <Link href="/dashboard" className="hover:text-cyan-500 transition-colors">لوحة التحكم</Link>
                  <ChevronRight className="w-3 h-3" />
                  <span>الإعدادات</span>
                </div>
                <h1 className="text-base font-bold dark:text-white text-slate-900">إعدادات الحساب</h1>
              </div>
              <Link
                href={`/profile/${user.username}`}
                className="mr-auto text-xs dark:text-slate-400 text-slate-500 hover:text-cyan-500 transition-colors hidden sm:block"
              >
                عرض ملفك الشخصي ←
              </Link>
            </div>
          </div>
        </div>

        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col lg:flex-row gap-6">

            {/* Sidebar / top tabs */}
            <div className="lg:w-56 flex-shrink-0">
              {/* Avatar card */}
              <div className="dark:bg-[#111827] bg-white rounded-2xl border dark:border-white/10 border-slate-200 p-4 mb-4 flex items-center gap-3 lg:block lg:text-center">
                <div className="relative flex-shrink-0 lg:mx-auto lg:mb-3 group">
                  <div className="w-14 h-14 lg:w-16 lg:h-16 rounded-2xl overflow-hidden gradient-bg flex items-center justify-center text-white text-2xl lg:text-3xl font-black shadow-lg shadow-cyan-500/20">
                    {avatarPreview || user.avatar ? (
                      <img
                        src={avatarPreview ?? user.avatar ?? ""}
                        alt={user.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      user.name?.charAt(0) || "م"
                    )}
                  </div>
                  <button
                    onClick={() => avatarInputRef.current?.click()}
                    disabled={uploadingAvatar}
                    className="absolute inset-0 rounded-2xl bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer disabled:cursor-wait"
                    title="تغيير الصورة"
                  >
                    {uploadingAvatar
                      ? <Loader2 className="w-5 h-5 text-white animate-spin" />
                      : <Camera className="w-5 h-5 text-white" />}
                  </button>
                  {uploadingAvatar && (
                    <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-cyan-500 flex items-center justify-center shadow-md">
                      <Loader2 className="w-3 h-3 text-white animate-spin" />
                    </div>
                  )}
                </div>
                <input
                  ref={avatarInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  className="hidden"
                  onChange={handleAvatarChange}
                />
                <div className="min-w-0 lg:w-full">
                  <p className="font-bold dark:text-white text-slate-900 text-sm truncate">{user.name}</p>
                  <p className="text-xs dark:text-slate-500 text-slate-400 truncate">@{user.username}</p>
                  <span className="mt-1 inline-block px-2 py-0.5 text-xs rounded-full dark:bg-cyan-500/15 dark:text-cyan-300 bg-cyan-50 text-cyan-700 border dark:border-cyan-500/20 border-cyan-200">
                    {user.level || "مبتدئ"}
                  </span>
                  <button
                    onClick={() => avatarInputRef.current?.click()}
                    disabled={uploadingAvatar}
                    className="mt-2 hidden lg:flex items-center gap-1 text-xs dark:text-slate-400 text-slate-500 hover:text-cyan-500 transition-colors mx-auto disabled:opacity-50"
                  >
                    <Camera className="w-3 h-3" />
                    {uploadingAvatar ? "جاري الرفع..." : "تغيير الصورة"}
                  </button>
                </div>
              </div>

              {/* Tab nav */}
              <div className="flex lg:flex-col gap-1 overflow-x-auto lg:overflow-visible pb-1 lg:pb-0">
                {TABS.map(t => (
                  <button
                    key={t.id}
                    onClick={() => setTab(t.id)}
                    className={`flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all text-right whitespace-nowrap lg:w-full flex-shrink-0 ${
                      tab === t.id
                        ? "gradient-bg text-white shadow-sm"
                        : "dark:text-slate-300 text-slate-600 dark:hover:bg-white/5 hover:bg-white dark:bg-transparent bg-white/60 border dark:border-transparent border-slate-200 lg:border-0 lg:bg-transparent"
                    }`}
                  >
                    {t.icon}
                    <span>{t.label}</span>
                    {savedTab === t.id && (
                      <CheckCircle className="w-3.5 h-3.5 text-green-400 mr-auto hidden lg:block" />
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Content area */}
            <div className="flex-1 min-w-0">
              <AnimatePresence mode="wait">

                {/* ── Profile ── */}
                {tab === "profile" && (
                  <motion.div key="profile" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
                    <div className="dark:bg-[#111827] bg-white rounded-2xl border dark:border-white/10 border-slate-200 overflow-hidden">
                      <div className="px-5 sm:px-6 py-4 border-b dark:border-white/5 border-slate-100 flex items-center justify-between">
                        <div>
                          <h2 className="font-bold dark:text-white text-slate-900 text-sm">الملف الشخصي</h2>
                          <p className="text-xs dark:text-slate-500 text-slate-400 mt-0.5">المعلومات الظاهرة في صفحتك العامة</p>
                        </div>
                        {savedTab === "profile" && (
                          <span className="flex items-center gap-1 text-xs text-green-500">
                            <CheckCircle className="w-3.5 h-3.5" /> تم الحفظ
                          </span>
                        )}
                      </div>

                      <div className="p-5 sm:p-6">
                        <div className="grid sm:grid-cols-2 gap-4">
                          <div>
                            <label className={label}>
                              <User className="w-3.5 h-3.5 inline ml-1.5 mb-0.5 text-cyan-500" />الاسم الكامل *
                            </label>
                            <input
                              type="text"
                              value={name}
                              onChange={e => setName(e.target.value)}
                              placeholder="اسمك الكامل"
                              className={input}
                            />
                          </div>

                          <div>
                            <label className={label}>
                              <AtSign className="w-3.5 h-3.5 inline ml-1.5 mb-0.5 text-violet-500" />اسم المستخدم
                            </label>
                            <input
                              type="text"
                              value={username}
                              onChange={e => setUsername(e.target.value)}
                              placeholder="username"
                              className={`${input} direction-ltr text-right`}
                            />
                          </div>

                          <div className="sm:col-span-2">
                            <label className={label}>
                              <FileText className="w-3.5 h-3.5 inline ml-1.5 mb-0.5 text-slate-500" />نبذة شخصية
                            </label>
                            <textarea
                              value={bio}
                              onChange={e => setBio(e.target.value)}
                              placeholder="اكتب نبذة مختصرة عنك..."
                              rows={3}
                              maxLength={500}
                              className={`${input} resize-none`}
                            />
                            <p className="text-xs dark:text-slate-600 text-slate-400 mt-1 text-left">{bio.length}/500</p>
                          </div>

                          <div>
                            <label className={label}>
                              <Mail className="w-3.5 h-3.5 inline ml-1.5 mb-0.5 text-slate-400" />البريد الإلكتروني
                            </label>
                            <input
                              type="email"
                              value={user.email}
                              disabled
                              className={`${input} opacity-40 cursor-not-allowed`}
                            />
                            <button
                              type="button"
                              onClick={() => setTab("security")}
                              className="text-xs text-cyan-500 hover:text-cyan-400 mt-1 transition-colors"
                            >
                              لتغيير بريدك ← اذهب لتبويب الأمان
                            </button>
                          </div>

                          <div>
                            <label className={label}>
                              <Phone className="w-3.5 h-3.5 inline ml-1.5 mb-0.5 text-green-500" />رقم الهاتف
                            </label>
                            <input
                              type="tel"
                              value={phone}
                              onChange={e => setPhone(e.target.value)}
                              placeholder="+20 1XX XXX XXXX"
                              className={input}
                            />
                          </div>

                          <div>
                            <label className={label}>
                              <MapPin className="w-3.5 h-3.5 inline ml-1.5 mb-0.5 text-rose-500" />الموقع / المدينة
                            </label>
                            <input
                              type="text"
                              value={address}
                              onChange={e => setAddress(e.target.value)}
                              placeholder="القاهرة، مصر"
                              className={input}
                            />
                          </div>

                          <div>
                            <label className={label}>
                              <Calendar className="w-3.5 h-3.5 inline ml-1.5 mb-0.5 text-amber-500" />العمر
                            </label>
                            <input
                              type="number"
                              value={age}
                              onChange={e => setAge(e.target.value)}
                              placeholder="عمرك"
                              min="10"
                              max="100"
                              className={input}
                            />
                          </div>
                        </div>

                        <div className="flex justify-end mt-5 pt-5 border-t dark:border-white/5 border-slate-100">
                          <button
                            onClick={handleSaveProfile}
                            disabled={saving}
                            className="btn-primary disabled:opacity-50 text-sm px-6 py-2.5"
                          >
                            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                            حفظ التغييرات
                          </button>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* ── Security ── */}
                {tab === "security" && (
                  <motion.div key="security" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="space-y-4">

                    {/* ─── Change Password Card ─── */}
                    <div className="dark:bg-[#111827] bg-white rounded-2xl border dark:border-white/10 border-slate-200 overflow-hidden">
                      <div className="px-5 sm:px-6 py-4 border-b dark:border-white/5 border-slate-100 flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-red-500/10 flex items-center justify-center flex-shrink-0">
                          <Shield className="w-4 h-4 text-red-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h2 className="font-bold dark:text-white text-slate-900 text-sm">تغيير كلمة المرور</h2>
                          <p className="text-xs dark:text-slate-500 text-slate-400">
                            {pwStep === "form" ? "يُنصح بتغييرها دورياً للحفاظ على أمان حسابك" : "أدخل الكود المرسل إلى بريدك الإلكتروني"}
                          </p>
                        </div>
                        {savedTab === "security" && pwStep === "form" && (
                          <span className="flex items-center gap-1 text-xs text-green-500">
                            <CheckCircle className="w-3.5 h-3.5" /> تم التغيير
                          </span>
                        )}
                      </div>

                      <div className="p-5 sm:p-6">
                        <AnimatePresence mode="wait">
                          {pwStep === "form" ? (
                            <motion.div key="pw-form" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4 max-w-md">
                              <div>
                                <label className={label}>كلمة المرور الحالية</label>
                                <div className="relative">
                                  <input
                                    type={showCurrentPw ? "text" : "password"}
                                    value={currentPassword}
                                    onChange={e => setCurrentPassword(e.target.value)}
                                    placeholder="••••••••"
                                    className={`${input} pl-10`}
                                  />
                                  <button type="button" onClick={() => setShowCurrentPw(!showCurrentPw)} className="absolute left-3 top-1/2 -translate-y-1/2 dark:text-slate-500 text-slate-400 hover:text-cyan-500 transition-colors">
                                    {showCurrentPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                  </button>
                                </div>
                              </div>
                              <div>
                                <label className={label}>كلمة المرور الجديدة</label>
                                <div className="relative">
                                  <input
                                    type={showNewPw ? "text" : "password"}
                                    value={newPassword}
                                    onChange={e => setNewPassword(e.target.value)}
                                    placeholder="••••••••"
                                    className={`${input} pl-10`}
                                  />
                                  <button type="button" onClick={() => setShowNewPw(!showNewPw)} className="absolute left-3 top-1/2 -translate-y-1/2 dark:text-slate-500 text-slate-400 hover:text-cyan-500 transition-colors">
                                    {showNewPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                  </button>
                                </div>
                                {newPassword && (
                                  <div className="mt-2 flex items-center gap-2">
                                    <div className="flex gap-1 flex-1">
                                      {[1, 2, 3, 4].map(n => (
                                        <div key={n} className={`h-1 flex-1 rounded-full transition-colors ${n <= pwStrength ? pwColor : "dark:bg-white/10 bg-slate-200"}`} />
                                      ))}
                                    </div>
                                    <span className="text-xs dark:text-slate-500 text-slate-400 w-10 text-left">{pwLabel}</span>
                                  </div>
                                )}
                              </div>
                              <div>
                                <label className={label}>تأكيد كلمة المرور الجديدة</label>
                                <div className="relative">
                                  <input
                                    type={showConfirmPw ? "text" : "password"}
                                    value={confirmPassword}
                                    onChange={e => setConfirmPassword(e.target.value)}
                                    placeholder="••••••••"
                                    className={`${input} pl-10 ${confirmPassword && confirmPassword !== newPassword ? "border-red-500/50" : ""}`}
                                  />
                                  <button type="button" onClick={() => setShowConfirmPw(!showConfirmPw)} className="absolute left-3 top-1/2 -translate-y-1/2 dark:text-slate-500 text-slate-400 hover:text-cyan-500 transition-colors">
                                    {showConfirmPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                  </button>
                                </div>
                                {confirmPassword && confirmPassword !== newPassword && (
                                  <p className="text-xs text-red-400 mt-1">كلمة المرور غير متطابقة</p>
                                )}
                              </div>
                              <div className="flex justify-end pt-2">
                                <button onClick={handleChangePasswordRequest} disabled={saving} className="btn-primary disabled:opacity-50 text-sm px-6 py-2.5">
                                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Shield className="w-4 h-4" />}
                                  إرسال كود التحقق
                                </button>
                              </div>
                            </motion.div>
                          ) : (
                            <motion.div key="pw-otp" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="max-w-md">
                              <div className="dark:bg-blue-950/30 bg-blue-50 border dark:border-blue-500/20 border-blue-200 rounded-xl p-4 mb-5 flex items-start gap-3">
                                <Mail className="w-4 h-4 text-blue-400 mt-0.5 flex-shrink-0" />
                                <div>
                                  <p className="text-sm font-medium dark:text-blue-300 text-blue-700">تم إرسال كود التحقق</p>
                                  <p className="text-xs dark:text-blue-400/70 text-blue-600 mt-0.5">تحقق من بريدك الإلكتروني <strong>{user.email}</strong> — الكود صالح 15 دقيقة</p>
                                </div>
                              </div>
                              <div className="mb-5">
                                <label className={label}>كود التحقق (6 أرقام)</label>
                                <input
                                  type="text"
                                  inputMode="numeric"
                                  value={pwOtp}
                                  onChange={e => setPwOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                                  placeholder="000000"
                                  maxLength={6}
                                  className={`${input} text-center tracking-[0.4em] text-xl font-bold direction-ltr`}
                                  autoFocus
                                />
                              </div>
                              <div className="flex gap-3">
                                <button onClick={() => { setPwStep("form"); setPwOtp(""); }} className="px-4 py-2.5 rounded-xl border dark:border-white/10 border-slate-200 text-sm dark:text-slate-400 text-slate-500 hover:dark:border-white/20 hover:border-slate-300 transition-colors">
                                  رجوع
                                </button>
                                <button onClick={handleChangePasswordConfirm} disabled={saving || pwOtp.length !== 6} className="btn-primary flex-1 disabled:opacity-50 text-sm py-2.5">
                                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                                  تأكيد تغيير كلمة المرور
                                </button>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    </div>

                    {/* ─── Change Email Card ─── */}
                    <div className="dark:bg-[#111827] bg-white rounded-2xl border dark:border-white/10 border-slate-200 overflow-hidden">
                      <div className="px-5 sm:px-6 py-4 border-b dark:border-white/5 border-slate-100 flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-violet-500/10 flex items-center justify-center flex-shrink-0">
                          <Mail className="w-4 h-4 text-violet-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h2 className="font-bold dark:text-white text-slate-900 text-sm">تغيير البريد الإلكتروني</h2>
                          <p className="text-xs dark:text-slate-500 text-slate-400">
                            {emailStep === "form"
                              ? <span>بريدك الحالي: <span className="dark:text-slate-300 text-slate-600 direction-ltr">{user.email}</span></span>
                              : "أدخل الكود المرسل إلى بريدك الحالي"}
                          </p>
                        </div>
                        {savedTab === "security" && emailStep === "form" && (
                          <span className="flex items-center gap-1 text-xs text-green-500">
                            <CheckCircle className="w-3.5 h-3.5" /> تم التغيير
                          </span>
                        )}
                      </div>
                      <div className="p-5 sm:p-6">
                        <AnimatePresence mode="wait">
                          {emailStep === "form" ? (
                            <motion.div key="email-form" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="max-w-md space-y-4">
                              <div>
                                <label className={label}>البريد الإلكتروني الجديد</label>
                                <input
                                  type="email"
                                  value={newEmailVal}
                                  onChange={e => setNewEmailVal(e.target.value)}
                                  placeholder="new@example.com"
                                  className={`${input} direction-ltr`}
                                />
                              </div>
                              <div className="dark:bg-amber-950/20 bg-amber-50 border dark:border-amber-500/20 border-amber-200 rounded-xl p-3">
                                <p className="text-xs dark:text-amber-300/80 text-amber-700">⚠️ سيُرسل كود التحقق إلى بريدك <strong>الحالي</strong> للتأكد من هويتك قبل تغيير البريد.</p>
                              </div>
                              <div className="flex justify-end">
                                <button onClick={handleChangeEmailRequest} disabled={saving || !newEmailVal.includes("@")} className="btn-primary disabled:opacity-50 text-sm px-6 py-2.5">
                                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mail className="w-4 h-4" />}
                                  إرسال كود التحقق
                                </button>
                              </div>
                            </motion.div>
                          ) : (
                            <motion.div key="email-otp" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="max-w-md">
                              <div className="dark:bg-violet-950/30 bg-violet-50 border dark:border-violet-500/20 border-violet-200 rounded-xl p-4 mb-5 flex items-start gap-3">
                                <CheckCircle className="w-4 h-4 text-violet-400 mt-0.5 flex-shrink-0" />
                                <div>
                                  <p className="text-sm font-medium dark:text-violet-300 text-violet-700">كود التحقق في طريقه إليك</p>
                                  <p className="text-xs dark:text-violet-400/70 text-violet-600 mt-0.5">
                                    تحقق من <strong>{user.email}</strong> — سيتم التغيير إلى <strong className="direction-ltr">{newEmailVal}</strong>
                                  </p>
                                </div>
                              </div>
                              <div className="mb-5">
                                <label className={label}>كود التحقق (6 أرقام)</label>
                                <input
                                  type="text"
                                  inputMode="numeric"
                                  value={emailOtp}
                                  onChange={e => setEmailOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                                  placeholder="000000"
                                  maxLength={6}
                                  className={`${input} text-center tracking-[0.4em] text-xl font-bold direction-ltr`}
                                  autoFocus
                                />
                              </div>
                              <div className="flex gap-3">
                                <button onClick={() => { setEmailStep("form"); setEmailOtp(""); }} className="px-4 py-2.5 rounded-xl border dark:border-white/10 border-slate-200 text-sm dark:text-slate-400 text-slate-500 hover:dark:border-white/20 transition-colors">
                                  رجوع
                                </button>
                                <button onClick={handleChangeEmailConfirm} disabled={saving || emailOtp.length !== 6} className="btn-primary flex-1 disabled:opacity-50 text-sm py-2.5">
                                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                                  تأكيد تغيير البريد الإلكتروني
                                </button>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    </div>

                    {/* Account info */}
                    <div className="dark:bg-[#111827] bg-white rounded-2xl border dark:border-white/10 border-slate-200 p-5 sm:p-6">
                      <h3 className="font-bold dark:text-white text-slate-900 mb-4 text-sm">معلومات الحساب</h3>
                      <div className="divide-y dark:divide-white/5 divide-slate-100">
                        {[
                          { label: "البريد الإلكتروني", value: user.email },
                          { label: "الدور", value: user.role === "super_admin" ? "مشرف عام" : user.role === "admin" ? "مشرف" : "مستخدم" },
                          { label: "تاريخ الانضمام", value: new Date(user.createdAt).toLocaleDateString("ar-EG", { year: "numeric", month: "long", day: "numeric" }) },
                        ].map(item => (
                          <div key={item.label} className="flex justify-between items-center py-3">
                            <span className="text-sm dark:text-slate-400 text-slate-500">{item.label}</span>
                            <span className="text-sm font-medium dark:text-white text-slate-900">{item.value}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* ── Social ── */}
                {tab === "social" && (
                  <motion.div key="social" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
                    <div className="dark:bg-[#111827] bg-white rounded-2xl border dark:border-white/10 border-slate-200 overflow-hidden">
                      <div className="px-5 sm:px-6 py-4 border-b dark:border-white/5 border-slate-100 flex items-center justify-between">
                        <div>
                          <h2 className="font-bold dark:text-white text-slate-900 text-sm">روابط التواصل الاجتماعي</h2>
                          <p className="text-xs dark:text-slate-500 text-slate-400 mt-0.5">تظهر في ملفك الشخصي العام</p>
                        </div>
                        {savedTab === "social" && (
                          <span className="flex items-center gap-1 text-xs text-green-500">
                            <CheckCircle className="w-3.5 h-3.5" /> تم الحفظ
                          </span>
                        )}
                      </div>

                      <div className="p-5 sm:p-6 space-y-4">
                        {[
                          { id: "github",   label: "GitHub",     icon: <Github className="w-4 h-4 text-slate-400" />,  placeholder: "https://github.com/username",          value: github,   set: setGithub },
                          { id: "linkedin", label: "LinkedIn",   icon: <Linkedin className="w-4 h-4 text-blue-500" />, placeholder: "https://linkedin.com/in/username",     value: linkedin, set: setLinkedin },
                          { id: "twitter",  label: "Twitter / X",icon: <Twitter className="w-4 h-4 text-sky-400" />,   placeholder: "https://twitter.com/username",         value: twitter,  set: setTwitter },
                          { id: "facebook", label: "Facebook",   icon: <Facebook className="w-4 h-4 text-blue-600" />, placeholder: "https://facebook.com/username",        value: facebook, set: setFacebook },
                        ].map(({ id, label: lbl, icon, placeholder, value, set }) => (
                          <div key={id}>
                            <label className={label}>
                              <span className="inline-flex items-center gap-1.5">{icon} {lbl}</span>
                            </label>
                            <div className="relative">
                              <input
                                type="url"
                                value={value}
                                onChange={e => set(e.target.value)}
                                placeholder={placeholder}
                                className={`${input} direction-ltr`}
                              />
                            </div>
                          </div>
                        ))}

                        <div className="flex justify-end pt-3 border-t dark:border-white/5 border-slate-100">
                          <button
                            onClick={handleSaveSocial}
                            disabled={saving}
                            className="btn-primary disabled:opacity-50 text-sm px-6 py-2.5"
                          >
                            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                            حفظ الروابط
                          </button>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* ── Notifications ── */}
                {tab === "notifications" && (
                  <motion.div key="notifications" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="space-y-4">
                    <div className="dark:bg-[#111827] bg-white rounded-2xl border dark:border-white/10 border-slate-200 overflow-hidden">
                      <div className="px-5 sm:px-6 py-4 border-b dark:border-white/5 border-slate-100">
                        <h2 className="font-bold dark:text-white text-slate-900 text-sm">تفضيلات الإشعارات</h2>
                        <p className="text-xs dark:text-slate-500 text-slate-400 mt-0.5">اختر ما تريد أن يُشعرك به نوفيل</p>
                      </div>

                      <div className="p-5 sm:p-6 space-y-3">
                        {[
                          { label: "إشعارات الكورسات",  desc: "دروس جديدة وتحديثات في الكورسات", value: notifCourses,   set: setNotifCourses },
                          { label: "إشعارات التحديات",  desc: "مسائل برمجية جديدة",              value: notifProblems,  set: setNotifProblems },
                          { label: "إشعارات تسويقية",   desc: "عروض وأخبار من نوفيل",             value: notifMarketing, set: setNotifMarketing },
                        ].map(({ label: lbl, desc, value, set }) => (
                          <div
                            key={lbl}
                            onClick={() => set(!value)}
                            className="flex items-center justify-between p-4 rounded-xl dark:bg-white/5 bg-slate-50 border dark:border-white/10 border-slate-200 cursor-pointer hover:dark:border-white/20 hover:border-slate-300 transition-colors"
                          >
                            <div>
                              <p className="font-medium dark:text-white text-slate-900 text-sm">{lbl}</p>
                              <p className="text-xs dark:text-slate-500 text-slate-400 mt-0.5">{desc}</p>
                            </div>
                            <div className={`relative w-11 h-6 rounded-full transition-colors flex-shrink-0 ml-4 ${value ? "gradient-bg" : "dark:bg-white/10 bg-slate-200"}`}>
                              <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-all ${value ? "left-1" : "left-6"}`} />
                            </div>
                          </div>
                        ))}

                        <div className="flex justify-end pt-3 border-t dark:border-white/5 border-slate-100">
                          <button
                            onClick={() => { toast.success("تم حفظ تفضيلات الإشعارات"); flashSaved("notifications"); }}
                            className="btn-primary text-sm px-6 py-2.5"
                          >
                            <Save className="w-4 h-4" /> حفظ التفضيلات
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className="dark:bg-red-950/30 bg-red-50 rounded-2xl border dark:border-red-500/20 border-red-200 p-5">
                      <h3 className="font-bold text-red-500 text-sm mb-2">منطقة الخطر</h3>
                      <p className="text-xs dark:text-slate-400 text-slate-500 mb-4">حذف الحساب بشكل دائم. هذا الإجراء لا يمكن التراجع عنه.</p>
                      <button className="px-4 py-2 rounded-xl border border-red-400/30 text-red-400 text-xs font-medium hover:bg-red-500/10 transition-colors">
                        حذف الحساب
                      </button>
                    </div>
                  </motion.div>
                )}

              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
