"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useModalAccessibility } from "@/components/ui/use-modal-accessibility";
import {
  AlertTriangle,
  ArrowRight,
  BrainCircuit,
  Globe2,
  LineChart,
  Loader2,
  Maximize2,
  Megaphone,
  Radar,
  RefreshCw,
  Search,
  Sparkles,
  Target,
  X,
} from "lucide-react";
import { ActionButton } from "../_components/ui/ActionButton";
import { GlassCard } from "../_components/ui/GlassCard";
import { PanelSectionHeader } from "../_components/ui/PanelSectionHeader";
import { StatusBadge } from "../_components/ui/StatusBadge";
import SectionIntroGate from "../_components/SectionIntroGate";

const Globe = dynamic(
  () => import("@/components/ui/cobe-globe").then((mod) => mod.Globe),
  {
    ssr: false,
    loading: () => (
      <div className="grid aspect-square place-items-center rounded-full border border-white/[0.06] bg-white/[0.02] text-xs font-black uppercase tracking-[0.16em] text-white/42">
        Lumen Eye
      </div>
    ),
  }
);

type EyeMode = "real" | "preview";

type Zone = {
  key: string;
  label: string;
  country: string;
  city?: string | null;
  region?: string | null;
  timezone?: string | null;
  location?: [number, number] | null;
  conversations: number;
  leads: number;
  opportunities: number;
  alerts: number;
  critical: number;
  lastEvent: string | null;
  intent: string;
  channels: string[];
  kind: "conversation" | "lead" | "opportunity" | "alert" | "research";
};

type EyeData = {
  ok?: boolean;
  error?: string;
  mode?: EyeMode;
  badge?: string;
  refreshedAt?: string;
  summary?: {
    conversations: number;
    geoConversations: number;
    leads: number;
    geoLeads: number;
    opportunities: number;
    critical: number;
  };
  zones?: Zone[];
  markers?: Array<{ id: string; location: [number, number]; label: string }>;
  arcs?: Array<{ id: string; from: [number, number]; to: [number, number]; label?: string }>;
  importantSignals?: Array<{
    id: string;
    category: string;
    title: string;
    impact: string;
    time?: string | null;
    action: string;
    href: string;
  }>;
  cases?: Array<{
    id: string;
    title: string;
    score: number;
    priority: string;
    source: string;
  }>;
  aiSummary?: string;
  privacy?: string;
};

const ranges = ["Hoy", "7 dias", "30 dias"];
const filters = ["Conversaciones", "Leads", "Oportunidades", "Alertas", "Investigacion"];

function formatTime(value?: string | null) {
  if (!value) return "Sin timestamp";
  try {
    return new Date(value).toLocaleString();
  } catch {
    return "Sin timestamp";
  }
}

function metricDelta(value: number, mode?: EyeMode) {
  if (mode !== "real") return "Preview";
  if (value <= 0) return "Sin senal";
  return "+ activo";
}

function zoneWeight(zone: Zone) {
  return zone.conversations + zone.leads * 2 + zone.opportunities * 3 + zone.alerts * 2;
}

