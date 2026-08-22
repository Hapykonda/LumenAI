"use client";

import { useEffect, useMemo, useState } from "react";

type TypingSegment = {
  text: string;
  highlight?: boolean;
};

type ProfessionalTypingMessageProps = {
  text?: string;
  segments?: TypingSegment[];
  thinking?: boolean;
  speedMs?: number;
  className?: string;
  badge?: string;
};

export function ProfessionalTypingMessage({
  text,
  segments,
  thinking = false,
  speedMs = 18,
  className = "",
  badge,
}: ProfessionalTypingMessageProps) {
  const normalizedSegments = useMemo<TypingSegment[]>(() => {
    if (segments?.length) return segments;
    return [{ text: text || "" }];
  }, [segments, text]);

  const fullText = useMemo(
    () => normalizedSegments.map((segment) => segment.text).join(""),
    [normalizedSegments],
  );
  const rangedSegments = useMemo(() => {
    return normalizedSegments.map((segment, index) => ({
      ...segment,
      start: normalizedSegments
        .slice(0, index)
        .reduce((total, current) => total + current.text.length, 0),
    }));
  }, [normalizedSegments]);
  const [visible, setVisible] = useState(0);

  useEffect(() => {
    const resetTimer = window.setTimeout(() => setVisible(0), 0);

    if (thinking) {
      return () => window.clearTimeout(resetTimer);
    }

    let cancelled = false;
    let index = 0;

    function step() {
      if (cancelled) return;
      index += 1;
      setVisible(index);

      if (index < fullText.length) {
        const char = fullText[index - 1] || "";
        const pause = /[.,!?]/.test(char) ? speedMs * 8 : speedMs;
        window.setTimeout(step, pause);
      }
    }

    const timer = window.setTimeout(step, 160);
    return () => {
      cancelled = true;
      window.clearTimeout(resetTimer);
      window.clearTimeout(timer);
    };
  }, [fullText, thinking, speedMs]);

  if (thinking) {
    return (
      <div className={["lmn-professional-typing is-thinking", className].filter(Boolean).join(" ")}>
        {badge ? <span className="lmn-typing-badge">{badge}</span> : null}
        <span className="lmn-thinking-dot" />
        <span className="lmn-thinking-dot" />
        <span className="lmn-thinking-dot" />
        <strong>Pensando</strong>
      </div>
    );
  }

  return (
    <p className={["lmn-professional-typing", className].filter(Boolean).join(" ")}>
      {badge ? <span className="lmn-typing-badge">{badge}</span> : null}
      {rangedSegments.map((segment, index) => {
        const start = segment.start;
        const localVisible = Math.max(0, Math.min(segment.text.length, visible - start));
        if (localVisible <= 0) return null;

        return (
          <span key={`${segment.text}-${index}`} className={segment.highlight ? "lmn-typing-highlight" : undefined}>
            {segment.text.slice(0, localVisible)}
          </span>
        );
      })}
      <span className="lmn-typing-cursor" aria-hidden="true" />
    </p>
  );
}
