"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  CheckCircle2,
  Copy,
  Loader2,
  MessageSquareText,
  Plus,
  RefreshCw,
  Target,
  TrendingUp,
} from "lucide-react";
import { ActionButton } from "../_components/ui/ActionButton";
import { GlassCard } from "../_components/ui/GlassCard";
import { PanelSectionHeader } from "../_components/ui/PanelSectionHeader";
import { StatusBadge } from "../_components/ui/StatusBadge";

type Opportunity = {
  id: string;
  lead_id?: string | null;
  chat_id?: string | null;
  title: string;
  summary?: string | null;
  score?: number | null;
  temperature?: string | null;
  priority?: string | null;
  status?: string | null;
  recommended_action?: string | null;
  suggested_message?: string | null;
  source?: string | null;
  created_at?: string | null;
};

type GrowthData = {
  ok?: boolean;
  error?: string;
  summary?: {
    opportunities: number;
    open: number;
    hot: number;
    followups: number;
    playbooks: number;
    analyzedLeads: number;
  };
  opportunities?: Opportunity[];
  followupTasks?: Array<Record<string, unknown>>;
  playbooks?: Array<Record<string, unknown>>;
  signals?: Array<Record<string, unknown>>;
  missingData?: string[];
};

function scoreTone(score?: number | null): "active" | "warning" | "muted" {
  const value = Number(score || 0);
  if (value >= 75) return "active";
  if (value >= 45) return "warning";
  return "muted";
}

function generationLabel(source?: string | null) {
  if (source === "heuristic") return "Reglas sobre datos reales";
  if (source === "lumenite_ai" || source === "ai") return "IA sobre datos reales";
  return "Origen no registrado";
}

