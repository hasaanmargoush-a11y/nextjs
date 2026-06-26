"use client";

import { motion } from "framer-motion";
import {
  Brain,
  Shield,
  Zap,
  Award,
  Code2,
  Users,
  TrendingUp,
  MessageSquare,
} from "lucide-react";

const features = [
  {
    icon: <Brain className="w-6 h-6" />,
    title: "ذكاء اصطناعي متكامل",
    description: "نظام AI يقيس مستواك ويكيّف الأسئلة والتحديات بناءً على نقاط قوتك وضعفك",
    color: "text-violet-400",
    bg: "bg-violet-500/10",
  },
  {
    icon: <Code2 className="w-6 h-6" />,
    title: "تحديات برمجية",
    description: "مئات المسائل في جميع لغات البرمجة بمستويات مختلفة: سهل، متوسط، صعب، خبير",
    color: "text-cyan-400",
    bg: "bg-cyan-500/10",
  },
  {
    icon: <Award className="w-6 h-6" />,
    title: "نقاط وجوائز",
    description: "نظام تحفيزي متكامل بالنقاط والشارات والشهادات الرقمية التي تثبت مهاراتك",
    color: "text-amber-400",
    bg: "bg-amber-500/10",
  },
  {
    icon: <TrendingUp className="w-6 h-6" />,
    title: "تتبع تقدمك",
    description: "لوحة تحكم ذكية تتابع رحلتك التعليمية وتعرض إحصائياتك بشكل مرئي",
    color: "text-green-400",
    bg: "bg-green-500/10",
  },
  {
    icon: <Shield className="w-6 h-6" />,
    title: "أمان وخصوصية",
    description: "حماية كاملة لبياناتك مع أعلى معايير الأمان والتشفير",
    color: "text-red-400",
    bg: "bg-red-500/10",
  },
  {
    icon: <Zap className="w-6 h-6" />,
    title: "تعلم سريع وفعال",
    description: "منهجية تعليمية مدروسة تضمن تعلمك بأسرع وقت وأعلى جودة",
    color: "text-blue-400",
    bg: "bg-blue-500/10",
  },
  {
    icon: <Users className="w-6 h-6" />,
    title: "مجتمع المبرمجين",
    description: "انضم لمجتمع من المبرمجين العرب الطموحين وتعلم معهم",
    color: "text-pink-400",
    bg: "bg-pink-500/10",
  },
  {
    icon: <MessageSquare className="w-6 h-6" />,
    title: "محتوى عربي أصيل",
    description: "كورسات مصممة خصيصاً باللغة العربية من مدرسين متخصصين",
    color: "text-orange-400",
    bg: "bg-orange-500/10",
  },
];

export function FeaturesSection() {
  return (
    <section className="py-20 dark:bg-[#070b14] bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <span className="badge badge-violet mb-4 inline-block">مميزات المنصة</span>
          <h2 className="section-title dark:text-white text-slate-900 mb-4">
            كل ما تحتاجه في مكان واحد
          </h2>
          <p className="dark:text-slate-400 text-slate-600 max-w-2xl mx-auto text-lg">
            منصة متكاملة تجمع بين التعليم التفاعلي والذكاء الاصطناعي لتجربة تعلم لا مثيل لها
          </p>
        </motion.div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((f, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.08 }}
              whileHover={{ y: -4, scale: 1.02 }}
              className="dark:bg-[#111827] bg-slate-50 rounded-2xl border dark:border-white/10 border-slate-200 p-6 hover:border-current/20 transition-all duration-300 group"
            >
              <div
                className={`w-12 h-12 ${f.bg} ${f.color} rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}
              >
                {f.icon}
              </div>
              <h3 className={`font-bold text-base dark:text-white text-slate-900 mb-2 group-hover:${f.color} transition-colors`}>
                {f.title}
              </h3>
              <p className="dark:text-slate-400 text-slate-500 text-sm leading-relaxed">
                {f.description}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
