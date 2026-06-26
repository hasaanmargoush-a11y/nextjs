import Link from "next/link";
import { Code2, Home, ArrowRight } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen dark:bg-[#0a0f1e] bg-slate-50 flex items-center justify-center p-4">
      <div className="text-center">
        <div className="relative inline-block mb-8">
          <div className="text-9xl font-black gradient-text opacity-20 select-none">404</div>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-20 h-20 rounded-2xl gradient-bg flex items-center justify-center shadow-2xl shadow-cyan-500/30">
              <Code2 className="w-10 h-10 text-white" />
            </div>
          </div>
        </div>

        <h1 className="text-3xl font-black dark:text-white text-slate-900 mb-3">
          الصفحة غير موجودة
        </h1>
        <p className="dark:text-slate-400 text-slate-600 mb-8 max-w-md mx-auto">
          الصفحة التي تبحث عنها غير موجودة أو تم نقلها أو حذفها
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link href="/" className="btn-primary">
            <Home className="w-4 h-4" />
            الرئيسية
          </Link>
          <Link href="/courses" className="btn-secondary">
            استعرض الكورسات
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </div>
  );
}
