import type { PulseWidgetState } from "@/lib/pulse-radar/types";
import styles from "./pulse-radar-widget.module.css";

export function PulseRadarMark({
  state,
  size = 32,
  title,
}: {
  state: PulseWidgetState;
  size?: number;
  title?: string;
}) {
  return (
    <svg
      className={styles.mark}
      data-state={state}
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      role={title ? "img" : undefined}
      aria-hidden={title ? undefined : true}
      aria-label={title}
    >
      <path
        className={styles.markTrail}
        d="M7 36.5 25.4 18.1"
        pathLength="1"
      />
      <path
        className={styles.markPrimary}
        d="M15.2 38 30.4 22.8v9.4h9.2"
        pathLength="1"
      />
      <path
        className={styles.markStar}
        d="m32 5.4 2.3 6.3 6.3 2.3-6.3 2.3-2.3 6.3-2.3-6.3-6.3-2.3 6.3-2.3L32 5.4Z"
      />
      <circle className={styles.markNode} cx="7" cy="36.5" r="2" />
      <circle className={styles.markNode} cx="15.2" cy="38" r="2" />
    </svg>
  );
}
