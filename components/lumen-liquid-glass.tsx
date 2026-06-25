"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { WEBP_DISPLACEMENT_MAP } from "@/components/apple-tahoe-liquid-glass-button";

type LumenLiquidGlassVariant = "panel" | "surface" | "header" | "button";

type GlassPreset = {
  radius: string;
  backgroundColor: string;
  borderColor: string;
  blur: string;
  saturate: string;
  displacement: string;
  shadow: string;
};

type LumenLiquidGlassProps = React.HTMLAttributes<HTMLDivElement> & {
  children: React.ReactNode;
  variant?: Exclude<LumenLiquidGlassVariant, "button">;
  contentClassName?: string;
  refract?: boolean;
};

type LumenLiquidButtonProps = React.HTMLAttributes<HTMLSpanElement> & {
  children: React.ReactNode;
  contentClassName?: string;
  refract?: boolean;
};

const presets = {
  panel: {
    radius: "rounded-[18px]",
    backgroundColor: "rgba(5, 7, 12, 0.22)",
    borderColor: "rgba(255,255,255,.088)",
    blur: "7px",
    saturate: "142%",
    displacement: "0.30",
    shadow: `
      0 22px 58px rgba(0,0,0,.36),
      inset 0 0 0 1px rgba(255,255,255,.045),
      inset 1.8px 3px 0px -2px rgba(255,255,255,.72),
      inset -2px -2px 0px -2px rgba(255,255,255,.42),
      inset -3px -8px 1px -6px rgba(255,255,255,.20),
      inset -0.3px -1px 4px 0px rgba(0,0,0,.28),
      inset -1.5px 2.5px 0px -2px rgba(0,0,0,.24),
      inset 0px 3px 4px -2px rgba(0,0,0,.22),
      inset 2px -6.5px 1px -4px rgba(0,0,0,.18)
    `,
  },
  surface: {
    radius: "rounded-[14px]",
    backgroundColor: "rgba(5, 7, 12, 0.19)",
    borderColor: "rgba(255,255,255,.074)",
    blur: "6px",
    saturate: "138%",
    displacement: "0.24",
    shadow: `
      0 14px 34px rgba(0,0,0,.28),
      inset 0 0 0 1px rgba(255,255,255,.038),
      inset 1.6px 2.6px 0px -2px rgba(255,255,255,.54),
      inset -2px -2px 0px -2px rgba(255,255,255,.28),
      inset -0.3px -1px 4px 0px rgba(0,0,0,.24),
      inset 0px 3px 4px -2px rgba(0,0,0,.20)
    `,
  },
  header: {
    radius: "rounded-none",
    backgroundColor: "rgba(5, 7, 12, 0.18)",
    borderColor: "rgba(255,255,255,.060)",
    blur: "5px",
    saturate: "132%",
    displacement: "0.20",
    shadow: `
      inset 0 1px 0 rgba(255,255,255,.070),
      inset 0 -1px 0 rgba(0,0,0,.30)
    `,
  },
  button: {
    radius: "rounded-[10px]",
    backgroundColor: "rgba(255, 255, 255, 0.030)",
    borderColor: "rgba(255,255,255,.090)",
    blur: "8px",
    saturate: "148%",
    displacement: "0.34",
    shadow: `
      0 10px 26px rgba(0,0,0,.22),
      inset 0 0 0 1px rgba(255,255,255,.060),
      inset 1.8px 3px 0px -2px rgba(255,255,255,.74),
      inset -2px -2px 0px -2px rgba(255,255,255,.40),
      inset -0.3px -1px 4px 0px rgba(0,0,0,.26),
      inset 0 -8px 14px -12px rgba(0,0,0,.70)
    `,
  },
} satisfies Record<LumenLiquidGlassVariant, GlassPreset>;