export default function LumenEyePage() {
  const [data, setData] = useState<EyeData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [range, setRange] = useState("30 dias");
  const [activeFilter, setActiveFilter] = useState("Conversaciones");
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [immersive, setImmersive] = useState(false);
  const immersiveDialogRef = useModalAccessibility<HTMLDivElement>({
    active: immersive,
    onClose: () => setImmersive(false),
  });

  const mode = data?.mode === "real" ? "real" : "preview";
  const zones = useMemo(() => data?.zones ?? [], [data?.zones]);
  const selectedZone = zones.find((zone) => zone.key === selectedKey) ?? zones[0];
  const markers = data?.markers ?? [];
  const arcs = data?.arcs ?? [];

  const visibleZones = useMemo(() => {
    const key = activeFilter.toLowerCase();
    return zones.filter((zone) => {
      if (key.startsWith("lead")) return zone.leads > 0;
      if (key.startsWith("oportun")) return zone.opportunities > 0;
      if (key.startsWith("alert")) return zone.alerts > 0 || zone.critical > 0;
      if (key.startsWith("invest")) return zone.kind === "research";
      return zone.conversations > 0 || zone.leads > 0;
    });
  }, [activeFilter, zones]);

  async function load(refresh = false) {
    setError(null);
    if (refresh) setRefreshing(true);
    else setLoading(true);

    try {
      const res = await fetch(refresh ? "/api/panel/lumen-eye/refresh" : "/api/panel/lumen-eye", {
        method: refresh ? "POST" : "GET",
        cache: "no-store",
        credentials: "include",
      });
      const json = (await res.json().catch(() => ({}))) as EyeData;
      if (!res.ok || json.ok === false) {
        setError(json.error || "No se pudo cargar Lumen Eye.");
        setData(null);
        return;
      }
      setData(json);
      setSelectedKey((current) => current ?? json.zones?.[0]?.key ?? null);
    } catch {
      setError("No se pudo conectar con Lumen Eye.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  return (
    <SectionIntroGate
      title="Lumen Eye observa el estado vivo del sistema."
      description="Esta vista reúne señales, actividad geográfica aproximada, oportunidades y alertas para entender qué está pasando sin revisar módulo por módulo."
      bullets={[
        "Visualiza actividad, leads, oportunidades y alertas desde una sola vista.",
        "Usa datos reales cuando existen y muestra preview vacio cuando aun no hay metadata geografica.",
        "Mantiene privacidad: muestra señales útiles sin exponer direcciones exactas.",
      ]}
      primaryActionLabel="Entrar al área"
      skipActionLabel="Omitir"
      storageKey="lumenai:intro:lumen-eye:v1"
    >
      <main className="grid gap-5 pb-10">
      <PanelSectionHeader
        variant="hero"
        eyebrow="Inteligencia"
        title="Lumen Eye"
        description="El ojo inteligente de LumenAI: observa senales, conversaciones, oportunidades y actividad global de tu negocio en tiempo real."
        status={mode === "real" ? "Live" : "Preview"}
        statusTone={mode === "real" ? "active" : "warning"}
        secondary={
          <div className="flex flex-wrap gap-2">
            <StatusBadge tone={mode === "real" ? "active" : "warning"}>
              {mode === "real" ? "Live" : "Preview"}
            </StatusBadge>
            <ActionButton type="button" onClick={() => void load(true)} disabled={refreshing}>
              <RefreshCw className={refreshing ? "h-3.5 w-3.5 animate-spin" : "h-3.5 w-3.5"} />
              Actualizar vista
            </ActionButton>
            <ActionButton href="/panel/research" variant="secondary">
              <Search className="h-3.5 w-3.5" />
              Crear investigacion
            </ActionButton>
            <ActionButton href="/panel/radar" variant="primary">
              <Radar className="h-3.5 w-3.5" />
              Enviar a Pulse
            </ActionButton>
          </div>
        }
      />

      <section className="lmn-eye-hero">
        <div className="lmn-eye-hero-copy">
          <span>Inteligencia global aproximada</span>
          <h2>Observa actividad, oportunidades y alertas desde una vista accionable.</h2>
          <p>
            Lumen Eye usa senales reales del sistema cuando existen. Si todavia no hay
            metadata geografica, muestra un preview vacio sin inventar actividad.
          </p>
          <div>
            <ActionButton type="button" onClick={() => setImmersive(true)}>
              <Maximize2 className="h-3.5 w-3.5" />
              Abrir modo inmersivo
            </ActionButton>
            <ActionButton href="/panel/radar" variant="secondary">
              Enviar a Pulse Radar
              <ArrowRight className="h-3.5 w-3.5" />
            </ActionButton>
          </div>
        </div>

        <div className="lmn-eye-hero-stage">
          <Globe
            markers={markers}
            arcs={arcs}
            dark={1}
            mapBrightness={6.2}
            diffuse={1.2}
            mapSamples={18000}
            markerSize={0.052}
            markerElevation={0.04}
            arcWidth={0.8}
            arcHeight={0.36}
            speed={0.0028}
            emptyLabel="Sin senales geograficas"
          />
        </div>
      </section>

      {error ? (
        <GlassCard variant="soft" className="p-5">
          <div className="flex items-center justify-between gap-4" role="alert">
            <div>
              <h3 className="text-lg font-black text-white">Error cargando Lumen Eye</h3>
              <p className="mt-2 text-sm leading-6 text-white/50">{error}</p>
            </div>
            <ActionButton type="button" onClick={() => void load()}>
              Reintentar
            </ActionButton>
          </div>
        </GlassCard>
      ) : null}

      {loading ? (
        <GlassCard variant="strong" className="grid min-h-[620px] place-items-center p-6">
          <div className="grid place-items-center gap-3 text-white/54">
            <Loader2 className="h-6 w-6 animate-spin" />
            <span className="text-xs font-black uppercase tracking-[0.18em]">Leyendo senales globales</span>
          </div>
        </GlassCard>
      ) : (
        <>
          <section className="grid gap-5 xl:grid-cols-[minmax(0,1.35fr)_380px]">
            <GlassCard variant="strong" accent className="min-h-[620px] overflow-hidden p-0">
              <div className="grid min-h-[620px] gap-5 p-5 lg:grid-cols-[minmax(0,1fr)_260px] lg:p-6">
                <div className="relative min-h-[480px] overflow-hidden rounded-[28px] border border-white/[0.065] bg-[radial-gradient(circle_at_50%_45%,rgba(45,212,255,.16),transparent_24%),radial-gradient(circle_at_38%_48%,rgba(108,94,255,.14),transparent_34%),linear-gradient(135deg,rgba(2,6,23,.62),rgba(7,12,28,.42))]">
                  <button
                    type="button"
                    onClick={() => setImmersive(true)}
                    className="lmn-eye-expand"
                    aria-label="Abrir Lumen Eye en pantalla completa"
                  >
                    <Maximize2 className="h-4 w-4" />
                    Pantalla completa
                  </button>
                  <div className="absolute left-5 top-5 z-20 flex flex-wrap gap-2">
                    {ranges.map((item) => (
                      <button
                        key={item}
                        type="button"
                        onClick={() => setRange(item)}
                        className={`rounded-full border px-3 py-2 text-[11px] font-black transition ${
                          range === item
                            ? "border-cyan-200/30 bg-cyan-300/12 text-white"
                            : "border-white/[0.07] bg-white/[0.025] text-white/48 hover:text-white"
                        }`}
                      >
                        {item}
                      </button>
                    ))}
                  </div>

                  <div className="absolute bottom-5 left-5 z-20 flex max-w-[calc(100%-40px)] flex-wrap gap-2">
                    {filters.map((item) => (
                      <button
                        key={item}
                        type="button"
                        onClick={() => setActiveFilter(item)}
                        className={`rounded-full border px-3 py-2 text-[11px] font-black transition ${
                          activeFilter === item
                            ? "border-violet-200/35 bg-violet-300/12 text-white"
                            : "border-white/[0.07] bg-black/20 text-white/45 hover:text-white"
                        }`}
                      >
                        {item}
                      </button>
                    ))}
                  </div>

                  <div className="absolute right-5 top-5 z-20 flex flex-col gap-2 text-[11px] font-black text-white/56">
                    {[
                      ["azul", "conversacion"],
                      ["verde", "lead"],
                      ["violeta", "oportunidad"],
                      ["amarillo", "alerta"],
                      ["rojo", "critico"],
                    ].map(([color, label]) => (
                      <span key={label} className="rounded-full border border-white/[0.06] bg-black/24 px-3 py-1.5">
                        {color} = {label}
                      </span>
                    ))}
                  </div>

                  <Globe
                    markers={markers}
                    arcs={arcs}
                    className="absolute left-1/2 top-1/2 w-[min(760px,92vw)] -translate-x-1/2 -translate-y-1/2 opacity-95"
                    dark={mode === "real" ? 1 : 0.82}
                    mapBrightness={mode === "real" ? 6.2 : 5.2}
                    diffuse={1.18}
                    mapSamples={18000}
                    markerSize={0.052}
                    markerElevation={0.04}
                    arcWidth={0.8}
                    arcHeight={0.36}
                    speed={0.0025}
                    emptyLabel="Sin senales geograficas"
                  />

                  <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,transparent_46%,rgba(0,0,0,.34)_78%,rgba(0,0,0,.66)_100%)]" />
                </div>

                <aside className="grid content-start gap-3">
                  <div>
                    <div className="text-[10px] font-black uppercase tracking-[0.18em] text-white/34">
                      Global Intelligence Map
                    </div>
                    <h3 className="mt-2 text-2xl font-black tracking-[-0.055em] text-white">
                      Vista global del negocio
                    </h3>
                    <p className="mt-3 text-sm leading-6 text-white/50">
                      Ubicaciones aproximadas por zona. No se muestran direcciones, IPs ni coordenadas personales.
                    </p>
                  </div>

                  <div className="grid gap-2">
                    {(visibleZones.length ? visibleZones : zones).slice(0, 7).map((zone) => (
                      <button
                        key={zone.key}
                        type="button"
                        onClick={() => setSelectedKey(zone.key)}
                        className={`rounded-[18px] border p-3 text-left transition ${
                          selectedZone?.key === zone.key
                            ? "border-cyan-200/28 bg-cyan-300/10"
                            : "border-white/[0.065] bg-white/[0.018] hover:bg-white/[0.035]"
                        }`}
                      >
                        <div className="flex items-center justify-between gap-3">
                          <span className="truncate text-sm font-black text-white">{zone.label}</span>
                          <span className="text-xs font-black text-white/46">{zoneWeight(zone)}</span>
                        </div>
                        <p className="mt-1 truncate text-xs text-white/42">{zone.intent}</p>
                      </button>
                    ))}
                  </div>
                </aside>
              </div>
            </GlassCard>

            <aside className="grid content-start gap-4 xl:sticky xl:top-24">
              <GlassCard variant="soft" className="p-4">
                <RailTitle icon={<AlertTriangle className="h-4 w-4" />} title="Senales importantes" />
                <div className="mt-3 grid gap-2">
                  {(data?.importantSignals ?? []).length ? (
                    data?.importantSignals?.map((signal) => (
                      <Link
                        key={signal.id}
                        href={signal.href}
                        className="rounded-[18px] border border-white/[0.06] bg-white/[0.018] p-3 no-underline transition hover:bg-white/[0.035]"
                      >
                        <div className="flex items-center justify-between gap-3">
                          <span className="text-[11px] font-black uppercase tracking-[0.12em] text-white/38">
                            {signal.category}
                          </span>
                          <StatusBadge tone="warning">{signal.impact}</StatusBadge>
                        </div>
                        <p className="mt-2 text-sm font-black leading-5 text-white">{signal.title}</p>
                        <div className="mt-2 flex items-center justify-between text-[11px] font-bold text-white/38">
                          <span>{formatTime(signal.time)}</span>
                          <span>{signal.action}</span>
                        </div>
                      </Link>
                    ))
                  ) : (
                    <EmptyMini text="Aun no hay señales priorizadas reales." />
                  )}
                </div>
              </GlassCard>

              <GlassCard variant="soft" className="p-4">
                <RailTitle icon={<BrainCircuit className="h-4 w-4" />} title="Casos para evaluar" />
                <div className="mt-3 grid gap-2">
                  {(data?.cases ?? []).length ? (
                    data?.cases?.map((item) => (
                      <div key={item.id} className="rounded-[18px] border border-white/[0.06] bg-white/[0.018] p-3">
                        <div className="flex items-center justify-between gap-3">
                          <span className="text-sm font-black text-white">{item.title}</span>
                          <StatusBadge tone={item.priority === "alta" ? "warning" : "muted"}>
                            {item.score}
                          </StatusBadge>
                        </div>
                        <div className="mt-3 flex flex-wrap gap-2">
                          <ActionButton href="/panel/research" variant="ghost">
                            Analizar
                          </ActionButton>
                          <ActionButton href="/panel/autoconfig" variant="ghost">
                            Enviar a Config AI
                          </ActionButton>
                        </div>
                      </div>
                    ))
                  ) : (
                    <EmptyMini text="Sin casos criticos reales por ahora." />
                  )}
                </div>
              </GlassCard>

              <GlassCard variant="soft" className="p-4">
                <RailTitle icon={<Sparkles className="h-4 w-4" />} title="Resumen IA" />
                <p className="mt-3 text-sm leading-6 text-white/56">{data?.aiSummary}</p>
                <p className="mt-3 border-t border-white/[0.06] pt-3 text-xs leading-5 text-white/36">
                  {data?.privacy}
                </p>
              </GlassCard>

              <GlassCard variant="soft" className="p-4">
                <RailTitle icon={<Target className="h-4 w-4" />} title="Acciones" />
                <div className="mt-3 grid grid-cols-1 gap-2">
                  <ActionButton href="/panel/research" variant="secondary">
                    <Search className="h-3.5 w-3.5" />
                    Investigar señal
                  </ActionButton>
                  <ActionButton href="/panel/radar" variant="secondary">
                    <Radar className="h-3.5 w-3.5" />
                    Enviar a Pulse
                  </ActionButton>
                  <ActionButton href="/panel/research" variant="secondary">
                    <BrainCircuit className="h-3.5 w-3.5" />
                    Crear investigacion
                  </ActionButton>
                  <ActionButton href="/panel/growth" variant="secondary">
                    <LineChart className="h-3.5 w-3.5" />
                    Crear oportunidad Growth
                  </ActionButton>
                  <ActionButton href="/panel/campaigns" variant="secondary">
                    <Megaphone className="h-3.5 w-3.5" />
                    Crear campaña
                  </ActionButton>
                  <ActionButton href="/panel/autoconfig" variant="secondary">
                    <Sparkles className="h-3.5 w-3.5" />
                    Enviar a Config AI
                  </ActionButton>
                </div>
              </GlassCard>
            </aside>
          </section>

          <section className="grid gap-4 md:grid-cols-4">
            <EyeMetric label="Conversaciones detectadas" value={data?.summary?.conversations ?? 0} delta={metricDelta(data?.summary?.geoConversations ?? 0, mode)} />
            <EyeMetric label="Leads geolocalizados" value={data?.summary?.geoLeads ?? 0} delta={metricDelta(data?.summary?.geoLeads ?? 0, mode)} />
            <EyeMetric label="Oportunidades activas" value={data?.summary?.opportunities ?? 0} delta={metricDelta(data?.summary?.opportunities ?? 0, mode)} />
            <EyeMetric label="Casos criticos" value={data?.summary?.critical ?? 0} delta={metricDelta(data?.summary?.critical ?? 0, mode)} warning />
          </section>

          {selectedZone ? (
            <GlassCard variant="soft" className="p-5">
              <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
                <div>
                  <div className="text-[10px] font-black uppercase tracking-[0.18em] text-white/34">
                    Zona seleccionada
                  </div>
                  <h3 className="mt-2 text-2xl font-black tracking-[-0.045em] text-white">
                    {selectedZone.label}
                  </h3>
                  <p className="mt-2 text-sm leading-6 text-white/50">
                    Canal(es): {selectedZone.channels.join(", ") || "sin canal"} · Ultimo evento: {formatTime(selectedZone.lastEvent)}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <ActionButton href={`/panel/research?query=${encodeURIComponent(selectedZone.intent)}`} variant="primary">
                    Investigar esta señal
                    <ArrowRight className="h-3.5 w-3.5" />
                  </ActionButton>
                  <ActionButton href="/panel/radar" variant="secondary">
                    Enviar insight a Pulse
                  </ActionButton>
                </div>
              </div>
            </GlassCard>
          ) : null}
        </>
      )}

      {immersive ? (
        <div
          ref={immersiveDialogRef}
          className="lmn-eye-immersive"
          role="dialog"
          aria-modal="true"
          aria-labelledby="lumen-eye-immersive-title"
          aria-describedby="lumen-eye-immersive-description"
          tabIndex={-1}
        >
          <button
            type="button"
            className="lmn-eye-close"
            onClick={() => setImmersive(false)}
            aria-label="Salir de pantalla completa"
          >
            <X className="h-4 w-4" />
            Salir
          </button>
          <div className="lmn-eye-immersive-copy">
            <span>{mode === "real" ? "Live intelligence" : "Preview intelligence"}</span>
            <h2 id="lumen-eye-immersive-title">Lumen Eye</h2>
            <p id="lumen-eye-immersive-description">
              Vista global aproximada de conversaciones, oportunidades, alertas y actividad del widget.
            </p>
          </div>
          <Globe
            markers={markers}
            arcs={arcs}
            className="lmn-eye-immersive-globe"
            dark={1}
            mapBrightness={6.8}
            diffuse={1.25}
            mapSamples={22000}
            markerSize={0.06}
            markerElevation={0.05}
            arcWidth={1}
            arcHeight={0.4}
            speed={0.003}
            emptyLabel="Sin señales geograficas"
          />
          <aside className="lmn-eye-immersive-panel">
            <span>Zona activa</span>
            <strong>{selectedZone?.label || "Sin zona"}</strong>
            <p>{selectedZone?.intent || "Aun no hay suficientes señales reales."}</p>
            <div>
              <i>Conversaciones {selectedZone?.conversations ?? 0}</i>
              <i>Leads {selectedZone?.leads ?? 0}</i>
              <i>Oportunidades {selectedZone?.opportunities ?? 0}</i>
            </div>
            <Link href="/panel/radar">Enviar a Pulse Radar</Link>
          </aside>
        </div>
      ) : null}
      </main>
    </SectionIntroGate>
  );
}

