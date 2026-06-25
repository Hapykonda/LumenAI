"use client";

import { Search, SlidersHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";

type SearchComponentProps = {
  placeholder?: string;
  value?: string;
  onChange?: (value: string) => void;
  className?: string;
};

export default function SearchComponent({
  placeholder = "Buscar...",
  value,
  onChange,
  className,
}: SearchComponentProps) {
  return (
    <label
      className={cn(
        "group relative flex h-12 w-full items-center overflow-hidden rounded-[10px] border px-3",
        "bg-[#080b12]/80 text-white transition duration-200",
        className
      )}
      style={{
        borderColor: "rgba(255,255,255,.12)",
        boxShadow:
          "0 10px 26px rgba(0,0,0,.22), inset 0 1px 0 rgba(255,255,255,.07)",
        backdropFilter: "blur(6px) saturate(1.08)",
        WebkitBackdropFilter: "blur(6px) saturate(1.08)",
      }}
    >
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-200 group-focus-within:opacity-100"
        style={{
          background:
            "linear-gradient(90deg, rgba(var(--lmn-accent-rgb,0,229,255),.14), rgba(var(--lmn-accent-2-rgb,27,67,255),.08), transparent 72%)",
        }}
      />

      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-3 top-0 h-px"
        style={{
          background:
            "linear-gradient(90deg, transparent, rgba(var(--lmn-accent-rgb,0,229,255),.55), rgba(var(--lmn-accent-2-rgb,27,67,255),.36), transparent)",
        }}
      />

      <Search className="relative z-10 mr-3 h-4 w-4 shrink-0 text-white/62 transition group-focus-within:text-white/86" />

      <input
        value={value}
        onChange={(event) => onChange?.(event.target.value)}
        placeholder={placeholder}
        className="relative z-10 h-full min-w-0 flex-1 bg-transparent text-sm font-semibold text-white outline-none placeholder:text-white/48"
      />

      <span className="relative z-10 ml-3 grid h-8 w-8 shrink-0 place-items-center rounded-[8px] border border-white/[0.10] bg-white/[0.045] text-white/60 transition group-focus-within:text-white/86">
        <SlidersHorizontal className="h-3.5 w-3.5" />
      </span>
    </label>
  );
}
