import type { ReactNode } from "react";

export function DataChip({
  children,
  tone = "default",
}: {
  children: ReactNode;
  tone?: "default" | "real" | "preview" | "demo" | "warning";
}) {
  return (
    <span className="lmn-data-chip" data-tone={tone}>
      {children}
    </span>
  );
}
