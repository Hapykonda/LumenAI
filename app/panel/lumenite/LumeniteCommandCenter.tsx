"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Activity,
  Ban,
  Check,
  CheckCircle2,
  ChevronRight,
  Clock3,
  FileCheck2,
  History,
  LoaderCircle,
  Play,
  Send,
  ShieldCheck,
  Sparkles,
  Undo2,
  Workflow,
  XCircle,
} from "lucide-react";
import { AnimatedHeroLights } from "@/components/ui/animated-hero-lights";
import { LumenSystemState } from "@/components/ui/lumen-system-state";
import type { LumeniteActionRun, LumenitePlan } from "@/lib/ai/lumenite/contracts";
import styles from "./lumenite-command-center.module.css";

type Capability = {
  id: string;
  name: string;
  description: string;
  requiredScopes: string[];
  riskLevel: "low" | "medium" | "high";
  supportsUndo: boolean;
};

type DryRun = {
  capability: string;
  name: string;
  description: string;
  resourceType: string;
  accessType: string;
  requiredScopes: string[];
  riskLevel: "low" | "medium" | "high";
  supportsUndo: boolean;
  input: Record<string, unknown>;
  reason: string;
  expectedResult: string;
  authorization: {
    allowed: boolean;
    canExecute: boolean;
    requiresApproval: boolean;
    initialStatus: LumeniteActionRun["status"];
    reason: string;
  };
};

type PlanState = {
  planId: string;
  plan: LumenitePlan;
  runs: LumeniteActionRun[];
  dryRun: DryRun[];
  deduplicated: boolean;
};

type DashboardData = {
  ok?: boolean;
  error?: string;
  runs?: LumeniteActionRun[];
  approvals?: LumeniteActionRun[];
  capabilities?: Capability[];
  autonomy?: {
    level: number;
    requiresApproval: boolean;
    allowsAutoExecute: boolean;
    role: string;
  };
};

const suggestions = [
  "Crea una tarea para revisar los leads nuevos de hoy.",
  "Crea una tarea de seguimiento con prioridad alta.",
  "Muéstrame las acciones internas disponibles con mis permisos.",
];

const statusLabels: Record<LumeniteActionRun["status"], string> = {
  draft: "Borrador",
  planning: "Planificando",
  awaiting_approval: "Pendiente de aprobación",
  approved: "Aprobada",
  rejected: "Rechazada",
  changes_requested: "Cambios solicitados",
  expired: "Expirada",
  queued: "En cola",
  executing: "Ejecutando",
  verifying: "Verificando",
  completed: "Completada",
  partially_completed: "Parcial",
  failed: "Fallida",
  cancelled: "Cancelada",
  undo_available: "Completada, reversible",
  reverted: "Revertida",
};

const terminalStatuses = new Set<LumeniteActionRun["status"]>([
  "completed",
  "partially_completed",
  "failed",
  "cancelled",
  "rejected",
  "undo_available",
  "reverted",
]);

