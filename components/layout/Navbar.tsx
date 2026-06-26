"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { useTheme } from "next-themes";
import { useAuth } from "@/lib/auth-context";
import {
  Sun, Moon, Menu, X, Code2, BookOpen, LayoutDashboard,
  User, LogOut, Shield, ChevronDown, Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { NotificationBell } from "@/components/layout/NotificationBell";

const STATIC_NAV = [
  { href: "/", label: "الرئيسية" },
  { href: "/courses", label: "الكورسات" },
  { href: "/problems", label: "التحديات" },
  { href: "/duels", label: "⚔️ المبارزات" },
  { href: "/articles", label: "المقالات" },
  { href: "/tools", label: "الأدوات" },
  { href: "/community-projects", label: "المجتمع" },
];

interface NavLink { href: string; label: string; }

export function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [navLinks, setNavLinks] = useState<NavLink[]>(STATIC_NAV);
  const { setTheme, resolvedTheme } = useTheme();
  const { user, logout, isAdmin } = useAuth();
  const pathname = usePathname();

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    fetch("/api/nav-items")
      .then(r => r.ok ? r.json() : null)
      .then((items: { type: string; label: string; href: string }[] | null) => {
        if (!items) return;
        const navbar = items.filter(i => i.type === "navbar");
        if (navbar.length > 0) setNavLinks(navbar.map(i => ({ href: i.href, label: i.label })));
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    setMobileOpen(false);
    setUserMenuOpen(false);
  }, [pathname]);

  const handleLogout = async () => {
    await logout();
    setUserMenuOpen(false);
  };

  return (
    <>
      <motion.nav
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className={cn(
          "fixed top-0 inset-x-0 z-50 transition-all duration-300",
          scrolled
            ? "dark:bg-[#0a0f1e]/90 bg-white/90 backdrop-blur-xl shadow-lg dark:shadow-cyan-500/5"
            : "bg-transparent",
        )}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link href="/" className="flex items-center gap-2 group">
              <div className="w-9 h-9 rounded-xl gradient-bg flex items-center justify-center shadow-lg shadow-cyan-500/30 group-hover:scale-110 transition-transform">
                <Code2 className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-extrabold gradient-text">نوفيل</span>
            </Link>

            <div className="hidden md:flex items-center gap-1">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={cn(
                    "px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200",
                    pathname === link.href
                      ? "text-cyan-400 bg-cyan-500/10"
                      : "dark:text-slate-300 text-slate-600 hover:text-cyan-400 hover:bg-cyan-500/5",
                  )}
                >
                  {link.label}
                </Link>
              ))}
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
                className="w-9 h-9 rounded-lg dark:bg-white/5 bg-slate-100 flex items-center justify-center dark:text-slate-300 text-slate-600 hover:text-cyan-400 transition-all hover:scale-110"
                aria-label="تبديل الثيم"
                suppressHydrationWarning
              >
                {mounted ? (resolvedTheme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />) : <Moon className="w-4 h-4" />}
              </button>

              <NotificationBell />

              {user ? (
                <div className="relative">
                  <button
                    onClick={() => setUserMenuOpen(!userMenuOpen)}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-xl dark:bg-white/5 bg-slate-100 hover:bg-cyan-500/10 transition-all"
                  >
                    <div className="w-7 h-7 rounded-full overflow-hidden gradient-bg flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                      {user.avatar
                        ? <img src={user.avatar} alt={user.name} className="w-full h-full object-cover" />
                        : user.name?.charAt(0) || "م"}
                    </div>
                    <span className="text-sm font-medium dark:text-slate-200 text-slate-700 hidden sm:block">
                      {user.name?.split(" ")[0]}
                    </span>
                    <ChevronDown className={cn("w-4 h-4 dark:text-slate-400 text-slate-500 transition-transform", userMenuOpen && "rotate-180")} />
                  </button>

                  <AnimatePresence>
                    {userMenuOpen && (
                      <motion.div
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                        transition={{ duration: 0.15 }}
                        className="absolute left-0 top-full mt-2 w-52 dark:bg-[#111827] bg-white rounded-2xl shadow-xl dark:shadow-black/50 border dark:border-white/10 border-slate-200 overflow-hidden"
                      >
                        <div className="p-2">
                          <div className="px-3 py-2 mb-1">
                            <p className="text-xs dark:text-slate-400 text-slate-500">مرحباً بك</p>
                            <p className="font-semibold dark:text-white text-slate-800 truncate">{user.name}</p>
                          </div>
                          <hr className="dark:border-white/10 border-slate-100 mb-1" />
                          <MenuLink href="/dashboard" icon={<LayoutDashboard className="w-4 h-4" />} label="لوحة التحكم" />
                          <MenuLink href={`/profile/${user.username}`} icon={<User className="w-4 h-4" />} label="ملفي الشخصي" />
                          <MenuLink href="/my-courses" icon={<BookOpen className="w-4 h-4" />} label="كورساتي" />
                          {isAdmin && (
                            <MenuLink href="/admin" icon={<Shield className="w-4 h-4" />} label="لوحة الإدارة" highlight />
                          )}
                          <hr className="dark:border-white/10 border-slate-100 mt-1 mb-1" />
                          <button
                            onClick={handleLogout}
                            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-red-400 hover:bg-red-500/10 transition-colors text-sm"
                          >
                            <LogOut className="w-4 h-4" />
                            تسجيل الخروج
                          </button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              ) : (
                <div className="hidden sm:flex items-center gap-2">
                  <Link href="/auth/login" className="btn-secondary py-1.5 px-4 text-sm">
                    دخول
                  </Link>
                  <Link href="/auth/register" className="btn-primary py-1.5 px-4 text-sm">
                    <Zap className="w-4 h-4" />
                    ابدأ مجاناً
                  </Link>
                </div>
              )}

              <button
                onClick={() => setMobileOpen(!mobileOpen)}
                className="md:hidden w-9 h-9 rounded-lg dark:bg-white/5 bg-slate-100 flex items-center justify-center dark:text-slate-300 text-slate-600"
              >
                {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            </div>
          </div>
        </div>
      </motion.nav>

      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
            className="fixed inset-x-0 top-16 z-40 dark:bg-[#0a0f1e]/95 bg-white/95 backdrop-blur-xl border-b dark:border-white/10 border-slate-200 md:hidden overflow-hidden"
          >
            <div className="max-w-7xl mx-auto px-4 py-4 space-y-1">
              {navLinks.map((link, i) => (
                <motion.div
                  key={link.href}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                >
                  <Link
                    href={link.href}
                    className={cn(
                      "block px-4 py-3 rounded-xl font-medium transition-all",
                      pathname === link.href
                        ? "text-cyan-400 bg-cyan-500/10"
                        : "dark:text-slate-300 text-slate-600",
                    )}
                  >
                    {link.label}
                  </Link>
                </motion.div>
              ))}
              {!user && (
                <div className="flex gap-2 pt-2">
                  <Link href="/auth/login" className="btn-secondary flex-1 justify-center text-sm py-2">
                    دخول
                  </Link>
                  <Link href="/auth/register" className="btn-primary flex-1 justify-center text-sm py-2">
                    ابدأ مجاناً
                  </Link>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

function MenuLink({
  href, icon, label, highlight,
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
  highlight?: boolean;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "flex items-center gap-3 px-3 py-2 rounded-lg transition-colors text-sm",
        highlight
          ? "text-cyan-400 hover:bg-cyan-500/10"
          : "dark:text-slate-300 text-slate-600 hover:bg-slate-100 dark:hover:bg-white/5",
      )}
    >
      {icon}
      {label}
    </Link>
  );
}
