"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  CalendarDays,
  Copy,
  Loader2,
  Megaphone,
  RefreshCw,
  Send,
  Sparkles,
} from "lucide-react";
import { ActionButton } from "../_components/ui/ActionButton";
import { GlassCard } from "../_components/ui/GlassCard";
import { PanelSectionHeader } from "../_components/ui/PanelSectionHeader";
import { StatusBadge } from "../_components/ui/StatusBadge";

type Campaign = {
  id: string;
  title: string;
  objective?: string | null;
  target_audience?: string | null;
  offer?: string | null;
  angle?: string | null;
  channels?: string[] | null;
  duration_days?: number | null;
  status?: string | null;
  summary?: string | null;
  metadata?: {
    source?: string | null;
  } | null;
  created_at?: string | null;
};

type Asset = {
  id: string;
  campaign_id?: string | null;
  asset_type: string;
  channel?: string | null;
  title?: string | null;
  content: string;
  variant?: string | null;
};

type CampaignData = {
  ok?: boolean;
  error?: string;
  summary?: {
    campaigns: number;
    active: number;
    assets: number;
    pendingTasks: number;
    experiments: number;
  };
  campaigns?: Campaign[];
  assets?: Asset[];
  tasks?: Array<Record<string, unknown>>;
  experiments?: Array<Record<string, unknown>>;
};

const objectives = [
  "vender producto",
  "recuperar leads",
  "lanzar promocion",
  "aumentar WhatsApp",
  "anunciar servicio",
  "postventa",
];

const channels = ["WhatsApp", "Instagram", "email", "landing", "widget", "todos"];