function LiquidGlassLayers({
  preset,
  refract = true,
}: {
  preset: GlassPreset;
  refract?: boolean;
}) {
  const reactId = React.useId().replace(/:/g, "");
  const filterId = `lumen-liquid-glass-${reactId}`;

  return (
    <>
      <svg
        aria-hidden="true"
        className="pointer-events-none absolute h-0 w-0 overflow-hidden"
      >
        <filter id={filterId} primitiveUnits="objectBoundingBox">
          <feImage
            result="map"
            width="100%"
            height="100%"
            x="0"
            y="0"
            href={WEBP_DISPLACEMENT_MAP}
            preserveAspectRatio="none"
          />

          <feGaussianBlur in="SourceGraphic" stdDeviation="0.01" result="blur" />

          <feDisplacementMap
            in="blur"
            in2="map"
            scale={preset.displacement}
            xChannelSelector="R"
            yChannelSelector="G"
          />
        </filter>
      </svg>

      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 z-0 rounded-[inherit]"
        style={{
          backgroundColor: preset.backgroundColor,
          backdropFilter: refract
            ? `blur(${preset.blur}) url(#${filterId}) saturate(${preset.saturate})`
            : `blur(${preset.blur}) saturate(${preset.saturate})`,
          WebkitBackdropFilter: `blur(${preset.blur}) saturate(${preset.saturate})`,
        }}
      />

      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 z-[1] rounded-[inherit]"
        style={{
          background: `
            radial-gradient(circle at 14% 0%, rgba(var(--lmn-accent-rgb,0,229,255), .090), transparent 28%),
            radial-gradient(circle at 88% 0%, rgba(var(--lmn-accent-2-rgb,27,67,255), .065), transparent 31%),
            linear-gradient(180deg, rgba(255,255,255,.064), rgba(255,255,255,.012) 36%, rgba(0,0,0,.030))
          `,
          mixBlendMode: "screen",
          opacity: 0.9,
        }}
      />

      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-5 top-0 z-[2] h-px"
        style={{
          background:
            "linear-gradient(90deg, transparent, rgba(var(--lmn-accent-rgb,0,229,255), .52), rgba(var(--lmn-accent-2-rgb,27,67,255), .36), transparent)",
        }}
      />

      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-y-0 left-0 z-[2] w-px"
        style={{
          background:
            "linear-gradient(180deg, transparent, rgba(var(--lmn-accent-rgb,0,229,255), .26), rgba(var(--lmn-accent-2-rgb,27,67,255), .14), transparent)",
        }}
      />
    </>
  );
}

export default function LumenLiquidGlass({
  children,
  className,
  contentClassName,
  variant = "panel",
  refract = true,
  style,
  ...props
}: LumenLiquidGlassProps) {
  const preset = presets[variant];

  return (
    <div
      className={cn(
        "relative isolate overflow-hidden border text-white",
        preset.radius,
        className
      )}
      style={{
        borderColor: preset.borderColor,
        boxShadow: preset.shadow,
        ...style,
      }}
      {...props}
    >
      <LiquidGlassLayers preset={preset} refract={refract} />

      <div className={cn("relative z-10", contentClassName)}>{children}</div>
    </div>
  );
}

export function LumenLiquidButton({
  children,
  className,
  contentClassName,
  refract = true,
  style,
  ...props
}: LumenLiquidButtonProps) {
  const preset = presets.button;

  return (
    <span
      className={cn(
        "relative isolate inline-flex h-10 items-center justify-center overflow-hidden border px-3 text-xs font-semibold text-white transition duration-150 hover:scale-[1.015] active:scale-[.985]",
        preset.radius,
        className
      )}
      style={{
        borderColor: preset.borderColor,
        boxShadow: preset.shadow,
        ...style,
      }}
      {...props}
    >
      <LiquidGlassLayers preset={preset} refract={refract} />

      <span
        className={cn(
          "relative z-10 flex items-center justify-center gap-2",
          contentClassName
        )}
      >
        {children}
      </span>
    </span>
  );
}
