import { Skeleton, CourseCardSkeleton } from "@/components/ui/Skeleton";
import { MainLayout } from "@/components/layout/MainLayout";

export default function HomeLoading() {
  return (
    <MainLayout>
      <div className="min-h-screen dark:bg-[#0a0f1e] bg-slate-50">
        <section className="relative min-h-[85vh] flex items-center justify-center py-20 px-4">
          <div className="text-center max-w-4xl mx-auto space-y-6">
            <Skeleton className="h-8 w-40 rounded-full mx-auto dark:bg-white/8 bg-slate-200" />
            <Skeleton className="h-16 w-full max-w-2xl mx-auto dark:bg-white/8 bg-slate-200" />
            <Skeleton className="h-10 w-3/4 mx-auto dark:bg-white/8 bg-slate-200" />
            <Skeleton className="h-6 w-2/3 mx-auto dark:bg-white/8 bg-slate-200" />
            <div className="flex gap-4 justify-center pt-4">
              <Skeleton className="h-12 w-40 rounded-xl dark:bg-white/8 bg-slate-200" />
              <Skeleton className="h-12 w-32 rounded-xl dark:bg-white/8 bg-slate-200" />
            </div>
          </div>
        </section>

        <section className="py-16 dark:bg-[#070b14] bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="text-center space-y-2">
                  <Skeleton className="h-12 w-24 mx-auto dark:bg-white/8 bg-slate-200" />
                  <Skeleton className="h-4 w-20 mx-auto dark:bg-white/8 bg-slate-200" />
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="py-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12 space-y-3">
              <Skeleton className="h-8 w-48 mx-auto dark:bg-white/8 bg-slate-200" />
              <Skeleton className="h-5 w-72 mx-auto dark:bg-white/8 bg-slate-200" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => (
                <CourseCardSkeleton key={i} />
              ))}
            </div>
          </div>
        </section>
      </div>
    </MainLayout>
  );
}
