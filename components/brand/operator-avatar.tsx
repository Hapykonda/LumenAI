import Image from "next/image";
import type { CSSProperties } from "react";
import {
  getOperator,
  operatorAsset,
  type OperatorId,
  type OperatorMood,
} from "@/lib/operators/catalog";
import styles from "./operator-avatar.module.css";

export function OperatorAvatar({
  operator = "pulse",
  mood = "welcome",
  size = 64,
  className,
  label,
  priority = false,
}: {
  operator?: OperatorId | string | null;
  mood?: OperatorMood;
  size?: number;
  className?: string;
  label?: string;
  priority?: boolean;
}) {
  const current = getOperator(operator);

  return (
    <span
      className={[styles.avatar, className].filter(Boolean).join(" ")}
      style={{ width: size, height: size, "--operator-accent": current.accent } as CSSProperties}
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      data-mood={mood}
    >
      <Image
        src={operatorAsset(current.id, mood)}
        alt=""
        fill
        sizes={`${size}px`}
        className={styles.image}
        priority={priority}
      />
    </span>
  );
}
