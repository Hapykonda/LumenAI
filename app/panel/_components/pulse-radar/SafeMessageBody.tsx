import type { RadarEmphasis } from "@/lib/pulse-radar/types";
import styles from "./pulse-radar-widget.module.css";

type Segment = {
  start: number;
  end: number;
  emphasis: RadarEmphasis;
};

function validSegments(body: string, emphasis: RadarEmphasis[]) {
  const segments: Segment[] = [];

  for (const item of emphasis.slice(0, 3)) {
    if (!item.text || item.text.length > 64) continue;
    const start = body.indexOf(item.text);
    if (start < 0) continue;
    const end = start + item.text.length;
    if (segments.some((segment) => start < segment.end && end > segment.start)) continue;
    segments.push({ start, end, emphasis: item });
  }

  return segments.sort((a, b) => a.start - b.start);
}

export function SafeMessageBody({
  body,
  emphasis = [],
}: {
  body: string;
  emphasis?: RadarEmphasis[];
}) {
  const segments = validSegments(body, emphasis);
  if (!segments.length) return <p>{body}</p>;

  const content: React.ReactNode[] = [];
  let cursor = 0;

  segments.forEach((segment, index) => {
    if (segment.start > cursor) {
      content.push(body.slice(cursor, segment.start));
    }
    content.push(
      <mark
        key={`${segment.start}-${segment.end}-${index}`}
        className={styles.emphasis}
        data-kind={segment.emphasis.kind}
      >
        {body.slice(segment.start, segment.end)}
      </mark>,
    );
    cursor = segment.end;
  });

  if (cursor < body.length) content.push(body.slice(cursor));
  return <p>{content}</p>;
}
