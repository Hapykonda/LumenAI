import type { CSSProperties, ReactNode } from "react";
import { cn } from "@/lib/utils";

const accentA = "var(--lmn-accent-rgb, 0,229,255)";
const accentB = "var(--lmn-accent-2-rgb, 27,67,255)";

type GlassCardProps = {
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
  variant?: "base" | "soft" | "strong";
  accent?: boolean;
  hover?: boolean;
};

export function GlassCard({
  children,
  className,
  style,
  variant = "base",
  accent = false,
  hover = false,
}: GlassCardProps) {
  const variantStyle: CSSProperties =
    variant === "strong"
      ? {
          borderColor: "var(--lmn-border-strong)",
          background:
            `radial-gradient(420px 240px at 88% 102%, rgba(${accentA}, .12), transparent 66%), radial-gradient(340px 220px at 4% 0%, rgba(${accentB}, .08), transparent 62%), linear-gradient(180deg, rgba(255,255,255,.060), rgba(255,255,255,.014)), var(--lmn-surface)`,
          boxShadow: "var(--lmn-shadow-card), inset 0 1px 0 rgba(255,255,255,.055)",
        }
      : variant === "soft"
      ? {
          borderColor: "var(--lmn-border)",
          background:
            `radial-gradient(320px 190px at 94% 105%, rgba(${accentA}, .08), transparent 68%), radial-gradient(260px 160px at 6% 0%, rgba(${accentB}, .05), transparent 62%), linear-gradient(180deg, rgba(255,255,255,.040), rgba(255,255,255,.010)), var(--lmn-surface-2)`,
          boxShadow: "var(--lmn-shadow-soft), inset 0 1px 0 rgba(255,255,255,.040)",
        }
      : {
          borderColor: "var(--lmn-border)",
          background:
            `radial-gradient(380px 220px at 92% 104%, rgba(${accentA}, .095), transparent 66%), radial-gradient(300px 180px at 0% 0%, rgba(${accentB}, .060), transparent 64%), linear-gradient(180deg, rgba(255,255,255,.045), rgba(255,255,255,.010)), var(--lmn-surface)`,
          boxShadow: "var(--lmn-shadow-card), inset 0 1px 0 rgba(255,255,255,.045)",
        };

  return (
    <div
      className={cn(
        "lmn-matte-card relative overflow-hidden border",
        hover &&
          "transition duration-150 hover:border-white/18 hover:bg-white/[0.026]",
        className
      )}
      data-accent={accent ? "true" : "false"}
      data-hover={hover ? "true" : "false"}
      data-variant={variant}
      style={{
        ...variantStyle,
        backdropFilter: "none",
        WebkitBackdropFilter: "none",
        contain: "layout paint",
        borderRadius: "var(--lmn-radius-lg)",
        ...style,
      }}
    >
      {accent ? (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 top-0 h-[2px]"
          style={{
            background: `linear-gradient(90deg, rgba(${accentA}, .78), rgba(${accentB}, .56), transparent 72%)`,
          }}
        />
      ) : null}

      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-70"
        style={{
          background: `
            radial-gradient(260px 150px at 100% 100%, rgba(${accentA}, .18), transparent 68%),
            radial-gradient(220px 140px at 0% 0%, rgba(${accentB}, .10), transparent 64%),
            linear-gradient(180deg, rgba(255,255,255,.010), transparent 34%)
          `,
          backgroundSize: "auto, auto, auto",
        }}
      />

      <div
        aria-hidden="true"
        className="pointer-events-none absolute bottom-0 left-0 top-0 w-px opacity-60"
        style={{
          background: accent
            ? `linear-gradient(180deg, transparent, rgba(${accentA}, .38), rgba(${accentB}, .16), transparent)`
            : "linear-gradient(180deg, transparent, rgba(255,255,255,.08), transparent)",
        }}
      />

      <div className="relative">{children}</div>
    </div>
  );
}
