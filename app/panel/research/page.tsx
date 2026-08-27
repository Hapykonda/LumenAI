"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  ArrowRight,
  BookOpenCheck,
  BrainCircuit,
  CheckCircle2,
  Eye,
  FileText,
  Loader2,
  Megaphone,
  Newspaper,
  Plus,
  RefreshCw,
  Search,
  Send,
  Sparkles,
  Target,
  TrendingUp,
} from "lucide-react";
import { ActionButton } from "../_components/ui/ActionButton";
import { GlassCard } from "../_components/ui/GlassCard";
import { PanelSectionHeader } from "../_components/ui/PanelSectionHeader";
import { StatusBadge } from "../_components/ui/StatusBadge";

type Row = Record<string, unknown>;

type ResearchData = {
  ok?: boolean;
  error?: string;
  mode?: "real" | "preview";
  summary?: {
    sources: number;
    activeSources: number;
    jobs: number;
    runningJobs: number;
    findings: number;
    openFindings: number;
    reports: number;
    hotLeads: number;
    unreadChats: number;
  };
  sources?: Row[];
  jobs?: Row[];
  findings?: Row[];
  reports?: Row[];
  marketNews?: Array<{
    headline: string;
    source: string;
    link: string;
    pubDate: string;
  }>;
  suggestedSources?: Row[];
  missingData?: string[];
};

function text(value: unknown, fallback = "") {
  return String(value ?? fallback).trim();
}

function generationLabel(value: unknown) {
  if (value === "evidence_rules") return "Reglas sobre datos reales";
  if (value === "ai") return "IA sobre datos reales";
  return "Origen no registrado";
}

