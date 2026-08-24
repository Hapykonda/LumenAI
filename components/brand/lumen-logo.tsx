import Image from "next/image";
import { cn } from "@/lib/utils";

type LumenLogoProps = {
  size?: "sm" | "md" | "lg";
  label?: string;
  subline?: string;
  compact?: boolean;
  animated?: boolean;
  priority?: boolean;
  className?: string;
};

const sizes = {
  sm: 30,
  md: 40,
  lg: 56,
} as const;

export function LumenLogo({
  size = "md",
  label = "LumenAI",
  subline,
  compact = false,
  animated = false,
  priority = false,
  className,
}: LumenLogoProps) {
  const pixels = sizes[size];

  return (
    <span
      className={cn("lmn-brand-lockup", animated && "is-animated", className)}
      data-size={size}
    >
      <span className="lmn-brand-mark lumenai-mark" aria-hidden="true">
        <Image
          src="/brand/lumenai-official-mark.png"
          alt=""
          width={pixels}
          height={pixels}
          sizes={`${pixels}px`}
          priority={priority}
          className="lmn-brand-mark-image"
        />
        {animated ? <span className="lmn-brand-star-pulse" /> : null}
      </span>

      {!compact ? (
        <span className="lmn-brand-copy">
          <strong>{label}</strong>
          {subline ? <small>{subline}</small> : null}
        </span>
      ) : (
        <span className="sr-only">{label}</span>
      )}
    </span>
  );
}
