import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Check, ShieldCheck } from "lucide-react";
import { LumenLogo } from "@/components/brand/lumen-logo";
import { Reveal } from "@/components/marketing/reveal";
import styles from "./subscriptions.module.css";

export const metadata: Metadata = {
  title: "Planes",
  description: "Planes de LumenAI para atención, ventas e inteligencia operativa con IA.",
};

const plans = [
  {
    slug: "inicio",
    label: "Inicio",
    title: "Para activar el primer canal inteligente",
    description: "La base para negocios que quieren atender mejor y centralizar su conocimiento.",
    price: "$29.990",
    features: ["1 negocio y 1 widget", "Knowledge esencial", "Conversaciones y leads", "Configuración IA guiada", "Métricas operativas básicas"],
  },
  {
    slug: "crecimiento",
    label: "Crecimiento",
    title: "Para convertir conversaciones en operación",
    description: "Más control, automatización y Pulse Radar para equipos que ya están creciendo.",
    price: "$69.990",
    featured: true,
    features: ["Todo lo incluido en Inicio", "Pulse Radar y recomendaciones", "Campañas y Growth", "Permisos y aprobaciones", "Calibración avanzada", "Soporte prioritario"],
  },
  {
    slug: "escala",
    label: "Escala",
    title: "Para empresas con procesos e integraciones",
    description: "Capacidad ampliada, controles avanzados y acompañamiento de implementación.",
    price: "$149.990",
    features: ["Todo lo incluido en Crecimiento", "Mayor capacidad operativa", "Integraciones empresariales", "Business Twin y Research", "Configuración asistida", "Seguimiento de implementación"],
  },
];

export default function SubscriptionsPage() {
  return (
    <main className={styles.shell}>
      <nav className={styles.nav} aria-label="Navegación de planes">
        <Link href="/" aria-label="Volver a LumenAI"><LumenLogo label="LumenAI" subline="Planes" priority /></Link>
        <div className={styles.navActions}>
          <Link className={styles.link} href="/"><ArrowLeft size={14} /> Volver</Link>
          <Link className={styles.primary} href="/login">Entrar <ArrowRight size={14} /></Link>
        </div>
      </nav>

      <Reveal className={styles.hero}>
        <div className={styles.kicker}>Suscripciones LumenAI</div>
        <h1>Elige cuánto quieres que tu sistema haga por ti.</h1>
        <p>Empieza con atención y conocimiento, añade inteligencia operativa cuando crezca el negocio y escala hacia integraciones y control avanzado.</p>
      </Reveal>

      <section className={styles.plans} aria-label="Planes disponibles">
        {plans.map((plan, index) => (
          <Reveal className={`${styles.plan} ${plan.featured ? styles.featured : ""}`} delay={index * 80} key={plan.slug}>
            {plan.featured ? <span className={styles.badge}>Recomendado</span> : null}
            <div className={styles.planName}>{plan.label}</div>
            <h2>{plan.title}</h2>
            <p className={styles.planCopy}>{plan.description}</p>
            <div className={styles.price}>{plan.price}<small>CLP / mes + IVA</small></div>
            <div className={styles.features}>
              {plan.features.map((feature) => <div className={styles.feature} key={feature}><Check size={15} /> {feature}</div>)}
            </div>
            <Link className={styles.choose} href={`/login?plan=${plan.slug}`}>Elegir {plan.label} <ArrowRight size={14} /></Link>
          </Reveal>
        ))}
      </section>

      <div className={styles.note}><ShieldCheck size={13} /> Los límites, periodos de prueba y condiciones definitivas se mostrarán antes de confirmar cualquier cobro. La selección del plan se conserva al crear tu cuenta.</div>

      <section className={styles.compare}>
        <Reveal><div className={styles.kicker}>Una base responsable</div><h2>Lo importante está incluido desde el primer plan.</h2></Reveal>
        <div className={styles.compareGrid}>
          <Reveal className={styles.compareItem}><strong>Seguridad por negocio</strong><p>Autenticación, contexto de negocio y aislamiento de datos desde la arquitectura.</p></Reveal>
          <Reveal className={styles.compareItem}><strong>IA configurable</strong><p>Knowledge, tono, reglas y límites controlados por el usuario.</p></Reveal>
          <Reveal className={styles.compareItem}><strong>Salida clara</strong><p>Exportación, historial, estados y trazabilidad para no depender de una caja negra.</p></Reveal>
        </div>
      </section>
    </main>
  );
}
