"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Ban,
  Check,
  CheckCircle2,
  ChevronRight,
  Clock3,
  ExternalLink,
  FileClock,
  History,
  LoaderCircle,
  MessageSquareDiff,
  ShieldCheck,
  Undo2,
  X,
} from "lucide-react";
import { AnimatedHeroLights } from "@/components/ui/animated-hero-lights";
import type { LumeniteActionRun, LumeniteApprovalInboxItem } from "@/lib/ai/lumenite/contracts";
import styles from "./approvals.module.css";

type InboxKey = "pending" | "approved" | "rejected" | "expired" | "executed" | "failed" | "reverted";
type InboxData = Record<InboxKey, LumeniteApprovalInboxItem[]>;
type Dashboard = { ok?: boolean; error?: string; approvalInbox?: InboxData; capabilities?: Array<{ id: string; name: string; supportsUndo: boolean }> };

const TABS: Array<{ id: InboxKey; label: string }> = [
  { id: "pending", label: "Pendientes" },
  { id: "approved", label: "Aprobadas" },
  { id: "rejected", label: "Rechazadas" },
  { id: "expired", label: "Expiradas" },
  { id: "executed", label: "Ejecutadas" },
  { id: "failed", label: "Fallidas" },
  { id: "reverted", label: "Revertidas" },
];

const EMPTY_INBOX: InboxData = { pending: [], approved: [], rejected: [], expired: [], executed: [], failed: [], reverted: [] };