function formatDate(value: string | null) {
  if (!value) return "Sin hora";
  return new Intl.DateTimeFormat("es", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function inputValue(value: unknown): string {
  if (value === null || value === undefined || value === "") return "No aplica";
  if (Array.isArray(value)) return value.map(inputValue).join(", ");
  if (typeof value === "object") {
    return Object.entries(value as Record<string, unknown>)
      .slice(0, 8)
      .map(([key, item]) => `${key.replaceAll("_", " ")}: ${inputValue(item)}`)
      .join(" · ");
  }
  return String(value);
}

function liveStatus(busy: "loading" | "planning" | "executing" | "undo" | null) {
  if (busy === "loading") return "Cargando capacidades y actividad reciente.";
  if (busy === "planning") return "Lumenite está preparando y validando el plan.";
  if (busy === "executing") return "La acción autorizada está en ejecución.";
  if (busy === "undo") return "Lumenite está revirtiendo y verificando el cambio.";
  return "Lumenite está preparado.";
}

function timelineFor(run: LumeniteActionRun) {
  const order: LumeniteActionRun["status"][] = [
    "awaiting_approval",
    "approved",
    "executing",
    "verifying",
    "completed",
  ];
  const current = run.status === "undo_available" ? "completed" : run.status;
  const index = order.indexOf(current);
  const stopped = ["failed", "cancelled", "rejected", "partially_completed"].includes(run.status);
  return [
    { key: "awaiting_approval", label: "Permisos verificados" },
    { key: "approved", label: "Autorización registrada" },
    { key: "executing", label: "Acción ejecutada" },
    { key: "verifying", label: "Resultado verificado" },
    { key: "completed", label: "Recibo emitido" },
  ].map((step, stepIndex) => ({
    ...step,
    state:
      stopped && stepIndex > Math.max(index, 0)
        ? "stopped"
        : stepIndex < index || (stepIndex === index && terminalStatuses.has(run.status))
          ? "done"
          : stepIndex === index
            ? "active"
            : "pending",
  }));
}

export function LumeniteCommandCenter() {
  const [command, setCommand] = useState("");
  const [planState, setPlanState] = useState<PlanState | null>(null);
  const [history, setHistory] = useState<LumeniteActionRun[]>([]);
  const [approvals, setApprovals] = useState<LumeniteActionRun[]>([]);
  const [capabilities, setCapabilities] = useState<Capability[]>([]);
  const [autonomy, setAutonomy] = useState<DashboardData["autonomy"] | null>(null);
  const [busy, setBusy] = useState<"loading" | "planning" | "executing" | "undo" | null>("loading");
  const [error, setError] = useState<string | null>(null);
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null);
  const handoffRef = useRef(false);

  const selectedRun = useMemo(() => {
    const all = [...(planState?.runs ?? []), ...history];
    return all.find((run) => run.id === selectedRunId) ?? planState?.runs[0] ?? history[0] ?? null;
  }, [history, planState?.runs, selectedRunId]);
  const selectedIsActivePlan = Boolean(
    selectedRun && planState?.runs.some((run) => run.id === selectedRun.id),
  );

  const mergePlanRuns = useCallback((runs: LumeniteActionRun[]) => {
    setPlanState((current) => {
      if (!current) return current;
      const updates = new Map(runs.map((run) => [run.id, run]));
      return {
        ...current,
        runs: current.runs.map((run) => updates.get(run.id) ?? run),
      };
    });
  }, []);

  const loadDashboard = useCallback(async (silent = false) => {
    if (!silent) setBusy("loading");
    try {
      const response = await fetch("/api/panel/lumenite/action-runs", {
        cache: "no-store",
        credentials: "include",
      });
      const json = (await response.json().catch(() => null)) as DashboardData | null;
      if (!response.ok || !json?.ok) throw new Error(json?.error || "No se pudo cargar Lumenite.");
      const runs = json.runs ?? [];
      setHistory(runs);
      setApprovals(json.approvals ?? []);
      setCapabilities(json.capabilities ?? []);
      setAutonomy(json.autonomy);
      mergePlanRuns(runs);
      setError(null);
    } catch (loadError) {
      if (!silent) setError(loadError instanceof Error ? loadError.message : "No se pudo cargar Lumenite.");
    } finally {
      if (!silent) setBusy(null);
    }
  }, [mergePlanRuns]);

  const createPlan = useCallback(async (message: string, handoff?: Record<string, unknown>) => {
    const instruction = message.trim();
    if (!instruction) return;
    setBusy("planning");
    setError(null);
    const requestKey = crypto.randomUUID();
    try {
      const response = await fetch("/api/panel/lumenite/plan", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json", "Idempotency-Key": requestKey },
        body: JSON.stringify({
          agent: "panel",
          instruction,
          source: handoff?.source || "command_center",
          context: handoff ?? {},
          signalId: handoff?.signalId ?? null,
        }),
      });
      const json = (await response.json().catch(() => null)) as
        | ({ ok?: boolean; error?: string } & Partial<PlanState>)
        | null;
      if (!response.ok || !json?.ok || !json.planId || !json.plan) {
        throw new Error(json?.error || "No se pudo preparar el plan.");
      }
      const next: PlanState = {
        planId: json.planId,
        plan: json.plan,
        runs: json.runs ?? [],
        dryRun: json.dryRun ?? [],
        deduplicated: Boolean(json.deduplicated),
      };
      setPlanState(next);
      setSelectedRunId(next.runs[0]?.id ?? null);
      await loadDashboard(true);
    } catch (planError) {
      setError(planError instanceof Error ? planError.message : "No se pudo preparar el plan.");
    } finally {
      setBusy(null);
    }
  }, [loadDashboard]);

  const preparePulseSignal = useCallback(async (signalId: string, retry = false) => {
    setBusy("planning");
    setError(null);
    try {
      const response = await fetch("/api/panel/pulse-radar/signals", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ signalId, action: retry ? "retry" : "prepare" }),
      });
      const json = (await response.json().catch(() => null)) as
        | ({ ok?: boolean; error?: string; existing?: boolean; runId?: string } & Partial<PlanState>)
        | null;
      if (!response.ok || !json?.ok) {
        throw new Error(json?.error || "No se pudo preparar la senal de Pulse Radar.");
      }
      if (json.existing && json.runId) {
        setSelectedRunId(json.runId);
        await loadDashboard(true);
        return;
      }
      if (!json.planId || !json.plan) throw new Error("Pulse Radar no devolvio un plan valido.");
      const next: PlanState = {
        planId: json.planId,
        plan: json.plan,
        runs: json.runs ?? [],
        dryRun: json.dryRun ?? [],
        deduplicated: Boolean(json.deduplicated),
      };
      setPlanState(next);
      setSelectedRunId(next.runs[0]?.id ?? null);
      await loadDashboard(true);
    } catch (prepareError) {
      setError(prepareError instanceof Error ? prepareError.message : "No se pudo preparar la senal.");
    } finally {
      setBusy(null);
    }
  }, [loadDashboard]);

  useEffect(() => {
    void loadDashboard();
  }, [loadDashboard]);

  useEffect(() => {
    if (handoffRef.current) return;
    handoffRef.current = true;
    const params = new URLSearchParams(window.location.search);
    const requestedRun = params.get("run")?.trim();
    if (requestedRun && /^[0-9a-f-]{36}$/i.test(requestedRun)) {
      setSelectedRunId(requestedRun);
      window.history.replaceState(null, "", "/panel/lumenite");
    }
    const signalId = params.get("signal")?.trim();
    if (signalId && /^[0-9a-f-]{36}$/i.test(signalId) && params.get("autoplan") === "1") {
      setCommand("Preparar accion desde Pulse Radar");
      window.history.replaceState(null, "", "/panel/lumenite");
      void preparePulseSignal(signalId, params.get("retry") === "1");
      return;
    }
    const prompt = params.get("prompt")?.trim();
    if (!prompt) return;
    setCommand(prompt);
    const handoff = {
      source: params.get("source") === "pulse_radar" ? "pulse_radar" : "command_center",
      resourceType: params.get("resourceType"),
      resourceId: params.get("resourceId"),
      capability: params.get("capability"),
    };
    window.history.replaceState(null, "", "/panel/lumenite");
    if (params.get("autoplan") === "1") void createPlan(prompt, handoff);
  }, [createPlan, preparePulseSignal]);

  async function executeRun(run: LumeniteActionRun) {
    setBusy("executing");
    setError(null);
    setSelectedRunId(run.id);
    setPlanState((current) => current ? {
      ...current,
      runs: current.runs.map((item) => item.id === run.id ? { ...item, status: "executing" } : item),
    } : current);
    const poll = window.setInterval(() => void loadDashboard(true), 700);
    try {
      const response = await fetch("/api/panel/lumenite/execute", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ runId: run.id, approve: run.status === "awaiting_approval" }),
      });
      const json = (await response.json().catch(() => null)) as
        | { ok?: boolean; error?: string; run?: LumeniteActionRun }
        | null;
      if (!response.ok || !json?.ok || !json.run) {
        throw new Error(json?.error || "No se pudo ejecutar la acción.");
      }
      mergePlanRuns([json.run]);
      await loadDashboard(true);
    } catch (runError) {
      setError(runError instanceof Error ? runError.message : "No se pudo ejecutar la acción.");
      await loadDashboard(true);
    } finally {
      window.clearInterval(poll);
      setBusy(null);
    }
  }

  async function rejectOrCancel(run: LumeniteActionRun) {
    setBusy("executing");
    setError(null);
    try {
      const response = await fetch("/api/panel/lumenite/action-runs", {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          runId: run.id,
          decision: run.status === "awaiting_approval" ? "reject" : "cancel",
        }),
      });
      const json = (await response.json().catch(() => null)) as
        | { ok?: boolean; error?: string; run?: LumeniteActionRun }
        | null;
      if (!response.ok || !json?.ok || !json.run) throw new Error(json?.error || "No se pudo cancelar.");
      mergePlanRuns([json.run]);
      await loadDashboard(true);
    } catch (cancelError) {
      setError(cancelError instanceof Error ? cancelError.message : "No se pudo cancelar.");
    } finally {
      setBusy(null);
    }
  }

  async function undoRun(run: LumeniteActionRun) {
    setBusy("undo");
    setError(null);
    try {
      const response = await fetch("/api/panel/lumenite/rollback", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ runId: run.id }),
      });
      const json = (await response.json().catch(() => null)) as
        | { ok?: boolean; error?: string; run?: LumeniteActionRun }
        | null;
      if (!response.ok || !json?.ok || !json.run) throw new Error(json?.error || "No se pudo deshacer.");
      mergePlanRuns([json.run]);
      await loadDashboard(true);
    } catch (undoError) {
      setError(undoError instanceof Error ? undoError.message : "No se pudo deshacer.");
    } finally {
      setBusy(null);
    }
  }

  const activeDryRun = selectedRun && selectedIsActivePlan
    ? planState?.dryRun.find((item) => item.capability === selectedRun.capability)
    : selectedIsActivePlan
      ? planState?.dryRun[0]
      : undefined;
  const receipt = selectedRun?.receipt ?? {};
  const hasReceipt = Object.keys(receipt).length > 0;

  return (
    <main className={`lmn-module-page lmn-lumenite-page ${styles.page}`} aria-busy={Boolean(busy)}>
      <p className="sr-only" aria-live="polite">{liveStatus(busy)}</p>
      <section className={styles.hero}>
        <AnimatedHeroLights intensity={busy ? "high" : "medium"} />
        <div className={styles.heroCopy}>
          <span className={styles.eyebrow}><Workflow aria-hidden="true" /> Agent Foundation</span>
          <h1>Lumenite Action OS</h1>
          <p>Observa. Planifica. Autoriza. Ejecuta. Verifica.</p>
        </div>
        <div className={styles.policySummary}>
          <span><ShieldCheck aria-hidden="true" /> Política activa</span>
          <strong>Nivel {autonomy?.level ?? "-"}</strong>
          <small>{autonomy?.requiresApproval ? "Aprobación humana" : "Autonomía limitada"}</small>
        </div>
      </section>

      <section className={styles.commandBand} aria-label="Solicitar una acción">
        <div className={styles.commandInput}>
          <Sparkles aria-hidden="true" />
          <textarea
            aria-label="Solicitud para Lumenite"
            value={command}
            onChange={(event) => setCommand(event.target.value)}
            placeholder="¿Qué debe preparar Lumenite?"
            rows={2}
            disabled={Boolean(busy)}
          />
          <button
            type="button"
            onClick={() => void createPlan(command)}
            disabled={Boolean(busy) || !command.trim()}
            aria-label="Preparar plan"
            title="Preparar plan"
          >
            {busy === "planning" ? <LoaderCircle className={styles.spin} /> : <Send />}
          </button>
        </div>
        <div className={styles.suggestions}>
          {suggestions.map((suggestion) => (
            <button key={suggestion} type="button" disabled={Boolean(busy)} onClick={() => {
              setCommand(suggestion);
              void createPlan(suggestion);
            }}>
              {suggestion}
            </button>
          ))}
        </div>
      </section>

      {error ? (
        <LumenSystemState
          state="error"
          title="Lumenite no pudo completar la operación"
          description={error}
          compact
        />
      ) : null}

      <div className={styles.workspace}>
        <section className={styles.planPanel}>
          <header className={styles.sectionHeader}>
            <div><span>Agent plan</span><h2>{selectedRun && !selectedIsActivePlan ? inputValue(selectedRun.planSnapshot.objective || capabilities.find((item) => item.id === selectedRun.capability)?.name) : planState?.plan.objective || "Plan operativo"}</h2></div>
            {selectedRun || planState ? <span className={styles.risk} data-risk={selectedRun && !selectedIsActivePlan ? selectedRun.riskLevel : planState?.plan.riskLevel}>Riesgo {selectedRun && !selectedIsActivePlan ? selectedRun.riskLevel : planState?.plan.riskLevel}</span> : null}
          </header>

          {selectedRun && !selectedIsActivePlan ? (
            <div className={styles.persistedReview}>
              <div className={styles.planSummary}>
                <p>{inputValue(selectedRun.planSnapshot.objective || "Acción operativa recuperada del historial.")}</p>
                <dl>
                  <div><dt>Capacidad</dt><dd>{capabilities.find((item) => item.id === selectedRun.capability)?.name || selectedRun.capability}</dd></div>
                  <div><dt>Estado</dt><dd>{statusLabels[selectedRun.status]}</dd></div>
                  <div><dt>Origen</dt><dd>{selectedRun.source}</dd></div>
                </dl>
              </div>
              <section className={styles.simulation}>
                <header><span><FileCheck2 aria-hidden="true" /> Entrada redactada</span><strong>Riesgo {selectedRun.riskLevel}</strong></header>
                <div className={styles.inputGrid}>
                  {Object.entries(selectedRun.inputRedacted).map(([key, value]) => (
                    <div key={key}><span>{key}</span><strong>{inputValue(value)}</strong></div>
                  ))}
                </div>
              </section>
              <div className={styles.planActions}>
                {["awaiting_approval", "approved", "queued"].includes(selectedRun.status) ? (
                  <button type="button" className={styles.primaryAction} disabled={Boolean(busy)} onClick={() => void executeRun(selectedRun)}>
                    {busy === "executing" ? <LoaderCircle className={styles.spin} /> : <Play />}
                    {selectedRun.status === "awaiting_approval" ? "Aprobar y ejecutar" : "Ejecutar"}
                  </button>
                ) : null}
                {["draft", "planning", "awaiting_approval", "approved", "queued"].includes(selectedRun.status) ? (
                  <button type="button" className={styles.secondaryAction} disabled={Boolean(busy)} onClick={() => void rejectOrCancel(selectedRun)}>
                    <Ban /> Cancelar
                  </button>
                ) : null}
                {selectedRun.status === "undo_available" ? (
                  <button type="button" className={styles.secondaryAction} disabled={Boolean(busy)} onClick={() => void undoRun(selectedRun)}>
                    {busy === "undo" ? <LoaderCircle className={styles.spin} /> : <Undo2 />} Deshacer
                  </button>
                ) : null}
              </div>
            </div>
          ) : !planState ? (
            <LumenSystemState
              state="empty"
              title="Sin plan activo"
              description="Elige una solicitud segura para iniciar. Lumenite preparará una simulación antes de ejecutar."
              icon={<Workflow aria-hidden="true" />}
              className={styles.embeddedState}
            />
          ) : (
            <>
              <div className={styles.planSummary}>
                <p>{planState.plan.summary}</p>
                <dl>
                  <div><dt>Resultado esperado</dt><dd>{planState.plan.expectedResult}</dd></div>
                  <div><dt>Datos</dt><dd>{planState.plan.dataUsed.join(", ") || "Contexto autorizado del negocio"}</dd></div>
                  <div><dt>Proveedor</dt><dd>{planState.plan.integrations.join(", ") || "Ninguno"}</dd></div>
                </dl>
              </div>

              {planState.plan.missingData.length ? (
                <div className={styles.blockedNotice}>
                  <Ban aria-hidden="true" />
                  <div><strong>Faltan datos</strong>{planState.plan.missingData.map((item) => <span key={item}>{item}</span>)}</div>
                </div>
              ) : null}

              <div className={styles.steps}>
                {planState.plan.steps.map((step, index) => (
                  <button key={step.id} type="button" onClick={() => setSelectedRunId(planState.runs[index]?.id ?? null)} data-active={selectedRun?.id === planState.runs[index]?.id}>
                    <span>{index + 1}</span>
                    <div><strong>{step.label}</strong><small>{step.description}</small></div>
                    <ChevronRight aria-hidden="true" />
                  </button>
                ))}
              </div>

              {activeDryRun ? (
                <section className={styles.simulation}>
                  <header><span><FileCheck2 aria-hidden="true" /> Simulación</span><strong>{activeDryRun.authorization.reason}</strong></header>
                  <div className={styles.inputGrid}>
                    {Object.entries(activeDryRun.input).map(([key, value]) => (
                      <div key={key}><span>{key}</span><strong>{inputValue(value)}</strong></div>
                    ))}
                  </div>
                  <footer>
                    <span>{activeDryRun.requiredScopes.join(" · ")}</span>
                    <span>{activeDryRun.supportsUndo ? "Reversible" : "No reversible"}</span>
                  </footer>
                </section>
              ) : null}

              {selectedRun ? (
                <div className={styles.planActions}>
                  {["awaiting_approval", "approved", "queued"].includes(selectedRun.status) ? (
                    <button type="button" className={styles.primaryAction} disabled={Boolean(busy)} onClick={() => void executeRun(selectedRun)}>
                      {busy === "executing" ? <LoaderCircle className={styles.spin} /> : <Play />}
                      {selectedRun.status === "awaiting_approval" ? "Aprobar y ejecutar" : "Ejecutar"}
                    </button>
                  ) : null}
                  {["draft", "planning", "awaiting_approval", "approved", "queued"].includes(selectedRun.status) ? (
                    <button type="button" className={styles.secondaryAction} disabled={Boolean(busy)} onClick={() => void rejectOrCancel(selectedRun)}>
                      <Ban /> Cancelar
                    </button>
                  ) : null}
                  {selectedRun.status === "undo_available" ? (
                    <button type="button" className={styles.secondaryAction} disabled={Boolean(busy)} onClick={() => void undoRun(selectedRun)}>
                      {busy === "undo" ? <LoaderCircle className={styles.spin} /> : <Undo2 />} Deshacer
                    </button>
                  ) : null}
                </div>
              ) : null}
            </>
          )}
        </section>

        <aside
          className={styles.executionPanel}
          data-run-state={selectedRun?.status || "idle"}
          aria-live="polite"
        >
          <header className={styles.sectionHeader}>
            <div><span>Live execution</span><h2>{selectedRun ? statusLabels[selectedRun.status] : "En espera"}</h2></div>
            <Activity aria-hidden="true" />
          </header>
          {selectedRun ? (
            <>
              <div className={styles.timeline}>
                {timelineFor(selectedRun).map((step) => (
                  <div key={step.key} data-state={step.state}>
                    <span>{step.state === "done" ? <Check /> : step.state === "active" ? <LoaderCircle className={styles.spin} /> : <Clock3 />}</span>
                    <div><strong>{step.label}</strong><small>{step.state === "done" ? formatDate(selectedRun.updatedAt) : step.state === "active" ? "En curso" : "Pendiente"}</small></div>
                  </div>
                ))}
              </div>
              {selectedRun.errorMessage ? <div className={styles.runError}>{selectedRun.errorMessage}</div> : null}
              <div className={styles.runMeta}>
                <span>Auditoría</span><code>{selectedRun.id}</code>
              </div>
            </>
          ) : <div className={styles.compactEmpty}>Selecciona un paso.</div>}
        </aside>
      </div>

      {selectedRun && hasReceipt ? (
        <section className={styles.receipt}>
          <header className={styles.sectionHeader}>
            <div><span>Action receipt</span><h2>Resultado verificado</h2></div>
            <CheckCircle2 aria-hidden="true" />
          </header>
          <div className={styles.receiptGrid}>
            <div><span>Solicitud</span><strong>{inputValue(receipt.requested)}</strong></div>
            <div><span>Acción</span><strong>{inputValue(receipt.performed)}</strong></div>
            <div><span>Proveedor</span><strong>{inputValue(receipt.provider)}</strong></div>
            <div><span>Reversión</span><strong>{receipt.reversible ? "Disponible" : "No disponible"}</strong></div>
          </div>
          <footer><FileCheck2 aria-hidden="true" /><span>{inputValue((receipt.verification as Record<string, unknown> | undefined)?.summary)}</span><code>{inputValue(receipt.auditId)}</code></footer>
          <details className={styles.technicalDisclosure}>
            <summary>Vista técnica</summary>
            <dl>
              <div><dt>ID de ejecución</dt><dd>{selectedRun.id}</dd></div>
              <div><dt>Capacidad</dt><dd>{selectedRun.capability}</dd></div>
              <div><dt>Clave de idempotencia</dt><dd>{selectedRun.idempotencyKey}</dd></div>
              <div><dt>Estado de reversión</dt><dd>{selectedRun.undoStatus || "No disponible"}</dd></div>
            </dl>
          </details>
        </section>
      ) : null}

      <div className={styles.lowerGrid}>
        <section className={styles.approvalPanel}>
          <header className={styles.sectionHeader}><div><span>Approval inbox</span><h2>Pendientes</h2></div><Link href="/panel/approvals" aria-label="Abrir bandeja de aprobaciones"><strong>{approvals.length}</strong><ChevronRight aria-hidden="true" /></Link></header>
          <div className={styles.list}>
            {approvals.length ? approvals.slice(0, 6).map((run) => (
              <button key={run.id} type="button" onClick={() => setSelectedRunId(run.id)}>
                <ShieldCheck aria-hidden="true" /><div><strong>{capabilities.find((item) => item.id === run.capability)?.name || run.capability}</strong><small>{formatDate(run.createdAt)} · Riesgo {run.riskLevel}</small></div><ChevronRight />
              </button>
            )) : <div className={styles.compactEmpty}>Sin aprobaciones pendientes.</div>}
          </div>
        </section>

        <section className={styles.historyPanel}>
          <header className={styles.sectionHeader}><div><span>Audit trail</span><h2>Actividad reciente</h2></div><History aria-hidden="true" /></header>
          <div className={styles.list}>
            {history.slice(0, 8).map((run) => (
              <button key={run.id} type="button" onClick={() => setSelectedRunId(run.id)} data-status={run.status}>
                {terminalStatuses.has(run.status) && run.status !== "failed" ? <CheckCircle2 /> : run.status === "failed" ? <XCircle /> : <Clock3 />}
                <div><strong>{capabilities.find((item) => item.id === run.capability)?.name || run.capability}</strong><small>{statusLabels[run.status]} · {formatDate(run.createdAt)}</small></div><ChevronRight />
              </button>
            ))}
            {!history.length ? <div className={styles.compactEmpty}>Aún no hay ejecuciones.</div> : null}
          </div>
        </section>

        <section className={styles.catalogPanel}>
          <header className={styles.sectionHeader}><div><span>Capability registry</span><h2>Acciones P0</h2></div><strong>{capabilities.length}</strong></header>
          <div className={styles.catalog}>
            {capabilities.map((capability) => (
              <div key={capability.id}><span><Sparkles aria-hidden="true" /></span><div><strong>{capability.name}</strong><small>{capability.requiredScopes.join(" · ")}</small></div></div>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
