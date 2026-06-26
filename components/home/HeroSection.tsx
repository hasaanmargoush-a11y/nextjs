"use client";

import { useEffect, useRef } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import {
  ArrowLeft,
  Zap,
  Code2,
  Brain,
  Trophy,
  Star,
  Play,
} from "lucide-react";

const PARTICLES = [
  { left: 10, top: 15, duration: 4.2, delay: 0 },
  { left: 25, top: 40, duration: 5.1, delay: 0.5 },
  { left: 45, top: 20, duration: 3.8, delay: 1 },
  { left: 60, top: 60, duration: 6.0, delay: 0.3 },
  { left: 75, top: 30, duration: 4.5, delay: 1.5 },
  { left: 85, top: 75, duration: 3.5, delay: 0.8 },
  { left: 15, top: 80, duration: 5.5, delay: 0.2 },
  { left: 35, top: 55, duration: 4.8, delay: 1.2 },
  { left: 55, top: 85, duration: 3.9, delay: 0.7 },
  { left: 90, top: 45, duration: 5.2, delay: 1.8 },
  { left: 5, top: 50, duration: 4.1, delay: 0.4 },
  { left: 70, top: 10, duration: 6.3, delay: 2.0 },
  { left: 40, top: 90, duration: 3.7, delay: 1.3 },
  { left: 20, top: 25, duration: 5.8, delay: 0.6 },
  { left: 80, top: 65, duration: 4.3, delay: 1.1 },
  { left: 50, top: 35, duration: 3.6, delay: 0.9 },
  { left: 65, top: 88, duration: 5.4, delay: 1.7 },
  { left: 30, top: 70, duration: 4.7, delay: 0.1 },
  { left: 95, top: 20, duration: 5.9, delay: 2.2 },
  { left: 12, top: 95, duration: 4.0, delay: 1.4 },
];

const codeSnippets = [
  { code: 'print("مرحباً بالعالم")', lang: "Python", color: "#3b82f6" },
  { code: 'console.log("نوفيل")', lang: "JavaScript", color: "#f59e0b" },
  { code: 'System.out.println("Learn")', lang: "Java", color: "#ef4444" },
  { code: 'cout << "Hello" << endl;', lang: "C++", color: "#06b6d4" },
];

const floatingBadges = [
  { icon: <Trophy className="w-4 h-4" />, text: "+500 شهادة", color: "from-amber-500/20 to-amber-600/10", border: "border-amber-500/20", textColor: "text-amber-400" },
  { icon: <Brain className="w-4 h-4" />, text: "ذكاء اصطناعي", color: "from-violet-500/20 to-violet-600/10", border: "border-violet-500/20", textColor: "text-violet-400" },
  { icon: <Star className="w-4 h-4" />, text: "4.9 تقييم", color: "from-cyan-500/20 to-cyan-600/10", border: "border-cyan-500/20", textColor: "text-cyan-400" },
  { icon: <Code2 className="w-4 h-4" />, text: "+50 كورس", color: "from-green-500/20 to-green-600/10", border: "border-green-500/20", textColor: "text-green-400" },
];

