"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { Zap, ArrowLeft } from "lucide-react";

export function CTASection() {
  return (
    <section className="py-24 dark:bg-[#070b14] bg-white">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="relative"
        >
          <div className="absolute inset-0 -z-10">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl" />
          </div>

          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-sm font-medium mb-8">
            <Zap className="w-4 h-4" />
            ابدأ رحلتك اليوم
          </div>

          <h2 className="text-4xl sm:text-5xl font-black dark:text-white text-slate-900 mb-6 leading-tight">
            جاهز تبدأ رحلتك في{" "}
            <span className="gradient-text">عالم البرمجة؟</span>
          </h2>

          <p className="dark:text-slate-400 text-slate-600 text-lg mb-10 max-w-2xl mx-auto">
            انضم لآلاف المبرمجين العرب الذين بدأوا رحلتهم مع نوفيل وحققوا أحلامهم في مجال التكنولوجيا.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/auth/register" className="btn-primary text-lg px-8 py-4 w-full sm:w-auto justify-center">
              <Zap className="w-5 h-5" />
              إنشاء حساب مجاني
            </Link>
            <Link href="/courses" className="btn-secondary text-lg px-8 py-4 w-full sm:w-auto justify-center">
              استعرض الكورسات
              <ArrowLeft className="w-5 h-5" />
            </Link>
          </div>

          <p className="dark:text-slate-500 text-slate-400 text-sm mt-6">
            لا يحتاج بطاقة ائتمانية • مجاني للأبد • ابدأ خلال دقيقة
          </p>
        </motion.div>
      </div>
    </section>
  );
}
