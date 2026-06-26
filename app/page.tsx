"use client";

import { MainLayout } from "@/components/layout/MainLayout";
import { HeroSection } from "@/components/home/HeroSection";
import { StatsSection } from "@/components/home/StatsSection";
import { FeaturedCourses } from "@/components/home/FeaturedCourses";
import { FeaturesSection } from "@/components/home/FeaturesSection";
import { CategoriesSection } from "@/components/home/CategoriesSection";
import { CTASection } from "@/components/home/CTASection";
import { useRouteOverride } from "@/hooks/useRouteOverride";
import { BlockRenderer } from "@/components/page-builder/BlockRenderer";

export default function HomePage() {
  const { checking, blocks } = useRouteOverride("home");

  if (checking) {
    return (
      <MainLayout>
        <div className="min-h-[80vh] dark:bg-[#0a0f1e] bg-slate-50" />
      </MainLayout>
    );
  }

  if (blocks) {
    return (
      <MainLayout>
        <BlockRenderer blocks={blocks} />
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <HeroSection />
      <StatsSection />
      <FeaturedCourses />
      <CategoriesSection />
      <FeaturesSection />
      <CTASection />
    </MainLayout>
  );
}