function shortDate(value?: string | null) {
  if (!value) return "";
  try {
    return new Date(value).toLocaleString("es", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "";
  }
}

export default function GrowthPage() {
  const [data, setData] = useState<GrowthData | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const opportunities = useMemo(
    () => data?.opportunities ?? [],
    [data?.opportunities]
  );
  const selected = useMemo(
    () => opportunities.find((item) => item.id === selectedId) || opportunities[0] || null,
    [opportunities, selectedId]
  );

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/panel/growth", {
        cache: "no-store",
        credentials: "include",
      });
      const json = (await res.json().catch(() => ({}))) as GrowthData;
      if (!res.ok || json.ok === false) {
        setError(json.error || "No se pudo cargar Growth Engine.");
        setData(null);
        return;
      }
      setData(json);
      if (!selectedId && json.opportunities?.[0]?.id) {
        setSelectedId(json.opportunities[0].id);
      }
    } catch {
      setError("No se pudo conectar con Growth Engine.");
    } finally {
      setLoading(false);
    }
  }

  async function analyze() {
    setAnalyzing(true);
    setError(null);
    try {
      const res = await fetch("/api/panel/growth/analyze", {
        method: "POST",
        credentials: "include",
      });
      const json = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string };
      if (!res.ok || json.ok === false) {
        setError(json.error || "No se pudo analizar oportunidades.");
        return;
      }
      await load();
    } catch {
      setError("No se pudo ejecutar el analisis.");
    } finally {
      setAnalyzing(false);
    }
  }

  async function runAction(action: string, body?: Record<string, unknown>) {
    if (!selected) return;
    setBusyAction(action);
    setError(null);
    try {
      const res = await fetch(`/api/panel/growth/opportunities/${selected.id}/action`, {
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
      setError("No se pudo conectar con la accion Growth.");
    } finally {
      setBusyAction(null);
    }
  }

  async function copyMessage() {
    if (!selected?.suggested_message) return;
    await navigator.clipboard?.writeText(selected.suggested_message).catch(() => undefined);
    await runAction("copy_message");
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const summary = data?.summary ?? {
    opportunities: 0,
    open: 0,
    hot: 0,
    followups: 0,
    playbooks: 0,
    analyzedLeads: 0,
  };

  return (
    <main className="grid gap-5 pb-10">
      <PanelSectionHeader
        variant="hero"
        eyebrow="LumenAI Growth Engine"
        title="Motor de oportunidades"
        description="Detecta oportunidades comerciales desde leads, chats y mensajes reales. Las acciones quedan preparadas, no enviadas automaticamente."
        status={`${summary.open} abiertas`}
        statusTone={summary.hot > 0 ? "warning" : "active"}
        secondary={
          <div className="flex flex-wrap gap-2">
            <ActionButton onClick={() => void load()} disabled={loading} variant="secondary">
              <RefreshCw className={loading ? "h-3.5 w-3.5 animate-spin" : "h-3.5 w-3.5"} />
              Actualizar
            </ActionButton>
            <ActionButton onClick={() => void analyze()} disabled={analyzing} variant="primary">
              {analyzing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <TrendingUp className="h-3.5 w-3.5" />}
              Analizar leads
            </ActionButton>
          </div>
        }
      />

      {error ? <div className="lmn-autoconfig-error" role="alert">{error}</div> : null}

      <section className="grid gap-3 md:grid-cols-5">
        <Metric label="Oportunidades" value={summary.opportunities} />
        <Metric label="Abiertas" value={summary.open} hot={summary.open > 0} />
        <Metric label="Hot" value={summary.hot} hot={summary.hot > 0} />
        <Metric label="Follow-ups" value={summary.followups} />
        <Metric label="Leads leidos" value={summary.analyzedLeads} />
      </section>

      <section className="grid gap-4 xl:grid-cols-[minmax(320px,420px)_minmax(0,1fr)_360px]">
        <GlassCard variant="soft" className="p-4">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div>
              <div className="text-[10px] font-black uppercase tracking-[0.16em] text-white/34">
                Opportunity queue
              </div>
              <h2 className="mt-1 text-lg font-black text-white">Prioridad comercial</h2>
            </div>
            <StatusBadge tone="muted">{opportunities.length}</StatusBadge>
          </div>

          <div className="grid max-h-[640px] gap-2 overflow-auto pr-1">
            {loading ? (
              <Empty title="Leyendo oportunidades" text="LumenAI esta revisando el panel." />
            ) : opportunities.length === 0 ? (
              <Empty
                title="Sin oportunidades aun"
                text="Ejecuta Analizar leads para crear la primera cola comercial desde datos reales."
              />
            ) : (
              opportunities.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setSelectedId(item.id)}
                  className={`apex-cut border p-3 text-left transition ${
                    selected?.id === item.id
                      ? "border-white/18 bg-white/[0.055]"
                      : "border-white/[0.065] bg-white/[0.018] hover:bg-white/[0.035]"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="truncate text-sm font-black text-white">{item.title}</div>
                      <p className="mt-1 line-clamp-2 text-xs leading-5 text-white/46">
                        {item.summary || "Sin resumen."}
                      </p>
                    </div>
                    <StatusBadge tone={scoreTone(item.score)}>{Number(item.score || 0)}%</StatusBadge>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <StatusBadge tone="muted">{item.temperature || "warm"}</StatusBadge>
                    <StatusBadge tone={item.priority === "high" ? "warning" : "muted"}>
                      {item.priority || "medium"}
                    </StatusBadge>
                    <StatusBadge tone="muted">{item.status || "open"}</StatusBadge>
                  </div>
                </button>
              ))
            )}
          </div>
        </GlassCard>

        <GlassCard variant="strong" accent className="p-5">
          {selected ? (
            <div className="grid gap-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="text-[10px] font-black uppercase tracking-[0.16em] text-white/34">
                    Oportunidad seleccionada
                  </div>
                  <h2 className="mt-2 text-3xl font-black tracking-[-0.055em] text-white">
                    {selected.title}
                  </h2>
                  <p className="mt-3 max-w-3xl text-sm leading-7 text-white/56">
                    {selected.summary || "LumenAI detecto una oportunidad que necesita revision humana."}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <StatusBadge tone="muted">{generationLabel(selected.source)}</StatusBadge>
                  <StatusBadge tone={scoreTone(selected.score)}>
                    Score {Number(selected.score || 0)}%
                  </StatusBadge>
                </div>
              </div>

              <div className="grid gap-3 md:grid-cols-3">
                <Insight label="Temperatura" value={selected.temperature || "warm"} />
                <Insight label="Prioridad" value={selected.priority || "medium"} />
                <Insight label="Creada" value={shortDate(selected.created_at) || "reciente"} />
              </div>

              <div className="apex-cut border border-white/[0.07] bg-black/18 p-4">
                <div className="mb-2 flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.16em] text-white/34">
                  <Target className="h-3.5 w-3.5" />
                  Accion recomendada
                </div>
                <p className="text-sm leading-7 text-white/66">
                  {selected.recommended_action || "Crear seguimiento manual y revisar el chat."}
                </p>
              </div>

              <div className="apex-cut border border-white/[0.07] bg-white/[0.018] p-4">
                <div className="mb-2 flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.16em] text-white/34">
                  <MessageSquareText className="h-3.5 w-3.5" />
                  Mensaje listo para copiar
                </div>
                <p className="whitespace-pre-line text-sm leading-7 text-white/72">
                  {selected.suggested_message || "No hay mensaje sugerido aun."}
                </p>
              </div>
            </div>
          ) : (
            <Empty
              title="Growth listo para analizar"
              text="Cuando existan leads o chats, LumenAI puede crear oportunidades comerciales accionables."
            />
          )}
        </GlassCard>

        <GlassCard variant="soft" className="p-4">
          <div className="text-[10px] font-black uppercase tracking-[0.16em] text-white/34">
            Action panel
          </div>
          <h3 className="mt-2 text-xl font-black text-white">Siguiente movimiento</h3>
          <p className="mt-2 text-sm leading-6 text-white/48">
            Las acciones crean tareas o cambian estados internos. No se envia nada por WhatsApp/email automaticamente.
          </p>

          <div className="mt-4 grid gap-2">
            <ActionButton onClick={() => void copyMessage()} disabled={!selected || busyAction === "copy_message"} variant="secondary">
              <Copy className="h-3.5 w-3.5" />
              Copiar mensaje
            </ActionButton>
            <ActionButton
              onClick={() => void runAction("create_followup")}
              disabled={!selected || busyAction === "create_followup"}
              variant="secondary"
            >
              <Plus className="h-3.5 w-3.5" />
              Crear follow-up
            </ActionButton>
            <ActionButton
              onClick={() => void runAction("mark_won")}
              disabled={!selected || busyAction === "mark_won"}
              variant="secondary"
            >
              <CheckCircle2 className="h-3.5 w-3.5" />
              Marcar ganado
            </ActionButton>
            {selected?.chat_id ? (
              <ActionButton href={`/panel/chat/${selected.chat_id}`} variant="primary">
                Abrir chat
                <ArrowRight className="h-3.5 w-3.5" />
              </ActionButton>
            ) : (
              <ActionButton href="/panel/leads" variant="primary">
                Ver leads
                <ArrowRight className="h-3.5 w-3.5" />
              </ActionButton>
            )}
          </div>

          <div className="mt-5 border-t border-white/[0.07] pt-4">
            <div className="text-[10px] font-black uppercase tracking-[0.16em] text-white/34">
              Playbooks
            </div>
            <div className="mt-3 grid gap-2">
              {(data?.playbooks ?? []).slice(0, 4).map((item) => (
                <div key={String(item.id)} className="apex-cut border border-white/[0.06] bg-white/[0.018] p-3">
                  <div className="text-xs font-black text-white">{String(item.name || "Playbook")}</div>
                  <div className="mt-1 text-[11px] leading-5 text-white/42">
                    {String(item.description || "Regla comercial interna.")}
                  </div>
                </div>
              ))}
              {!data?.playbooks?.length ? (
                <p className="text-xs leading-5 text-white/42">
                  Crea playbooks desde oportunidades o Campaign Studio.
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
      <div className="text-[10px] font-black uppercase tracking-[0.16em] text-white/34">
        {label}
      </div>
      <div className="mt-3 text-3xl font-black tracking-[-0.06em] text-white">{value}</div>
    </GlassCard>
  );
}

function Insight({ label, value }: { label: string; value: string }) {
  return (
    <div className="apex-cut border border-white/[0.07] bg-white/[0.018] p-3">
      <div className="text-[10px] font-black uppercase tracking-[0.14em] text-white/32">{label}</div>
      <div className="mt-2 text-sm font-black text-white">{value}</div>
    </div>
  );
}

function Empty({ title, text }: { title: string; text: string }) {
  return (
    <div className="grid min-h-[180px] place-items-center p-5 text-center">
      <div>
        <div className="text-xl font-black tracking-[-0.04em] text-white">{title}</div>
        <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-white/46">{text}</p>
      </div>
    </div>
  );
}

