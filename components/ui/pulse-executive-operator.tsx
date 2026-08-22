"use client";

import Link from "next/link";
import { ArrowRight, Crosshair, Gauge, MessageSquareText } from "lucide-react";
import { InsightSticker } from "@/components/ui/insight-sticker";
import { ProfessionalTypingMessage } from "@/components/ui/professional-typing-message";
import type { InsightMood, PulseOverallStatus, PulseRecommendation } from "@/lib/pulse-insights";

type PulseExecutiveOperatorProps = {
  status: PulseOverallStatus;
  mood: InsightMood;
  greeting: string;
  summary: string;
  suggestedFocus?: string;
  questions?: string[];
  recommendations: PulseRecommendation[];
  thinking?: boolean;
};

function statusCopy(status: PulseOverallStatus) {
  if (status === "healthy") return "Sistema estable";
  if (status === "opportunity") return "Oportunidad detectada";
  if (status === "warning") return "Atención necesaria";
  if (status === "needs_setup") return "Requiere configuración";
  return "Sin datos suficientes";
}

export function PulseExecutiveOperator({
  status,
  mood,
  greeting,
  summary,
  suggestedFocus,
  questions = [],
  recommendations,
  thinking = false,
}: PulseExecutiveOperatorProps) {
  const primary = recommendations[0];

  return (
    <section className="lmn-pulse-operator">
      <div className="lmn-pulse-operator-head">
        <InsightSticker type="system" severity={status === "warning" ? "warning" : "info"} mood={mood} />
        <div className="min-w-0">
          <span>Operador ejecutivo</span>
          <strong>{statusCopy(status)}</strong>
        </div>
        <Gauge className="ml-auto h-4 w-4 text-white/38" />
      </div>

      <ProfessionalTypingMessage
        thinking={thinking}
        badge="Briefing"
        segments={[
          { text: greeting ? `${greeting} ` : "", highlight: true },
          { text: summary },
        ]}
        speedMs={14}
      />

      {suggestedFocus ? (
        <div className="lmn-pulse-focus-line">
          <Crosshair className="h-3.5 w-3.5" />
          <span>{suggestedFocus}</span>
        </div>
      ) : null}

      {questions.length ? (
        <div className="lmn-pulse-question-row">
          {questions.slice(0, 3).map((question) => (
            <span key={question}>
              <MessageSquareText className="h-3 w-3" />
              {question}
            </span>
          ))}
        </div>
      ) : null}

      {primary?.href ? (
        <Link href={primary.href} className="lmn-pulse-operator-cta">
          <span>
            <strong>{primary.title}</strong>
            <small>{primary.reasoning || primary.message}</small>
          </span>
          <ArrowRight className="h-4 w-4" />
        </Link>
      ) : null}
    </section>
  );
}
