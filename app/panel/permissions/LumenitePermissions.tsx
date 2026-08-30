"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Ban,
  Check,
  ChevronRight,
  Clock3,
  LoaderCircle,
  Plus,
  RotateCcw,
  Save,
  ShieldCheck,
  SlidersHorizontal,
  TimerReset,
  UsersRound,
} from "lucide-react";
import styles from "./permissions.module.css";

type Policy = {
  id: string;
  name: string;
  subjectUserId: string | null;
  role: string | null;
  integrationId: string | null;
  capability: string;
  resourceType: string;
  accessTypes: string[];
  autonomyLevel: number;
  allowed: boolean;
  maxPerHour: number | null;
  maxPerDay: number | null;
  allowedDays: number[];
  startTime: string | null;
  endTime: string | null;
  timezone: string;
  expiresAt: string | null;
  requiresApproval: boolean;
  allowsAutoExecute: boolean;
  allowsUndo: boolean;
  enabled: boolean;
  revision: number;
  revokedAt: string | null;
  revocationReason: string | null;
  updatedAt: string;
};

type Capability = { id: string; name: string; resourceType: string; accessType: string };
type Member = { userId: string; name: string; role: string; status: string };
type Integration = { id: string; provider: string; status: string };
type PolicyData = {
  ok?: boolean;
  error?: string;
  business?: { id: string; name: string };
  role?: string;
  policies?: Policy[];
  capabilities?: Capability[];
  members?: Member[];
  integrations?: Integration[];
  accessTypes?: string[];
};

type Editor = Omit<Policy, "id" | "enabled" | "revision" | "revokedAt" | "revocationReason" | "updatedAt">;

const LEVELS = [
  { level: 0, name: "Observar" },
  { level: 1, name: "Asesorar" },
  { level: 2, name: "Preparar" },
  { level: 3, name: "Aprobar" },
  { level: 4, name: "Limitada" },
];
const DAYS = ["D", "L", "M", "X", "J", "V", "S"];

function emptyEditor(): Editor {
  return {
    name: "Nueva politica",
    subjectUserId: null,
    role: "owner",
    integrationId: null,
    capability: "*",
    resourceType: "*",
    accessTypes: ["create"],
    autonomyLevel: 3,
    allowed: true,
    maxPerHour: 20,
    maxPerDay: 100,
    allowedDays: [],
    startTime: null,
    endTime: null,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
    expiresAt: null,
    requiresApproval: true,
    allowsAutoExecute: false,
    allowsUndo: true,
  };
}

function editorFromPolicy(policy: Policy): Editor {
  return {
    name: policy.name,
    subjectUserId: policy.subjectUserId,
    role: policy.role,
    integrationId: policy.integrationId,
    capability: policy.capability,
    resourceType: policy.resourceType,
    accessTypes: policy.accessTypes,
    autonomyLevel: policy.autonomyLevel,
    allowed: policy.allowed,
    maxPerHour: policy.maxPerHour,
    maxPerDay: policy.maxPerDay,
    allowedDays: policy.allowedDays,
    startTime: policy.startTime,
    endTime: policy.endTime,
    timezone: policy.timezone,
    expiresAt: policy.expiresAt,
    requiresApproval: policy.requiresApproval,
    allowsAutoExecute: policy.allowsAutoExecute,
    allowsUndo: policy.allowsUndo,
  };
}

