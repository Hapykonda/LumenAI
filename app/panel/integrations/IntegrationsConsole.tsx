"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import {
  CheckCircle2,
  CircleAlert,
  ExternalLink,
  FileClock,
  Link2,
  LoaderCircle,
  Mail,
  RefreshCw,
  ShieldCheck,
  Unplug,
} from "lucide-react";
import styles from "./integrations.module.css";

type Connection = {
  id: string;
  status: string;
  account_email: string | null;
  scopes: string[] | null;
  connected_at: string | null;
  token_expires_at: string | null;
  last_health_check_at: string | null;
  last_sync_at: string | null;
  last_error_code: string | null;
  last_error_message: string | null;
};

type Draft = {
  id: string;
  action_run_id: string;
  recipient: string;
  subject: string;
  status: string;
  external_id: string | null;
  external_url: string | null;
  error_message: string | null;
  prepared_at: string | null;
  created_at: string;
};

type IntegrationPayload = {
  ok: boolean;
  configured: boolean;
  connection: Connection | null;
  drafts: Draft[];
  error?: string;
};

function formatDate(value: string | null | undefined) {
  if (!value) return "Sin registro";
  return new Intl.DateTimeFormat("es", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

function statusLabel(status: string | undefined) {
  const labels: Record<string, string> = {
    connected: "Conectada",
    degraded: "Degradada",
    expired: "Expirada",
    revoked: "Revocada",
    error: "Con error",
    connecting: "Conectando",
  };
  return labels[status ?? ""] ?? "Desconectada";
}

export function IntegrationsConsole() {
  const [data, setData] = useState<IntegrationPayload | null>(null);
  const [busy, setBusy] = useState<"load" | "health" | "disconnect" | "draft" | null>("load");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirmDisconnect, setConfirmDisconnect] = useState(false);
  const [recipient, setRecipient] = useState("");
  const [subject, setSubject] = useState("");
  const [content, setContent] = useState("");

  const load = useCallback(async (quiet = false) => {
    if (!quiet) setBusy("load");
    setError(null);
    try {
      const response = await fetch("/api/panel/integrations", { credentials: "include", cache: "no-store" });
      const json = await response.json() as IntegrationPayload;
      if (!response.ok || !json.ok) throw new Error(json.error || "No se pudo cargar la integracion.");
      setData(json);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "No se pudo cargar la integracion.");
    } finally {
      if (!quiet) setBusy(null);
    }
  }, []);

  useEffect(() => {
    void load();
    const params = new URLSearchParams(window.location.search);
    if (params.get("connected") === "1") setMessage("Gmail quedo conectado y verificado.");
    if (params.get("error")) setError(`Google no pudo completar la conexion: ${params.get("error")}.`);
  }, [load]);

  async function healthCheck() {
    setBusy("health");
    setError(null);
    try {
      const response = await fetch("/api/panel/integrations/google", { method: "POST", credentials: "include" });
      const json = await response.json() as { ok?: boolean; error?: string };
      if (!response.ok || !json.ok) throw new Error(json.error || "La comprobacion fallo.");
      setMessage("Conexion verificada con Gmail.");
      await load(true);
    } catch (healthError) {
      setError(healthError instanceof Error ? healthError.message : "La comprobacion fallo.");
    } finally {
      setBusy(null);
    }
  }

  async function disconnect() {
    if (!confirmDisconnect) {
      setConfirmDisconnect(true);
      return;
    }
    setBusy("disconnect");
    setError(null);
    try {
      const response = await fetch("/api/panel/integrations/google", { method: "DELETE", credentials: "include" });
      const json = await response.json() as { ok?: boolean; error?: string; providerRevocationConfirmed?: boolean };
      if (!response.ok || !json.ok) throw new Error(json.error || "No se pudo desconectar Gmail.");
      setMessage(json.providerRevocationConfirmed
        ? "Acceso revocado en Google y credenciales locales eliminadas."
        : "Credenciales locales eliminadas; revisa la revocacion en Google.");
      setConfirmDisconnect(false);
      await load(true);
    } catch (disconnectError) {
      setError(disconnectError instanceof Error ? disconnectError.message : "No se pudo desconectar Gmail.");
    } finally {
      setBusy(null);
    }
  }

  async function prepareDraft(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!data?.connection?.id) return;
    setBusy("draft");
    setError(null);
    setMessage(null);
    try {
      const response = await fetch("/api/panel/integrations/google/drafts", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json", "Idempotency-Key": crypto.randomUUID() },
        body: JSON.stringify({ integrationId: data.connection.id, recipient, subject, content }),
      });
      const json = await response.json() as { ok?: boolean; error?: string; runs?: Array<{ status: string }> };
      if (!response.ok || !json.ok) throw new Error(json.error || "No se pudo preparar el plan.");
      if (!json.runs?.length) throw new Error("El permiso actual no permite preparar este borrador.");
      setMessage("Plan creado. El borrador no se creara hasta que una persona lo apruebe.");
      await load(true);
    } catch (draftError) {
      setError(draftError instanceof Error ? draftError.message : "No se pudo preparar el borrador.");
    } finally {
      setBusy(null);
    }
  }

  const connection = data?.connection;
  const connected = connection?.status === "connected" || connection?.status === "degraded";

  return (
    <main className={`lmn-module-page lmn-integrations-page ${styles.page}`} id="main-content">
      <header className={styles.hero}>
        <div>
          <span><Link2 aria-hidden="true" /> Conexiones autorizadas</span>
          <h1>Integraciones</h1>
          <p>Canales externos bajo permiso, aprobacion humana y auditoria verificable.</p>
        </div>
        <dl>
          <div><dt>Proveedor</dt><dd>Google Gmail</dd></div>
          <div><dt>Modo</dt><dd>Solo borradores</dd></div>
          <div><dt>Estado</dt><dd data-status={connection?.status ?? "disconnected"}>{statusLabel(connection?.status)}</dd></div>
        </dl>
      </header>

      {(message || error) ? (
        <div className={error ? styles.alertError : styles.alertSuccess} role={error ? "alert" : "status"}>
          {error ? <CircleAlert aria-hidden="true" /> : <CheckCircle2 aria-hidden="true" />}
          <span>{error || message}</span>
        </div>
      ) : null}

      <section className={styles.provider} aria-labelledby="gmail-title">
        <div className={styles.providerIdentity}>
          <span className={styles.providerMark}><Mail aria-hidden="true" /></span>
          <div><small>Google Workspace</small><h2 id="gmail-title">Gmail Drafts</h2><p>Scope minimo `gmail.compose`. El sistema no dispone de una accion de envio.</p></div>
        </div>
        <div className={styles.providerActions}>
          {connected ? (
            <>
              <button type="button" onClick={() => void healthCheck()} disabled={Boolean(busy)} title="Comprobar conexion">
                {busy === "health" ? <LoaderCircle className={styles.spin} /> : <RefreshCw />}<span>Verificar</span>
              </button>
              <button type="button" className={styles.danger} onClick={() => void disconnect()} disabled={Boolean(busy)}>
                {busy === "disconnect" ? <LoaderCircle className={styles.spin} /> : <Unplug />}
                <span>{confirmDisconnect ? "Confirmar revocacion" : "Desconectar"}</span>
              </button>
            </>
          ) : data?.configured ? (
            <a className={styles.primary} href="/api/panel/integrations/google/connect"><Link2 /> Conectar Google</a>
          ) : (
            <span className={styles.notConfigured}>Credenciales OAuth pendientes en servidor</span>
          )}
        </div>
        <dl className={styles.connectionFacts}>
          <div><dt>Cuenta</dt><dd>{connection?.account_email || "No conectada"}</dd></div>
          <div><dt>Scope concedido</dt><dd>{connection?.scopes?.includes("https://www.googleapis.com/auth/gmail.compose") ? "gmail.compose" : "Pendiente"}</dd></div>
          <div><dt>Ultimo health check</dt><dd>{formatDate(connection?.last_health_check_at)}</dd></div>
          <div><dt>Ultima sincronizacion</dt><dd>{formatDate(connection?.last_sync_at)}</dd></div>
        </dl>
        <div className={styles.guardrail}><ShieldCheck aria-hidden="true" /><span><strong>Guardrail activo</strong> Cada borrador requiere Approval Inbox. Ninguna ruta de esta version envia correos.</span></div>
      </section>

      <div className={styles.workspace}>
        <form className={styles.composer} onSubmit={prepareDraft}>
          <header><div><small>Preparacion externa</small><h2>Nuevo borrador</h2></div><FileClock aria-hidden="true" /></header>
          <label><span>Destinatario</span><input type="email" value={recipient} onChange={(event) => setRecipient(event.target.value)} placeholder="persona@empresa.com" required disabled={!connected || Boolean(busy)} /></label>
          <label><span>Asunto</span><input value={subject} onChange={(event) => setSubject(event.target.value)} maxLength={300} required disabled={!connected || Boolean(busy)} /></label>
          <label><span>Contenido</span><textarea value={content} onChange={(event) => setContent(event.target.value)} maxLength={10000} rows={9} required disabled={!connected || Boolean(busy)} /></label>
          <footer>
            <span>Se mostraran destinatario, asunto y contenido antes de aprobar.</span>
            <button type="submit" className={styles.primary} disabled={!connected || Boolean(busy)}>
              {busy === "draft" ? <LoaderCircle className={styles.spin} /> : <FileClock />} Preparar para aprobacion
            </button>
          </footer>
        </form>

        <section className={styles.history} aria-labelledby="draft-history-title">
          <header><div><small>Trazabilidad</small><h2 id="draft-history-title">Borradores recientes</h2></div><Link href="/panel/approvals">Abrir aprobaciones</Link></header>
          <div className={styles.draftList}>
            {data?.drafts?.length ? data.drafts.map((draft) => (
              <article key={draft.id}>
                <div><span data-status={draft.status}>{draft.status}</span><time>{formatDate(draft.prepared_at || draft.created_at)}</time></div>
                <h3>{draft.subject}</h3>
                <p>{draft.recipient}</p>
                {draft.error_message ? <small className={styles.draftError}>{draft.error_message}</small> : null}
                {draft.external_url ? <a href={draft.external_url} target="_blank" rel="noreferrer">Abrir borrador <ExternalLink /></a> : <Link href="/panel/approvals">Ver plan pendiente</Link>}
              </article>
            )) : <p className={styles.empty}>{busy === "load" ? "Cargando historial..." : "Aun no hay borradores externos."}</p>}
          </div>
        </section>
      </div>
    </main>
  );
}
