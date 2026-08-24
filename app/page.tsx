import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  BarChart3,
  Bot,
  BrainCircuit,
  Check,
  ChevronRight,
  Command,
  Gauge,
  MessageSquareText,
  Radar,
  ShieldCheck,
  Sparkles,
  UsersRound,
} from "lucide-react";
import { LumenLogo } from "@/components/brand/lumen-logo";
import { Reveal } from "@/components/marketing/reveal";
import styles from "./marketing.module.css";

const modules = [
  { icon: Radar, title: "Pulse Radar", copy: "Lee señales, explica cambios y prioriza la siguiente decisión con datos del negocio.", tag: "Inteligencia operativa", wide: true },
  { icon: Bot, title: "Widget", copy: "Un asistente instalable, adaptable a la marca y conectado al conocimiento real.", tag: "Atención 24/7" },
  { icon: BrainCircuit, title: "Knowledge", copy: "Servicios, precios, políticas, horarios y documentos convertidos en memoria utilizable.", tag: "Memoria empresarial" },
  { icon: Command, title: "Config IA", copy: "Conversa con LumenAI, revisa propuestas y publica cambios con trazabilidad.", tag: "Configuración guiada" },
  { icon: MessageSquareText, title: "Conversaciones", copy: "Inbox operativo con contexto, control humano y seguimiento de cada cliente.", tag: "Soporte y ventas", wide: true },
  { icon: UsersRound, title: "Leads", copy: "Detecta intención, captura contactos y transforma conversaciones en oportunidades.", tag: "Pipeline comercial" },
];

const flow = [
  ["01", "Escucha", "El widget recibe la conversación y consulta el contexto correcto."],
  ["02", "Comprende", "Knowledge y la calibración definen qué sabe y cómo responde."],
  ["03", "Prioriza", "Pulse Radar identifica señales, riesgo y oportunidad comercial."],
  ["04", "Actúa", "El equipo aprueba, responde, configura o ejecuta el siguiente paso."],
];

