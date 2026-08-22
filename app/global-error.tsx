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
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          background: "#050607",
          color: "#F5F7FA",
          fontFamily:
            "Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif",
        }}
      >
        <main
          style={{
            minHeight: "100vh",
            display: "grid",
            placeItems: "center",
            padding: 24,
            background: "linear-gradient(180deg, #050608, #080A0F)",
          }}
        >
          <section
            role="alert"
            style={{
              width: "100%",
              maxWidth: 560,
              border: "1px solid rgba(255,255,255,.10)",
              borderRadius: 8,
              background: "#0C0F15",
              boxShadow: "0 24px 70px rgba(0,0,0,.36)",
              padding: 28,
            }}
          >
            <div
              style={{
                display: "inline-flex",
                borderRadius: 6,
                border: "1px solid rgba(94,235,255,.24)",
                background: "rgba(94,235,255,.07)",
                padding: "7px 11px",
                fontSize: 11,
                fontWeight: 900,
                letterSpacing: 0,
                textTransform: "uppercase",
                color: "#5EEBFF",
              }}
            >
              LumenAI
            </div>
            <h1 style={{ margin: "18px 0 0", fontSize: 28, lineHeight: 1.05 }}>
              No pudimos completar esta acción
            </h1>
            <p style={{ marginTop: 12, color: "rgba(245,247,250,.68)", lineHeight: 1.7 }}>
              Intenta nuevamente. Si el problema continúa, revisa la
              configuración o vuelve a abrir el panel.
            </p>
            {error.digest ? (
              <details style={{ marginTop: 14, color: "#A8B0BE", fontSize: 12 }}>
                <summary style={{ cursor: "pointer" }}>Detalles técnicos</summary>
                <code style={{ display: "block", marginTop: 8 }}>{error.digest}</code>
              </details>
            ) : null}
            <button
              onClick={() => reset()}
              style={{
                marginTop: 20,
                height: 44,
                borderRadius: 8,
                border: "1px solid rgba(94,235,255,.42)",
                background: "#5EEBFF",
                color: "#041014",
                padding: "0 16px",
                fontWeight: 900,
                cursor: "pointer",
              }}
            >
              Reintentar
            </button>
          </section>
        </main>
      </body>
    </html>
  );
}