export default function CampaignsPage() {
  const [data, setData] = useState<CampaignData | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [instruction, setInstruction] = useState("");
  const [objective, setObjective] = useState(objectives[0]);
  const [channel, setChannel] = useState("WhatsApp");
  const [duration, setDuration] = useState(7);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const campaigns = useMemo(() => data?.campaigns ?? [], [data?.campaigns]);
  const selected = useMemo(
    () => campaigns.find((item) => item.id === selectedId) || campaigns[0] || null,
    [campaigns, selectedId]
  );
  const selectedAssets = useMemo(
    () => (data?.assets ?? []).filter((asset) => asset.campaign_id === selected?.id),
    [data?.assets, selected?.id]
  );

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/panel/campaigns", {
        cache: "no-store",
        credentials: "include",
      });
      const json = (await res.json().catch(() => ({}))) as CampaignData;
      if (!res.ok || json.ok === false) {
        setError(json.error || "No se pudo cargar Campaign Studio.");
        setData(null);
        return;
      }
      setData(json);
      if (!selectedId && json.campaigns?.[0]?.id) {
        setSelectedId(json.campaigns[0].id);
      }
    } catch {
      setError("No se pudo conectar con Campaign Studio.");
    } finally {
      setLoading(false);
    }
  }

  async function generate(text?: string) {
    const prompt = (text ?? instruction).trim();
    if (!prompt || generating) return;
    setGenerating(true);
    setError(null);
    try {
      const res = await fetch("/api/panel/campaigns/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          instruction: prompt,
          objective,
          channel,
          duration_days: duration,
        }),
      });
      const json = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        error?: string;
        campaign?: Campaign;
      };
      if (!res.ok || json.ok === false) {
        setError(json.error || "No se pudo generar campana.");
        return;
      }
      setInstruction("");
      setSelectedId(json.campaign?.id ?? null);
      await load();
    } catch {
      setError("No se pudo generar la campana.");
    } finally {
      setGenerating(false);
    }
  }

  async function campaignAction(action: string, body?: Record<string, unknown>) {
    if (!selected) return;
    setBusyAction(action);
    setError(null);
    try {
      const res = await fetch(`/api/panel/campaigns/${selected.id}/action`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ action, ...body }),
      });
      const json = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string };
      if (!res.ok || json.ok === false) {
        setError(json.error || "No se pudo ejecutar accion.");
        return;
      }
      await load();
    } catch {
      setError("No se pudo conectar con acciones de campana.");
    } finally {
      setBusyAction(null);
    }
  }

  async function copyAsset(asset: Asset) {
    await navigator.clipboard?.writeText(asset.content).catch(() => undefined);
    await campaignAction("copy_asset", { asset_id: asset.id, asset_title: asset.title });
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const summary = data?.summary ?? {
    campaigns: 0,
    active: 0,
    assets: 0,
    pendingTasks: 0,
    experiments: 0,
  };

  return (
    <main className="grid gap-5 pb-10">
      <PanelSectionHeader
        variant="hero"
        eyebrow="LumenAI Campaign Studio"
        title="Estudio de campanas comerciales"
        description="Convierte una idea en oferta, mensajes, tareas y experimentos listos para ejecutar manualmente."
        status={`${summary.campaigns} campanas`}
        statusTone={summary.active > 0 ? "active" : "muted"}
        secondary={
          <ActionButton onClick={() => void load()} disabled={loading} variant="secondary">
            <RefreshCw className={loading ? "h-3.5 w-3.5 animate-spin" : "h-3.5 w-3.5"} />
            Actualizar
          </ActionButton>
        }
      />

      {error ? <div className="lmn-autoconfig-error" role="alert">{error}</div> : null}

      <section className="grid gap-3 md:grid-cols-5">
        <Metric label="Campanas" value={summary.campaigns} />
        <Metric label="Activas" value={summary.active} hot={summary.active > 0} />
        <Metric label="Assets" value={summary.assets} />
        <Metric label="Tareas" value={summary.pendingTasks} />
        <Metric label="A/B" value={summary.experiments} />
      </section>

      <section className="grid gap-4 xl:grid-cols-[360px_minmax(0,1fr)_360px]">
        <GlassCard variant="soft" className="p-4">
          <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.16em] text-white/34">
            <Megaphone className="h-3.5 w-3.5" />
            Campaign builder
          </div>
          <h2 className="mt-2 text-xl font-black text-white">Idea a campana</h2>
          <p className="mt-2 text-sm leading-6 text-white/48">
            Describe lo que quieres vender. LumenAI generara piezas listas para copiar.
          </p>
          <form
            className="mt-4 grid gap-3"
            onSubmit={(event) => {
              event.preventDefault();
              void generate();
            }}
          >
            <textarea
              aria-label="Instrucciones de la campaña"
              value={instruction}
              onChange={(event) => setInstruction(event.target.value)}
              rows={6}
              className="apex-cut border border-white/[0.08] bg-black/20 p-3 text-sm leading-6 text-white outline-none"
              placeholder="Crea una campana de 7 dias para vender el servicio premium usando WhatsApp como CTA principal."
            />
            <select
              aria-label="Objetivo de la campaña"
              value={objective}
              onChange={(event) => setObjective(event.target.value)}
              className="apex-cut h-11 border border-white/[0.08] bg-black/20 px-3 text-sm font-bold text-white outline-none"
            >
              {objectives.map((item) => (
                <option key={item} value={item} className="bg-[#07080b]">
                  {item}
                </option>
              ))}
            </select>
            <div className="grid grid-cols-[1fr_100px] gap-2">
              <select
                aria-label="Canal de la campaña"
                value={channel}
                onChange={(event) => setChannel(event.target.value)}
                className="apex-cut h-11 border border-white/[0.08] bg-black/20 px-3 text-sm font-bold text-white outline-none"
              >
                {channels.map((item) => (
                  <option key={item} value={item} className="bg-[#07080b]">
                    {item}
                  </option>
                ))}
              </select>
              <input
                aria-label="Duración de la campaña en días"
                type="number"
                min={1}
                max={90}
                value={duration}
                onChange={(event) => setDuration(Number(event.target.value))}
                className="apex-cut h-11 border border-white/[0.08] bg-black/20 px-3 text-sm font-bold text-white outline-none"
              />
            </div>
            <ActionButton type="submit" disabled={generating || !instruction.trim()} variant="primary">
              {generating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
              Generar campana
            </ActionButton>
          </form>
        </GlassCard>

        <GlassCard variant="strong" accent className="p-5">
          {selected ? (
            <div className="grid gap-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="text-[10px] font-black uppercase tracking-[0.16em] text-white/34">
                    Campaign canvas
                  </div>
                  <h2 className="mt-2 text-3xl font-black tracking-[-0.055em] text-white">
                    {selected.title}
                  </h2>
                  <p className="mt-3 max-w-3xl text-sm leading-7 text-white/56">
                    {selected.summary || selected.offer || "Campana comercial lista para revisar."}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <StatusBadge tone="muted">
                    {selected.metadata?.source === "evidence_rules"
                      ? "Reglas sobre datos reales"
                      : selected.metadata?.source === "lumenite_ai"
                        ? "IA sobre datos reales"
                        : "Origen no registrado"}
                  </StatusBadge>
                  <StatusBadge tone={selected.status === "active" ? "active" : "warning"}>
                    {selected.status || "ready"}
                  </StatusBadge>
                </div>
              </div>

              <div className="grid gap-3 md:grid-cols-4">
                <Flow label="Objetivo" value={selected.objective || "ventas"} />
                <Flow label="Oferta" value={selected.offer || "propuesta"} />
                <Flow label="Canal" value={(selected.channels || []).join(", ") || "WhatsApp"} />
                <Flow label="Duracion" value={`${selected.duration_days || 7} dias`} />
              </div>

              <div className="apex-cut border border-white/[0.07] bg-black/18 p-4">
                <div className="text-[10px] font-black uppercase tracking-[0.16em] text-white/34">
                  Angulo comercial
                </div>
                <p className="mt-2 text-sm leading-7 text-white/66">
                  {selected.angle || "Claridad, confianza y accion comercial directa."}
                </p>
              </div>

              <div className="grid gap-3">
                {selectedAssets.length ? (
                  selectedAssets.map((asset) => (
                    <article key={asset.id} className="apex-cut border border-white/[0.07] bg-white/[0.018] p-4">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <div className="text-xs font-black text-white">
                            {asset.title || asset.asset_type}
                          </div>
                          <div className="mt-1 text-[11px] font-bold uppercase tracking-[0.12em] text-white/34">
                            {asset.channel || "manual"} / {asset.asset_type}
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => void copyAsset(asset)}
                          className="apex-cut border border-white/[0.08] bg-white/[0.035] p-2 text-white"
                          title="Copiar"
                        >
                          <Copy className="h-3.5 w-3.5" />
                        </button>
                      </div>
                      <p className="mt-3 whitespace-pre-line text-sm leading-7 text-white/68">
                        {asset.content}
                      </p>
                    </article>
                  ))
                ) : (
                  <Empty title="Sin assets cargados" text="Genera una campana para ver mensajes listos." />
                )}
              </div>
            </div>
          ) : (
            <Empty
              title="Crea tu primera campana"
              text="LumenAI puede convertir productos, leads y Knowledge en mensajes y tareas comerciales."
            />
          )}
        </GlassCard>

        <GlassCard variant="soft" className="p-4">
          <div className="text-[10px] font-black uppercase tracking-[0.16em] text-white/34">
            Execution panel
          </div>
          <h3 className="mt-2 text-xl font-black text-white">Acciones preparadas</h3>
          <p className="mt-2 text-sm leading-6 text-white/48">
            Las piezas quedan listas para copiar. Para cambiar widget/greeting se envia a Config AI.
          </p>
          <div className="mt-4 grid gap-2">
            <ActionButton
              onClick={() => void campaignAction("status", { status: "active" })}
              disabled={!selected || busyAction === "status"}
              variant="primary"
            >
              <CalendarDays className="h-3.5 w-3.5" />
              Marcar activa
            </ActionButton>
            <ActionButton
              onClick={() => void campaignAction("send_to_config")}
              disabled={!selected || busyAction === "send_to_config"}
              variant="secondary"
            >
              <Send className="h-3.5 w-3.5" />
              Enviar a Config AI
            </ActionButton>
            <ActionButton href="/panel/growth" variant="secondary">
              Crear playbook
              <ArrowRight className="h-3.5 w-3.5" />
            </ActionButton>
          </div>

          <div className="mt-5 border-t border-white/[0.07] pt-4">
            <div className="text-[10px] font-black uppercase tracking-[0.16em] text-white/34">
              Library
            </div>
            <div className="mt-3 grid gap-2">
              {campaigns.slice(0, 8).map((campaign) => (
                <button
                  key={campaign.id}
                  type="button"
                  onClick={() => setSelectedId(campaign.id)}
                  className="apex-cut border border-white/[0.06] bg-white/[0.018] p-3 text-left transition hover:bg-white/[0.035]"
                >
                  <div className="truncate text-xs font-black text-white">{campaign.title}</div>
                  <div className="mt-1 flex flex-wrap gap-2 text-[11px] text-white/40">
                    <span>{campaign.status || "draft"}</span>
                    <span>{campaign.objective || "campana"}</span>
                  </div>
                </button>
              ))}
              {!campaigns.length ? (
                <p className="text-xs leading-5 text-white/42">
                  Las campanas guardadas apareceran aqui.
                </p>
              ) : null}
            </div>
          </div>
        </GlassCard>
      </section>
    </main>
  );
}

function Metric({ label, value, hot }: { label: string; value: number; hot?: boolean }) {
  return (
    <GlassCard variant="soft" accent={hot} className="p-4">
      <div className="text-[10px] font-black uppercase tracking-[0.16em] text-white/34">{label}</div>
      <div className="mt-3 text-3xl font-black tracking-[-0.06em] text-white">{value}</div>
    </GlassCard>
  );
}

function Flow({ label, value }: { label: string; value: string }) {
  return (
    <div className="apex-cut border border-white/[0.07] bg-black/18 p-3">
      <div className="text-[10px] font-black uppercase tracking-[0.14em] text-white/32">{label}</div>
      <div className="mt-2 truncate text-sm font-black text-white">{value}</div>
    </div>
  );
}

function Empty({ title, text }: { title: string; text: string }) {
  return (
    <div className="grid min-h-[280px] place-items-center p-6 text-center">
      <div>
        <div className="text-2xl font-black tracking-[-0.05em] text-white">{title}</div>
        <p className="mx-auto mt-2 max-w-lg text-sm leading-7 text-white/46">{text}</p>
      </div>
    </div>
  );
}

