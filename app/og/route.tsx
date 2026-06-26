import { ImageResponse } from "next/og";
import { NextRequest } from "next/server";

const FONT_URL = "https://fonts.gstatic.com/s/tajawal/v12/Iurf6YBj_oCad4k1l4qkLrY.ttf";

async function loadFont(): Promise<ArrayBuffer> {
  const res = await fetch(FONT_URL);
  return res.arrayBuffer();
}

// Satori has limited RTL support — reverse word order for correct Arabic display
function rtl(text: string): string {
  return text.split(" ").reverse().join(" ");
}

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;

  const title = searchParams.get("title") ?? "نوفيل";
  const description = searchParams.get("description") ?? "منصة تعليم البرمجة بالعربي";
  const category = searchParams.get("category") ?? "";
  const author = searchParams.get("author") ?? "فريق نوفيل";
  const readTime = searchParams.get("readTime") ?? "";
  const type = searchParams.get("type") ?? "article";

  const font = await loadFont();

  const typeConfig: Record<string, { label: string; color: string }> = {
    article: { label: "مقال",  color: "#06b6d4" },
    course:  { label: "كورس", color: "#8b5cf6" },
    problem: { label: "تحدي", color: "#f59e0b" },
  };
  const cfg = typeConfig[type] ?? typeConfig.article;

  const shortTitle = title.length > 55 ? title.slice(0, 53) + "…" : title;
  const shortDesc  = description.length > 120 ? description.slice(0, 118) + "…" : description;
  const shortCat   = category.length > 20 ? category.slice(0, 18) + "…" : category;
  const authorInit = [...author].find(c => /[\u0600-\u06FF]/.test(c)) ?? author[0] ?? "ن";

  return new ImageResponse(
    (
      <div
        style={{
          width: 1200,
          height: 630,
          display: "flex",
          flexDirection: "column",
          background: "linear-gradient(135deg, #070b14 0%, #0d1424 60%, #0a0f1e 100%)",
          fontFamily: "Tajawal",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Glow blobs */}
        <div style={{
          position: "absolute", top: -140, right: -140,
          width: 420, height: 420, borderRadius: "50%",
          background: `radial-gradient(circle, ${cfg.color}40 0%, transparent 65%)`,
        }} />
        <div style={{
          position: "absolute", bottom: -100, left: -100,
          width: 350, height: 350, borderRadius: "50%",
          background: "radial-gradient(circle, #8b5cf640 0%, transparent 65%)",
        }} />

        {/* Grid overlay */}
        <div style={{
          position: "absolute", inset: 0,
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.025) 1px,transparent 1px)," +
            "linear-gradient(90deg,rgba(255,255,255,0.025) 1px,transparent 1px)",
          backgroundSize: "60px 60px",
        }} />

        {/* ── Header ── */}
        <div style={{
          display: "flex", alignItems: "center",
          justifyContent: "space-between",
          padding: "38px 56px 0",
        }}>
          {/* Badges — right side (displayed left in LTR flex, visually right) */}
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <div style={{
              padding: "8px 20px", borderRadius: 50,
              background: `${cfg.color}22`,
              border: `1.5px solid ${cfg.color}55`,
              color: cfg.color, fontSize: 20, fontWeight: 700,
            }}>
              {cfg.label}
            </div>
            {shortCat && (
              <div style={{
                padding: "8px 20px", borderRadius: 50,
                background: "rgba(255,255,255,0.07)",
                border: "1.5px solid rgba(255,255,255,0.14)",
                color: "#94a3b8", fontSize: 20,
              }}>
                {rtl(shortCat)}
              </div>
            )}
          </div>

          {/* Logo — left side */}
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <span style={{
              fontSize: 34, fontWeight: 700,
              background: `linear-gradient(90deg, ${cfg.color}, #8b5cf6)`,
              backgroundClip: "text",
              color: "transparent",
            }}>
              نوفيل
            </span>
            <div style={{
              width: 54, height: 54, borderRadius: 14,
              background: `linear-gradient(135deg, ${cfg.color}, #8b5cf6)`,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 22, color: "#fff", fontWeight: 700,
              boxShadow: `0 0 28px ${cfg.color}55`,
            }}>
              {"</>"}
            </div>
          </div>
        </div>

        {/* ── Main text ── */}
        <div style={{
          flex: 1, display: "flex", flexDirection: "column",
          justifyContent: "center", padding: "24px 56px 0",
        }}>
          <div style={{
            fontSize: shortTitle.length > 38 ? 48 : 58,
            fontWeight: 700, color: "#ffffff",
            lineHeight: 1.4, marginBottom: 22,
            maxWidth: 1050,
            textAlign: "right",
          }}>
            {rtl(shortTitle)}
          </div>

          <div style={{
            fontSize: 26, color: "#94a3b8",
            lineHeight: 1.65, maxWidth: 950,
            textAlign: "right",
          }}>
            {rtl(shortDesc)}
          </div>
        </div>

        {/* ── Footer ── */}
        <div style={{
          display: "flex", alignItems: "center",
          justifyContent: "space-between",
          padding: "26px 56px 38px",
          borderTop: "1px solid rgba(255,255,255,0.07)",
          marginTop: 24,
        }}>
          {/* Domain — left */}
          <div style={{
            display: "flex", alignItems: "center", gap: 10,
            color: "#475569", fontSize: 20,
          }}>
            <div style={{
              width: 10, height: 10, borderRadius: "50%",
              background: cfg.color,
              boxShadow: `0 0 10px ${cfg.color}`,
            }} />
            nouvil.com
          </div>

          {/* Author — right */}
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 3 }}>
              <span style={{ color: "#e2e8f0", fontSize: 22, fontWeight: 600 }}>
                {rtl(author)}
              </span>
              {readTime && (
                <span style={{ color: "#64748b", fontSize: 17 }}>
                  {readTime} دقائق قراءة
                </span>
              )}
            </div>
            <div style={{
              width: 48, height: 48, borderRadius: "50%",
              background: `linear-gradient(135deg, ${cfg.color}, #8b5cf6)`,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 22, color: "#fff", fontWeight: 700,
            }}>
              {authorInit}
            </div>
          </div>
        </div>

        {/* Bottom accent */}
        <div style={{
          position: "absolute", bottom: 0, left: 0, right: 0, height: 5,
          background: `linear-gradient(90deg, transparent, ${cfg.color}, #8b5cf6, transparent)`,
        }} />
      </div>
    ),
    {
      width: 1200,
      height: 630,
      fonts: [{ name: "Tajawal", data: font, weight: 700, style: "normal" }],
    }
  );
}
