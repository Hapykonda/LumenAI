"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import {
  BellOff,
  Check,
  ChevronRight,
  CircleAlert,
  Clock3,
  Ellipsis,
  ExternalLink,
  HeartPulse,
  Minus,
  RefreshCw,
  Send,
  Settings2,
  Square,
  X,
} from "lucide-react";
import { expressionForWidgetState, getPulseExpression } from "@/lib/pulse-radar/expression-catalog";
import { PulsePersona } from "@/components/brand/pulse-persona";
import type {
  PulseConversationMessage,
  PulseHealthData,
  PulseRadarData,
  PulseWidgetState,
} from "@/lib/pulse-radar/types";
import { SafeMessageBody } from "./SafeMessageBody";
import styles from "./pulse-radar-widget.module.css";

type PanelProps = {
  state: PulseWidgetState;
  data: PulseRadarData | null;
  health: PulseHealthData | null;
  messages: PulseConversationMessage[];
  contextLabel: string;
  guidePrompt: string;
  input: string;
  error: string | null;
  proactiveEnabled: boolean;
  onInput: (value: string) => void;
  onSubmit: () => void;
  onCancel: () => void;
  onClose: () => void;
  onRefresh: () => void;
  onSuggestion: (value: string) => void;
  onToggleProactive: () => void;
  onAction: (messageId: string) => void;
};

