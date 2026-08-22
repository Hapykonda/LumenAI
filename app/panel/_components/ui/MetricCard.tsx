import type { ReactNode } from "react";
import { ObsidianMetric } from "./ObsidianPrimitives";

type MetricCardProps = {
  label: string;
  value: ReactNode;
  detail?: string;
  icon?: ReactNode;
  tone?: "default" | "success" | "warning" | "danger" | "preview";
};

export function MetricCard(props: MetricCardProps) {
  return <ObsidianMetric {...props} />;
}
