import { Skeleton } from "@/components/ui/Skeleton";
import { MainLayout } from "@/components/layout/MainLayout";

export default function DashboardLoading() {
  return (
    <MainLayout>
      <div className="min-h-screen dark:bg-[#0a0f1e] bg-slate-50">
        <div className="dark:bg-[#070b14] bg-white border-b dark:border-white/5 border-slate-100 py-8">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center gap-4">
              <Skeleton className="w-14 h-14 rounded-2xl flex-shrink-0 dark:bg-white/8 bg-slate-200" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-3 w-20 dark:bg-white/8 bg-slate-200" />
                <Skeleton className="h-6 w-48 dark:bg-white/8 bg-slate-200" />
                <Skeleton className="h-4 w-32 dark:bg-white/8 bg-slate-200" />
              </div>
              <div className="flex gap-3">
                <Skeleton className="h-9 w-32 rounded-xl dark:bg-white/5 bg-slate-100" />
                <Skeleton className="h-9 w-24 rounded-xl dark:bg-white/5 bg-slate-100" />
              </div>
            </div>
            <Skeleton className="h-10 w-full rounded-xl mt-5 dark:bg-white/5 bg-slate-100" />
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="dark:bg-[#111827] bg-white rounded-2xl border dark:border-white/10 border-slate-200 p-5 space-y-3">
                <Skeleton className="w-10 h-10 rounded-xl dark:bg-white/5 bg-slate-100" />
                <Skeleton className="h-8 w-16 dark:bg-white/8 bg-slate-200" />
                <Skeleton className="h-3 w-24 dark:bg-white/8 bg-slate-200" />
              </div>
            ))}
          </div>

          <div className="grid lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-4">
              <Skeleton className="h-7 w-40 dark:bg-white/8 bg-slate-200" />
              {[...Array(3)].map((_, i) => (
                <div key={i} className="dark:bg-[#111827] bg-white rounded-xl border dark:border-white/10 border-slate-200 p-4 flex items-center gap-3">
                  <Skeleton className="w-10 h-10 rounded-xl flex-shrink-0 dark:bg-white/5 bg-slate-100" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-3/4 dark:bg-white/8 bg-slate-200" />
                    <Skeleton className="h-2 w-full rounded-full dark:bg-white/5 bg-slate-100" />
                  </div>
                  <Skeleton className="h-8 w-8 rounded-lg flex-shrink-0 dark:bg-white/5 bg-slate-100" />
                </div>
              ))}
            </div>
            <div className="space-y-3">
              <Skeleton className="h-7 w-36 dark:bg-white/8 bg-slate-200" />
              {[...Array(5)].map((_, i) => (
                <div key={i} className="dark:bg-[#111827] bg-white rounded-xl border dark:border-white/10 border-slate-200 p-3 flex items-center gap-3">
                  <Skeleton className="w-8 h-8 rounded-lg flex-shrink-0 dark:bg-white/5 bg-slate-100" />
                  <Skeleton className="h-4 flex-1 dark:bg-white/8 bg-slate-200" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
