"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { canAccess, getFirstSection, ROLE_LABELS, ROLE_COLORS, type AdminSection } from "@/lib/admin-roles";
import { Skeleton } from "@/components/ui/Skeleton";
import Link from "next/link";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard, Users, BookOpen, Code2, Settings,
  Newspaper, Shield, ChevronRight, LogOut, Home, Menu, X, Bell, LayoutTemplate, ShieldAlert,
  Map, Calendar, Award, GraduationCap, Mail, Search, DollarSign, Lock
} from "lucide-react";
import { useState } from "react";
import { useTheme } from "next-themes";
import { Sun, Moon } from "lucide-react";
import SecurityAlertListener from "@/components/admin/SecurityAlertListener";

interface NavItem {
  href: string;
  label: string;
  icon: React.ReactNode;
  section: AdminSection;
}

const ALL_NAV: NavItem[] = [
  { href: "/admin", label: "الإحصائيات", icon: <LayoutDashboard className="w-4 h-4" />, section: "dashboard" },
  { href: "/admin/users", label: "المستخدمون", icon: <Users className="w-4 h-4" />, section: "users" },
  { href: "/admin/courses", label: "الكورسات", icon: <BookOpen className="w-4 h-4" />, section: "courses" },
  { href: "/admin/challenges", label: "التحديات", icon: <Code2 className="w-4 h-4" />, section: "problems" },
  { href: "/admin/badges", label: "الشارات", icon: <Award className="w-4 h-4" />, section: "problems" },
  { href: "/admin/school", label: "مدرسة البرمجة", icon: <GraduationCap className="w-4 h-4" />, section: "courses" },
  { href: "/admin/articles", label: "المقالات", icon: <Newspaper className="w-4 h-4" />, section: "articles" },
  { href: "/admin/pages", label: "الصفحات", icon: <LayoutTemplate className="w-4 h-4" />, section: "pages" },
  { href: "/admin/notifications", label: "الإشعارات", icon: <Bell className="w-4 h-4" />, section: "settings" },
  { href: "/admin/settings",    label: "الإعدادات",     icon: <Settings className="w-4 h-4" />,    section: "settings" },
  { href: "/admin/ide-monitor", label: "أمان IDE",       icon: <ShieldAlert className="w-4 h-4" />, section: "security" },
  { href: "/admin/security",   label: "مركز الأمان",    icon: <Shield className="w-4 h-4" />,      section: "security" },
  { href: "/admin/email",      label: "البريد الإلكتروني", icon: <Mail className="w-4 h-4" />,    section: "settings" },
  { href: "/admin/seo",        label: "SEO & البحث",    icon: <Search className="w-4 h-4" />,      section: "settings" },
  { href: "/admin/adsense",    label: "AdSense",         icon: <DollarSign className="w-4 h-4" />, section: "settings" },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, loading, isAdmin } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const { setTheme, resolvedTheme } = useTheme();

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    if (loading) return;
    if (!user || !isAdmin) {
      router.replace("/");
      return;
    }
    if (pathname === "/admin" && !canAccess(user.role, "dashboard")) {
      router.replace(getFirstSection(user.role));
    }
  }, [user, loading, isAdmin, pathname, router]);

  if (loading) {
    return (
      <div className="min-h-screen dark:bg-[#0a0f1e] bg-slate-50 flex">
        <div className="w-64 dark:bg-[#070b14] bg-white border-l dark:border-white/10 border-slate-200 hidden md:flex flex-col p-4 gap-3">
          {[...Array(6)].map((_, i) => (
            <Skeleton key={i} className="h-10 w-full rounded-xl" />
          ))}
        </div>
        <div className="flex-1 p-8 space-y-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-24 w-full rounded-2xl" />
          ))}
        </div>
      </div>
    );
  }

  if (!user || !isAdmin) return null;

  const visibleNav = ALL_NAV.filter((item) => canAccess(user.role, item.section));
  const roleLabel = ROLE_LABELS[user.role] ?? user.role;
  const roleColor = ROLE_COLORS[user.role] ?? "bg-slate-500/15 text-slate-400";

  const SidebarContent = () => (
    <>
      <div className="p-5 border-b dark:border-white/10 border-slate-100">
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="w-9 h-9 rounded-xl gradient-bg flex items-center justify-center shadow-lg shadow-cyan-500/20">
            <Shield className="w-4 h-4 text-white" />
          </div>
          <div>
            <p className="text-xs dark:text-slate-500 text-slate-400">نوفيل</p>
            <p className="text-sm font-bold gradient-text">لوحة الإدارة</p>
          </div>
        </Link>
      </div>

      <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
        {visibleNav.map((item) => {
          const isActive = item.href === "/admin"
            ? pathname === "/admin"
            : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setMobileOpen(false)}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all",
                isActive
                  ? "gradient-bg text-white shadow-lg shadow-cyan-500/20"
                  : "dark:text-slate-400 text-slate-600 hover:text-cyan-400 hover:dark:bg-white/5 hover:bg-slate-50",
              )}
            >
              {item.icon}
              {item.label}
              {isActive && <ChevronRight className="w-3 h-3 mr-auto" />}
            </Link>
          );
        })}

        {/* Super Admin Only */}
        {user?.role === "super_admin" && (
          <>
            <div className="pt-2 pb-1 px-3">
              <div className="h-px dark:bg-amber-500/20 bg-amber-300/30" />
              <p className="text-[10px] font-semibold dark:text-amber-500/60 text-amber-600/60 mt-2 mb-1 tracking-wider uppercase">سوبر أدمن</p>
            </div>
            <Link
              href="/admin/super-settings"
              onClick={() => setMobileOpen(false)}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all border",
                pathname.startsWith("/admin/super-settings")
                  ? "bg-amber-500/20 text-amber-300 border-amber-500/40 shadow-lg shadow-amber-500/10"
                  : "dark:text-amber-400/70 text-amber-600 border-amber-500/20 dark:hover:bg-amber-500/10 hover:bg-amber-50 hover:text-amber-500",
              )}
            >
              <Lock className="w-4 h-4" />
              النسخ الاحتياطية
              {pathname.startsWith("/admin/super-settings") && <ChevronRight className="w-3 h-3 mr-auto" />}
            </Link>
          </>
        )}
      </nav>

      <div className="p-3 border-t dark:border-white/10 border-slate-100 space-y-2">
        <div className="flex items-center gap-2">
          <Link
            href="/"
            className="flex-1 flex items-center gap-3 px-3 py-2 rounded-xl text-sm dark:text-slate-400 text-slate-600 hover:text-cyan-400 hover:dark:bg-white/5 hover:bg-slate-50 transition-all"
          >
            <Home className="w-4 h-4" />
            العودة للموقع
          </Link>
          <button
            onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
            className="w-9 h-9 rounded-xl dark:bg-white/5 bg-slate-100 flex items-center justify-center dark:text-slate-300 text-slate-600 hover:text-cyan-400 transition-all flex-shrink-0"
            aria-label="تبديل الثيم"
            suppressHydrationWarning
          >
            {mounted ? (resolvedTheme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />) : <Moon className="w-4 h-4" />}
          </button>
        </div>
        <div className="flex items-center gap-3 p-3 rounded-xl dark:bg-white/5 bg-slate-50">
          <div className="w-8 h-8 rounded-lg overflow-hidden gradient-bg flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
            {user.avatar
              ? <img src={user.avatar} alt={user.name} className="w-full h-full object-cover" />
              : user.name?.charAt(0)}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold dark:text-white text-slate-900 truncate">{user.name}</p>
            <span className={`inline-block px-1.5 py-0.5 text-[10px] font-semibold rounded-full ${roleColor}`}>
              {roleLabel}
            </span>
          </div>
        </div>
      </div>
    </>
  );

  return (
    <div className="min-h-screen dark:bg-[#0a0f1e] bg-slate-50 flex">
      <SecurityAlertListener />
      <aside className="w-64 dark:bg-[#070b14] bg-white border-l dark:border-white/10 border-slate-200 flex-shrink-0 hidden md:flex flex-col">
        <SidebarContent />
      </aside>

      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 dark:bg-black/60 bg-black/40 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
          <aside className="absolute top-0 right-0 h-full w-72 dark:bg-[#070b14] bg-white flex flex-col shadow-2xl">
            <SidebarContent />
          </aside>
        </div>
      )}

      <div className="flex-1 flex flex-col min-w-0">
        <header className="md:hidden flex items-center justify-between px-4 py-3 dark:bg-[#070b14] bg-white border-b dark:border-white/10 border-slate-200">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg gradient-bg flex items-center justify-center">
              <Shield className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold gradient-text text-sm">لوحة الإدارة</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
              className="w-9 h-9 rounded-lg dark:bg-white/5 bg-slate-100 flex items-center justify-center dark:text-slate-300 text-slate-600 hover:text-cyan-400 transition-all"
              aria-label="تبديل الثيم"
              suppressHydrationWarning
            >
              {mounted ? (resolvedTheme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />) : <Moon className="w-4 h-4" />}
            </button>
            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              className="w-9 h-9 rounded-lg dark:bg-white/5 bg-slate-100 flex items-center justify-center dark:text-slate-300 text-slate-600"
            >
              {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </header>

        <main className="flex-1 overflow-auto p-5 md:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
