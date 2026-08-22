type LumenCardSkeletonProps = {
  lines?: number;
  compact?: boolean;
};

export function LumenCardSkeleton({ lines = 3, compact = false }: LumenCardSkeletonProps) {
  return (
    <div className={compact ? "lmn-card-skeleton is-compact" : "lmn-card-skeleton"} aria-hidden="true">
      <span className="lmn-skeleton-icon" />
      <span className="lmn-skeleton-line is-wide" />
      {Array.from({ length: lines }).map((_, index) => (
        <span key={index} className={index === lines - 1 ? "lmn-skeleton-line is-short" : "lmn-skeleton-line"} />
      ))}
    </div>
  );
}