function timeLabel(value: string) {
  const time = new Date(value).getTime();
  if (!Number.isFinite(time)) return "";
  const minutes = Math.max(0, Math.floor((Date.now() - time) / 60000));
  if (minutes < 1) return "ahora";
  if (minutes < 60) return `hace ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `hace ${hours} h`;
  return new Date(value).toLocaleDateString("es", { day: "2-digit", month: "short" });
}

function healthLabel(health: PulseHealthData | null) {
  if (!health || !health.ok) return "Salud desconocida";
  if (health.health === "critical") return "Sistema crítico";
  if (health.health === "warning") return "Sistema con advertencias";
  return "Sistema saludable";
}

function PulseSystemHealth({
  health,
  expanded,
  onToggle,
}: {
  health: PulseHealthData | null;
  expanded: boolean;
  onToggle: () => void;
}) {
  const total = health?.summary.total ?? 0;
  const ready = health?.summary.ready ?? 0;
  const percent = total > 0 ? Math.round((ready / total) * 100) : null;

  return (
    <section className={styles.health} data-health={health?.health ?? "unknown"}>
      <button
        type="button"
        className={styles.healthSummary}
        onClick={onToggle}
        aria-expanded={expanded}
        aria-label={`${healthLabel(health)}. ${
          percent === null ? "Porcentaje no disponible" : `${percent} por ciento`
        }. ${health?.summary.warnings ?? 0} advertencias y ${health?.summary.critical ?? 0} errores críticos.`}
      >
        <span className={styles.healthHeading}>
          <HeartPulse aria-hidden="true" />
          <strong>{healthLabel(health)}</strong>
          <b>{percent === null ? "--" : `${percent}%`}</b>
        </span>
        <span className={styles.healthTrack}>
          <i style={{ width: `${percent ?? 0}%` }} />
        </span>
        <small>
          {health
            ? `${health.summary.warnings} advertencias · ${health.summary.critical} críticos · ${timeLabel(health.checkedAt)}`
            : "Comprobación no disponible"}
        </small>
      </button>

      {expanded ? (
        <div className={styles.healthDetails}>
          <p>Fórmula: checks correctos / checks totales.</p>
          <div>
            {(health?.checks ?? []).slice(0, 8).map((check) => (
              <span key={check.key} data-status={check.status}>
                {check.status === "ready" ? <Check /> : <CircleAlert />}
                <b>{check.label}</b>
                <small>{check.detail}</small>
              </span>
            ))}
          </div>
          <Link href="/panel/system-health">
            Abrir System Health
            <ExternalLink />
          </Link>
        </div>
      ) : null}
    </section>
  );
}

function PulseMessage({
  message,
  onAction,
}: {
  message: PulseConversationMessage;
  onAction: (messageId: string) => void;
}) {
  const expression = getPulseExpression(message.expression);
  const decorativeEmoji =
    expression.tone === "critical"
      ? []
      : (message.emojis ?? expression.emoji).slice(0, 2);

  return (
    <article
      className={styles.message}
      data-role={message.role}
      data-state={message.state ?? "complete"}
      data-tone={expression.tone}
    >
      {message.role === "assistant" ? (
        <PulsePersona
          className={styles.messagePersona}
          expression={message.expression}
          size={32}
          title={`Pulse: ${expression.label}`}
        />
      ) : null}
      {message.role === "assistant" && decorativeEmoji.length ? (
        <div className={styles.messageDecorations} aria-hidden="true">
          {decorativeEmoji.map((item, index) => (
            <span key={`${item}-${index}`} data-index={index}>
              {item}
            </span>
          ))}
        </div>
      ) : null}

      <header>
        <span>{message.role === "assistant" ? expression.label : "Tú"}</span>
        <time dateTime={message.createdAt}>{timeLabel(message.createdAt)}</time>
      </header>
      {message.title ? <h4>{message.title}</h4> : null}
      <SafeMessageBody body={message.body} emphasis={message.emphasis} />

      {message.source?.label ? (
        <div className={styles.messageMeta}>
          <span>Fuente: {message.source.label}</span>
          {message.period?.label ? <span>Periodo: {message.period.label}</span> : null}
          {message.signalStatus ? <span>Estado: {message.signalStatus}</span> : null}
          {typeof message.confidence === "number" ? (
            <span>Confianza: {Math.round(message.confidence * 100)}%</span>
          ) : null}
        </div>
      ) : null}

      {message.lastError ? <p className={styles.inlineSignalError} role="alert">{message.lastError}</p> : null}

      {message.actions?.length ? (
        <div className={styles.messageActions}>
          {message.actions.slice(0, 2).map((action) => (
            <Link
              key={action.id}
              href={action.href}
              data-kind={action.kind ?? "secondary"}
              onClick={() => onAction(message.id)}
            >
              {action.label}
              <ChevronRight />
            </Link>
          ))}
        </div>
      ) : null}
    </article>
  );
}

export default function PulseRadarPanel(props: PanelProps) {
  const {
    state,
    data,
    health,
    messages,
    contextLabel,
    guidePrompt,
    input,
    error,
    proactiveEnabled,
    onInput,
    onSubmit,
    onCancel,
    onClose,
    onRefresh,
    onSuggestion,
    onToggleProactive,
    onAction,
  } = props;
  const [healthOpen, setHealthOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const streamRef = useRef<HTMLDivElement>(null);
  const expression = expressionForWidgetState(state);
  const waiting = state === "thinking" || state === "listening" || state === "streaming";
  const suggestions = useMemo(
    () =>
      Array.from(new Set([guidePrompt, ...(data?.questions ?? [])]))
        .filter(Boolean)
        .slice(0, 3),
    [data?.questions, guidePrompt],
  );

  useEffect(() => {
    titleRef.current?.focus({ preventScroll: true });
  }, []);

  useEffect(() => {
    const element = streamRef.current;
    if (!element) return;
    element.scrollTop = element.scrollHeight;
  }, [messages, waiting]);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  function submit(event: FormEvent) {
    event.preventDefault();
    if (!waiting && input.trim()) onSubmit();
  }

  return (
    <motion.section
      className={styles.panel}
      data-state={state}
      data-accent={expression.accentMode}
      role="dialog"
      aria-modal="false"
      aria-labelledby="pulse-radar-title"
      initial={{ opacity: 0, y: 14, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 10, scale: 0.98 }}
      transition={{ duration: 0.25, ease: [0.2, 0.8, 0.2, 1] }}
    >
      <header className={styles.panelHeader}>
        <span className={styles.headerMark}>
          <PulsePersona state={state} size={46} title={`Pulse: ${expression.label}`} />
        </span>
        <div>
          <span className={styles.eyebrow}>Inteligencia contextual</span>
          <h2 id="pulse-radar-title" ref={titleRef} tabIndex={-1}>
            Pulse Radar
          </h2>
          <p>
            <span data-status={state}>{expression.label}</span>
            Observando {contextLabel}
          </p>
        </div>
        <div className={styles.headerActions}>
          <button
            type="button"
            onClick={onRefresh}
            disabled={waiting}
            aria-label="Actualizar Pulse Radar"
            title="Actualizar"
          >
            <RefreshCw className={waiting ? styles.spin : undefined} />
          </button>
          <button
            type="button"
            onClick={onClose}
            aria-label="Minimizar Pulse Radar"
            title="Minimizar"
          >
            <Minus />
          </button>
          <button
            type="button"
            onClick={() => setMenuOpen((value) => !value)}
            aria-label="Más opciones de Pulse Radar"
            aria-expanded={menuOpen}
            title="Más opciones"
          >
            <Ellipsis />
          </button>
          <button type="button" onClick={onClose} aria-label="Cerrar Pulse Radar" title="Cerrar">
            <X />
          </button>
        </div>
      </header>

      {menuOpen ? (
        <div className={styles.optionsMenu}>
          <button type="button" onClick={onToggleProactive}>
            {proactiveEnabled ? <BellOff /> : <Settings2 />}
            {proactiveEnabled ? "Silenciar sugerencias en esta sesión" : "Activar sugerencias"}
          </button>
          <Link href="/panel/settings">
            <Settings2 />
            Preferencias del panel
          </Link>
        </div>
      ) : null}

      <PulseSystemHealth
        health={health}
        expanded={healthOpen}
        onToggle={() => setHealthOpen((value) => !value)}
      />

      <section className={styles.context}>
        <div>
          <span>Contexto actual</span>
          <strong>{contextLabel}</strong>
        </div>
        <p>{data?.suggestedFocus || "Leyendo actividad real del sistema."}</p>
      </section>

      <div className={styles.stream} ref={streamRef} aria-live="polite" aria-relevant="additions text">
        {messages.slice(-16).map((message) => (
          <PulseMessage key={message.id} message={message} onAction={onAction} />
        ))}
        {waiting ? (
          <div className={styles.typing} role="status">
            <PulsePersona state={state} size={24} />
            <span>
              <i />
              <i />
              <i />
            </span>
            <strong>
              {state === "listening"
                ? "Conectando información"
                : state === "streaming"
                  ? "Escribiendo"
                  : "Revisando señales"}
            </strong>
          </div>
        ) : null}
        {error ? (
          <div className={styles.inlineError} role="alert">
            <CircleAlert />
            <div>
              <strong>No pude completar la revisión</strong>
              <p>{error}</p>
            </div>
            <button type="button" onClick={onRefresh}>
              Reintentar
            </button>
          </div>
        ) : null}
      </div>

      {suggestions.length ? (
        <div className={styles.suggestions} aria-label="Sugerencias rápidas">
          {suggestions.map((suggestion) => (
            <button key={suggestion} type="button" onClick={() => onSuggestion(suggestion)}>
              {suggestion}
            </button>
          ))}
      </div>
      ) : null}

      <form className={styles.composer} onSubmit={submit}>
        <label htmlFor="pulse-radar-composer">Pregunta a Pulse Radar</label>
        <div>
          <input
            id="pulse-radar-composer"
            value={input}
            onChange={(event) => onInput(event.target.value.slice(0, 600))}
            placeholder="Pregunta por esta sección..."
            autoComplete="off"
            disabled={waiting}
          />
          {waiting ? (
            <button type="button" onClick={onCancel} aria-label="Detener generación" title="Detener">
              <Square />
            </button>
          ) : (
            <button
              type="submit"
              disabled={!input.trim()}
              aria-label="Enviar a Pulse Radar"
              title="Enviar"
            >
              <Send />
            </button>
          )}
        </div>
        <small>
          Pulse usa la sección y señales reales disponibles. No ejecuta acciones críticas.
        </small>
      </form>

      <footer className={styles.panelFooter}>
        <span>
          <Clock3 />
          {data?.refreshedAt ? `Actualizado ${timeLabel(data.refreshedAt)}` : "Esperando datos"}
        </span>
        <Link href="/panel/radar">
          Abrir Radar
          <ChevronRight />
        </Link>
      </footer>
    </motion.section>
  );
}
