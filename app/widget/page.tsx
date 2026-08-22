import "./widget.css";
import WidgetClient from "./WidgetClient";

type PageProps = {
  searchParams?:
    | Promise<{
        key?: string;
        publicKey?: string;
      }>
    | {
        key?: string;
        publicKey?: string;
      };
};

export default async function WidgetPage({ searchParams }: PageProps) {
  const params = await Promise.resolve(searchParams ?? {});
  const publicKey = String(params.key || params.publicKey || "").trim();

  if (!publicKey) {
    return <MissingKeyScreen />;
  }

  return <WidgetClient publicKey={publicKey} />;
}

function MissingKeyScreen() {
  return (
    <main
      style={{
        minHeight: "100dvh",
        width: "100%",
        display: "grid",
        placeItems: "center",
        background:
          "radial-gradient(760px 420px at 100% 0%, rgba(0,229,255,.10), transparent 64%), radial-gradient(680px 420px at 0% 100%, rgba(27,67,255,.075), transparent 68%), #05070B",
        color: "#F5F7FA",
        fontFamily:
          "Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif",
        padding: 24,
      }}
    >
      <section
        style={{
          width: "min(620px, 100%)",
          border: "1px solid rgba(255,255,255,.08)",
          borderRadius: 24,
          background:
            "linear-gradient(180deg, rgba(255,255,255,.048), rgba(255,255,255,.014)), rgba(8,10,15,.86)",
          boxShadow:
            "0 28px 90px rgba(0,0,0,.45), inset 0 1px 0 rgba(255,255,255,.06)",
          backdropFilter: "blur(18px)",
          WebkitBackdropFilter: "blur(18px)",
          padding: 28,
        }}
      >
        <div
          style={{
            width: 52,
            height: 52,
            borderRadius: 16,
            display: "grid",
            placeItems: "center",
            background: "linear-gradient(135deg, #00E5FF 0%, #008CFF 45%, #1B43FF 75%, #6C3BFF 100%)",
            boxShadow: "0 0 28px rgba(0,229,255,.16)",
            fontWeight: 900,
            marginBottom: 22,
          }}
        >
          L
        </div>

        <p
          style={{
            margin: 0,
            fontSize: 11,
            letterSpacing: 0,
            textTransform: "uppercase",
            color: "rgba(255,255,255,.42)",
            fontWeight: 800,
          }}
        >
          LumenAI Widget
        </p>

        <h1
          style={{
            margin: "10px 0 0",
            fontSize: "clamp(32px, 5vw, 48px)",
            lineHeight: ".96",
            letterSpacing: 0,
          }}
        >
          Falta la public key.
        </h1>

        <p
          style={{
            margin: "18px 0 0",
            color: "rgba(255,255,255,.58)",
            lineHeight: 1.7,
            fontSize: 15,
          }}
        >
          Para cargar el widget real, abre esta ruta usando la key pública del negocio.
        </p>

        <div
          style={{
            marginTop: 22,
            border: "1px solid rgba(255,255,255,.075)",
            borderRadius: 16,
            background: "rgba(0,0,0,.22)",
            padding: 14,
            color: "rgba(255,255,255,.76)",
            fontSize: 13,
            fontFamily:
              "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
            overflowX: "auto",
          }}
        >
          /widget?key=TU_PUBLIC_KEY
        </div>

        <p
          style={{
            margin: "18px 0 0",
            color: "rgba(255,255,255,.36)",
            fontSize: 13,
            lineHeight: 1.6,
          }}
        >
          Puedes obtenerla desde el modulo{" "}
          <strong style={{ color: "rgba(255,255,255,.68)" }}>
            Widget del panel
          </strong>
        </p>
      </section>
    </main>
  );
}
