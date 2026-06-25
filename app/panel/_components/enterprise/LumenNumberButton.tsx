"use client";

import type { ReactNode } from "react";
import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

export function LumenNumberButton({
  count,
  children,
  className,
  onClick,
  disabled,
}: {
  count: number | string;
  children: ReactNode;
  className?: string;
  onClick?: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "lmn-liquid-button inline-flex h-11 items-center gap-3 rounded-[11px] border border-white/10 bg-transparent px-4 text-xs font-black text-white transition",
        disabled && "pointer-events-none opacity-50",
        className
      )}
    >
      <span className="grid h-6 min-w-6 place-items-center rounded-[8px] border border-white/12 bg-white/[0.12] text-[11px] text-white">
        {count}
      </span>
      {children}
      <ArrowRight className="h-3.5 w-3.5 text-white/60" />
    </button>
  );
}
