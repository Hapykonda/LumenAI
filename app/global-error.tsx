"use client";

export default function GlobalError({
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
            background:
              "radial-gradient(760px 480px at 86% 8%, rgba(215,255,47,.10), transparent 58%), #050607",
          }}
        >
          <section
            style={{
              width: "100%",
              maxWidth: 560,
              border: "1px solid rgba(255,255,255,.10)",
              borderRadius: 22,
              background: "#101217",
              boxShadow: "0 24px 70px rgba(0,0,0,.36)",
              padding: 28,
            }}
          >
            <div
              style={{
                display: "inline-flex",
                borderRadius: 999,
                border: "1px solid rgba(215,255,47,.22)",
                background: "rgba(215,255,47,.08)",
                padding: "7px 11px",
                fontSize: 11,
                fontWeight: 900,
                letterSpacing: ".14em",
                textTransform: "uppercase",
                color: "#D7FF2F",
              }}
            >
              LumenAI
            </div>
            <h1 style={{ margin: "18px 0 0", fontSize: 28, lineHeight: 1.05 }}>
              No pudimos completar esta accion
            </h1>
            <p style={{ marginTop: 12, color: "rgba(245,247,250,.68)", lineHeight: 1.7 }}>
              Intenta nuevamente. Si el problema continua, revisa la
              configuracion o vuelve a abrir el panel.
            </p>
            <button
              onClick={() => reset()}
              style={{
                marginTop: 20,
                height: 44,
                borderRadius: 14,
                border: 0,
                background: "#D7FF2F",
                color: "#111318",
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
