import { redirect, notFound } from "next/navigation";

interface Props {
  params: Promise<{ language: string }>;
}

async function getFirstTopic(lang: string): Promise<string | null> {
  try {
    const baseUrl = process.env.INTERNAL_API_URL ?? "http://localhost:8080";
    const res = await fetch(`${baseUrl}/api/school/languages/${lang}`, { next: { revalidate: 300 } });
    if (!res.ok) return null;
    const data = await res.json();
    const allTopics = data.chapters?.flatMap((ch: { topics: { slug: string }[] }) => ch.topics) ?? [];
    const uncategorized = data.uncategorized ?? [];
    const first = [...allTopics, ...uncategorized][0];
    return first?.slug ?? null;
  } catch {
    return null;
  }
}

export default async function LanguagePage({ params }: Props) {
  const { language } = await params;
  const firstSlug = await getFirstTopic(language);
  if (!firstSlug) notFound();
  redirect(`/learn/${language}/${firstSlug}`);
}
