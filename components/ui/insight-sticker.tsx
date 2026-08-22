import { getInsightEmoji, type InsightMood, type InsightSeverity, type InsightType } from "@/lib/pulse-insights";

type InsightStickerProps = {
  type?: InsightType;
  severity?: InsightSeverity;
  mood?: InsightMood;
  emoji?: string;
  label?: string;
  className?: string;
};

export function InsightSticker({
  type = "system",
  severity = "info",
  mood = "calm",
  emoji,
  label,
  className = "",
}: InsightStickerProps) {
  const displayEmoji = emoji || getInsightEmoji(type, severity, mood);

  return (
    <span
      className={["lmn-insight-sticker", `is-${severity}`, className].filter(Boolean).join(" ")}
      aria-label={label || type}
      role="img"
    >
      {displayEmoji}
    </span>
  );
}