function shortDate(value: unknown) {
  const raw = text(value);
  if (!raw) return "reciente";
  try {
    return new Date(raw).toLocaleString("es", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "reciente";
  }
}

function scoreTone(value: unknown): "active" | "warning" | "muted" {
  const score = Number(value ?? 0);
  if (score >= 78) return "active";
  if (score >= 55) return "warning";
  return "muted";
}

export default function ResearchPage() {
  const [data, setData] = useState<ResearchData | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [instruction, setInstruction] = useState("");
  const [sourceForm, setSourceForm] = useState({
    name: "",
    query: "",
    url: "",
    source_type: "query",
  });
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [savingSource, setSavingSource] = useState(false);
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const findings = useMemo(() => data?.findings ?? [], [data?.findings]);
  const sources = data?.sources ?? [];
  const reports = data?.reports ?? [];
  const jobs = data?.jobs ?? [];
  const selected = useMemo(
    () => findings.find((item) => text(item.id) === selectedId) || findings[0] || null,
    [findings, selectedId]
  );
  const summary = data?.summary ?? {
    sources: 0,
    activeSources: 0,
    jobs: 0,
    runningJobs: 0,
    findings: 0,
    openFindings: 0,
    reports: 0,
    hotLeads: 0,
    unreadChats: 0,
  };

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/panel/research", {
        cache: "no-store",
        credentials: "include",
      });
      const json = (await res.json().catch(() => ({}))) as ResearchData;
      if (!res.ok || json.ok === false) {
        setError(json.error || "No se pudo cargar Research.");
        setData(null);
        return;
      }
      setData(json);
      if (!selectedId && json.findings?.[0]?.id) {
        setSelectedId(text(json.findings[0].id));
      }
    } catch {
      setError("No se pudo conectar con Research.");
    } finally {
      setLoading(false);
    }
  }

  async function createSource() {
    setSavingSource(true);
    setError(null);
    try {
      const res = await fetch("/api/panel/research/sources", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(sourceForm),
      });
      const json = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string };
      if (!res.ok || json.ok === false) {
        setError(json.error || "No se pudo crear la fuente.");
        return;
      }
      setSourceForm({ name: "", query: "", url: "", source_type: "query" });
      await load();
    } catch {
      setError("No se pudo guardar la fuente.");
    } finally {
      setSavingSource(false);
    }
  }

  async function runResearch(sourceId?: string) {
    setRunning(true);
    setError(null);
    try {
      const res = await fetch("/api/panel/research/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          source_id: sourceId || null,
          query:
            instruction ||
            "Investiga oportunidades, riesgos, objeciones y movimientos de mercado para este negocio.",
          scope: sourceId ? "source" : "business",
          priority: "high",
        }),
      });
      const json = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        error?: string;
        findings?: Row[];
      };
      if (!res.ok || json.ok === false) {
        setError(json.error || "No se pudo ejecutar Research.");
        return;
      }
      if (json.findings?.[0]?.id) setSelectedId(text(json.findings[0].id));
      await load();
    } catch {
      setError("No se pudo ejecutar la investigacion.");
    } finally {
      setRunning(false);
    }
  }

  async function generateReport() {
    setBusyAction("report");
    setError(null);
    try {
      const res = await fetch("/api/panel/research/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          title: "Reporte Research",
          instruction: instruction || "Genera un reporte ejecutivo con los findings recientes.",
        }),
      });
      const json = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string };
      if (!res.ok || json.ok === false) {
        setError(json.error || "No se pudo generar el reporte.");
        return;
      }
      await load();
    } catch {
      setError("No se pudo generar el reporte.");
    } finally {
      setBusyAction(null);
    }
  }

  async function runFindingAction(action: string) {
    if (!selected?.id) return;
    setBusyAction(action);
    setError(null);
    try {
      const res = await fetch(`/api/panel/research/findings/${selected.id}/action`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ action }),
      });
      const json = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string };
      if (!res.ok || json.ok === false) {
        setError(json.error || "No se pudo ejecutar la accion.");
        return;
      }
      await load();
    } catch {
      setError("No se pudo conectar con la accion de Research.");
    } finally {
      setBusyAction(null);
    }
  }

  useEffect(() => {
    const query = new URLSearchParams(window.location.search).get("query");
    if (query) setInstruction(query);
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <main className="lmn-module-page lmn-research-page grid gap-5 pb-10">
      <PanelSectionHeader
        variant="hero"
        eyebrow="Inteligencia"
        title="Research Engine"
        description="Investiga mercado, competidores, conversaciones, oportunidades y señales internas para decidir que enviar a Pulse, Lumen Eye, Growth, Campaigns o Config AI."
        status={data?.mode === "real" ? "Investigacion activa" : "Modo preview"}
        statusTone={data?.mode === "real" ? "active" : "warning"}
        secondary={
          <div className="flex flex-wrap gap-2">
            <ActionButton type="button" onClick={() => void load()} disabled={loading}>
              <RefreshCw className={loading ? "h-3.5 w-3.5 animate-spin" : "h-3.5 w-3.5"} />
              Actualizar
            </ActionButton>
            <ActionButton
              type="button"
              onClick={() => void generateReport()}
              disabled={busyAction === "report"}
              variant="secondary"
            >
              <FileText className="h-3.5 w-3.5" />
              Generar reporte
            </ActionButton>
            <ActionButton type="button" onClick={() => void runResearch()} disabled={running} variant="primary">
              {running ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Search className="h-3.5 w-3.5" />}
              Ejecutar Research
            </ActionButton>
          </div>
        }
      />

      {error ? <div className="lmn-autoconfig-error" role="alert">{error}</div> : null}

      <section className="grid gap-3 md:grid-cols-4 xl:grid-cols-8">
        <Metric label="Fuentes" value={summary.sources} />
        <Metric label="Activas" value={summary.activeSources} />
        <Metric label="Jobs" value={summary.jobs} />
        <Metric label="Findings" value={summary.findings} hot={summary.openFindings > 0} />
        <Metric label="Reportes" value={summary.reports} />
        <Metric label="Leads hot" value={summary.hotLeads} hot={summary.hotLeads > 0} />
        <Metric label="Chats" value={summary.unreadChats} hot={summary.unreadChats > 0} />
        <Metric label="Running" value={summary.runningJobs} hot={summary.runningJobs > 0} />
      </section>

      <section className="grid gap-4 xl:grid-cols-[340px_minmax(0,1fr)_360px]">
        <GlassCard variant="soft" className="p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-[10px] font-black uppercase tracking-[0.16em] text-white/34">
                Source desk
              </div>
              <h2 className="mt-1 text-xl font-black text-white">Fuentes</h2>
            </div>
            <StatusBadge tone={sources.length ? "active" : "warning"}>{sources.length || "preview"}</StatusBadge>
          </div>

          <div className="mt-4 grid gap-3">
            <FieldLabel label="Nombre">
              <input
                aria-label="Nombre de la fuente"
                value={sourceForm.name}
                onChange={(event) => setSourceForm((prev) => ({ ...prev, name: event.target.value }))}
                placeholder="Competidores, industria, objeciones..."
                className="lmn-input"
              />
            </FieldLabel>
            <FieldLabel label="Query">
              <textarea
                aria-label="Consulta de investigación"
                value={sourceForm.query}
                onChange={(event) => setSourceForm((prev) => ({ ...prev, query: event.target.value }))}
                placeholder="Que debe observar Research"
                className="lmn-input min-h-[78px] resize-none"
              />
            </FieldLabel>
            <FieldLabel label="URL opcional">
              <input
                aria-label="URL opcional de la fuente"
                value={sourceForm.url}
                onChange={(event) => setSourceForm((prev) => ({ ...prev, url: event.target.value }))}
                placeholder="https://..."
                className="lmn-input"
              />
            </FieldLabel>
            <ActionButton type="button" onClick={() => void createSource()} disabled={savingSource} variant="primary">
              {savingSource ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
              Crear fuente
            </ActionButton>
          </div>

          <div className="mt-5 grid max-h-[420px] gap-2 overflow-auto pr-1">
            {loading ? (
              <EmptyMini text="Leyendo fuentes de Research." />
            ) : sources.length ? (
              sources.map((source) => (
                <button
                  key={text(source.id)}
                  type="button"
                  onClick={() => void runResearch(text(source.id))}
                  className="apex-cut border border-white/[0.065] bg-white/[0.018] p-3 text-left transition hover:bg-white/[0.035]"
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className="truncate text-sm font-black text-white">{text(source.name, "Fuente")}</span>
                    <Send className="h-3.5 w-3.5 text-white/38" />
                  </div>
                  <p className="mt-1 line-clamp-2 text-xs leading-5 text-white/42">
                    {text(source.query || source.url || source.description, "Ejecutar investigacion")}
                  </p>
                </button>
              ))
            ) : (
              (data?.suggestedSources ?? []).map((source, index) => (
                <div key={index} className="apex-cut border border-white/[0.06] bg-white/[0.018] p-3">
                  <div className="text-sm font-black text-white">{text(source.name)}</div>
                  <p className="mt-1 text-xs leading-5 text-white/42">{text(source.description)}</p>
                </div>
              ))
            )}
          </div>
        </GlassCard>

        <GlassCard variant="strong" accent className="p-5">
          <div className="grid gap-5">
            <div className="apex-cut border border-white/[0.07] bg-black/18 p-4">
              <div className="mb-3 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.16em] text-white/34">
                  <BrainCircuit className="h-3.5 w-3.5" />
                  Research command
                </div>
                <StatusBadge tone="muted">LumenAI</StatusBadge>
              </div>
              <textarea
                aria-label="Instrucción para Research"
                value={instruction}
                onChange={(event) => setInstruction(event.target.value)}
                placeholder="Ej: investiga oportunidades para vender mas con los leads recientes y dime que enviar a Growth o Campaigns."
                className="lmn-input min-h-[116px] resize-none text-sm leading-6"
              />
              <div className="mt-3 flex flex-wrap gap-2">
                {[
                  "Investiga objeciones frecuentes y como responderlas.",
                  "Encuentra oportunidades de campana para leads calientes.",
                  "Compara senales internas con noticias del mercado.",
                ].map((prompt) => (
                  <button
                    key={prompt}
                    type="button"
                    onClick={() => setInstruction(prompt)}
                    className="rounded-full border border-white/[0.07] bg-white/[0.02] px-3 py-2 text-[11px] font-bold text-white/48 transition hover:text-white"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </div>

            {selected ? (
              <div className="grid gap-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="text-[10px] font-black uppercase tracking-[0.16em] text-white/34">
                      Hallazgo seleccionado
                    </div>
                    <h2 className="mt-2 text-3xl font-black tracking-[-0.055em] text-white">
                      {text(selected.title, "Hallazgo Research")}
                    </h2>
                    <p className="mt-3 max-w-4xl text-sm leading-7 text-white/56">
                      {text(selected.summary, "Sin resumen disponible.")}
                    </p>
                  </div>
                  <StatusBadge tone={scoreTone(selected.confidence)}>
                    {Number(selected.confidence ?? 0)}%
                  </StatusBadge>
                </div>

                <div className="grid gap-3 md:grid-cols-4">
                  <Insight label="Impacto" value={text(selected.impact, "medium")} />
                  <Insight label="Categoria" value={text(selected.category, "signal")} />
                  <Insight label="Estado" value={text(selected.status, "new")} />
                  <Insight
                    label="Generacion"
                    value={generationLabel(
                      (selected.payload as Record<string, unknown> | undefined)
                        ?.generation_mode
                    )}
                  />
                </div>

                <div className="apex-cut border border-white/[0.07] bg-white/[0.018] p-4">
                  <div className="mb-2 flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.16em] text-white/34">
                    <Target className="h-3.5 w-3.5" />
                    Accion recomendada
                  </div>
                  <p className="text-sm leading-7 text-white/66">
                    {text(selected.recommended_action, "Revisar hallazgo y decidir modulo destino.")}
                  </p>
                </div>

                <div className="grid gap-2 md:grid-cols-3">
                  <ActionButton type="button" onClick={() => void runFindingAction("send_to_radar")} disabled={busyAction === "send_to_radar"} variant="secondary">
                    <Newspaper className="h-3.5 w-3.5" />
                    Enviar a Pulse
                  </ActionButton>
                  <ActionButton type="button" onClick={() => void runFindingAction("send_to_eye")} disabled={busyAction === "send_to_eye"} variant="secondary">
                    <Eye className="h-3.5 w-3.5" />
                    Enviar a Lumen Eye
                  </ActionButton>
                  <ActionButton type="button" onClick={() => void runFindingAction("create_growth")} disabled={busyAction === "create_growth"} variant="secondary">
                    <TrendingUp className="h-3.5 w-3.5" />
                    Crear Growth
                  </ActionButton>
                  <ActionButton type="button" onClick={() => void runFindingAction("create_campaign")} disabled={busyAction === "create_campaign"} variant="secondary">
                    <Megaphone className="h-3.5 w-3.5" />
                    Crear Campaign
                  </ActionButton>
                  <ActionButton type="button" onClick={() => void runFindingAction("send_to_config")} disabled={busyAction === "send_to_config"} variant="secondary">
                    <Sparkles className="h-3.5 w-3.5" />
                    Enviar a Config AI
                  </ActionButton>
                  <ActionButton type="button" onClick={() => void runFindingAction("create_investigation")} disabled={busyAction === "create_investigation"} variant="primary">
                    Profundizar
                    <ArrowRight className="h-3.5 w-3.5" />
                  </ActionButton>
                </div>
              </div>
            ) : (
              <Empty
                title="Research listo para ejecutar"
                text="Crea una fuente o escribe una instruccion. El motor generara findings, reportes y rutas hacia otros modulos."
              />
            )}
          </div>
        </GlassCard>

        <aside className="grid content-start gap-4 xl:sticky xl:top-24">
          <GlassCard variant="soft" className="p-4">
            <RailTitle icon={<BookOpenCheck className="h-4 w-4" />} title="Findings" />
            <div className="mt-3 grid max-h-[340px] gap-2 overflow-auto pr-1">
              {findings.length ? (
                findings.map((finding) => (
                  <button
                    key={text(finding.id)}
                    type="button"
                    onClick={() => setSelectedId(text(finding.id))}
                    className={`rounded-[18px] border p-3 text-left transition ${
                      selected?.id === finding.id
                        ? "border-cyan-200/28 bg-cyan-300/10"
                        : "border-white/[0.065] bg-white/[0.018] hover:bg-white/[0.035]"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <span className="line-clamp-2 text-sm font-black text-white">{text(finding.title)}</span>
                      <StatusBadge tone={scoreTone(finding.confidence)}>
                        {Number(finding.confidence ?? 0)}
                      </StatusBadge>
                    </div>
                    <p className="mt-2 line-clamp-2 text-xs leading-5 text-white/42">
                      {text(finding.summary)}
                    </p>
                  </button>
                ))
              ) : (
                <EmptyMini text="Aun no hay hallazgos. Ejecuta Research para crear los primeros." />
              )}
            </div>
          </GlassCard>

          <GlassCard variant="soft" className="p-4">
            <RailTitle icon={<FileText className="h-4 w-4" />} title="Reportes" />
            <div className="mt-3 grid gap-2">
              {reports.slice(0, 4).map((report) => (
                <div key={text(report.id)} className="rounded-[18px] border border-white/[0.06] bg-white/[0.018] p-3">
                  <div className="text-sm font-black text-white">{text(report.title, "Reporte")}</div>
                  <p className="mt-1 line-clamp-2 text-xs leading-5 text-white/42">{text(report.summary)}</p>
                  <div className="mt-2 text-[11px] font-bold text-white/34">{shortDate(report.created_at)}</div>
                </div>
              ))}
              {!reports.length ? <EmptyMini text="Sin reportes generados todavia." /> : null}
            </div>
          </GlassCard>

          <GlassCard variant="soft" className="p-4">
            <RailTitle icon={<Newspaper className="h-4 w-4" />} title="Mercado" />
            <div className="mt-3 grid gap-2">
              {(data?.marketNews ?? []).slice(0, 4).map((item) => (
                <a
                  key={`${item.headline}-${item.source}`}
                  href={item.link}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-[18px] border border-white/[0.06] bg-white/[0.018] p-3 no-underline transition hover:bg-white/[0.035]"
                >
                  <div className="text-xs font-black leading-5 text-white">{item.headline}</div>
                  <div className="mt-2 flex items-center justify-between gap-3 text-[11px] font-bold text-white/34">
                    <span>{item.source}</span>
                    <span>{shortDate(item.pubDate)}</span>
                  </div>
                </a>
              ))}
              {!data?.marketNews?.length ? <EmptyMini text="Noticias externas no disponibles ahora." /> : null}
            </div>
          </GlassCard>

          <GlassCard variant="soft" className="p-4">
            <RailTitle icon={<CheckCircle2 className="h-4 w-4" />} title="Jobs recientes" />
            <div className="mt-3 grid gap-2">
              {jobs.slice(0, 5).map((job) => (
                <div key={text(job.id)} className="rounded-[18px] border border-white/[0.06] bg-white/[0.018] p-3">
                  <div className="flex items-center justify-between gap-3">
                    <span className="line-clamp-1 text-xs font-black text-white">{text(job.query, "Research job")}</span>
                    <StatusBadge tone={job.status === "completed" ? "active" : "muted"}>
                      {text(job.status, "queued")}
                    </StatusBadge>
                  </div>
                </div>
              ))}
              {!jobs.length ? <EmptyMini text="No hay jobs persistidos aun." /> : null}
            </div>
          </GlassCard>
        </aside>
      </section>
    </main>
  );
}

function Metric({ label, value, hot }: { label: string; value: number; hot?: boolean }) {
  return (
    <GlassCard variant="soft" accent={hot} className="min-h-[112px] p-4">
      <div className="text-[10px] font-black uppercase tracking-[0.16em] text-white/34">{label}</div>
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

function FieldLabel({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="grid gap-2">
      <span className="text-[10px] font-black uppercase tracking-[0.16em] text-white/34">{label}</span>
      {children}
    </label>
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

function Empty({ title, text }: { title: string; text: string }) {
  return (
    <div className="grid min-h-[420px] place-items-center p-5 text-center">
      <div>
        <div className="text-2xl font-black tracking-[-0.04em] text-white">{title}</div>
        <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-white/46">{text}</p>
      </div>
    </div>
  );
}
