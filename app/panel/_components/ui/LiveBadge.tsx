import { Activity } from "lucide-react";

export function LiveBadge({ label = "Live Sync" }: { label?: string }) {
  return (
    <span className="lmn-live-badge" aria-label={label}>
      <Activity className="h-3.5 w-3.5" aria-hidden="true" />
      {label}
    </span>
  );
}
