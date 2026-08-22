"use client";

import { useEffect } from "react";
import { RefreshCw } from "lucide-react";
import { LumenButton } from "@/components/ui/lumen-button";
import { LumenSystemState } from "@/components/ui/lumen-system-state";

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
      <LumenSystemState
        state="error"
        className="w-full max-w-xl"
        title="No pudimos cargar esta sección"
        description="Intenta nuevamente. Si el problema continúa, revisa el estado del sistema."
        technical={(error as Error & { digest?: string }).digest || undefined}
        action={
          <LumenButton type="button" onClick={() => reset()} variant="secondary">
            <RefreshCw className="h-4 w-4" />
            Reintentar
          </LumenButton>
        }
      />
    </main>
  );
}
