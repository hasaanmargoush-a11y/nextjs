"use client";

import { motion } from "framer-motion";
import Link from "next/link";

const categories = [
  { name: "Python", label: "PY", count: 12, color: "from-blue-500/20 to-blue-600/5", border: "border-blue-500/20", labelColor: "text-blue-400 bg-blue-500/20", href: "/courses?category=python" },
  { name: "JavaScript", label: "JS", count: 10, color: "from-yellow-500/20 to-yellow-600/5", border: "border-yellow-500/20", labelColor: "text-yellow-400 bg-yellow-500/20", href: "/courses?category=javascript" },
  { name: "React", label: "JSX", count: 8, color: "from-cyan-500/20 to-cyan-600/5", border: "border-cyan-500/20", labelColor: "text-cyan-400 bg-cyan-500/20", href: "/courses?category=react" },
  { name: "C++", label: "C++", count: 6, color: "from-indigo-500/20 to-indigo-600/5", border: "border-indigo-500/20", labelColor: "text-indigo-400 bg-indigo-500/20", href: "/courses?category=cpp" },
  { name: "Java", label: "JAVA", count: 7, color: "from-red-500/20 to-red-600/5", border: "border-red-500/20", labelColor: "text-red-400 bg-red-500/20", href: "/courses?category=java" },
  { name: "Flutter", label: "DART", count: 5, color: "from-blue-400/20 to-blue-500/5", border: "border-blue-400/20", labelColor: "text-blue-300 bg-blue-400/20", href: "/courses?category=flutter" },
  { name: "SQL", label: "SQL", count: 4, color: "from-green-500/20 to-green-600/5", border: "border-green-500/20", labelColor: "text-green-400 bg-green-500/20", href: "/courses?category=sql" },
  { name: "DevOps", label: "OPS", count: 3, color: "from-orange-500/20 to-orange-600/5", border: "border-orange-500/20", labelColor: "text-orange-400 bg-orange-500/20", href: "/courses?category=devops" },
];

export function CategoriesSection() {
  return (
    <section className="py-20 dark:bg-[#0a0f1e] bg-slate-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <span className="badge badge-cyan mb-4 inline-block">التخصصات</span>
          <h2 className="section-title dark:text-white text-slate-900 mb-4">
            اختر تخصصك
          </h2>
          <p className="dark:text-slate-400 text-slate-600">
            كورسات في أكثر لغات وتقنيات البرمجة طلباً في سوق العمل
          </p>
        </motion.div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {categories.map((cat, i) => (
            <motion.div
              key={cat.name}
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.06 }}
              whileHover={{ y: -4, scale: 1.03 }}
            >
              <Link
                href={cat.href}
                className={`block p-5 rounded-2xl bg-gradient-to-br ${cat.color} border ${cat.border} hover:shadow-lg transition-all duration-300 text-center group`}
              >
                <div className="mb-3 flex justify-center">
                  <span className={`text-xs font-black px-2 py-1 rounded-lg ${cat.labelColor} group-hover:scale-110 transition-transform inline-block`}>{cat.label}</span>
                </div>
                <h3 className="font-bold dark:text-white text-slate-800 mb-1">
                  {cat.name}
                </h3>
                <p className="text-xs dark:text-slate-400 text-slate-500">
                  {cat.count} كورس
                </p>
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
