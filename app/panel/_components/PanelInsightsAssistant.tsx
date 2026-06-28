"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  ArrowRight,
  BarChart3,
  Bot,
  ChevronDown,
  RefreshCw,
  Sparkles,
} from "lucide-react";

type SignalTone = "good" | "warn" | "risk" | "info";

type RadarData = {
  ok?: boolean;
  error?: string;
  assistant?: {
    name: string;
    role: string;
    ai?: {
      provider: string;
      configured: boolean;
      model: string;
      usingFallbackKey: boolean;
    };
  };
  headline?: string;
  brief?: string;
  signals?: Array<{
    label: string;
    value: string;
    tone: SignalTone;
  }>;
  actions?: Array<{
    title: string;
    detail: string;
    href: string;
  }>;
  marketNotes?: string[];
  refreshedAt?: string;
};

function toneClass(tone?: SignalTone) {
  if (tone === "good") return "is-good";
  if (tone === "warn") return "is-warn";
  if (tone === "risk") return "is-risk";
  return "is-info";
}

function formatTime(value?: string | null) {
  if (!value) return "";

  try {
    return new Date(value).toLocaleTimeString("es", {
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "";
  }
}

export function PanelInsightsAssistant() {
  const [open, setOpen] = useState(false);
  const [data, setData] = useState<RadarData | null>(null);
  const [loading, setLoading] = useState(true);

  const topSignal = useMemo(() => data?.signals?.[0], [data?.signals]);

  async function loadRadar(opts?: { silent?: boolean }) {
    const silent = opts?.silent ?? false;
    if (!silent) setLoading(true);

    try {
      const res = await fetch("/api/panel/insights", {
        cache: "no-store",
        credentials: "include",
      });
      const json = (await res.json().catch(() => null)) as RadarData | null;

      if (!res.ok || json?.ok === false) {
        setData({
          ok: false,
          headline: "Radar sin datos suficientes",
          brief: json?.error || "No se pudo leer el estado del panel.",
          signals: [],
          actions: [
            {
              title: "Revisar configuracion",
              detail: "Abre Config IA para auditar el panel y recuperar el flujo.",
              href: "/panel/autoconfig",
            },
          ],
        });
        return;
      }

      setData(json);
    } catch {
      setData({
        ok: false,
        headline: "Radar desconectado",
        brief: "No se pudo conectar con el asistente de insights.",
        signals: [],
        actions: [
          {
            title: "Auditar panel",
            detail: "Usa Config IA para revisar el sistema completo.",
            href: "/panel/autoconfig",
          },
        ],
      });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadRadar();

    const interval = window.setInterval(() => {
      if (document.visibilityState !== "hidden") {
        void loadRadar({ silent: true });
      }
    }, 45000);

    return () => window.clearInterval(interval);
  }, []);

  return (
    <aside className={open ? "lmn-radar is-open" : "lmn-radar"} aria-label="Lumen Radar">
      <button
        className="lmn-radar-trigger"
        type="button"
        onClick={() => setOpen((value) => !value)}
      >
        <span className="lmn-radar-avatar">
          <Bot className="h-4 w-4" />
        </span>
        <span className="min-w-0 flex-1 text-left">
          <span className="block truncate text-xs font-black text-white">
            {data?.assistant?.name || "Lumen Radar"}
          </span>
          <span className="block truncate text-[11px] font-semibold text-white/46">
            {loading ? "Leyendo panel..." : topSignal ? `${topSignal.label}: ${topSignal.value}` : "Insights activos"}
          </span>
        </span>
        <ChevronDown className="h-4 w-4 text-white/42" />
      </button>

      {open ? (
        <div className="lmn-radar-panel">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.16em] text-white/38">
                <Sparkles className="h-3.5 w-3.5" />
                Asistente global
              </div>
              <h3 className="mt-2 text-base font-black tracking-[-0.03em] text-white">
                {loading ? "Analizando sistema" : data?.headline || "Radar operativo"}
              </h3>
              <div className="mt-2 lmn-radar-ai-state">
                <span>{data?.assistant?.ai?.configured ? "Lumenite activo" : "Modo seguro"}</span>
                <span>Radar operativo</span>
              </div>
            </div>

            <button
              className="lmn-radar-icon-button"
              type="button"
              onClick={() => void loadRadar()}
              title="Actualizar Radar"
            >
              <RefreshCw className={loading ? "h-4 w-4 animate-spin" : "h-4 w-4"} />
            </button>
          </div>

          <p className="mt-3 text-sm leading-6 text-white/54">
            {data?.brief ||
              "Lumen Radar lee el estado del panel y resume lo que conviene hacer ahora."}
          </p>

          <div className="mt-4 grid grid-cols-2 gap-2">
            {(data?.signals ?? []).slice(0, 4).map((signal) => (
              <div key={signal.label} className={`lmn-radar-signal ${toneClass(signal.tone)}`}>
                <span>{signal.label}</span>
                <strong>{signal.value}</strong>
              </div>
            ))}
          </div>

          <div className="mt-4 grid gap-2">
            {(data?.actions ?? []).slice(0, 3).map((action) => (
              <Link key={action.title} href={action.href} className="lmn-radar-action">
                <span className="lmn-radar-action-icon">
                  <Activity className="h-3.5 w-3.5" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-xs font-black text-white">
                    {action.title}
                  </span>
                  <span className="mt-1 block text-[11px] leading-5 text-white/46">
                    {action.detail}
                  </span>
                </span>
                <ArrowRight className="h-3.5 w-3.5 text-white/42" />
              </Link>
            ))}
          </div>

          <div className="mt-4 border-t border-white/[0.07] pt-3">
            <div className="mb-2 flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.14em] text-white/34">
              <BarChart3 className="h-3.5 w-3.5" />
              Mercado y rendimiento
            </div>
            <div className="grid gap-1.5">
              {(data?.marketNotes ?? []).slice(0, 3).map((note, index) => (
                <p key={`${note}-${index}`} className="text-[11px] leading-5 text-white/44">
                  {note}
                </p>
              ))}
            </div>
          </div>

          <div className="mt-4 flex items-center justify-between gap-3">
            <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-white/28">
              {formatTime(data?.refreshedAt)}
            </span>
            <Link href="/panel/autoconfig" className="lmn-radar-config-link">
              Config IA
              <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
        </div>
      ) : null}
    </aside>
  );
}
