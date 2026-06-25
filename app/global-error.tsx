// app/global-error.tsx
"use client";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="es">
      <body style={{ background: "#0b0b10", color: "white", fontFamily: "system-ui", padding: 24 }}>
        <h1 style={{ margin: 0, fontSize: 22 }}>Ocurrió un error</h1>
        <p style={{ opacity: 0.8, marginTop: 8, maxWidth: 780 }}>
          {error?.message || "Error desconocido."}
        </p>
        <button
          onClick={() => reset()}
          style={{
            marginTop: 14,
            padding: "10px 14px",
            borderRadius: 12,
            border: "1px solid rgba(255,255,255,0.15)",
            background: "rgba(0,140,255,0.22)",
            color: "white",
            fontWeight: 800,
            cursor: "pointer",
          }}
        >
          Reintentar
        </button>
      </body>
    </html>
  );
}