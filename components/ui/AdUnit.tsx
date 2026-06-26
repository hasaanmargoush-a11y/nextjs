"use client";

import { useEffect, useRef, useState } from "react";

interface AdUnitProps {
  slot: string;
  format?: "auto" | "fluid" | "rectangle" | "vertical" | "horizontal";
  responsive?: boolean;
  className?: string;
}

declare global {
  interface Window {
    adsbygoogle: unknown[];
  }
}

export function AdUnit({ slot, format = "auto", responsive = true, className = "" }: AdUnitProps) {
  const ref = useRef<HTMLModElement>(null);
  const pushed = useRef(false);
  const [publisherId, setPublisherId] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/settings/adsense")
      .then((r) => r.json())
      .then((d) => {
        if (d.enabled && d.publisherId?.startsWith("ca-pub-")) {
          setPublisherId(d.publisherId);
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!publisherId || !ref.current || pushed.current) return;
    try {
      window.adsbygoogle = window.adsbygoogle || [];
      window.adsbygoogle.push({});
      pushed.current = true;
    } catch {
    }
  }, [publisherId]);

  if (!publisherId || !slot) return null;

  return (
    <div className={`ad-unit-wrapper overflow-hidden text-center ${className}`}>
      <ins
        ref={ref}
        className="adsbygoogle"
        style={{ display: "block" }}
        data-ad-client={publisherId}
        data-ad-slot={slot}
        data-ad-format={format}
        data-full-width-responsive={responsive ? "true" : "false"}
      />
    </div>
  );
}
