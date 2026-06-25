// app/panel/error.tsx
"use client";

import { useEffect } from "react";

export default function PanelError({ error, reset }: { error: Error; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main style={{ padding: 24 }}>
      <h1 style={{ fontSize: 22, marginBottom: 10 }}>❌ Error en /panel</h1>
      <pre style={{ whiteSpace: "pre-wrap" }}>{error.message}</pre>
      <button onClick={() => reset()} style={{ marginTop: 12, padding: "10px 14px", borderRadius: 10 }}>
        Reintentar
      </button>
    </main>
  );
}