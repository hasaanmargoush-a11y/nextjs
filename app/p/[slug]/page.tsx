"use client";

import { use, useEffect } from "react";
import { useRouter } from "next/navigation";

export default function LegacySlugRedirect({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const router = useRouter();

  useEffect(() => {
    router.replace(`/${slug}`);
  }, [slug, router]);

  return null;
}
