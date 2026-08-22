import { LumenSectionSkeleton } from "@/components/ui/lumen-section-skeleton";
import { LumenLogo } from "@/components/brand/lumen-logo";

type LumenLoadingScreenProps = {
  title?: string;
  message?: string;
  compact?: boolean;
};

export function LumenLoadingScreen({
  title = "Preparando LumenAI",
  message = "Sincronizando senales del sistema.",
  compact = false,
}: LumenLoadingScreenProps) {
  return (
    <main className={compact ? "lmn-loading-screen is-compact" : "lmn-loading-screen"}>
      <section className="lmn-loading-card" aria-busy="true" aria-live="polite">
        <div className="lmn-loading-brand">
          <LumenLogo size="lg" compact animated />
        </div>
        <div>
          <p className="lmn-loading-eyebrow">LumenAI</p>
          <h1>{title}</h1>
          <p>{message}</p>
        </div>
        <div className="lmn-loading-bar" aria-hidden="true">
          <span />
        </div>
      </section>

      {!compact ? <LumenSectionSkeleton rows={3} /> : null}
    </main>
  );
}
