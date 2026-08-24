"use client";

import type { PulseWidgetState } from "@/lib/pulse-radar/types";
import { usePanel } from "@/app/panel/_components/panel-context";
import { OperatorAvatar } from "./operator-avatar";
import type { OperatorId, OperatorMood } from "@/lib/operators/catalog";

type PersonaMood =
  | "idle"
  | "thinking"
  | "analyzing"
  | "reading"
  | "positive"
  | "celebration"
  | "warning"
  | "critical"
  | "offline";

function resolveMood(state?: PulseWidgetState, expression?: string): PersonaMood {
  const value = expression || state || "idle";
  if (["critical", "error"].includes(value)) return "critical";
  if (["warning", "urgent", "recovering"].includes(value)) return "warning";
  if (["celebration", "success", "action_complete"].includes(value)) return "celebration";
  if (["good_news", "opportunity", "reassuring"].includes(value)) return "positive";
  if (["thinking", "listening"].includes(value)) return "thinking";
  if (["analyzing", "streaming", "writing"].includes(value)) return "analyzing";
  if (["reading", "research"].includes(value)) return "reading";
  if (["offline", "no_data"].includes(value)) return "offline";
  return "idle";
}

function toOperatorMood(mood: PersonaMood): OperatorMood {
  if (mood === "celebration") return "celebrating";
  if (mood === "positive") return "good-news";
  if (mood === "warning" || mood === "critical") return "bad-news";
  if (mood === "thinking") return "thinking";
  if (mood === "analyzing") return "analyzing";
  if (mood === "reading") return "working";
  if (mood === "offline") return "thinking";
  return "welcome";
}

export function PulsePersona({
  size = 48,
  state,
  expression,
  title,
  className,
  operator,
}: {
  size?: number;
  state?: PulseWidgetState;
  expression?: string;
  title?: string;
  className?: string;
  operator?: OperatorId;
}) {
  const panel = usePanel();
  const mood = resolveMood(state, expression);

  return (
    <OperatorAvatar
      operator={operator ?? panel.operatorId}
      mood={toOperatorMood(mood)}
      size={size}
      className={className}
      label={title}
    />
  );
}
