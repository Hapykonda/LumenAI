"use client";

import { cn } from "@/lib/utils";

export type ModuleTabItem = {
  key: string;
  label: string;
  description?: string;
};

type ModuleTabsProps = {
  items: ModuleTabItem[];
  value: string;
  onChange(value: string): void;
  className?: string;
};

export function ModuleTabs({
  items,
  value,
  onChange,
  className,
}: ModuleTabsProps) {
  return (
    <div
      className={cn(
        "lmn-module-tabs flex gap-1 overflow-x-auto border p-1",
        className
      )}
      role="group"
      aria-label="Secciones del módulo"
    >
      {items.map((item) => {
        const active = item.key === value;

        return (
          <button
            key={item.key}
            type="button"
            onClick={() => onChange(item.key)}
            className={cn(
              "group relative min-h-10 shrink-0 overflow-hidden border px-3 text-left transition duration-150 active:translate-y-px",
              active ? "is-active" : ""
            )}
            aria-pressed={active}
          >
            <span className="relative z-[1] block text-xs font-semibold">
              {item.label}
            </span>

            {item.description ? (
              <span className="relative z-[1] mt-0.5 hidden text-[11px] md:block">
                {item.description}
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