function RailTitle({ icon, title }: { icon: ReactNode; title: string }) {
  return (
    <div className="flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.16em] text-white/42">
      {icon}
      {title}
    </div>
  );
}

function EmptyMini({ text }: { text: string }) {
  return (
    <div className="rounded-[18px] border border-white/[0.06] bg-white/[0.014] p-4 text-sm leading-6 text-white/42">
      {text}
    </div>
  );
}

function EyeMetric({
  label,
  value,
  delta,
  warning,
}: {
  label: string;
  value: number;
  delta: string;
  warning?: boolean;
}) {
  return (
    <GlassCard variant="soft" accent={warning} className="min-h-[132px] p-5">
      <div className="flex items-center justify-between gap-3">
        <div className="text-[11px] font-black uppercase tracking-[0.12em] text-white/42">{label}</div>
        <Globe2 className="h-4 w-4 text-white/36" />
      </div>
      <div className="mt-5 text-4xl font-black tracking-[-0.06em] text-white">{value}</div>
      <div className="mt-3 flex items-center justify-between gap-3">
        <StatusBadge tone={warning ? "warning" : "muted"}>{delta}</StatusBadge>
        <div className="h-1.5 w-20 overflow-hidden rounded-full bg-white/[0.06]">
          <span
            className="block h-full rounded-full bg-[linear-gradient(90deg,rgb(var(--lmn-accent-rgb,0,229,255)),rgb(var(--lmn-accent-2-rgb,108,94,255)))]"
            style={{ width: `${Math.max(18, Math.min(100, value * 8))}%` }}
          />
        </div>
      </div>
    </GlassCard>
  );
}