export function HeroSection() {
  return (
    <section className="relative min-h-screen flex items-center overflow-hidden dark:bg-[#0a0f1e] bg-slate-50">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 right-20 w-72 h-72 bg-cyan-500/10 rounded-full blur-3xl animate-pulse-slow" />
        <div className="absolute bottom-20 left-20 w-96 h-96 bg-violet-500/10 rounded-full blur-3xl animate-pulse-slow" style={{ animationDelay: "2s" }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-cyan-500/5 rounded-full blur-3xl" />

        {PARTICLES.map((p, i) => (
          <motion.div
            key={i}
            className="absolute w-1 h-1 bg-cyan-400/30 rounded-full"
            style={{ left: `${p.left}%`, top: `${p.top}%` }}
            animate={{ y: [-20, 20, -20], opacity: [0.3, 0.8, 0.3] }}
            transition={{ duration: p.duration, repeat: Infinity, delay: p.delay }}
          />
        ))}
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 grid lg:grid-cols-2 gap-16 items-center">
        <div>
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-sm font-medium mb-6">
              <Zap className="w-4 h-4" />
              منصة البرمجة العربية الأولى
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black leading-tight dark:text-white text-slate-900 mb-6">
              تعلم البرمجة{" "}
              <span className="gradient-text">بالعربي</span>
              <br />
              من الصفر للاحتراف
            </h1>

            <p className="text-lg dark:text-slate-400 text-slate-600 leading-relaxed mb-8 max-w-xl">
              كورسات احترافية، تحديات يومية، وذكاء اصطناعي يحلل مستواك ويطور مهاراتك. انضم لآلاف المبرمجين العرب في رحلتهم نحو الاحتراف.
            </p>

            <div className="flex flex-wrap gap-4 mb-10">
              <Link href="/auth/register" className="btn-primary text-base px-6 py-3">
                <Zap className="w-5 h-5" />
                ابدأ مجاناً الآن
              </Link>
              <Link href="/courses" className="btn-secondary text-base px-6 py-3">
                <Play className="w-5 h-5" />
                استعرض الكورسات
                <ArrowLeft className="w-4 h-4" />
              </Link>
            </div>

            <div className="flex flex-wrap gap-3">
              {floatingBadges.map((badge, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.4 + i * 0.1 }}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gradient-to-r ${badge.color} border ${badge.border} ${badge.textColor} text-sm font-medium`}
                >
                  {badge.icon}
                  {badge.text}
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>

        <motion.div
          initial={{ opacity: 0, x: 50 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="relative hidden lg:block"
        >
          <div className="relative">
            <motion.div
              className="dark:bg-[#111827] bg-white rounded-2xl border dark:border-white/10 border-slate-200 shadow-2xl p-6 mb-4"
              animate={{ y: [-5, 5, -5] }}
              transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
            >
              <div className="flex items-center gap-2 mb-4">
                <div className="w-3 h-3 rounded-full bg-red-500" />
                <div className="w-3 h-3 rounded-full bg-yellow-500" />
                <div className="w-3 h-3 rounded-full bg-green-500" />
                <span className="text-xs dark:text-slate-500 text-slate-400 mr-2">editor.py</span>
              </div>
              <div className="space-y-2 font-mono text-sm">
                <div className="flex gap-4">
                  <span className="text-slate-500">1</span>
                  <span className="text-violet-400">def</span>
                  <span className="dark:text-slate-200 text-slate-800">احسب_النقاط</span>
                  <span className="text-slate-400">(مستوى):</span>
                </div>
                <div className="flex gap-4">
                  <span className="text-slate-500">2</span>
                  <span className="mr-4 text-cyan-400">نقاط</span>
                  <span className="text-slate-400">= مستوى</span>
                  <span className="text-amber-400">* 100</span>
                </div>
                <div className="flex gap-4">
                  <span className="text-slate-500">3</span>
                  <span className="mr-4 text-violet-400">return</span>
                  <span className="text-green-400">نقاط</span>
                </div>
                <div className="flex gap-4">
                  <span className="text-slate-500">4</span>
                  <span className="dark:text-slate-300 text-slate-600">print(احسب_النقاط(</span>
                  <span className="text-amber-400">5</span>
                  <span className="dark:text-slate-300 text-slate-600">))</span>
                </div>
              </div>
              <motion.div
                className="mt-4 p-3 rounded-lg bg-green-500/10 border border-green-500/20"
                animate={{ opacity: [0.7, 1, 0.7] }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                <p className="text-green-400 text-sm font-mono">الناتج: 500 نقطة</p>
              </motion.div>
            </motion.div>

            {codeSnippets.map((snippet, i) => (
              <motion.div
                key={i}
                className="absolute dark:bg-[#1e293b] bg-white rounded-xl border dark:border-white/10 border-slate-200 shadow-lg px-4 py-2"
                style={{
                  top: `${20 + i * 25}%`,
                  right: i % 2 === 0 ? "-10%" : "auto",
                  left: i % 2 !== 0 ? "-15%" : "auto",
                }}
                animate={{
                  y: [0, -10, 0],
                  rotate: [i % 2 === 0 ? -3 : 3, i % 2 === 0 ? 0 : 0, i % 2 === 0 ? -3 : 3],
                }}
                transition={{
                  duration: 3 + i,
                  repeat: Infinity,
                  ease: "easeInOut",
                  delay: i * 0.5,
                }}
              >
                <p
                  className="text-xs font-mono"
                  style={{ color: snippet.color }}
                >
                  {snippet.code}
                </p>
                <p className="text-xs text-slate-500 mt-0.5">{snippet.lang}</p>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>

      <div className="absolute bottom-8 left-1/2 -translate-x-1/2">
        <motion.div
          animate={{ y: [0, 8, 0] }}
          transition={{ duration: 1.5, repeat: Infinity }}
          className="w-6 h-10 rounded-full border-2 dark:border-slate-600 border-slate-300 flex items-start justify-center pt-2"
        >
          <div className="w-1 h-2 bg-cyan-400 rounded-full" />
        </motion.div>
      </div>
    </section>
  );
}
