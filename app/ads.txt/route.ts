const API_BASE = process.env.INTERNAL_API_URL ?? "http://localhost:8080";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const res = await fetch(`${API_BASE}/api/settings/adsense`, {
      next: { revalidate: 3600 },
    });
    if (res.ok) {
      const data = (await res.json()) as {
        enabled?: boolean;
        publisherId?: string;
      };
      if (data?.enabled && data?.publisherId?.startsWith("ca-pub-")) {
        const pubId = data.publisherId.trim();
        const content = `google.com, ${pubId}, DIRECT, f08c47fec0942fa0`;
        return new Response(content, {
          headers: { "Content-Type": "text/plain; charset=utf-8" },
        });
      }
    }
  } catch {
  }
  return new Response("", { status: 404 });
}
