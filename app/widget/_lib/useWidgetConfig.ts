"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

export type WidgetConfig = {
  widgetEnabled: boolean;
  greeting: string;
  assistantName: string;
  tone: string;
  position: "br" | "bl" | "tr" | "tl";
  theme: {
    primaryColor: string;
    gradientFrom: string;
    gradientTo: string;
    fontFamily: string;
  };
  channels: { whatsapp: string | null; email: string | null };
  businessHours: unknown;
};

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : "config error";
}

export function useWidgetConfig() {
  const sp = useSearchParams();
  const key = sp.get("key");

  const [cfg, setCfg] = useState<WidgetConfig | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!key) return;

    (async () => {
      try {
        setErr(null);
        const res = await fetch(`/api/widget/config?key=${encodeURIComponent(key)}`, {
          cache: "no-store",
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json?.error ?? "config error");
        setCfg(json);
      } catch (error) {
        setErr(errorMessage(error));
      }
    })();
  }, [key]);

  return { key, cfg, err };
}
