"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Code2, Heart, Github, Twitter, Facebook, Youtube } from "lucide-react";

interface FooterLink { label: string; href: string; }
interface FooterSection { key: string; title: string; links: FooterLink[]; }

const DEFAULT_SECTIONS: FooterSection[] = [
  { key: "platform", title: "المنصة", links: [
    { label: "الكورسات", href: "/courses" },
    { label: "التحديات", href: "/problems" },
    { label: "المقالات", href: "/articles" },
    { label: "الأدوات", href: "/tools" },
  ]},
  { key: "account", title: "الحساب", links: [
    { label: "إنشاء حساب", href: "/auth/register" },
    { label: "تسجيل الدخول", href: "/auth/login" },
    { label: "لوحة التحكم", href: "/dashboard" },
    { label: "الملف الشخصي", href: "/profile" },
  ]},
  { key: "legal", title: "روابط", links: [
    { label: "سياسة الخصوصية", href: "/privacy" },
    { label: "شروط الاستخدام", href: "/terms" },
    { label: "عن نوفيل", href: "/about" },
    { label: "تواصل معنا", href: "/contact" },
  ]},
];

const CACHE_KEY = "nouvil_site_cfg_v1";
const CACHE_TTL = 60_000;

function getFooterSections(): FooterSection[] | null {
  try {
    const raw = sessionStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const { d, t } = JSON.parse(raw) as { d: { footerMenus?: FooterSection[] }; t: number };
    if (Date.now() - t > CACHE_TTL) return null;
    return d?.footerMenus ?? null;
  } catch { return null; }
}

export function Footer() {
  const [sections, setSections] = useState<FooterSection[]>(DEFAULT_SECTIONS);

  useEffect(() => {
    const cached = getFooterSections();
    if (cached) { setSections(cached); return; }
    fetch("/api/site-config")
      .then(r => r.ok ? r.json() : null)
      .then((data: { footerMenus?: FooterSection[] } | null) => {
        if (data?.footerMenus?.length) setSections(data.footerMenus);
      })
      .catch(() => {});
  }, []);

  return (
    <footer className="dark:bg-[#070b14] bg-slate-900 text-white border-t dark:border-white/5 border-white/10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10">
          <div className="lg:col-span-1">
            <Link href="/" className="flex items-center gap-2 mb-4">
              <div className="w-10 h-10 rounded-xl gradient-bg flex items-center justify-center shadow-lg">
                <Code2 className="w-5 h-5 text-white" />
              </div>
              <span className="text-2xl font-extrabold gradient-text">نوفيل</span>
            </Link>
            <p className="text-slate-400 text-sm leading-relaxed mb-6">
              منصة تعليم البرمجة الأولى بالعربي. تعلم من الصفر حتى الاحتراف مع كورسات احترافية وتحديات ذكاء اصطناعي.
            </p>
            <div className="flex items-center gap-3">
              {[
                { icon: <Facebook className="w-4 h-4" />, href: "#" },
                { icon: <Twitter className="w-4 h-4" />, href: "#" },
                { icon: <Youtube className="w-4 h-4" />, href: "#" },
                { icon: <Github className="w-4 h-4" />, href: "#" },
              ].map((s, i) => (
                <a key={i} href={s.href}
                  className="w-9 h-9 rounded-lg bg-white/5 hover:bg-cyan-500/20 hover:text-cyan-400 flex items-center justify-center text-slate-400 transition-all hover:scale-110">
                  {s.icon}
                </a>
              ))}
            </div>
          </div>

          {sections.map(section => (
            <div key={section.key}>
              <h3 className="font-bold text-white mb-4">{section.title}</h3>
              <ul className="space-y-3">
                {section.links.map((l, i) => (
                  <li key={i}>
                    <Link href={l.href} className="text-slate-400 hover:text-cyan-400 transition-colors text-sm">
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-12 pt-8 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-slate-500 text-sm">© 2025 نوفيل. جميع الحقوق محفوظة.</p>
          <p className="text-slate-500 text-sm flex items-center gap-1">
            صُنع بـ <Heart className="w-4 h-4 text-red-400 fill-red-400" /> في مصر
          </p>
        </div>
      </div>
    </footer>
  );
}
