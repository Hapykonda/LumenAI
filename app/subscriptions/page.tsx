import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  BarChart3,
  BrainCircuit,
  Check,
  Globe2,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { LumenLogo } from "@/components/brand/lumen-logo";
import { Reveal } from "@/components/marketing/reveal";
import styles from "./subscriptions.module.css";

export const metadata: Metadata = {
  title: "Planes",
  description: "Planes de LumenAI para atención, ventas e inteligencia operativa con IA.",
};

const plans = [
  {
    slug: "start",
    number: "01",
    label: "LumenAI Start",
    title: "Activa tu primera operación inteligente.",
    description: "La base para negocios que quieren atender mejor y convertir su conocimiento en respuestas útiles.",
    price: "$29.990",
    capacity: "1 negocio · 2 usuarios · 1 canal",
    features: ["Knowledge esencial", "Conversaciones incluidas con uso razonable", "Config AI guiado", "Lumen Eye esencial"],
  },
  {
    slug: "business",
    number: "02",
    label: "LumenAI Business",
    title: "Convierte cada señal en una decisión.",
    description: "Control, automatización y Pulse Radar para equipos que ya venden, atienden y necesitan avanzar más rápido.",
    price: "$69.990",
    capacity: "3 negocios · 10 usuarios · 4 canales",
    featured: true,
    features: ["Todo lo incluido en Start", "Pulse Radar y recomendaciones", "Lumen Eye avanzado", "Calibration y aprobaciones", "Research mensual"],
  },
  {
    slug: "scale",
    number: "03",
    label: "LumenAI Scale",
    title: "Orquesta procesos e integraciones reales.",
    description: "Capacidad ampliada, controles avanzados y acompañamiento para operaciones que no pueden detenerse.",
    price: "$149.990",
    capacity: "Negocios y usuarios ampliados · omnicanal",
    features: ["Todo lo incluido en Business", "Research continuo", "Mayor autonomía gobernada", "Historial ampliado", "Soporte de implementación"],
  },
];

const foundations = [
  { icon: ShieldCheck, title: "Contexto protegido", copy: "Autenticación, aislamiento por negocio y controles de acceso desde la arquitectura." },
  { icon: BrainCircuit, title: "IA gobernable", copy: "Knowledge, tono, reglas y límites configurables. Tu operación nunca depende de una caja negra." },
  { icon: BarChart3, title: "Evidencia visible", copy: "Historial, estados, métricas y trazabilidad para entender por qué ocurre cada resultado." },
];

export default function SubscriptionsPage() {
  return (
    <main className={styles.shell}>
      <nav className={styles.nav} aria-label="Navegación de planes">
        <Link href="/" aria-label="Volver a LumenAI">
          <LumenLogo label="LumenAI" subline="Intelligence OS" priority />
        </Link>
        <div className={styles.navCenter} aria-hidden="true">
          <span>Planes</span><i /> <span>CLP</span><i /> <span>Acceso inmediato</span>
        </div>
        <div className={styles.navActions}>
          <Link className={styles.link} href="/"><ArrowLeft size={14} /> Inicio</Link>
          <Link className={styles.primary} href="/login">Entrar <ArrowRight size={14} /></Link>
        </div>
      </nav>

      <section className={styles.hero}>
        <Reveal className={styles.heroCopy}>
          <div className={styles.kicker}><Sparkles size={13} /> Una operación que crece contigo</div>
          <h1>Empieza claro.<span>Escala sin perder el control.</span></h1>
          <p>Un sistema completo de atención, conocimiento e inteligencia operativa. Elige la capacidad que necesitas hoy y conserva una ruta limpia para mañana.</p>
          <div className={styles.heroActions}>
            <a href="#planes">Comparar planes <ArrowRight size={15} /></a>
            <span><ShieldCheck size={14} /> Sin cobros antes de confirmar</span>
          </div>
        </Reveal>

        <Reveal className={styles.heroVisual} delay={120}>
          <div className={styles.posterFrame}>
            <Image src="/brand/editorial/cobalt-folds.png" alt="Identidad editorial de LumenAI" fill sizes="(max-width: 860px) 92vw, 430px" priority />
            <div className={styles.posterOverlay}><span>Intelligence / operating system</span><strong>LumenAI</strong></div>
          </div>
          <div className={styles.heroTicket}>
            <span>LumenAI</span><strong>Una misma inteligencia</strong><small>Web · Widget · Pulse Radar</small>
          </div>
        </Reveal>
      </section>

      <div className={styles.marquee} aria-hidden="true">
        <div>Atención <i /> Conocimiento <i /> Ventas <i /> Radar <i /> Automatización <i /> Evidencia <i /> Atención <i /> Conocimiento <i /> Ventas</div>
      </div>

      <section className={styles.pricingSection} id="planes" aria-label="Planes disponibles">
        <Reveal className={styles.sectionHeading}>
          <div><span className={styles.kicker}>03 membresías · una sola inteligencia</span><h2>Capacidad para cada etapa.</h2></div>
          <p>Todos los planes comparten la misma identidad, seguridad y experiencia. Cambia la profundidad operativa, no la calidad del producto.</p>
        </Reveal>

        <div className={styles.plans}>
          {plans.map((plan, index) => (
            <Reveal className={`${styles.plan} ${plan.featured ? styles.featured : ""}`} delay={index * 80} key={plan.slug}>
              <header className={styles.planHeader}>
                <span className={styles.planNumber}>{plan.number}</span>
                <div><span className={styles.planName}>{plan.label}</span>{plan.featured ? <span className={styles.badge}>Recomendado</span> : null}</div>
              </header>
              <h3>{plan.title}</h3>
              <p className={styles.planCopy}>{plan.description}</p>
              <div className={styles.price}>{plan.price}<small>CLP / mes + IVA</small></div>
              <div className={styles.capacity}><Globe2 size={14} /> {plan.capacity}</div>
              <div className={styles.features}>
                {plan.features.map((feature) => <div className={styles.feature} key={feature}><Check size={14} /> {feature}</div>)}
              </div>
              <Link className={styles.choose} href={`/login?plan=${plan.slug}`}>Elegir {plan.label} <ArrowRight size={15} /></Link>
            </Reveal>
          ))}
        </div>
        <div className={styles.note}><ShieldCheck size={14} /> Los límites, periodos de prueba y condiciones definitivas se mostrarán antes de confirmar cualquier cobro. La selección se conserva al crear tu cuenta.</div>
      </section>

      <section className={styles.compare}>
        <Reveal className={styles.compareIntro}>
          <div className={styles.kicker}>La base no se negocia</div><h2>Profesional desde el primer acceso.</h2>
          <p>Diseñamos LumenAI como infraestructura operativa, no como un conjunto de funciones desconectadas.</p>
        </Reveal>
        <div className={styles.compareGrid}>
          {foundations.map(({ icon: Icon, title, copy }, index) => (
            <Reveal className={styles.compareItem} delay={index * 90} key={title}>
              <span className={styles.foundationNumber}>0{index + 1}</span><Icon aria-hidden="true" /><strong>{title}</strong><p>{copy}</p>
            </Reveal>
          ))}
        </div>
      </section>

      <Reveal className={styles.finalCta}>
        <span className={styles.kicker}>Listo cuando tú lo estés</span><h2>Tu siguiente etapa ya tiene sistema.</h2>
        <Link href="/login?plan=business">Crear mi espacio <ArrowRight size={18} /></Link>
      </Reveal>
    </main>
  );
}
