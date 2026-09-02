"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  BrainCircuit,
  Copy,
  GitBranch,
  Loader2,
  RefreshCw,
  Save,
  Send,
} from "lucide-react";
import { ActionButton } from "../_components/ui/ActionButton";
import { GlassCard } from "../_components/ui/GlassCard";
import { PanelSectionHeader } from "../_components/ui/PanelSectionHeader";
import { StatusBadge } from "../_components/ui/StatusBadge";

type Scenario = {
  id: string;
  title: string;
  scenario_type: string;
  confidence?: number | null;
  status?: string | null;
  input?: string | null;
  created_at?: string | null;
};

type Report = {
  id: string;
  scenario_id?: string | null;
  summary?: string | null;
  expected_impact?: string | null;
  risks?: string | null;
  opportunities?: string | null;
  recommendation?: string | null;
  confidence?: number | null;
  next_actions?: Array<Record<string, unknown>> | null;
  missing_data?: string[] | null;
  raw_result?: {
    generation_mode?: string | null;
  } | null;
};

type TwinData = {
  ok?: boolean;
  error?: string;
  context?: {
    stats?: Record<string, number>;
    missingData?: string[];
    productsDetected?: number;
  };
  confidence?: number;
  scenarios?: Scenario[];
  reports?: Report[];
};

type SimulateResponse = {
  ok?: boolean;
  error?: string;
  scenario?: Scenario;
  report?: Report;
};

const examples = [
  "Subir precio del servicio principal un 15% y destacar mas valor.",
  "Agregar un producto premium con CTA a WhatsApp.",
  "Crear promocion por 7 dias para recuperar leads frios.",
  "Cambiar el greeting del widget a uno mas vendedor.",
];

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

