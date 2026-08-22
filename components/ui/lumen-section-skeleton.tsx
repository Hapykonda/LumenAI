import { LumenCardSkeleton } from "@/components/ui/lumen-card-skeleton";

type LumenSectionSkeletonProps = {
  title?: string;
  rows?: number;
};

export function LumenSectionSkeleton({
  title = "Cargando centro operativo",
  rows = 4,
}: LumenSectionSkeletonProps) {
  return (
    <section className="lmn-section-skeleton" aria-label={title} aria-busy="true">
      <div className="lmn-section-skeleton-head" aria-hidden="true">
        <span />
        <strong>{title}</strong>
        <i />
      </div>
      <div className="lmn-section-skeleton-grid">
        {Array.from({ length: rows }).map((_, index) => (
          <LumenCardSkeleton key={index} compact={index > 1} />
        ))}
      </div>
    </section>
  );
}
