"use client";

import { motion } from "framer-motion";
import type { CSSProperties, RefObject } from "react";
import type {
  PulseHealthData,
  PulseWidgetState,
} from "@/lib/pulse-radar/types";
import { expressionForWidgetState } from "@/lib/pulse-radar/expression-catalog";
import { PulsePersona } from "@/components/brand/pulse-persona";
import styles from "./pulse-radar-widget.module.css";

function launcherLabel(state: PulseWidgetState, unreadCount: number) {
  if (unreadCount > 0) return "Pulse Radar tiene una señal nueva";
  if (state === "thinking" || state === "listening" || state === "streaming") {
    return "Pulse Radar está analizando";
  }
  if (state === "offline") return "Pulse Radar no está disponible";
  if (state === "warning") return "Pulse Radar detectó una advertencia";
  if (state === "critical") return "Pulse Radar detectó una señal crítica";
  return "Abrir Pulse Radar";
}

export function PulseRadarLauncher({
  state,
  unreadCount,
  health,
  onOpen,
  launcherRef,
}: {
  state: PulseWidgetState;
  unreadCount: number;
  health: PulseHealthData | null;
  onOpen: () => void;
  launcherRef: RefObject<HTMLButtonElement | null>;
}) {
  const expression = expressionForWidgetState(state);
  const label = launcherLabel(state, unreadCount);
  const healthPercent = health?.summary.total
    ? Math.round((health.summary.ready / health.summary.total) * 100)
    : 0;

  return (
    <motion.button
      ref={launcherRef}
      type="button"
      className={styles.launcher}
      data-state={state}
      data-accent={expression.accentMode}
      onClick={onOpen}
      aria-label={label}
      title={label}
      whileHover={{ y: -2 }}
      whileTap={{ scale: 0.97 }}
      transition={{ duration: 0.16 }}
    >
      <span
        className={styles.healthRing}
        data-health={health?.health ?? "unknown"}
        style={
          { "--pulse-progress": `${healthPercent * 3.6}deg` } as CSSProperties
        }
        aria-hidden="true"
      />
      <span className={styles.launcherCore}>
        <PulsePersona state={state} size={68} />
      </span>
      {unreadCount > 0 ? (
        <span className={styles.unreadSignal} aria-hidden="true" />
      ) : null}
      <span className={styles.launcherCopy}>
        <strong>Pulse Radar</strong>
        <small>{expression.label}</small>
      </span>
    </motion.button>
  );
}
