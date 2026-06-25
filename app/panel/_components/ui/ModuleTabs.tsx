"use client";

import { cn } from "@/lib/utils";

const accentA = "var(--lmn-accent-rgb, 0,229,255)";
const accentB = "var(--lmn-accent-2-rgb, 27,67,255)";

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
        "lmn-module-tabs flex gap-2 overflow-x-auto border p-1.5",
        className
      )}
      style={{
        borderColor: "rgba(255,255,255,.050)",
        background:
          "linear-gradient(180deg, rgba(255,255,255,.018), rgba(255,255,255,.004)), rgba(1,3,8,.44)",
        boxShadow:
          "0 10px 22px rgba(0,0,0,.16), inset 0 1px 0 rgba(255,255,255,.026)",
        contain: "layout paint",
      }}
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
              active ? "text-white" : "text-white/58 hover:text-white/84"
            )}
            style={
              active
                ? {
                    borderColor: `rgba(${accentA}, .22)`,
                    background: `linear-gradient(135deg, rgba(${accentA}, .13), rgba(${accentB}, .075)), rgba(255,255,255,.012)`,
                    boxShadow:
                      "0 8px 16px rgba(0,0,0,.16), inset 0 1px 0 rgba(255,255,255,.034)",
                  }
                : {
                    borderColor: "rgba(255,255,255,.034)",
                    background: "rgba(255,255,255,.006)",
                  }
            }
          >
            <span className="relative z-[1] block text-xs font-semibold">
              {item.label}
            </span>

            {item.description ? (
              <span className="relative z-[1] mt-0.5 hidden text-[11px] text-white/38 md:block">
                {item.description}
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
