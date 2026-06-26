"use client";

import { useEffect, useRef, useState } from "react";
import { motion, useInView } from "framer-motion";
import { Users, BookOpen, Code, Award } from "lucide-react";
import { api, type PlatformStats } from "@/lib/api";

const defaultStats = [
  { icon: <Users className="w-6 h-6" />, label: "طالب مسجل", key: "totalStudents", fallback: 5000, color: "text-cyan-400" },
  { icon: <BookOpen className="w-6 h-6" />, label: "كورس متاح", key: "totalCourses", fallback: 50, color: "text-violet-400" },
  { icon: <Code className="w-6 h-6" />, label: "تحدي برمجي", key: "totalProblems", fallback: 500, color: "text-amber-400" },
  { icon: <Award className="w-6 h-6" />, label: "شهادة مُصدرة", key: "totalCertificates", fallback: 1200, color: "text-green-400" },
];

function CountUp({ target, duration = 2 }: { target: number; duration?: number }) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true });

  useEffect(() => {
    if (!inView) return;
    let start = 0;
    const step = target / (duration * 60);
    const timer = setInterval(() => {
      start += step;
      if (start >= target) {
        setCount(target);
        clearInterval(timer);
      } else {
        setCount(Math.floor(start));
      }
    }, 1000 / 60);
    return () => clearInterval(timer);
  }, [inView, target, duration]);

  return (
    <span ref={ref} suppressHydrationWarning>
      {count.toLocaleString("ar-EG")}
    </span>
  );
}

export function StatsSection() {
  const [stats, setStats] = useState<PlatformStats | null>(null);

  useEffect(() => {
    api.get<PlatformStats>("/stats/platform")
      .then(setStats)
      .catch(() => {});
  }, []);

  return (
    <section className="py-16 dark:bg-[#070b14] bg-white border-y dark:border-white/5 border-slate-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
          {defaultStats.map((stat, i) => {
            const value = stats
              ? ((stats as unknown) as Record<string, number>)[stat.key] ?? stat.fallback
              : stat.fallback;

            return (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="text-center"
              >
                <div
                  className={`w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4 ${stat.color} bg-current/10`}
                  style={{ background: "rgba(var(--tw-bg-opacity, 1), 0.1)" }}
                >
                  <div className={stat.color}>{stat.icon}</div>
                </div>
                <div className={`text-4xl font-black mb-2 ${stat.color}`}>
                  +<CountUp target={value} />
                </div>
                <p className="dark:text-slate-400 text-slate-600 text-sm font-medium">
                  {stat.label}
                </p>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