function localExpiry(value: string | null) {
  if (!value) return "";
  const date = new Date(value);
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

export function LumenitePermissions() {
  const [data, setData] = useState<PolicyData>({});
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editor, setEditor] = useState<Editor>(emptyEditor);
  const [busy, setBusy] = useState<"load" | "save" | "revoke" | null>("load");
  const [message, setMessage] = useState<string | null>(null);
  const [revokeReason, setRevokeReason] = useState("");

  const selected = useMemo(
    () => data.policies?.find((policy) => policy.id === selectedId) ?? null,
    [data.policies, selectedId],
  );

  const load = useCallback(async (preserveSelection = true) => {
    setBusy("load");
    try {
      const response = await fetch("/api/panel/lumenite/policies", { credentials: "include", cache: "no-store" });
      const json = (await response.json().catch(() => null)) as PolicyData | null;
      if (!response.ok || !json?.ok) throw new Error(json?.error || "No se pudieron cargar los permisos.");
      setData(json);
      setSelectedId((current) => preserveSelection && json.policies?.some((item) => item.id === current) ? current : null);
      setMessage(null);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "No se pudieron cargar los permisos.");
    } finally {
      setBusy(null);
    }
  }, []);

  useEffect(() => { void load(false); }, [load]);

  function selectPolicy(policy: Policy) {
    setSelectedId(policy.id);
    setEditor(editorFromPolicy(policy));
    setRevokeReason("");
    setMessage(null);
  }

  function newPolicy() {
    setSelectedId(null);
    setEditor(emptyEditor());
    setRevokeReason("");
    setMessage(null);
  }

  function patch<K extends keyof Editor>(key: K, value: Editor[K]) {
    setEditor((current) => ({ ...current, [key]: value }));
  }

  function setLevel(level: number) {
    setEditor((current) => ({
      ...current,
      autonomyLevel: level,
      requiresApproval: level === 3 ? true : level === 4 ? current.requiresApproval : true,
      allowsAutoExecute: level === 4 ? current.allowsAutoExecute : false,
    }));
  }

  async function save() {
    setBusy("save");
    setMessage(null);
    try {
      const response = await fetch("/api/panel/lumenite/policies", {
        method: selected ? "PATCH" : "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(selected ? { id: selected.id, revision: selected.revision, policy: editor } : editor),
      });
      const json = (await response.json().catch(() => null)) as { ok?: boolean; error?: string; policy?: Policy } | null;
      if (!response.ok || !json?.ok || !json.policy) throw new Error(json?.error || "No se pudo guardar la politica.");
      setSelectedId(json.policy.id);
      setEditor(editorFromPolicy(json.policy));
      setMessage(selected ? "Politica actualizada." : "Politica creada.");
      await load(true);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "No se pudo guardar la politica.");
    } finally {
      setBusy(null);
    }
  }

  async function revoke() {
    if (!selected) return;
    setBusy("revoke");
    setMessage(null);
    try {
      const response = await fetch("/api/panel/lumenite/policies", {
        method: "DELETE",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: selected.id, reason: revokeReason }),
      });
      const json = (await response.json().catch(() => null)) as { ok?: boolean; error?: string; cancelledRuns?: number } | null;
      if (!response.ok || !json?.ok) throw new Error(json?.error || "No se pudo revocar la politica.");
      setMessage(`Politica revocada. ${json.cancelledRuns ?? 0} acciones pendientes detenidas.`);
      newPolicy();
      await load(false);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "No se pudo revocar la politica.");
    } finally {
      setBusy(null);
    }
  }

  const activePolicies = data.policies?.filter((policy) => policy.enabled).length ?? 0;
  const autoPolicies = data.policies?.filter((policy) => policy.enabled && policy.allowsAutoExecute).length ?? 0;

  return (
    <main className={`lmn-module-page lmn-permissions-page ${styles.page}`}>
      <section className={styles.hero}>
        <div className={styles.heroCopy}>
          <span><ShieldCheck aria-hidden="true" /> Control plane</span>
          <h1>Permisos de LumenAI</h1>
        </div>
        <dl className={styles.heroStats}>
          <div><dt>Activas</dt><dd>{activePolicies}</dd></div>
          <div><dt>Auto</dt><dd>{autoPolicies}</dd></div>
          <div><dt>Rol</dt><dd>{data.role || "-"}</dd></div>
        </dl>
      </section>

      <div className={styles.toolbar}>
        <div><strong>{data.business?.name || "Workspace"}</strong><span>{data.policies?.length ?? 0} politicas registradas</span></div>
        <button type="button" onClick={newPolicy}><Plus aria-hidden="true" /> Nueva politica</button>
      </div>

      <div className={styles.workspace}>
        <aside className={styles.policyList} aria-label="Politicas registradas">
          <header><span>Politicas</span><strong>{activePolicies}</strong></header>
          <div>
            {data.policies?.map((policy) => (
              <button
                key={policy.id}
                type="button"
                className={selectedId === policy.id ? styles.selectedPolicy : undefined}
                onClick={() => selectPolicy(policy)}
                data-disabled={!policy.enabled}
              >
                <span className={styles.policyLevel}>{policy.autonomyLevel}</span>
                <span><strong>{policy.name}</strong><small>{policy.capability === "*" ? "Todas las capacidades" : data.capabilities?.find((item) => item.id === policy.capability)?.name || policy.capability}</small></span>
                <ChevronRight aria-hidden="true" />
              </button>
            ))}
            {!data.policies?.length && busy !== "load" ? <p className={styles.empty}>Sin politicas registradas.</p> : null}
          </div>
        </aside>

        <form className={styles.editor} onSubmit={(event) => { event.preventDefault(); void save(); }}>
          <header className={styles.editorHeader}>
            <div><span>{selected ? `Revision ${selected.revision}` : "Borrador nuevo"}</span><h2>{selected ? "Editar politica" : "Configurar politica"}</h2></div>
            <div className={styles.editorActions}>
              <button type="button" className={styles.iconButton} onClick={newPolicy} title="Restablecer formulario"><RotateCcw aria-hidden="true" /></button>
              <button type="submit" className={styles.primaryButton} disabled={Boolean(busy)}>{busy === "save" ? <LoaderCircle className={styles.spin} /> : <Save />} Guardar</button>
            </div>
          </header>

          <div className={styles.formGrid}>
            <label className={styles.full}><span>Nombre</span><input value={editor.name} onChange={(event) => patch("name", event.target.value)} maxLength={100} required /></label>

            <fieldset className={styles.full}>
              <legend>Nivel de autonomia</legend>
              <div className={styles.levels}>
                {LEVELS.map((item) => <button key={item.level} type="button" aria-pressed={editor.autonomyLevel === item.level} onClick={() => setLevel(item.level)}><strong>{item.level}</strong><span>{item.name}</span></button>)}
              </div>
            </fieldset>

            <label><span>Usuario</span><select value={editor.subjectUserId || ""} onChange={(event) => patch("subjectUserId", event.target.value || null)}><option value="">Cualquier usuario</option>{data.members?.filter((member) => member.status === "active").map((member) => <option key={member.userId} value={member.userId}>{member.name}</option>)}</select></label>
            <label><span>Rol</span><select value={editor.role || ""} onChange={(event) => patch("role", event.target.value || null)}><option value="">Cualquier rol</option>{["owner", "admin", "manager", "member", "viewer"].map((role) => <option key={role} value={role}>{role}</option>)}</select></label>
            <label><span>Capacidad</span><select value={editor.capability} onChange={(event) => patch("capability", event.target.value)}><option value="*">Todas</option>{data.capabilities?.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
            <label><span>Recurso</span><select value={editor.resourceType} onChange={(event) => patch("resourceType", event.target.value)}><option value="*">Todos</option>{Array.from(new Set(data.capabilities?.map((item) => item.resourceType) || [])).map((resource) => <option key={resource} value={resource}>{resource}</option>)}</select></label>
            <label className={styles.full}><span>Integracion</span><select value={editor.integrationId || ""} onChange={(event) => patch("integrationId", event.target.value || null)}><option value="">Sin integracion especifica</option>{data.integrations?.map((integration) => <option key={integration.id} value={integration.id}>{integration.provider} - {integration.status}</option>)}</select></label>

            <fieldset className={styles.full}>
              <legend>Acciones permitidas</legend>
              <div className={styles.checkGrid}>{data.accessTypes?.map((access) => <label key={access}><input type="checkbox" checked={editor.accessTypes.includes(access)} onChange={(event) => patch("accessTypes", event.target.checked ? [...editor.accessTypes, access] : editor.accessTypes.filter((item) => item !== access))} /><span>{access}</span></label>)}</div>
            </fieldset>

            <label><span>Maximo por hora</span><input type="number" min={1} max={10000} value={editor.maxPerHour ?? ""} onChange={(event) => patch("maxPerHour", event.target.value ? Number(event.target.value) : null)} /></label>
            <label><span>Maximo por dia</span><input type="number" min={1} max={10000} value={editor.maxPerDay ?? ""} onChange={(event) => patch("maxPerDay", event.target.value ? Number(event.target.value) : null)} /></label>

            <fieldset className={styles.full}>
              <legend>Horario</legend>
              <div className={styles.days}>{DAYS.map((day, index) => <button key={`${day}-${index}`} type="button" aria-pressed={editor.allowedDays.includes(index)} onClick={() => patch("allowedDays", editor.allowedDays.includes(index) ? editor.allowedDays.filter((item) => item !== index) : [...editor.allowedDays, index].sort())}>{day}</button>)}</div>
              <div className={styles.timeGrid}>
                <label><span>Desde</span><input type="time" value={editor.startTime || ""} onChange={(event) => patch("startTime", event.target.value || null)} /></label>
                <label><span>Hasta</span><input type="time" value={editor.endTime || ""} onChange={(event) => patch("endTime", event.target.value || null)} /></label>
                <label><span>Zona horaria</span><input value={editor.timezone} onChange={(event) => patch("timezone", event.target.value)} /></label>
              </div>
            </fieldset>

            <label className={styles.full}><span>Expiracion</span><input type="datetime-local" value={localExpiry(editor.expiresAt)} onChange={(event) => patch("expiresAt", event.target.value ? new Date(event.target.value).toISOString() : null)} /></label>

            <fieldset className={`${styles.full} ${styles.switches}`}>
              <legend>Controles de ejecucion</legend>
              <label><input type="checkbox" checked={editor.allowed} onChange={(event) => patch("allowed", event.target.checked)} /><span><Check /> Permitida</span></label>
              <label><input type="checkbox" checked={editor.requiresApproval} disabled={editor.autonomyLevel === 3} onChange={(event) => patch("requiresApproval", event.target.checked)} /><span><UsersRound /> Requiere aprobacion</span></label>
              <label><input type="checkbox" checked={editor.allowsUndo} onChange={(event) => patch("allowsUndo", event.target.checked)} /><span><TimerReset /> Permite undo</span></label>
              <label><input type="checkbox" checked={editor.allowsAutoExecute} disabled={editor.autonomyLevel !== 4} onChange={(event) => patch("allowsAutoExecute", event.target.checked)} /><span><SlidersHorizontal /> Ejecucion automatica</span></label>
            </fieldset>
          </div>

          {selected?.enabled ? (
            <section className={styles.revokeBand}>
              <div><Ban aria-hidden="true" /><span><strong>Revocar politica</strong><small>Detiene pendientes e invalida sus aprobaciones.</small></span></div>
              <input value={revokeReason} onChange={(event) => setRevokeReason(event.target.value)} placeholder="Motivo de revocacion" aria-label="Motivo de revocacion" />
              <button type="button" onClick={() => void revoke()} disabled={busy === "revoke"}>{busy === "revoke" ? <LoaderCircle className={styles.spin} /> : <Ban />} Revocar</button>
            </section>
          ) : null}
        </form>
      </div>

      <div className={styles.live} role="status" aria-live="polite">
        {busy === "load" ? <><LoaderCircle className={styles.spin} /> Cargando permisos...</> : message ? <>{message}</> : <><Clock3 /> Politicas sincronizadas</>}
      </div>
    </main>
  );
}
