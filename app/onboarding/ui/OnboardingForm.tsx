"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import styles from "../onboarding.module.css";

type FormState = {
  name: string;
  industry: string;
  tone: string;
  hours: string;
  whatsapp: string;
  email: string;
};

export default function OnboardingForm() {
  const router = useRouter();

  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const [form, setForm] = useState<FormState>({
    name: "",
    industry: "",
    tone: "Profesional y cercano",
    hours: "Lun a Vie 09:00–18:00",
    whatsapp: "",
    email: "",
  });

  const ready = useMemo(() => {
    return (
      !!form.name.trim() &&
      !!form.industry.trim() &&
      !!form.tone.trim() &&
      !!form.hours.trim()
    );
  }, [form]);

  const disabled = useMemo(() => loading || !ready, [loading, ready]);

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((p) => ({ ...p, [key]: value }));
  }

  async function submit() {
    setErr(null);
    setLoading(true);

    try {
      const { data: u, error: uErr } = await supabase.auth.getUser();
      if (uErr || !u?.user) throw new Error("Tu sesión expiró. Vuelve a iniciar sesión.");

      const { error: rpcErr } = await supabase.rpc("create_business_for_new_user", {
        business_name: form.name.trim(),
        business_industry: form.industry.trim(),
        tone_in: form.tone.trim(),
        hours_in: form.hours.trim(),
        whatsapp_in: form.whatsapp.trim(),
        email_in: form.email.trim(),
      });

      if (rpcErr) throw new Error(rpcErr.message);

      router.replace("/panel");
    } catch (error: unknown) {
      setErr(error instanceof Error ? error.message : "Error inesperado");
    } finally {
      setLoading(false);
    }
  }

  const previewName = form.name.trim() || "—";
  const previewIndustry = form.industry.trim() || "—";
  const previewTone = form.tone.trim() || "—";
  const previewHours = form.hours.trim() || "—";

  return (
    <main className={styles.page}>
      {/* ✅ Fondo premium con movimiento armónico (orbs + aurora + breath) */}
      <div className={styles.bg} aria-hidden="true">
        <div className={styles.bgCore} />
        <div className={styles.bgAurora} />

        {/* ✅ nuevas “luces vivas” con rutas envolventes */}
        <div className={styles.bgOrbA} />
        <div className={styles.bgOrbB} />
        <div className={styles.bgOrbC} />
        <div className={styles.bgPulse} />

        <div className={styles.bgBloom} />
        <div className={styles.bgGrid} />
        <div className={styles.bgVignette} />
        <div className={styles.bgNoise} />
      </div>

      <div className={styles.wrap}>
        <a className={styles.back} href="/panel">
          <span className={styles.backArrow}>‹</span> Volver
        </a>

        <section className={styles.shell}>
          <div className={styles.shellGlow} />
          <div className={styles.shellInner}>
            {/* LEFT: venta + preview */}
            <aside className={styles.leftCard}>
              <div className={styles.leftTop}>
                <div className={styles.brandRow}>
                  <div className={styles.logoPill}>
                    <span className={styles.logoLetter} aria-hidden="true">
                      L
                    </span>
                  </div>

                  <div className={styles.brandText}>
                    <div className={styles.stepPill}>
                      <span className={styles.stepDot} />
                      SETUP · 1/1
                    </div>

                    <h1 className={styles.h1}>Configura tu negocio</h1>

                    <p className={styles.sub}>
                      En 60 segundos, dejamos tu panel listo para que LumenAI responda con tu{" "}
                      <b>tono</b>, <b>horarios</b> y datos esenciales.
                    </p>

                    <p className={styles.microTrust}>
                      Editable después · Sin tarjeta · Setup rápido
                    </p>
                  </div>
                </div>

                <div className={styles.benefits}>
                  <Benefit title="Knowledge listo" desc="Publica FAQs, servicios y precios." />
                  <Benefit title="Widget instalable" desc="Atención al cliente en tu web." />
                  <Benefit title="Editable siempre" desc="Puedes cambiar estos datos cuando quieras." />
                </div>
              </div>

              <div className={styles.preview}>
                <div className={styles.previewHeader}>
                  <div className={styles.previewTitle}>Vista previa</div>
                  <span className={styles.previewBadge}>Identidad</span>
                </div>

                <div className={styles.previewRows}>
                  <PreviewRow label="Negocio" value={previewName} />
                  <PreviewRow label="Rubro" value={previewIndustry} />
                  <PreviewRow label="Tono" value={previewTone} />
                  <PreviewRow label="Horario" value={previewHours} />
                </div>

                <div className={styles.previewHint}>
                  Tip: completa esto una vez y LumenAI ya puede “hablar como tu negocio”.
                </div>
              </div>
            </aside>

            {/* RIGHT: formulario */}
            <section className={styles.rightCard} aria-busy={loading}>
              <div className={styles.rightHeader}>
                <div className={styles.kicker}>CONFIGURACIÓN</div>
                <div className={styles.rightTitle}>Datos del negocio</div>
                <div className={styles.rightSub}>
                  Completa lo esencial. Lo demás lo ajustas después.
                </div>
              </div>

              <div className={styles.form}>
                <Field
                  label="Nombre del negocio *"
                  value={form.name}
                  onChange={(v) => set("name", v)}
                  placeholder="Ej: Reweb"
                />
                <Field
                  label="Rubro *"
                  value={form.industry}
                  onChange={(v) => set("industry", v)}
                  placeholder="Ej: Agencia web / Restaurante / Abogado"
                />
                <Field
                  label="Tono de atención *"
                  value={form.tone}
                  onChange={(v) => set("tone", v)}
                  placeholder="Ej: Profesional y cercano"
                />
                <Field
                  label="Horarios *"
                  value={form.hours}
                  onChange={(v) => set("hours", v)}
                  placeholder="Ej: Lun a Vie 09:00–18:00"
                />

                <div className={styles.twoCols}>
                  <Field
                    label="WhatsApp (opcional)"
                    value={form.whatsapp}
                    onChange={(v) => set("whatsapp", v)}
                    placeholder="Ej: +56 9 1234 5678"
                  />
                  <Field
                    label="Email del negocio (opcional)"
                    value={form.email}
                    onChange={(v) => set("email", v)}
                    placeholder="Ej: contacto@minegocio.com"
                  />
                </div>

                {err && (
                  <div className={styles.alert} role="alert">
                    <div className={styles.alertIcon}>!</div>
                    <div className={styles.alertText}>{err}</div>
                  </div>
                )}

                <div className={styles.ctaBlock}>
                  <button
                    className={`${styles.primaryBtn} ${
                      ready ? styles.primaryBtnReady : ""
                    }`}
                    onClick={submit}
                    disabled={disabled}
                  >
                    <span className={styles.btnShine} />
                    <span className={styles.btnText}>
                      {loading ? "Creando..." : "Crear negocio y entrar"}
                    </span>
                  </button>

                  <div className={styles.ctaMeta}>
                    {ready ? (
                      <span className={styles.readyLine}>✅ Listo para crear</span>
                    ) : (
                      <span className={styles.readyLineMuted}>
                        Completa los campos obligatorios (*)
                      </span>
                    )}
                    <span className={styles.dotSep}>·</span>
                    <span className={styles.trustLine}>Editable después</span>
                    <span className={styles.dotSep}>·</span>
                    <span className={styles.trustLine}>1 minuto</span>
                  </div>

                  <p className={styles.footerNote}>
                    Al crear tu negocio, LumenAI configura automáticamente tu panel.
                  </p>
                </div>
              </div>
            </section>
          </div>
        </section>
      </div>
    </main>
  );
}

function Benefit({ title, desc }: { title: string; desc: string }) {
  return (
    <div className={styles.benefit}>
      <span className={styles.benefitIcon} aria-hidden="true" />
      <div className={styles.benefitText}>
        <div className={styles.benefitTitle}>{title}</div>
        <div className={styles.benefitDesc}>{desc}</div>
      </div>
    </div>
  );
}

function PreviewRow({ label, value }: { label: string; value: string }) {
  return (
    <div className={styles.previewRow}>
      <div className={styles.previewLabel}>{label}</div>
      <div className={styles.previewValue}>{value}</div>
    </div>
  );
}

function Field(props: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <label className={styles.field}>
      <span className={styles.label}>{props.label}</span>
      <input
        className={styles.input}
        value={props.value}
        onChange={(e) => props.onChange(e.target.value)}
        placeholder={props.placeholder}
        autoComplete="off"
      />
    </label>
  );
}
