import { ToolCardSkeleton, PageHeaderSkeleton } from "@/components/ui/Skeleton";
import { MainLayout } from "@/components/layout/MainLayout";

export default function ToolsLoading() {
  return (
    <MainLayout>
      <div className="min-h-screen dark:bg-[#0a0f1e] bg-slate-50">
        <PageHeaderSkeleton />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <div className="flex gap-2 mb-8 overflow-x-auto pb-2">
            {[...Array(9)].map((_, i) => (
              <div
                key={i}
                className="h-9 w-20 rounded-xl animate-pulse dark:bg-white/5 bg-slate-200 flex-shrink-0"
              />
            ))}
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
            {[...Array(12)].map((_, i) => (
              <ToolCardSkeleton key={i} />
            ))}
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
