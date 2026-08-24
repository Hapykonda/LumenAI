"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { BellOff, Clock3, X } from "lucide-react";
import { getPulseExpression } from "@/lib/pulse-radar/expression-catalog";
import type { PulseRadarInsight } from "@/lib/pulse-radar/types";
import { PulsePersona } from "@/components/brand/pulse-persona";
import styles from "./pulse-radar-widget.module.css";

export function ProactiveInsightBubble({
  insight,
  onDismiss,
  onRead,
  onSnooze,
  onMute,
}: {
  insight: PulseRadarInsight;
  onDismiss: () => void;
  onRead: () => void;
  onSnooze: () => void;
  onMute: () => void;
}) {
  const expression = getPulseExpression(insight.expression);
  const action = insight.actions?.[0];
  const decorativeEmoji =
    insight.severity === "critical"
      ? []
      : (insight.emojis ?? expression.emoji).slice(0, 2);

  return (
    <motion.aside
      className={styles.teaser}
      data-severity={insight.severity}
      initial={{ opacity: 0, y: 10, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 8, scale: 0.98 }}
      transition={{ duration: 0.22, ease: [0.2, 0.8, 0.2, 1] }}
      aria-label="Nueva señal de Pulse Radar"
    >
      {decorativeEmoji.map((item, index) => (
        <span
          key={`${item}-${index}`}
          className={styles.teaserEmoji}
          data-index={index}
          aria-hidden="true"
        >
          {item}
        </span>
      ))}

      <div className={styles.teaserHeader}>
        <PulsePersona
          expression={insight.expression}
          size={38}
          title={`Pulse: ${expression.label}`}
        />
        <div>
          <span>{expression.label}</span>
          <strong>{insight.title}</strong>
        </div>
        <button type="button" onClick={onDismiss} aria-label="Cerrar sugerencia">
          <X />
        </button>
      </div>

      <p>{insight.body}</p>

      <div className={styles.teaserActions}>
        {action ? (
          <Link href={action.href} onClick={onRead}>
            {action.label}
          </Link>
        ) : (
          <button type="button" onClick={onRead}>
            Marcar como visto
          </button>
        )}
        <button type="button" onClick={onSnooze}>
          <Clock3 />
          Después
        </button>
        <button type="button" onClick={onMute} aria-label="Silenciar sugerencias durante esta sesión">
          <BellOff />
        </button>
      </div>
    </motion.aside>
  );
}
