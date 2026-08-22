import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { InsightSticker } from "@/components/ui/insight-sticker";
import type { InsightSeverity, InsightType } from "@/lib/pulse-insights";

export type PulseSignalItem = {
  id: string;
  title: string;
  message: string;
  type: InsightType;
  severity: InsightSeverity;
  emoji: string;
  timestamp?: string;
  actionHref?: string;
};

function timeLabel(value?: string) {
  if (!value) return "Ahora";
  try {
    return new Date(value).toLocaleTimeString("es", { hour: "2-digit", minute: "2-digit" });
  } catch {
    return "Ahora";
  }
}

export function PulseSignalStream({ signals }: { signals: PulseSignalItem[] }) {
  return (
    <section className="lmn-pulse-signal-stream">
      <div className="lmn-pulse-block-heading">
        <span>Signal Stream</span>
        <strong>Señales del sistema</strong>
      </div>
      <div className="lmn-pulse-stream-list">
        {signals.slice(0, 7).map((signal) => {
          const content = (
            <>
              <InsightSticker type={signal.type} severity={signal.severity} emoji={signal.emoji} />
              <span className="min-w-0 flex-1">
                <strong>{signal.title}</strong>
                <small>{signal.message}</small>
              </span>
              <span className="lmn-pulse-stream-time">{timeLabel(signal.timestamp)}</span>
              {signal.actionHref ? <ArrowRight className="h-3.5 w-3.5 text-white/38" /> : null}
            </>
          );

          return signal.actionHref ? (
            <Link key={signal.id} href={signal.actionHref} className={`lmn-pulse-stream-item is-${signal.severity}`}>
              {content}
            </Link>
          ) : (
            <div key={signal.id} className={`lmn-pulse-stream-item is-${signal.severity}`}>
              {content}
            </div>
          );
        })}
      </div>
    </section>
  );
}