function formatDate(value: string | null) {
  if (!value) return "No aplica";
  return new Intl.DateTimeFormat("es", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

function formatValue(value: unknown): string {
  if (value === null || value === undefined || value === "") return "No aplica";
  if (Array.isArray(value)) return value.map(formatValue).join(", ");
  if (typeof value === "object") {
    return Object.entries(value as Record<string, unknown>)
      .slice(0, 10)
      .map(([key, item]) => `${key.replaceAll("_", " ")}: ${formatValue(item)}`)
      .join(" | ");
  }
  return String(value);
}

function expectedResult(run: LumeniteActionRun) {
  const dryRun = run.planSnapshot.dryRun;
  return dryRun && typeof dryRun === "object"
    ? String((dryRun as Record<string, unknown>).expectedResult || "Resultado verificado por Lumenite")
    : "Resultado verificado por Lumenite";
}

function permissionLabel(run: LumeniteActionRun) {
  const policy = run.permissionSnapshot.policy;
  if (!policy || typeof policy !== "object") return "Politica vigente";
  const value = policy as Record<string, unknown>;
  return `Nivel ${value.autonomyLevel ?? "-"} | ${value.capability || run.capability}`;
}

export function ApprovalInbox() {
  const [inbox, setInbox] = useState<InboxData>(EMPTY_INBOX);
  const [capabilities, setCapabilities] = useState<Dashboard["capabilities"]>([]);
  const [active, setActive] = useState<InboxKey>("pending");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [comment, setComment] = useState("");
  const [busy, setBusy] = useState<string | null>("load");
  const [message, setMessage] = useState<string | null>(null);

  const items = inbox[active];
  const selected = useMemo(
    () => Object.values(inbox).flat().find((item) => item.id === selectedId) ?? items[0] ?? null,
    [inbox, items, selectedId],
  );

  const load = useCallback(async (silent = false) => {
    if (!silent) setBusy("load");
    try {
      const response = await fetch("/api/panel/lumenite/action-runs", { credentials: "include", cache: "no-store" });
      const json = (await response.json().catch(() => null)) as Dashboard | null;
      if (!response.ok || !json?.ok || !json.approvalInbox) throw new Error(json?.error || "No se pudo cargar la bandeja.");
      setInbox(json.approvalInbox);
      setCapabilities(json.capabilities || []);
      setSelectedId((current) => current && Object.values(json.approvalInbox || {}).flat().some((item) => item.id === current) ? current : null);
      setMessage(null);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "No se pudo cargar la bandeja.");
    } finally {
      if (!silent) setBusy(null);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  function selectTab(tab: InboxKey) {
    setActive(tab);
    setSelectedId(inbox[tab][0]?.id ?? null);
    setComment("");
  }

  async function decide(decision: "reject" | "cancel" | "request_changes") {
    if (!selected) return;
    setBusy(decision);
    setMessage(null);
    try {
      const response = await fetch("/api/panel/lumenite/action-runs", {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ runId: selected.run.id, decision, reason: comment }),
      });
      const json = (await response.json().catch(() => null)) as { ok?: boolean; error?: string; replacement?: { version?: number } } | null;
      if (!response.ok || !json?.ok) throw new Error(json?.error || "No se pudo actualizar la aprobacion.");
      setMessage(decision === "request_changes" ? `Plan version ${json.replacement?.version ?? "nueva"} creado.` : decision === "reject" ? "Aprobacion rechazada." : "Accion cancelada.");
      setComment("");
      await load(true);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "No se pudo actualizar la aprobacion.");
    } finally {
      setBusy(null);
    }
  }

  async function approve() {
    if (!selected) return;
    setBusy("approve");
    setMessage(null);
    try {
      const response = await fetch("/api/panel/lumenite/execute", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ runId: selected.run.id, approve: true }),
      });
      const json = (await response.json().catch(() => null)) as { ok?: boolean; error?: string } | null;
      if (!response.ok || !json?.ok) throw new Error(json?.error || "No se pudo aprobar y ejecutar.");
      setMessage("Accion aprobada, ejecutada y verificada.");
      await load(true);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "No se pudo aprobar y ejecutar.");
    } finally {
      setBusy(null);
    }
  }

  async function undo() {
    if (!selected) return;
    setBusy("undo");
    setMessage(null);
    try {
      const response = await fetch("/api/panel/lumenite/rollback", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ runId: selected.run.id }),
      });
      const json = (await response.json().catch(() => null)) as { ok?: boolean; error?: string } | null;
      if (!response.ok || !json?.ok) throw new Error(json?.error || "No se pudo ejecutar el undo.");
      setMessage("Undo ejecutado y verificado.");
      await load(true);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "No se pudo ejecutar el undo.");
    } finally {
      setBusy(null);
    }
  }

  const total = Object.values(inbox).reduce((sum, group) => sum + group.length, 0);
  const capabilityName = selected ? capabilities?.find((item) => item.id === selected.run.capability)?.name || selected.run.capability : "Aprobacion";
  const dryRun = selected?.run.planSnapshot.dryRun;
  const supportsUndo = Boolean(dryRun && typeof dryRun === "object" && (dryRun as Record<string, unknown>).supportsUndo);

  return (
    <main className={`lmn-module-page lmn-approvals-page ${styles.page}`}>
      <section className={styles.hero}>
        <AnimatedHeroLights intensity="medium" />
        <div className={styles.heroCopy}><span><ShieldCheck aria-hidden="true" /> Decision ledger</span><h1>Approval Inbox</h1></div>
        <dl><div><dt>Pendientes</dt><dd>{inbox.pending.length}</dd></div><div><dt>Historial</dt><dd>{total}</dd></div></dl>
      </section>

      <div className={styles.tabs} role="tablist" aria-label="Estados de aprobacion">
        {TABS.map((tab) => <button key={tab.id} type="button" role="tab" aria-selected={active === tab.id} onClick={() => selectTab(tab.id)}><span>{tab.label}</span><strong>{inbox[tab.id].length}</strong></button>)}
      </div>

      <div className={styles.workspace}>
        <section className={styles.listPanel} aria-label={TABS.find((tab) => tab.id === active)?.label}>
          <header><div><span>Cola de decisiones</span><h2>{TABS.find((tab) => tab.id === active)?.label}</h2></div><FileClock aria-hidden="true" /></header>
          <div className={styles.list}>
            {items.map((item) => (
              <button key={item.id} type="button" aria-pressed={selected?.id === item.id} onClick={() => { setSelectedId(item.id); setComment(""); }}>
                <span className={styles.risk} data-risk={item.run.riskLevel}>{item.run.riskLevel.slice(0, 1).toUpperCase()}</span>
                <span><strong>{capabilities?.find((capability) => capability.id === item.run.capability)?.name || item.run.capability}</strong><small>Plan v{item.planVersion} | {item.requesterName}</small><small>{formatDate(item.createdAt)}</small></span>
                <ChevronRight aria-hidden="true" />
              </button>
            ))}
            {!items.length && busy !== "load" ? <div className={styles.empty}><CheckCircle2 aria-hidden="true" /><strong>Sin elementos</strong></div> : null}
          </div>
        </section>

        <section className={styles.detailPanel}>
          {selected ? <>
            <header className={styles.detailHeader}>
              <div><span>Plan v{selected.planVersion}</span><h2>{capabilityName}</h2><small>{selected.businessName} | Riesgo {selected.run.riskLevel}</small></div>
              <span className={styles.status} data-status={selected.run.status}>{selected.run.status.replaceAll("_", " ")}</span>
            </header>

            <dl className={styles.factGrid}>
              <div><dt>Solicitante</dt><dd>{selected.requesterName}</dd></div>
              <div><dt>Integracion</dt><dd>{selected.integrationName || "LumenAI interno"}</dd></div>
              <div><dt>Permiso</dt><dd>{permissionLabel(selected.run)}</dd></div>
              <div><dt>Expiracion</dt><dd>{formatDate(selected.expiresAt)}</dd></div>
            </dl>

            <div className={styles.detailBands}>
              <section><span>Plan</span><p>{String(selected.run.planSnapshot.objective || capabilityName)}</p></section>
              <section><span>Datos afectados</span><p>{formatValue(selected.run.inputRedacted)}</p></section>
              <section><span>Resultado esperado</span><p>{expectedResult(selected.run)}</p></section>
              <section><span>Undo</span><p>{supportsUndo ? "Disponible despues de verificar. Retira el recurso creado y comprueba su ausencia." : "No disponible para esta accion."}</p></section>
              {selected.run.planSnapshot.changeRequest ? <section><span>Cambios solicitados</span><p>{String(selected.run.planSnapshot.changeRequest)}</p></section> : null}
              {selected.reason ? <section><span>Decision</span><p>{selected.reason}</p></section> : null}
              {selected.run.errorMessage ? <section data-error="true"><span>Error</span><p>{selected.run.errorMessage}</p></section> : null}
            </div>

            {active === "pending" ? <div className={styles.comment}><label htmlFor="approval-comment">Comentario</label><textarea id="approval-comment" value={comment} onChange={(event) => setComment(event.target.value.slice(0, 500))} placeholder="Motivo del rechazo o cambios solicitados" /></div> : null}

            <div className={styles.actions}>
              {active === "pending" ? <>
                <button type="button" className={styles.primary} onClick={() => void approve()} disabled={Boolean(busy)}>{busy === "approve" ? <LoaderCircle className={styles.spin} /> : <Check />} Aprobar y ejecutar</button>
                <button type="button" onClick={() => void decide("request_changes")} disabled={Boolean(busy) || comment.trim().length < 3}><MessageSquareDiff /> Solicitar cambios</button>
                <button type="button" onClick={() => void decide("reject")} disabled={Boolean(busy)}><X /> Rechazar</button>
                <button type="button" onClick={() => void decide("cancel")} disabled={Boolean(busy)}><Ban /> Cancelar</button>
              </> : null}
              {selected.run.status === "undo_available" ? <button type="button" onClick={() => void undo()} disabled={Boolean(busy)}><Undo2 /> Ejecutar undo</button> : null}
              <Link href={`/panel/lumenite?run=${selected.run.id}`}><ExternalLink /> Abrir plan</Link>
              <Link href="/panel/activity"><History /> Ver auditoria</Link>
            </div>

            <details className={styles.technical}><summary>Detalles de ejecucion</summary><dl><div><dt>Run</dt><dd>{selected.run.id}</dd></div><div><dt>Plan</dt><dd>{selected.run.planId}</dd></div><div><dt>Creado</dt><dd>{formatDate(selected.run.createdAt)}</dd></div><div><dt>Finalizado</dt><dd>{formatDate(selected.run.completedAt)}</dd></div><div><dt>Verificacion</dt><dd>{formatValue(selected.run.verificationResult)}</dd></div></dl></details>
          </> : <div className={styles.detailEmpty}><ShieldCheck /><strong>Selecciona una aprobacion</strong></div>}
        </section>
      </div>

      <div className={styles.live} role="status" aria-live="polite">{busy === "load" ? <><LoaderCircle className={styles.spin} /> Cargando bandeja...</> : message || <><Clock3 /> Bandeja sincronizada</>}</div>
    </main>
  );
}