export default function TwinPage() {
  const [data, setData] = useState<TwinData | null>(null);
  const [input, setInput] = useState("");
  const [activeReport, setActiveReport] = useState<Report | null>(null);
  const [activeScenario, setActiveScenario] = useState<Scenario | null>(null);
  const [loading, setLoading] = useState(true);
  const [simulating, setSimulating] = useState(false);
  const [savingKnowledge, setSavingKnowledge] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reportByScenario = useMemo(() => {
    const map = new Map<string, Report>();
    for (const report of data?.reports ?? []) {
      if (report.scenario_id) map.set(report.scenario_id, report);
    }
    return map;
  }, [data?.reports]);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/panel/twin", {
        cache: "no-store",
        credentials: "include",
      });
      const json = (await res.json().catch(() => ({}))) as TwinData;
      if (!res.ok || json.ok === false) {
        setError(json.error || "No se pudo cargar Business Twin.");
        setData(null);
        return;
      }
      setData(json);
      if (!activeScenario && json.scenarios?.[0]) {
        setActiveScenario(json.scenarios[0]);
        setActiveReport(
          json.reports?.find((report) => report.scenario_id === json.scenarios?.[0]?.id) ||
            json.reports?.[0] ||
            null
        );
      }
    } catch {
      setError("No se pudo conectar con Business Twin.");
    } finally {
      setLoading(false);
    }
  }

  async function simulate(text?: string) {
    const scenario = (text ?? input).trim();
    if (!scenario || simulating) return;
    setSimulating(true);
    setError(null);
    try {
      const res = await fetch("/api/panel/twin/simulate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ input: scenario }),
      });
      const json = (await res.json().catch(() => ({}))) as SimulateResponse;
      if (!res.ok || json.ok === false) {
        setError(json.error || "No se pudo simular escenario.");
        return;
      }
      setInput("");
      setActiveScenario(json.scenario ?? null);
      setActiveReport(json.report ?? null);
      await load();
    } catch {
      setError("No se pudo ejecutar la simulacion.");
    } finally {
      setSimulating(false);
    }
  }

  async function copyReport() {
    if (!activeReport) return;
    const text = [
      activeScenario?.title,
      activeReport.summary,
      activeReport.expected_impact,
      activeReport.risks,
      activeReport.opportunities,
      activeReport.recommendation,
    ]
      .filter(Boolean)
      .join("\n\n");
    await navigator.clipboard?.writeText(text).catch(() => undefined);
  }

  async function createKnowledgeDraft() {
    if (!activeReport || savingKnowledge) return;
    setSavingKnowledge(true);
    setError(null);
    try {
      const res = await fetch("/api/panel/twin/actions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          action_type: "create_knowledge_draft",
          scenario_id: activeScenario?.id,
          payload: {
            type: "other",
            title: `Recomendacion Twin - ${activeScenario?.title || "escenario"}`,
            content: activeReport.recommendation || activeReport.summary,
          },
        }),
      });
      const json = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string };
      if (!res.ok || json.ok === false) {
        setError(json.error || "No se pudo crear Knowledge draft.");
      }
    } catch {
      setError("No se pudo guardar Knowledge draft.");
    } finally {
      setSavingKnowledge(false);
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const stats = data?.context?.stats ?? {};
  const missing = data?.context?.missingData ?? [];
  const configPrompt = encodeURIComponent(
    `Aplica esta recomendacion de Business Twin: ${activeReport?.recommendation || activeScenario?.input || ""}`
  );

  return (
    <main className="lmn-module-page lmn-twin-page grid gap-5 pb-10">
      <PanelSectionHeader
        variant="hero"
        eyebrow="Calibration · Lumen Twin"
        title="Simulación contextual"
        description="Prueba decisiones de identidad y estrategia antes de publicarlas. Twin funciona dentro de Calibration, no como otro pilar."
        status={`${data?.confidence ?? 0}% confianza`}
        statusTone={(data?.confidence ?? 0) >= 70 ? "active" : "warning"}
        secondary={
          <ActionButton onClick={() => void load()} disabled={loading} variant="secondary">
            <RefreshCw className={loading ? "h-3.5 w-3.5 animate-spin" : "h-3.5 w-3.5"} />
            Actualizar
          </ActionButton>
        }
      />

      {error ? <div className="lmn-autoconfig-error" role="alert">{error}</div> : null}

      <section className="grid gap-3 md:grid-cols-5">
        <Metric label="Leads hot" value={Number(stats.hotLeads || 0)} />
        <Metric label="Oportunidades" value={Number(stats.openOpportunities || 0)} />
        <Metric label="Knowledge" value={Number(stats.knowledgePublished || 0)} />
        <Metric label="Campanas" value={Number(stats.activeCampaigns || 0)} />
        <Metric label="Faltantes" value={missing.length} hot={missing.length > 0} />
      </section>

      <section className="grid gap-4 xl:grid-cols-[360px_minmax(0,1fr)_360px]">
        <GlassCard variant="soft" className="p-4">
          <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.16em] text-white/34">
            <GitBranch className="h-3.5 w-3.5" />
            Scenario builder
          </div>
          <h2 className="mt-2 text-xl font-black text-white">Simula antes de cambiar</h2>
          <p className="mt-2 text-sm leading-6 text-white/48">
            Escribe una decision comercial. LumenAI usara datos del panel y guardara el reporte.
          </p>
          <form
            className="mt-4 grid gap-3"
            onSubmit={(event) => {
              event.preventDefault();
              void simulate();
            }}
          >
            <textarea
              aria-label="Decisión comercial para simular"
              value={input}
              onChange={(event) => setInput(event.target.value)}
              rows={6}
              className="apex-cut border border-white/[0.08] bg-black/20 p-3 text-sm leading-6 text-white outline-none"
              placeholder="Ej: Que pasa si subo el precio del servicio premium y destaco WhatsApp por 7 dias?"
            />
            <ActionButton type="submit" disabled={simulating || !input.trim()} variant="primary">
              {simulating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <BrainCircuit className="h-3.5 w-3.5" />}
              Simular
            </ActionButton>
          </form>

          <div className="mt-4 grid gap-2">
            {examples.map((example) => (
              <button
                key={example}
                type="button"
                onClick={() => void simulate(example)}
                disabled={simulating}
                className="apex-cut border border-white/[0.06] bg-white/[0.018] p-3 text-left text-xs font-bold leading-5 text-white/58 transition hover:bg-white/[0.035]"
              >
                {example}
              </button>
            ))}
          </div>
        </GlassCard>

        <GlassCard variant="strong" accent className="p-5">
          {activeReport ? (
            <div className="grid gap-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="text-[10px] font-black uppercase tracking-[0.16em] text-white/34">
                    Simulation canvas
                  </div>
                  <h2 className="mt-2 text-3xl font-black tracking-[-0.055em] text-white">
                    {activeScenario?.title || "Simulacion guardada"}
                  </h2>
                  <p className="mt-3 max-w-3xl text-sm leading-7 text-white/58">
                    {activeReport.summary}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <StatusBadge tone="muted">
                    {activeReport.raw_result?.generation_mode === "evidence_rules"
                      ? "Reglas sobre datos reales"
                      : activeReport.raw_result?.generation_mode === "ai"
                        ? "IA sobre datos reales"
                        : "Origen no registrado"}
                  </StatusBadge>
                  <StatusBadge tone={(activeReport.confidence ?? 0) >= 70 ? "active" : "warning"}>
                    {activeReport.confidence ?? 0}% confianza
                  </StatusBadge>
                </div>
              </div>

              <div className="grid gap-3 md:grid-cols-4">
                <FlowStep label="Estado actual" value="Datos reales" />
                <FlowStep label="Cambio" value={activeScenario?.scenario_type || "decision"} />
                <FlowStep label="Impacto" value={`${activeReport.confidence ?? 0}%`} />
                <FlowStep label="Accion" value="Prueba controlada" />
              </div>

              <ReportBlock title="Impacto esperado" text={activeReport.expected_impact} />
              <ReportBlock title="Riesgos" text={activeReport.risks} />
              <ReportBlock title="Oportunidades" text={activeReport.opportunities} />
              <ReportBlock title="Recomendacion" text={activeReport.recommendation} strong />
            </div>
          ) : (
            <Empty
              title="Aun no hay simulacion activa"
              text="Crea un escenario para ver impacto, riesgos y acciones sugeridas."
            />
          )}
        </GlassCard>

        <GlassCard variant="soft" className="p-4">
          <div className="text-[10px] font-black uppercase tracking-[0.16em] text-white/34">
            Strategic actions
          </div>
          <h3 className="mt-2 text-xl font-black text-white">Convertir en accion</h3>
          <p className="mt-2 text-sm leading-6 text-white/48">
            El Twin prepara acciones internas. Los cambios sensibles pasan por Config AI.
          </p>
          <div className="mt-4 grid gap-2">
            <ActionButton
              href={`/panel/autoconfig?prompt=${configPrompt}`}
              variant="primary"
              className={!activeReport ? "pointer-events-none opacity-50" : ""}
            >
              <Send className="h-3.5 w-3.5" />
              Enviar a Config AI
            </ActionButton>
            <ActionButton onClick={() => void createKnowledgeDraft()} disabled={!activeReport || savingKnowledge} variant="secondary">
              <Save className="h-3.5 w-3.5" />
              Crear Knowledge draft
            </ActionButton>
            <ActionButton onClick={() => void copyReport()} disabled={!activeReport} variant="secondary">
              <Copy className="h-3.5 w-3.5" />
              Copiar informe
            </ActionButton>
            <ActionButton href="/panel/autoconfig?view=campaigns" variant="secondary">
              Crear campana
              <ArrowRight className="h-3.5 w-3.5" />
            </ActionButton>
          </div>

          <div className="mt-5 border-t border-white/[0.07] pt-4">
            <div className="text-[10px] font-black uppercase tracking-[0.16em] text-white/34">
              Historial
            </div>
            <div className="mt-3 grid gap-2">
              {(data?.scenarios ?? []).slice(0, 6).map((scenario) => {
                const report = reportByScenario.get(scenario.id) || null;
                return (
                  <button
                    key={scenario.id}
                    type="button"
                    onClick={() => {
                      setActiveScenario(scenario);
                      setActiveReport(report);
                    }}
                    className="apex-cut border border-white/[0.06] bg-white/[0.018] p-3 text-left transition hover:bg-white/[0.035]"
                  >
                    <div className="truncate text-xs font-black text-white">{scenario.title}</div>
                    <div className="mt-1 flex flex-wrap gap-2 text-[11px] text-white/40">
                      <span>{scenario.scenario_type}</span>
                      <span>{shortDate(scenario.created_at)}</span>
                    </div>
                  </button>
                );
              })}
              {!data?.scenarios?.length ? (
                <p className="text-xs leading-5 text-white/42">Las simulaciones guardadas apareceran aqui.</p>
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

function FlowStep({ label, value }: { label: string; value: string }) {
  return (
    <div className="apex-cut border border-white/[0.07] bg-black/18 p-3">
      <div className="text-[10px] font-black uppercase tracking-[0.14em] text-white/32">{label}</div>
      <div className="mt-2 truncate text-sm font-black text-white">{value}</div>
    </div>
  );
}

function ReportBlock({ title, text, strong }: { title: string; text?: string | null; strong?: boolean }) {
  return (
    <section className={`apex-cut border p-4 ${strong ? "border-white/12 bg-white/[0.045]" : "border-white/[0.07] bg-white/[0.018]"}`}>
      <div className="text-[10px] font-black uppercase tracking-[0.16em] text-white/34">{title}</div>
      <p className="mt-2 text-sm leading-7 text-white/64">{text || "Sin datos suficientes."}</p>
    </section>
  );
}

function Empty({ title, text }: { title: string; text: string }) {
  return (
    <div className="grid min-h-[420px] place-items-center p-6 text-center">
      <div>
        <div className="text-2xl font-black tracking-[-0.05em] text-white">{title}</div>
        <p className="mx-auto mt-2 max-w-lg text-sm leading-7 text-white/46">{text}</p>
      </div>
    </div>
  );
}
