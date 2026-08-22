import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import {
  AlertTriangle,
  Ban,
  CheckCircle2,
  CircleAlert,
  CircleDashed,
  LoaderCircle,
  LockKeyhole,
  RefreshCw,
  RotateCcw,
  SearchCheck,
  ShieldAlert,
  Signal,
  Sparkles,
  WifiOff,
} from "lucide-react";
import { cn } from "@/lib/utils";

export type LumenSystemStateName =
  | "loading"
  | "empty"
  | "error"
  | "offline"
  | "degraded"
  | "success"
  | "warning"
  | "critical"
  | "permission_required"
  | "approval_pending"
  | "syncing"
  | "analysing"
  | "executing"
  | "verifying"
  | "reconnecting"
  | "cancelled"
  | "reverted";

type StateDefinition = {
  label: string;
  title: string;
  description: string;
  icon: LucideIcon;
  tone: "neutral" | "info" | "success" | "warning" | "danger" | "ai";
  busy?: boolean;
};

const STATE_DEFINITIONS: Record<LumenSystemStateName, StateDefinition> = {
  loading: {
    label: "Cargando",
    title: "Preparando la información",
    description: "LumenAI está recuperando los datos autorizados.",
    icon: LoaderCircle,
    tone: "info",
    busy: true,
  },
  empty: {
    label: "Sin datos",
    title: "Todavía no hay información",
    description: "Cuando exista actividad verificable aparecerá en este espacio.",
    icon: CircleDashed,
    tone: "neutral",
  },
  error: {
    label: "Error",
    title: "No se pudo completar la operación",
    description: "Reintenta la operación o revisa el estado del sistema.",
    icon: CircleAlert,
    tone: "danger",
  },
  offline: {
    label: "Sin conexión",
    title: "LumenAI está desconectado",
    description: "Las acciones quedan detenidas hasta recuperar la conexión.",
    icon: WifiOff,
    tone: "danger",
  },
  degraded: {
    label: "Servicio degradado",
    title: "Parte del sistema necesita atención",
    description: "Algunas funciones pueden responder con capacidad limitada.",
    icon: Signal,
    tone: "warning",
  },
  success: {
    label: "Completado",
    title: "Resultado verificado",
    description: "La operación terminó y su evidencia quedó registrada.",
    icon: CheckCircle2,
    tone: "success",
  },
  warning: {
    label: "Atención",
    title: "Revisa antes de continuar",
    description: "Existe una condición que requiere una decisión consciente.",
    icon: AlertTriangle,
    tone: "warning",
  },
  critical: {
    label: "Crítico",
    title: "La operación está bloqueada",
    description: "Se detectó un riesgo que impide continuar de forma segura.",
    icon: ShieldAlert,
    tone: "danger",
  },
  permission_required: {
    label: "Permiso requerido",
    title: "Esta acción necesita autorización",
    description: "LumenAI no continuará hasta confirmar el alcance solicitado.",
    icon: LockKeyhole,
    tone: "warning",
  },
  approval_pending: {
    label: "Aprobación pendiente",
    title: "El plan está listo para revisión",
    description: "Comprueba el impacto, los datos y la reversibilidad antes de aprobar.",
    icon: SearchCheck,
    tone: "ai",
  },
  syncing: {
    label: "Sincronizando",
    title: "Actualizando información",
    description: "Los cambios se están conciliando con la fuente autorizada.",
    icon: RefreshCw,
    tone: "info",
    busy: true,
  },
  analysing: {
    label: "Analizando",
    title: "Interpretando el contexto",
    description: "LumenAI está identificando objetivo, límites y riesgos.",
    icon: Sparkles,
    tone: "ai",
    busy: true,
  },
  executing: {
    label: "Ejecutando",
    title: "Aplicando la acción autorizada",
    description: "Sólo se está utilizando la capacidad registrada en el plan.",
    icon: LoaderCircle,
    tone: "info",
    busy: true,
  },
  verifying: {
    label: "Verificando",
    title: "Comprobando el resultado real",
    description: "La operación no se marcará como completa sin evidencia.",
    icon: SearchCheck,
    tone: "ai",
    busy: true,
  },
  reconnecting: {
    label: "Reconectando",
    title: "Restableciendo el servicio",
    description: "Las operaciones sensibles permanecen detenidas durante la reconexión.",
    icon: RefreshCw,
    tone: "info",
    busy: true,
  },
  cancelled: {
    label: "Cancelado",
    title: "La operación fue detenida",
    description: "No se ejecutaron pasos posteriores a la cancelación.",
    icon: Ban,
    tone: "neutral",
  },
  reverted: {
    label: "Revertido",
    title: "El cambio fue deshecho",
    description: "LumenAI verificó la reversión y conservó el registro de auditoría.",
    icon: RotateCcw,
    tone: "success",
  },
};

type LumenSystemStateProps = {
  state: LumenSystemStateName;
  title?: string;
  description?: string;
  action?: ReactNode;
  icon?: ReactNode;
  technical?: ReactNode;
  compact?: boolean;
  className?: string;
};

export function LumenSystemState({
  state,
  title,
  description,
  action,
  icon,
  technical,
  compact = false,
  className,
}: LumenSystemStateProps) {
  const definition = STATE_DEFINITIONS[state];
  const Icon = definition.icon;
  const alert = state === "error" || state === "critical" || state === "offline";

  return (
    <section
      className={cn("lmn-system-state", compact && "is-compact", className)}
      data-state={state}
      data-tone={definition.tone}
      aria-busy={definition.busy || undefined}
      aria-live={alert ? "assertive" : "polite"}
      role={alert ? "alert" : "status"}
    >
      <span className="lmn-system-state-icon" aria-hidden="true">
        {icon || <Icon />}
      </span>
      <div className="lmn-system-state-copy">
        <span>{definition.label}</span>
        <h2>{title || definition.title}</h2>
        <p>{description || definition.description}</p>
      </div>
      {action ? <div className="lmn-system-state-action">{action}</div> : null}
      {technical ? (
        <details className="lmn-system-state-technical">
          <summary>Detalles técnicos</summary>
          <div>{technical}</div>
        </details>
      ) : null}
      {definition.busy ? <span className="lmn-system-state-trace" aria-hidden="true" /> : null}
    </section>
  );
}
