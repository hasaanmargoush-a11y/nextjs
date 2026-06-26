"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { use } from "react";
import { api } from "@/lib/api";
import { Loader2, Download, ArrowRight, Award, Copy } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

interface CertData {
  uniqueCode: string;
  issuedAt: string;
  courseTitle: string;
  certTitle: string;
  certDescription?: string | null;
  certType: string;
  userName: string;
  signatoryName?: string | null;
  signatoryTitle?: string | null;
}

// Generate QR data URL for a given URL string
async function generateQrDataUrl(url: string): Promise<string> {
  const QRCode = (await import("qrcode")).default;
  return QRCode.toDataURL(url, {
    width: 200,
    margin: 1,
    color: { dark: "#5a3c00", light: "#fffef8" },
    errorCorrectionLevel: "M",
  });
}

// ─── Certificate Card (HTML — 1123×794 fixed, scaled by JS) ──────────────────
function CertificateCard({
  cert, issuedDate, qrDataUrl,
}: {
  cert: CertData;
  issuedDate: string;
  qrDataUrl: string | null;
}) {
  return (
    <div style={{
      width: 1123, height: 794,
      fontFamily: "'Tajawal','Arial',sans-serif",
      direction: "rtl",
      background: "linear-gradient(160deg,#fffef8 0%,#fefcf0 40%,#fffdf5 100%)",
      position: "relative", overflow: "hidden", boxSizing: "border-box",
    }}>
      {/* Subtle diagonal stripe watermark */}
      <div style={{ position: "absolute", inset: 0, opacity: 0.022,
        backgroundImage: "repeating-linear-gradient(45deg,#a07820 0,#a07820 1px,transparent 0,transparent 40%)",
        backgroundSize: "16px 16px" }} />

      {/* Outer gold border */}
      <div style={{ position: "absolute", inset: 16, border: "2.5px solid #a07820", borderRadius: 6, pointerEvents: "none" }} />
      {/* Inner thin border */}
      <div style={{ position: "absolute", inset: 24, border: "1px solid rgba(184,150,62,0.45)", borderRadius: 4, pointerEvents: "none" }} />

      {/* Corner ornaments */}
      {([
        { top: 12, right: 12, rotate: 0 },
        { top: 12, left: 12, rotate: 90 },
        { bottom: 12, right: 12, rotate: -90 },
        { bottom: 12, left: 12, rotate: 180 },
      ] as const).map((pos, i) => (
        <div key={i} style={{ position: "absolute", width: 52, height: 52, ...(pos as any),
          rotate: undefined,
          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 52 52'%3E%3Cpath d='M52,2 L2,2 L2,52' stroke='%23a07820' stroke-width='2.5' fill='none' stroke-linecap='square'/%3E%3Cpath d='M46,8 L8,8 L8,46' stroke='%23c9a84c' stroke-width='1' fill='none' opacity='0.6'/%3E%3Ccircle cx='52' cy='2' r='4' fill='%23a07820' opacity='0.5'/%3E%3C/svg%3E")`,
          backgroundSize: "cover", transform: `rotate(${pos.rotate ?? 0}deg)` } as React.CSSProperties} />
      ))}

      {/* ── CONTENT ── */}
      <div style={{
        position: "absolute", inset: 0,
        display: "flex", flexDirection: "column", alignItems: "center",
        justifyContent: "space-between",
        padding: "46px 80px 40px", boxSizing: "border-box", textAlign: "center",
      }}>
        {/* TOP SECTION */}
        <div style={{ width: "100%", display: "flex", flexDirection: "column", alignItems: "center" }}>
          <p style={{ margin: 0, color: "#7a5c14", fontSize: 10, fontWeight: 700,
            letterSpacing: "0.28em", textTransform: "uppercase" }}>NOUVIL PLATFORM</p>
          <p style={{ margin: "3px 0 16px", color: "#2c1f06", fontSize: 16, fontWeight: 800,
            letterSpacing: "0.08em" }}>منصة نوفيل للتعليم</p>

          {/* Ornamental divider */}
          <div style={{ display: "flex", alignItems: "center", width: 360, gap: 8, marginBottom: 16 }}>
            <div style={{ flex: 1, height: 1, background: "linear-gradient(90deg,transparent,#c9a84c 80%)" }} />
            <svg width="14" height="14" viewBox="0 0 14 14">
              <rect x="4" y="0" width="6" height="6" fill="#a07820" transform="rotate(45 7 7)" />
            </svg>
            <div style={{ flex: 1, height: 1, background: "linear-gradient(90deg,#c9a84c 20%,transparent)" }} />
          </div>

          <p style={{ margin: "0 0 0px", color: "#7a5c14", fontSize: 13, fontWeight: 600,
            letterSpacing: "0.12em" }}>
            شَهادَة إِتْمام &nbsp;·&nbsp; Certificate of Completion
          </p>
        </div>

        {/* MIDDLE SECTION */}
        <div style={{ width: "100%", display: "flex", flexDirection: "column", alignItems: "center", flex: 1, justifyContent: "center", gap: 0 }}>
          <h1 style={{ margin: "0 0 28px", color: "#1a1000", fontSize: 34, fontWeight: 900,
            lineHeight: 1.25, maxWidth: 720 }}>{cert.certTitle}</h1>

          <p style={{ margin: "0 0 10px", color: "#5a4010", fontSize: 14, fontWeight: 400,
            letterSpacing: "0.05em" }}>تُقدَّم هذه الشهادة إلى</p>

          <p style={{ margin: 0, color: "#7a4f00", fontSize: 52, fontWeight: 900,
            lineHeight: 1, letterSpacing: "0.01em" }}>{cert.userName}</p>

          <div style={{ width: 240, height: 2.5, marginTop: 10, marginBottom: 18,
            background: "linear-gradient(90deg,transparent 0%,#a07820 30%,#c9a84c 50%,#a07820 70%,transparent 100%)" }} />

          <p style={{ margin: "0 0 10px", color: "#5a4010", fontSize: 14, fontWeight: 400 }}>
            لإتمامه/ا بنجاح دورة
          </p>

          <p style={{ margin: "0 0 24px", color: "#1a1000", fontSize: 22, fontWeight: 700,
            maxWidth: 640, lineHeight: 1.4 }}>{cert.courseTitle}</p>

          {/* Badge */}
          <div style={{
            display: "inline-flex", alignItems: "center", gap: 8,
            padding: "8px 28px", borderRadius: 100,
            border: "1.5px solid #c9a84c",
            background: "linear-gradient(90deg,rgba(184,150,62,0.08),rgba(201,168,76,0.12),rgba(184,150,62,0.08))",
          }}>
            <svg width="14" height="14" viewBox="0 0 24 24">
              <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" fill="#a07820" />
            </svg>
            <span style={{ color: "#5a3c00", fontSize: 13, fontWeight: 700 }}>
              {cert.certType === "course" ? "شهادة إتمام الكورس" : "شهادة إتمام المرحلة"}
            </span>
          </div>
        </div>

        {/* FOOTER */}
        <div style={{
          width: "100%",
          borderTop: "1px solid rgba(160,120,32,0.3)", paddingTop: 16,
          display: "flex", alignItems: "center", justifyContent: "space-between",
          gap: 12,
        }}>
          {/* Date — right */}
          <div style={{ textAlign: "right", minWidth: 120 }}>
            <p style={{ margin: "0 0 4px", color: "#8a7040", fontSize: 10, fontWeight: 600,
              letterSpacing: "0.08em", textTransform: "uppercase" }}>تاريخ الإصدار</p>
            <p style={{ margin: 0, color: "#2c1f06", fontSize: 14, fontWeight: 700 }}>{issuedDate}</p>
          </div>

          {/* Signatory — center */}
          <div style={{ textAlign: "center", flex: 1 }}>
            {cert.signatoryName ? (
              <>
                <div style={{ width: 80, height: 1, background: "rgba(160,120,32,0.4)", margin: "0 auto 6px" }} />
                <p style={{ margin: 0, color: "#2c1f06", fontSize: 13, fontWeight: 700 }}>{cert.signatoryName}</p>
                {cert.signatoryTitle && (
                  <p style={{ margin: "3px 0 0", color: "#8a7040", fontSize: 11, fontWeight: 500 }}>{cert.signatoryTitle}</p>
                )}
              </>
            ) : (
              <p style={{ margin: 0, color: "#7a5c14", fontSize: 12, fontWeight: 600 }}>منصة نوفيل للتعليم</p>
            )}
          </div>

          {/* QR Code — left */}
          <div style={{ textAlign: "left", minWidth: 100, display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 3 }}>
            {qrDataUrl ? (
              <>
                <div style={{ border: "1.5px solid rgba(160,120,32,0.4)", borderRadius: 5, padding: 2, background: "#fffef8", display: "inline-block" }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={qrDataUrl} alt="QR" width={46} height={46} style={{ display: "block", borderRadius: 3 }} />
                </div>
                <p style={{ margin: 0, color: "#8a7040", fontSize: 8, fontWeight: 600, letterSpacing: "0.05em", textTransform: "uppercase", direction: "ltr" }}>
                  Scan to verify
                </p>
              </>
            ) : (
              <div style={{ width: 50, height: 50, background: "rgba(160,120,32,0.06)", borderRadius: 5, border: "1px solid rgba(160,120,32,0.2)" }} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Canvas PDF generator (mirrors CertificateCard exactly) ──────────────────
async function drawCertToCanvas(
  cert: CertData, issuedDate: string, verifyUrl: string
): Promise<HTMLCanvasElement> {
  const W = 1123, H = 794, S = 3;
  const canvas = document.createElement("canvas");
  canvas.width = W * S; canvas.height = H * S;
  const ctx = canvas.getContext("2d")!;
  ctx.scale(S, S);
  const cx = W / 2;

  function rr(x: number, y: number, w: number, h: number, r: number) {
    ctx.beginPath(); ctx.roundRect(x, y, w, h, r);
  }
  function wrapText(text: string, maxW: number): string[] {
    const words = text.split(" ");
    const lines: string[] = [];
    let cur = "";
    for (const w of words) {
      const test = cur ? `${cur} ${w}` : w;
      if (ctx.measureText(test).width > maxW && cur) { lines.push(cur); cur = w; }
      else cur = test;
    }
    if (cur) lines.push(cur);
    return lines;
  }
  function centerText(text: string, y: number) { ctx.fillText(text, cx, y); }
  function centerLines(lines: string[], startY: number, lineH: number): number {
    lines.forEach((l, i) => ctx.fillText(l, cx, startY + i * lineH));
    return startY + lines.length * lineH;
  }
  function loadImg(src: string): Promise<HTMLImageElement | null> {
    return new Promise(res => {
      const img = new Image();
      img.onload = () => res(img);
      img.onerror = () => res(null);
      img.src = src;
    });
  }

  // Generate QR code
  const QRCode = (await import("qrcode")).default;
  const qrDataUrl = await QRCode.toDataURL(verifyUrl, {
    width: 200, margin: 1,
    color: { dark: "#5a3c00", light: "#fffef8" },
    errorCorrectionLevel: "M",
  });
  const qrImg = await loadImg(qrDataUrl);

  // ── Background ─────────────────────────────────────────────────────────────
  const bgG = ctx.createLinearGradient(0, 0, W * 0.6, H);
  bgG.addColorStop(0, "#fffef8"); bgG.addColorStop(0.4, "#fefcf0"); bgG.addColorStop(1, "#fffdf5");
  ctx.fillStyle = bgG; ctx.fillRect(0, 0, W, H);

  // Diagonal stripe watermark
  ctx.save(); ctx.globalAlpha = 0.022; ctx.strokeStyle = "#a07820"; ctx.lineWidth = 0.8;
  for (let i = -H; i < W + H; i += 16) {
    ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i + H, H); ctx.stroke();
  }
  ctx.restore();

  // ── Borders ────────────────────────────────────────────────────────────────
  ctx.strokeStyle = "#a07820"; ctx.lineWidth = 2.5;
  rr(16, 16, W - 32, H - 32, 6); ctx.stroke();
  ctx.strokeStyle = "rgba(184,150,62,0.45)"; ctx.lineWidth = 1;
  rr(24, 24, W - 48, H - 48, 4); ctx.stroke();

  // ── Corner ornaments ───────────────────────────────────────────────────────
  function drawCorner(ox: number, oy: number, flipX: number, flipY: number) {
    ctx.save(); ctx.translate(ox, oy); ctx.scale(flipX, flipY);
    ctx.strokeStyle = "#a07820"; ctx.lineWidth = 2.5; ctx.lineCap = "square";
    ctx.beginPath(); ctx.moveTo(0, 40); ctx.lineTo(0, 2); ctx.lineTo(40, 2); ctx.stroke();
    ctx.strokeStyle = "#c9a84c"; ctx.lineWidth = 1; ctx.globalAlpha = 0.6;
    ctx.beginPath(); ctx.moveTo(6, 34); ctx.lineTo(6, 8); ctx.lineTo(34, 8); ctx.stroke();
    ctx.globalAlpha = 1;
    ctx.fillStyle = "#a07820"; ctx.globalAlpha = 0.5;
    ctx.beginPath(); ctx.arc(0, 2, 3.5, 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = 1;
    ctx.restore();
  }
  drawCorner(12, 12, 1, 1);
  drawCorner(W - 12, 12, -1, 1);
  drawCorner(12, H - 12, 1, -1);
  drawCorner(W - 12, H - 12, -1, -1);

  // ── Text setup ─────────────────────────────────────────────────────────────
  ctx.textAlign = "center"; ctx.direction = "rtl";

  // ── TOP SECTION ────────────────────────────────────────────────────────────
  ctx.font = "700 11px 'Tajawal',Arial"; ctx.fillStyle = "#7a5c14";
  ctx.letterSpacing = "3.2px";
  centerText("NOUVIL PLATFORM", 70);
  ctx.letterSpacing = "0px";

  ctx.font = "800 17px 'Tajawal',Arial"; ctx.fillStyle = "#2c1f06";
  centerText("منصة نوفيل للتعليم", 92);

  // Ornamental divider
  const dW = 180;
  const gDiv = ctx.createLinearGradient(cx - dW, 0, cx + dW, 0);
  gDiv.addColorStop(0, "transparent"); gDiv.addColorStop(0.5, "#c9a84c"); gDiv.addColorStop(1, "transparent");
  ctx.strokeStyle = gDiv; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(cx - dW, 118); ctx.lineTo(cx - 9, 118); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(cx + 9, 118); ctx.lineTo(cx + dW, 118); ctx.stroke();
  ctx.save(); ctx.translate(cx, 118); ctx.rotate(Math.PI / 4);
  ctx.fillStyle = "#a07820"; ctx.fillRect(-4.5, -4.5, 9, 9); ctx.restore();

  ctx.font = "600 13px 'Tajawal',Arial"; ctx.fillStyle = "#7a5c14";
  centerText("شَهادَة إِتْمام  ·  Certificate of Completion", 148);

  // ── CERT TITLE ─────────────────────────────────────────────────────────────
  ctx.font = "900 34px 'Tajawal',Arial"; ctx.fillStyle = "#1a1000";
  const titleLines = wrapText(cert.certTitle, 720);
  const titleStartY = 196;
  const titleEndY = centerLines(titleLines, titleStartY, 44);

  // ── MIDDLE (centered in remaining space above footer) ──────────────────────
  const midTop = titleEndY + 20;
  const midBottom = H - 100;
  const midH = midBottom - midTop;
  const midPad = Math.max(8, (midH - 240) / 5);

  let my = midTop + midPad;

  ctx.font = "400 14px 'Tajawal',Arial"; ctx.fillStyle = "#5a4010";
  centerText("تُقدَّم هذه الشهادة إلى", my);
  my += 18 + 8;

  ctx.font = "900 52px 'Tajawal',Arial"; ctx.fillStyle = "#7a4f00";
  centerText(cert.userName, my + 38);
  my += 64 + midPad;

  // Gold name underline
  const nw = Math.min(ctx.measureText(cert.userName).width + 60, 300);
  const gName = ctx.createLinearGradient(cx - nw / 2, 0, cx + nw / 2, 0);
  gName.addColorStop(0, "transparent"); gName.addColorStop(0.3, "#a07820");
  gName.addColorStop(0.7, "#c9a84c"); gName.addColorStop(1, "transparent");
  ctx.strokeStyle = gName; ctx.lineWidth = 2.5;
  ctx.beginPath(); ctx.moveTo(cx - nw / 2, my); ctx.lineTo(cx + nw / 2, my); ctx.stroke();
  my += 14 + midPad;

  ctx.font = "400 14px 'Tajawal',Arial"; ctx.fillStyle = "#5a4010";
  centerText("لإتمامه/ا بنجاح دورة", my);
  my += 20 + 8;

  ctx.font = "700 22px 'Tajawal',Arial"; ctx.fillStyle = "#1a1000";
  const courseLines = wrapText(cert.courseTitle, 640);
  my = centerLines(courseLines, my, 30) + midPad;

  // Badge pill
  const pillText = cert.certType === "course" ? "شهادة إتمام الكورس" : "شهادة إتمام المرحلة";
  ctx.font = "700 13px 'Tajawal',Arial";
  const tw = ctx.measureText(pillText).width;
  const ph = 36, pw = tw + 68;
  const px = cx - pw / 2, py = my - 2;
  rr(px, py, pw, ph, ph / 2);
  const pillG = ctx.createLinearGradient(px, 0, px + pw, 0);
  pillG.addColorStop(0, "rgba(184,150,62,0.07)");
  pillG.addColorStop(0.5, "rgba(201,168,76,0.13)");
  pillG.addColorStop(1, "rgba(184,150,62,0.07)");
  ctx.fillStyle = pillG; ctx.fill();
  ctx.strokeStyle = "#c9a84c"; ctx.lineWidth = 1.5; ctx.stroke();
  // star
  const starX = px + 20, starY = py + ph / 2;
  ctx.save(); ctx.translate(starX, starY);
  ctx.beginPath();
  for (let i = 0; i < 5; i++) {
    const oa = (i * 4 * Math.PI) / 5 - Math.PI / 2;
    const ia = oa + (2 * Math.PI) / 10;
    if (i === 0) ctx.moveTo(7 * Math.cos(oa), 7 * Math.sin(oa));
    else ctx.lineTo(7 * Math.cos(oa), 7 * Math.sin(oa));
    ctx.lineTo(2.9 * Math.cos(ia), 2.9 * Math.sin(ia));
  }
  ctx.closePath(); ctx.fillStyle = "#a07820"; ctx.fill();
  ctx.restore();
  ctx.fillStyle = "#5a3c00";
  ctx.textAlign = "left"; ctx.direction = "ltr";
  ctx.fillText(pillText, starX + 14, starY + 5);
  ctx.textAlign = "center"; ctx.direction = "rtl";

  // ── FOOTER ─────────────────────────────────────────────────────────────────
  // fTop at H-96 = 698, leaving 96px for footer contents.
  // Inner border is at H-24 = 770, outer at H-16 = 778.
  // QR (50px) + box-padding(4*2=8) = 58 total height.
  // qrY = 710 → box top = 706 → box bottom = 706+58 = 764 ✓ (inside border)
  const fTop = H - 96; // = 698
  ctx.strokeStyle = "rgba(160,120,32,0.3)"; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(80, fTop); ctx.lineTo(W - 80, fTop); ctx.stroke();

  // Date (right in RTL = high X)
  ctx.textAlign = "right";
  ctx.font = "600 10px 'Tajawal',Arial"; ctx.fillStyle = "#8a7040";
  ctx.fillText("تاريخ الإصدار", W - 80, fTop + 20);
  ctx.font = "700 14px 'Tajawal',Arial"; ctx.fillStyle = "#2c1f06";
  ctx.fillText(issuedDate, W - 80, fTop + 40);

  // Signatory (center)
  ctx.textAlign = "center";
  if (cert.signatoryName) {
    ctx.strokeStyle = "rgba(160,120,32,0.35)"; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(cx - 50, fTop + 12); ctx.lineTo(cx + 50, fTop + 12); ctx.stroke();
    ctx.font = "700 13px 'Tajawal',Arial"; ctx.fillStyle = "#2c1f06";
    ctx.fillText(cert.signatoryName, cx, fTop + 32);
    if (cert.signatoryTitle) {
      ctx.font = "500 11px 'Tajawal',Arial"; ctx.fillStyle = "#8a7040";
      ctx.fillText(cert.signatoryTitle, cx, fTop + 50);
    }
  } else {
    ctx.font = "600 12px 'Tajawal',Arial"; ctx.fillStyle = "#7a5c14";
    ctx.fillText("منصة نوفيل للتعليم", cx, fTop + 32);
  }

  // QR Code (left = low X in canvas)
  // Carefully placed so it stays strictly inside the certificate border.
  if (qrImg) {
    const qrSize = 50;
    const qrX = 84;
    const qrY = fTop + 10; // = 708, box top = 704, box bottom = 704+58 = 762 ✓

    // White background box (4px padding around QR)
    ctx.fillStyle = "#fffef8";
    rr(qrX - 4, qrY - 4, qrSize + 8, qrSize + 8, 6);
    ctx.fill();
    ctx.strokeStyle = "rgba(160,120,32,0.4)"; ctx.lineWidth = 1.5;
    rr(qrX - 4, qrY - 4, qrSize + 8, qrSize + 8, 6);
    ctx.stroke();

    ctx.drawImage(qrImg, qrX, qrY, qrSize, qrSize);

    // "Scan to verify" label — below the QR box, still inside border
    ctx.textAlign = "left"; ctx.direction = "ltr";
    ctx.font = "500 8px 'Tajawal',Arial"; ctx.fillStyle = "#8a7040";
    ctx.fillText("Scan to verify", qrX, qrY + qrSize + 12); // = 708+50+12 = 770 ✓
    ctx.direction = "rtl";
  }

  return canvas;
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function CertificatePage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = use(params);
  const [cert, setCert] = useState<CertData | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);

  const certRef      = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    api.get<CertData>(`/my/certificates/${code}`)
      .then(data => setCert(data))
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [code]);

  // Generate QR code once we have the cert code
  useEffect(() => {
    if (!cert) return;
    const url = `${window.location.origin}/verify/${cert.uniqueCode}`;
    generateQrDataUrl(url).then(setQrDataUrl);
  }, [cert]);

  const applyScale = useCallback(() => {
    const el = certRef.current, wrap = containerRef.current;
    if (!el || !wrap) return;
    const w = wrap.offsetWidth;
    if (!w) return;
    el.style.transform = `scale(${w / 1123})`;
    el.style.transformOrigin = "top left";
  }, []);

  useEffect(() => {
    if (!cert) return;
    applyScale();
    window.addEventListener("resize", applyScale);
    return () => window.removeEventListener("resize", applyScale);
  }, [cert, applyScale]);

  const handleDownloadPDF = useCallback(async () => {
    if (!cert) return;
    setDownloading(true);
    try {
      await document.fonts.ready;
      const issuedDate = new Date(cert.issuedAt).toLocaleDateString("ar-EG", {
        year: "numeric", month: "long", day: "numeric",
      });
      const verifyUrl = `${window.location.origin}/verify/${cert.uniqueCode}`;
      const certCanvas = await drawCertToCanvas(cert, issuedDate, verifyUrl);
      const { jsPDF } = await import("jspdf");
      const imgData = certCanvas.toDataURL("image/png");
      const pdf = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4", compress: false });
      const pdfW = 297;
      const pdfH = (certCanvas.height * pdfW) / certCanvas.width;
      pdf.addImage(imgData, "PNG", 0, 0, pdfW, pdfH);
      pdf.save(`شهادة-${cert.uniqueCode}.pdf`);
      toast.success("تم تحميل الشهادة بنجاح");
    } catch (e) {
      console.error("PDF error:", e);
      toast.error("فشل إنشاء PDF");
    } finally {
      setDownloading(false);
    }
  }, [cert]);

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center dark:bg-[#0a0f1e] bg-slate-50">
      <Loader2 className="w-8 h-8 text-amber-500 animate-spin" />
    </div>
  );

  if (notFound || !cert) return (
    <div className="min-h-screen flex flex-col items-center justify-center dark:bg-[#0a0f1e] bg-slate-50 p-4">
      <Award className="w-16 h-16 dark:text-slate-700 text-slate-300 mb-4" />
      <h2 className="text-xl font-bold dark:text-white text-slate-900 mb-2">الشهادة غير موجودة</h2>
      <p className="dark:text-slate-400 text-slate-600 mb-6 text-sm text-center">
        تأكد من صحة رمز الشهادة أو أنك مسجل الدخول
      </p>
      <Link href="/dashboard" className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-amber-500 text-white font-semibold text-sm hover:opacity-90 transition-opacity">
        <ArrowRight className="w-4 h-4" />العودة للداشبورد
      </Link>
    </div>
  );

  const issuedDate = new Date(cert.issuedAt).toLocaleDateString("ar-EG", {
    year: "numeric", month: "long", day: "numeric",
  });

  return (
    <div className="min-h-screen dark:bg-[#0a0f1e] bg-slate-100 flex flex-col items-center p-4 sm:p-8 pt-8">

      {/* Action bar */}
      <div className="flex items-center justify-between w-full max-w-4xl mb-6 gap-3 flex-wrap">
        <Link href="/dashboard" className="flex items-center gap-2 text-sm dark:text-slate-400 text-slate-600 hover:text-amber-600 transition-colors">
          <ArrowRight className="w-4 h-4" />العودة للداشبورد
        </Link>
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => {
              const url = `${window.location.origin}/verify/${cert.uniqueCode}`;
              navigator.clipboard.writeText(url).then(() => toast.success("تم نسخ رابط التحقق"));
            }}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl border dark:border-[#1f2937] border-slate-300 dark:text-slate-300 text-slate-700 font-semibold text-sm hover:border-amber-500/60 hover:text-amber-600 transition-all cursor-pointer"
          >
            <Copy className="w-4 h-4" />نسخ رابط التحقق
          </button>
          <button
            onClick={handleDownloadPDF}
            disabled={downloading}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-semibold text-sm transition-colors disabled:opacity-60 cursor-pointer disabled:cursor-not-allowed"
          >
            {downloading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
            تحميل PDF
          </button>
        </div>
      </div>

      {/* Certificate wrapper */}
      <div className="w-full max-w-4xl">
        <div className="rounded-xl overflow-hidden shadow-2xl shadow-amber-900/20 ring-1 ring-amber-900/10">
          <div ref={containerRef} style={{ width: "100%", position: "relative", paddingBottom: `${(794 / 1123) * 100}%` }}>
            <div ref={certRef} style={{ position: "absolute", top: 0, left: 0, width: 1123, height: 794 }}>
              <CertificateCard cert={cert} issuedDate={issuedDate} qrDataUrl={qrDataUrl} />
            </div>
          </div>
        </div>

        <div className="mt-4 flex items-center justify-center gap-2 text-xs dark:text-slate-500 text-slate-400">
          <span>للتحقق من صحة الشهادة:</span>
          <a href={`/verify/${cert.uniqueCode}`} target="_blank" className="text-amber-600 hover:underline font-mono">
            nouvil.com/verify/{cert.uniqueCode}
          </a>
        </div>
      </div>
    </div>
  );
}
