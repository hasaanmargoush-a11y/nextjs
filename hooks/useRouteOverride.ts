"use client";
import { useEffect, useState } from "react";

export interface OverrideBlock {
  id: number;
  type: string;
  settings: Record<string, unknown>;
  isVisible: boolean;
}

interface SiteConfig {
  siteRoutes: Record<string, string>;
}

const CACHE_KEY = "nouvil_site_cfg_v1";
const CACHE_TTL = 60_000;

function getCache(): SiteConfig | null {
  try {
    const raw = sessionStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const { d, t } = JSON.parse(raw) as { d: SiteConfig; t: number };
    if (Date.now() - t > CACHE_TTL) return null;
    return d;
  } catch { return null; }
}

export function setCachedSiteConfig(cfg: SiteConfig) {
  try {
    sessionStorage.setItem(CACHE_KEY, JSON.stringify({ d: cfg, t: Date.now() }));
  } catch {}
}

export function invalidateSiteConfigCache() {
  try { sessionStorage.removeItem(CACHE_KEY); } catch {}
}

export function useRouteOverride(route: string) {
  const [state, setState] = useState<"checking" | "default" | "custom">("checking");
  const [blocks, setBlocks] = useState<OverrideBlock[]>([]);

  useEffect(() => {
    let cancelled = false;

    async function resolve() {
      let cfg = getCache();
      if (!cfg) {
        try {
          const r = await fetch("/api/site-config");
          if (!r.ok) throw new Error("fail");
          cfg = await r.json() as SiteConfig;
          setCachedSiteConfig(cfg);
        } catch {
          if (!cancelled) setState("default");
          return;
        }
      }

      const slug = cfg.siteRoutes?.[route];
      if (!slug) {
        if (!cancelled) setState("default");
        return;
      }

      try {
        const r = await fetch(`/api/pages/render/${slug}`);
        if (!r.ok) throw new Error("fail");
        const page = await r.json() as { blocks: OverrideBlock[] };
        if (!cancelled && page?.blocks?.length) {
          setBlocks(page.blocks);
          setState("custom");
        } else if (!cancelled) {
          setState("default");
        }
      } catch {
        if (!cancelled) setState("default");
      }
    }

    resolve();
    return () => { cancelled = true; };
  }, [route]);

  return {
    checking: state === "checking",
    blocks: state === "custom" ? blocks : null,
  };
}
