import type { CSSProperties } from "react";
import type { PulseRecommendation } from "@/lib/pulse-insights";
import { InsightSticker } from "@/components/ui/insight-sticker";

type PulseSignal = {
  label: string;
  value: string;
  tone: "good" | "warn" | "risk" | "info";
};

type PulseRadarProps = {
  status: string;
  score: number;
  signals: PulseSignal[];
  recommendations?: PulseRecommendation[];
};

function toneToSeverity(tone: PulseSignal["tone"]) {
  if (tone === "good") return "success";
  if (tone === "warn") return "warning";
  if (tone === "risk") return "critical";
  return "info";
}

export function PulseRadar({ status, score, signals, recommendations = [] }: PulseRadarProps) {
  const activeSignals = signals.slice(0, 5);

  return (
    <div className="lmn-live-pulse-radar" aria-label="Pulse Radar vivo">
      <div className="lmn-live-radar-orbit">
        <div className="lmn-live-radar-sweep" />
        <div className="lmn-live-radar-core">
          <strong>{score}%</strong>
          <span>{status}</span>
        </div>
        {activeSignals.map((signal, index) => (
          <span
            key={signal.label}
            className={`lmn-live-radar-dot is-${signal.tone}`}
            style={{
              "--x": `${28 + ((index * 31) % 45)}%`,
              "--y": `${22 + ((index * 19) % 52)}%`,
            } as CSSProperties}
          />
        ))}
      </div>

      <div className="lmn-live-radar-feed">
        {activeSignals.map((signal) => (
          <div key={signal.label}>
            <InsightSticker severity={toneToSeverity(signal.tone)} />
            <span>{signal.label}</span>
            <strong>{signal.value}</strong>
          </div>
        ))}
      </div>

      {recommendations[0] ? (
        <div className="lmn-live-radar-primary">
          <InsightSticker
            type={recommendations[0].type}
            severity={recommendations[0].severity}
            emoji={recommendations[0].emoji}
          />
          <span>{recommendations[0].title}</span>
        </div>
      ) : null}
    </div>
  );
}
