"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function OnboardingClient({ email }: { email: string }) {
  const router = useRouter();
  const [businessName, setBusinessName] = useState("");
  const [industry, setIndustry] = useState("");
  const [tone, setTone] = useState("Profesional y humano");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function submit() {
    setErr(null);
    if (!businessName.trim()) return setErr("Escribe el nombre del negocio.");

    try {
      setLoading(true);
      const res = await fetch("/api/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          businessName: businessName.trim(),
          industry: industry.trim(),
          tone: tone.trim(),
        }),
      });

      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(j?.error ?? "No se pudo crear el negocio.");

      router.replace("/panel");
    } catch (e: any) {
      setErr(e?.message ?? "Error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ padding: 24, maxWidth: 560, margin: "0 auto", color: "white" }}>
      <h1 style={{ fontSize: 22, fontWeight: 800 }}>Onboarding</h1>
      <p style={{ opacity: 0.75, marginTop: 6 }}>
        Estás logeado como: <b>{email || "—"}</b>
      </p>

      <div style={{ marginTop: 16, display: "grid", gap: 12 }}>
        <label>
          <div style={{ fontWeight: 700, marginBottom: 6 }}>Nombre del negocio</div>
          <input
            value={businessName}
            onChange={(e) => setBusinessName(e.target.value)}
            style={input()}
            placeholder="Ej: LumenAI Studio"
          />
        </label>

        <label>
          <div style={{ fontWeight: 700, marginBottom: 6 }}>Rubro (opcional)</div>
          <input
            value={industry}
            onChange={(e) => setIndustry(e.target.value)}
            style={input()}
            placeholder="Ej: Servicios legales, ecommerce…"
          />
        </label>

        <label>
          <div style={{ fontWeight: 700, marginBottom: 6 }}>Tono del asistente</div>
          <input
            value={tone}
            onChange={(e) => setTone(e.target.value)}
            style={input()}
          />
        </label>

        {err ? (
          <div style={{ color: "#ff9090", fontWeight: 700 }}>{err}</div>
        ) : null}

        <button
          onClick={submit}
          disabled={loading}
          style={{
            padding: "12px 14px",
            borderRadius: 12,
            border: "1px solid rgba(255,255,255,0.16)",
            background: "rgba(120,160,255,0.25)",
            color: "white",
            fontWeight: 800,
            cursor: "pointer",
          }}
        >
          {loading ? "Creando…" : "Crear negocio y entrar al panel"}
        </button>
      </div>
    </div>
  );
}

function input(): React.CSSProperties {
  return {
    width: "100%",
    padding: "12px 12px",
    borderRadius: 12,
    border: "1px solid rgba(255,255,255,0.14)",
    background: "rgba(0,0,0,0.25)",
    color: "white",
    outline: "none",
  };
}