export default function Home() {
  return (
    <main className={styles.shell}>
      <header className={styles.navWrap}>
        <nav className={styles.nav} aria-label="Navegación principal">
          <Link href="/" aria-label="Inicio de LumenAI">
            <LumenLogo label="LumenAI" subline="Business Intelligence OS" priority />
          </Link>
          <div className={styles.navLinks}>
            <Link className={styles.navLink} href="#sistema">Sistema</Link>
            <Link className={styles.navLink} href="#pulse">Pulse</Link>
            <Link className={styles.navLink} href="#widget">Widget</Link>
            <Link className={styles.navLink} href="/subscriptions">Planes</Link>
          </div>
          <div className={styles.navActions}>
            <Link className={styles.ghostButton} href="/login">Entrar</Link>
            <Link className={styles.primaryButton} href="/login">Crear acceso <ArrowRight size={14} /></Link>
          </div>
        </nav>
      </header>

      <section className={styles.hero}>
        <div className={styles.heroGlow} aria-hidden="true" />
        <div className={styles.heroInner}>
          <Reveal>
            <div className={styles.eyebrow}><span className={styles.signal} /> Inteligencia para empresas que quieren avanzar</div>
            <h1 className={styles.title}>Tu negocio, <span className={styles.titleAccent}>convertido en un sistema vivo.</span></h1>
            <p className={styles.lead}>LumenAI une atención, ventas, conocimiento y decisiones en una plataforma que entiende tu empresa y acompaña cada paso con Pulse.</p>
            <div className={styles.heroActions}>
              <Link className={styles.primaryButton} href="/login">Comenzar con LumenAI <ArrowRight size={15} /></Link>
              <Link className={styles.secondaryButton} href="#sistema">Descubrir el sistema <ChevronRight size={15} /></Link>
            </div>
            <div className={styles.microProof}>
              <span><ShieldCheck size={14} /> Datos aislados por empresa</span>
              <span><Sparkles size={14} /> IA configurable</span>
              <span><Gauge size={14} /> Operación en tiempo real</span>
            </div>
          </Reveal>

          <Reveal delay={140}>
            <div className={styles.commandFrame} id="pulse">
              <div className={styles.commandPanel}>
                <div className={styles.commandTop}>
                  <div className={styles.commandStatus}><span className={styles.pulseCore} /> Pulse está observando</div>
                  <div className={styles.commandMeta}>Actualizado ahora</div>
                </div>
                <div className={styles.commandBody}>
                  <div className={styles.pulseHeading}>
                    <div className={styles.pulseAvatar}>
                      <Image src="/brand/operators/pulse/welcome.webp" alt="Pulse Nova, asistente de LumenAI" width={72} height={72} sizes="46px" />
                    </div>
                    <div><strong>Buenos días. Tengo algo importante.</strong><p>Revisé conversaciones, leads y salud de configuración.</p></div>
                  </div>
                  <div className={styles.insight}>
                    <div className={styles.insightLabel}>Oportunidad detectada</div>
                    <h3>Tus consultas de servicios aumentaron esta semana.</h3>
                    <p>La respuesta de precios no está publicada en Knowledge. Completarla puede reducir fricción y acelerar nuevas conversaciones.</p>
                  </div>
                  <div className={styles.metricGrid}>
                    <div className={styles.metric}><span>Conversaciones</span><strong>248</strong><em>+18% esta semana</em></div>
                    <div className={styles.metric}><span>Leads activos</span><strong>36</strong><em>8 alta intención</em></div>
                    <div className={styles.metric}><span>Salud IA</span><strong>92%</strong><em>Lista para operar</em></div>
                  </div>
                  <div className={styles.askBox}>Pregúntale a Pulse cómo está tu negocio <button aria-label="Preguntar a Pulse"><ArrowRight size={14} /></button></div>
                </div>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      <section className={styles.section} id="sistema">
        <div className={styles.sectionInner}>
          <Reveal className={styles.sectionIntro}>
            <div><div className={styles.sectionKicker}>El sistema LumenAI</div><h2 className={styles.sectionTitle}>Una sola inteligencia. Cada área conectada.</h2></div>
            <p className={styles.sectionCopy}>Cada módulo tiene una función propia, pero comparte el mismo negocio, la misma memoria y la misma capa de permisos. La información deja de estar fragmentada y empieza a convertirse en decisiones.</p>
          </Reveal>
          <div className={styles.bento}>
            {modules.map((item, index) => {
              const Icon = item.icon;
              return (
                <Reveal key={item.title} className={`${styles.card} ${item.wide ? styles.cardWide : ""}`} delay={(index % 3) * 70}>
                  <div className={styles.cardIcon}><Icon size={19} /></div>
                  <h3>{item.title}</h3><p>{item.copy}</p><span className={styles.cardTag}>{item.tag}</span>
                </Reveal>
              );
            })}
          </div>
        </div>
      </section>

      <section className={styles.section}>
        <div className={styles.sectionInner}>
          <Reveal className={styles.sectionIntro}>
            <div><div className={styles.sectionKicker}>Del mensaje a la acción</div><h2 className={styles.sectionTitle}>Entiende el negocio mientras ocurre.</h2></div>
            <p className={styles.sectionCopy}>LumenAI transforma conversaciones en contexto, contexto en señales y señales en acciones controladas. Pulse explica el proceso para que siempre sepas qué está haciendo el sistema.</p>
          </Reveal>
          <div className={styles.flow}>
            {flow.map(([index, title, copy]) => <Reveal className={styles.flowStep} key={index}><div className={styles.flowIndex}>{index}</div><h3>{title}</h3><p>{copy}</p></Reveal>)}
          </div>
        </div>
      </section>

      <section className={styles.section} id="widget">
        <div className={`${styles.sectionInner} ${styles.showcase}`}>
          <Reveal>
            <div className={styles.sectionKicker}>Widget inteligente</div>
            <h2 className={styles.sectionTitle}>La experiencia de LumenAI dentro de cualquier sitio.</h2>
            <p className={styles.sectionCopy}>Instala un asistente que respeta la identidad del negocio, responde con conocimiento real y convierte cada conversación en información útil para el panel.</p>
            <div className={styles.featureList}>
              <div className={styles.featureItem}><Check size={16} /> Instalación mediante script y clave pública.</div>
              <div className={styles.featureItem}><Check size={16} /> Diseño adaptable, responsive y configurable.</div>
              <div className={styles.featureItem}><Check size={16} /> Chat, mensajes, transcripción y derivación humana.</div>
              <div className={styles.featureItem}><Check size={16} /> Historial conectado a conversaciones y leads.</div>
            </div>
          </Reveal>
          <Reveal className={styles.showcasePanel} delay={100}>
            <Image src="/brand/lumenai-calibration-widget-preview.webp" alt="Vista previa del widget LumenAI" width={1200} height={780} sizes="(max-width: 980px) 100vw, 52vw" />
          </Reveal>
        </div>
      </section>

      <section className={styles.cta}>
        <Reveal className={styles.ctaBox}>
          <div className={styles.sectionKicker}>Empieza con una base real</div>
          <h2>Haz que tu empresa responda, aprenda y avance.</h2>
          <p>Configura el negocio, construye su Knowledge, calibra la IA y publica un widget preparado para conversaciones reales.</p>
          <div className={styles.heroActions}>
            <Link className={styles.primaryButton} href="/subscriptions">Ver planes <BarChart3 size={15} /></Link>
            <Link className={styles.secondaryButton} href="/login">Entrar a LumenAI <ArrowRight size={15} /></Link>
          </div>
        </Reveal>
      </section>

      <footer className={styles.footer}>
        <LumenLogo label="LumenAI" compact size="sm" />
        <span>© 2026 LumenAI. Inteligencia operativa para empresas.</span>
        <nav><Link href="/legal/privacy">Privacidad</Link><Link href="/legal/terms">Términos</Link><Link href="/support">Soporte</Link></nav>
      </footer>
    </main>
  );
}
