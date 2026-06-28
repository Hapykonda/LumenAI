"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, Newspaper, RefreshCw, Sparkles } from "lucide-react";
import { ActionButton } from "../_components/ui/ActionButton";
import { GlassCard } from "../_components/ui/GlassCard";
import { PanelSectionHeader } from "../_components/ui/PanelSectionHeader";
import { StatusBadge } from "../_components/ui/StatusBadge";

type RadarData = {
  ok?: boolean;
  error?: string;
  headline?: string;
  brief?: string;
  refreshedAt?: string;
  signals?: Array<{ label: string; value: string; tone: "good" | "warn" | "risk" | "info" }>;
  actions?: Array<{ title: string; detail: string; href: string }>;
  marketNotes?: string[];
  marketNews?: Array<{
    headline?: string;
    title?: string;
    source?: string;
    link?: string;
    url?: string;
    summary?: string;
    pubDate?: string;
  }>;
};

function tone(toneName?: string): "active" | "warning" | "danger" | "muted" {
  if (toneName === "good") return "active";
  if (toneName === "warn") return "warning";
  if (toneName === "risk") return "danger";
  return "muted";
}

export default function RadarPage() {
  const [data, setData] = useState<RadarData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load(refresh = false) {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(refresh ? "/api/panel/radar/refresh" : "/api/panel/radar", {
        method: refresh ? "POST" : "GET",
        cache: "no-store",
        credentials: "include",
      });
      const json = (await res.json().catch(() => ({}))) as RadarData;
      if (!res.ok || json.ok === false) {
        setError(json.error || "No se pudo cargar Radar.");
        setData(null);
        return;
      }
      setData(json);
    } catch {
      setError("No se pudo conectar con Radar.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  return (
    <main className="grid gap-5 pb-10">
      <PanelSectionHeader
        eyebrow="Lumenite Radar"
        title="Radar ejecutivo"
        description="Feed de senales internas, mercado, riesgos y acciones recomendadas para el negocio."
        status={loading ? "leyendo" : "actualizado"}
        statusTone="active"
        secondary={
          <ActionButton onClick={() => void load(true)} disabled={loading} variant="primary">
            <RefreshCw className={loading ? "h-3.5 w-3.5 animate-spin" : "h-3.5 w-3.5"} />
            Actualizar radar
          </ActionButton>
        }
      />

      {error ? <div className="lmn-autoconfig-error">{error}</div> : null}

      <GlassCard variant="strong" accent className="p-5">
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_380px]">
          <div>
            <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.16em] text-white/34">
              <Sparkles className="h-3.5 w-3.5" />
              Lumenite recomienda
            </div>
            <h2 className="mt-3 max-w-4xl text-4xl font-black tracking-[-0.065em] text-white md:text-5xl">
              {data?.headline || "Radar operativo listo"}
            </h2>
            <p className="mt-4 max-w-3xl text-sm leading-7 text-white/58">
              {data?.brief || "Conecta datos, Knowledge y fuentes para activar recomendaciones mas profundas."}
            </p>
          </div>
          <div className="grid gap-2">
            {(data?.signals ?? []).slice(0, 4).map((signal) => (
              <div key={signal.label} className="apex-cut flex items-center justify-between gap-3 border border-white/[0.07] bg-white/[0.018] p-3">
                <span className="text-xs font-black text-white/56">{signal.label}</span>
                <StatusBadge tone={tone(signal.tone)}>{signal.value}</StatusBadge>
              </div>
            ))}
          </div>
        </div>
      </GlassCard>

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_380px]">
        <div className="grid gap-4 md:grid-cols-2">
          {(data?.marketNews ?? []).slice(0, 6).map((item, index) => {
            const title = item.headline || item.title || "Senal de mercado";
            const href = item.link || item.url || "";
            return (
              <GlassCard key={`${title}-${index}`} variant="soft" className="p-4">
                <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.16em] text-white/34">
                  <Newspaper className="h-3.5 w-3.5" />
                  {item.source || "Fuente"}
                </div>
                <h3 className="mt-3 text-lg font-black leading-tight text-white">{title}</h3>
                <p className="mt-2 text-sm leading-6 text-white/48">
                  {item.summary || "Radar cruza esta senal con el estado interno del negocio."}
                </p>
                {href ? (
                  <a
                    href={href}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-4 inline-flex items-center gap-2 text-xs font-black text-white no-underline"
                  >
                    Ver fuente
                    <ArrowRight className="h-3.5 w-3.5" />
                  </a>
                ) : null}
              </GlassCard>
            );
          })}
          {!data?.marketNews?.length ? (
            <GlassCard variant="soft" className="p-6 md:col-span-2">
              <h3 className="text-xl font-black text-white">Conecta fuentes de mercado</h3>
              <p className="mt-2 text-sm leading-7 text-white/48">
                Radar funciona con senales internas y puede sumar RSS/API externas cuando agregues fuentes.
              </p>
            </GlassCard>
          ) : null}
        </div>

        <GlassCard variant="soft" className="p-4">
          <div className="text-[10px] font-black uppercase tracking-[0.16em] text-white/34">
            Acciones recomendadas
          </div>
          <div className="mt-3 grid gap-2">
            {(data?.actions ?? []).map((action) => (
              <Link
                key={action.title}
                href={action.href}
                className="apex-cut border border-white/[0.07] bg-white/[0.018] p-3 no-underline transition hover:bg-white/[0.035]"
              >
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="text-xs font-black text-white">{action.title}</div>
                    <p className="mt-1 text-[11px] leading-5 text-white/42">{action.detail}</p>
                  </div>
                  <ArrowRight className="h-3.5 w-3.5 text-white/42" />
                </div>
              </Link>
            ))}
          </div>

          <div className="mt-5 border-t border-white/[0.07] pt-4">
            <div className="text-[10px] font-black uppercase tracking-[0.16em] text-white/34">
              Notas
            </div>
            <div className="mt-3 grid gap-2">
              {(data?.marketNotes ?? []).map((note, index) => (
                <p key={`${note}-${index}`} className="text-xs leading-6 text-white/48">
                  {note}
                </p>
              ))}
            </div>
          </div>
        </GlassCard>
      </section>
    </main>
  );
}
