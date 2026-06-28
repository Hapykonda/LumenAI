"use client";

import { useEffect } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";

export default function PanelError({
  error,
  reset,
}: {
  error: Error;
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="grid min-h-screen place-items-center bg-[var(--lmn-bg)] px-4 text-[var(--lmn-text)]">
      <section className="w-full max-w-xl rounded-[22px] border border-[var(--lmn-border)] bg-[var(--lmn-surface)] p-6 shadow-[var(--lmn-shadow-card)]">
        <div className="grid h-12 w-12 place-items-center rounded-[14px] border border-[var(--lmn-border)] bg-[color-mix(in_srgb,var(--lmn-warning)_12%,transparent)]">
          <AlertTriangle className="h-5 w-5 text-[var(--lmn-warning)]" />
        </div>
        <h1 className="mt-5 text-2xl font-black tracking-[-0.04em]">
          No pudimos cargar esta seccion
        </h1>
        <p className="mt-3 text-sm leading-6 text-[var(--lmn-text-soft)]">
          Intenta nuevamente. Si el problema continua, revisa la configuracion
          del proyecto o vuelve al panel principal.
        </p>
        <button
          type="button"
          onClick={() => reset()}
          className="mt-5 inline-flex h-11 items-center gap-2 rounded-[14px] bg-[var(--lmn-text)] px-4 text-sm font-black text-[var(--lmn-bg)]"
        >
          <RefreshCw className="h-4 w-4" />
          Reintentar
        </button>
      </section>
    </main>
  );
}
