import { Skeleton } from "@/components/ui/Skeleton";
import { MainLayout } from "@/components/layout/MainLayout";

export default function ProblemDetailLoading() {
  return (
    <MainLayout>
      <div className="min-h-screen dark:bg-[#0a0f1e] bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="grid lg:grid-cols-2 gap-6 h-[calc(100vh-8rem)]">
            <div className="space-y-4 overflow-hidden">
              <div className="dark:bg-[#111827] bg-white rounded-2xl border dark:border-white/10 border-slate-200 p-6 space-y-4">
                <div className="flex gap-2">
                  <Skeleton className="h-6 w-16 rounded-full dark:bg-white/8 bg-slate-200" />
                  <Skeleton className="h-6 w-20 rounded-full dark:bg-white/8 bg-slate-200" />
                </div>
                <Skeleton className="h-8 w-5/6 dark:bg-white/8 bg-slate-200" />
                <div className="flex gap-4">
                  <Skeleton className="h-4 w-20 dark:bg-white/8 bg-slate-200" />
                  <Skeleton className="h-4 w-24 dark:bg-white/8 bg-slate-200" />
                  <Skeleton className="h-4 w-16 dark:bg-white/8 bg-slate-200" />
                </div>
                <div className="space-y-3 pt-2">
                  {[...Array(6)].map((_, i) => (
                    <Skeleton key={i} className="h-4 w-full dark:bg-white/8 bg-slate-200" />
                  ))}
                  <Skeleton className="h-4 w-3/4 dark:bg-white/8 bg-slate-200" />
                </div>
              </div>
              <div className="dark:bg-[#111827] bg-white rounded-2xl border dark:border-white/10 border-slate-200 p-6 space-y-3">
                <Skeleton className="h-5 w-28 dark:bg-white/8 bg-slate-200" />
                <Skeleton className="h-28 w-full rounded-xl dark:bg-white/5 bg-slate-100" />
              </div>
            </div>
            <div className="space-y-4 overflow-hidden">
              <div className="dark:bg-[#111827] bg-white rounded-2xl border dark:border-white/10 border-slate-200 overflow-hidden">
                <div className="flex items-center justify-between p-4 border-b dark:border-white/10 border-slate-200">
                  <Skeleton className="h-8 w-32 rounded-lg dark:bg-white/5 bg-slate-100" />
                  <div className="flex gap-2">
                    <Skeleton className="h-8 w-20 rounded-lg dark:bg-white/5 bg-slate-100" />
                    <Skeleton className="h-8 w-20 rounded-lg dark:bg-white/5 bg-slate-100" />
                  </div>
                </div>
                <Skeleton className="h-80 w-full rounded-none dark:bg-white/5 bg-slate-100" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
