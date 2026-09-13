import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  BarChart3,
  BrainCircuit,
  Check,
  ChevronRight,
  CircleDot,
  Command,
  GitBranch,
  Layers3,
  MessageSquareText,
  Radar,
  ShieldCheck,
  Sparkles,
  Target,
  Workflow,
} from "lucide-react";
import { LumenLogo } from "@/components/brand/lumen-logo";
import { OperatorAvatar } from "@/components/brand/operator-avatar";
import { Reveal } from "@/components/marketing/reveal";
import { OperatorShowcase } from "@/components/marketing/operator-showcase";
import styles from "./marketing.module.css";

const systemModules = [
  { icon: Radar, title: "Pulse Radar", copy: "Explica cambios, riesgo y oportunidad con señales reales del negocio.", code: "SIGNAL / 01", visual: "radar", wide: true },
  { icon: Workflow, title: "Action OS", copy: "Convierte intención en planes aprobables, acciones y evidencia.", code: "ACTION / 02", visual: "flow" },
  { icon: BrainCircuit, title: "Knowledge", copy: "Servicios, precios y políticas se transforman en memoria utilizable.", code: "MEMORY / 03", visual: "memory" },
  { icon: MessageSquareText, title: "Conversaciones", copy: "Atención humana e IA comparten contexto, historial y siguiente paso.", code: "LIVE / 04", visual: "chat", wide: true },
  { icon: Target, title: "Growth", copy: "Prioriza oportunidades según intención, impacto y capacidad comercial.", code: "GROWTH / 05", visual: "growth" },
  { icon: GitBranch, title: "Business Twin", copy: "Simula escenarios antes de comprometer presupuesto o procesos.", code: "TWIN / 06", visual: "twin", wide: true },
];


const operatingFlow = [
  ["01", "Escucha", "El widget y los canales capturan conversaciones y señales."],
  ["02", "Comprende", "Knowledge y la calibración entregan contexto verificable."],
  ["03", "Prioriza", "Pulse organiza riesgos, oportunidades y urgencia."],
  ["04", "Actúa", "LumenAI prepara y ejecuta únicamente lo autorizado."],
];

export default function Home() {
  return (
    <main className={styles.shell}>
      <header className={styles.navWrap}>
        <nav className={styles.nav} aria-label="Navegación principal">
          <Link href="/" aria-label="Inicio de LumenAI">
            <LumenLogo label="LumenAI" subline="Intelligence Operating System" priority />
          </Link>
          <div className={styles.navLinks}>
            <Link href="#sistema">Sistema</Link>
            <Link href="#pulse">Pulse</Link>
            <Link href="#widget">Widget</Link>
            <Link href="/subscriptions">Planes</Link>
          </div>
          <div className={styles.navActions}>
            <Link className={styles.navLogin} href="/login">Entrar</Link>
            <Link className={styles.navPrimary} href="/login">Crear acceso <ArrowRight aria-hidden="true" /></Link>
          </div>
        </nav>
      </header>

      <section className={styles.hero}>
        <div className={styles.heroGrid} aria-hidden="true" />
        <div className={styles.heroCopy}>
          <div className={styles.heroMeta}>
            <span>AI BUSINESS OPERATING SYSTEM</span>
            <span><i /> OPERACIÓN CONECTADA</span>
          </div>
          <h1><span>Toda tu empresa.</span><span>Un mismo sistema.</span><em>Decisiones claras.</em></h1>
          <p>
            LumenAI reúne atención, ventas, conocimiento y ejecución en una sola
            inteligencia operativa. Pulse convierte cada señal en una decisión clara.
          </p>
          <div className={styles.heroActions}>
            <Link className={styles.primaryButton} href="/login">Construir mi sistema <ArrowRight aria-hidden="true" /></Link>
            <Link className={styles.secondaryButton} href="#sistema">Explorar arquitectura <ChevronRight aria-hidden="true" /></Link>
          </div>
          <div className={styles.heroProof}>
            <span><ShieldCheck /> Aislamiento por empresa</span>
            <span><Command /> Control y aprobaciones</span>
            <span><Sparkles /> IA configurable</span>
          </div>
        </div>

        <div className={styles.heroVisual} aria-label="Identidad visual de LumenAI">
          <Image src="/brand/editorial/lumenai-light-ribbon.png" alt="Escultura de luz azul sobre un fondo oscuro" fill priority sizes="(max-width: 900px) 100vw, 56vw" />
          <div className={styles.heroVisualShade} />
          <div className={styles.liveCard}>
            <div className={styles.liveCardTop}>
              <OperatorAvatar operator="pulse" mood="analyzing" size={54} priority />
              <span><small>Pulse Radar</small><strong>Una lectura. Un siguiente paso.</strong></span><i />
            </div>
            <p>Pulse conecta tus señales con el contexto de tu negocio para ayudarte a priorizar.</p>
            <div className={styles.liveMetrics}>
              <span><small>01</small><strong>Observar</strong></span>
              <span><small>02</small><strong>Entender</strong></span>
              <span><small>03</small><strong>Actuar</strong></span>
            </div>
          </div>
        </div>

        <div className={styles.heroRail}>
          <LumenLogo compact size="sm" />
          <span><i>01</i> ENTENDER</span><span><i>02</i> PRIORIZAR</span><span><i>03</i> EJECUTAR</span>
          <b>LUMENAI / 2026</b>
        </div>
      </section>

      <div className={styles.marquee} aria-label="Capacidades conectadas">
        <div>
          {Array.from({ length: 2 }).flatMap((_, repetition) =>
            ["PULSE RADAR", "KNOWLEDGE", "LUMENITE", "CONVERSACIONES", "GROWTH", "BUSINESS TWIN"].map((label) => (
              <span className={styles.marqueeItem} key={`${repetition}-${label}`}><b>{label}</b><CircleDot /></span>
            )),
          )}
        </div>
      </div>

      <section className={styles.systemSection} id="sistema">
        <div className={styles.sectionFrame}>
          <Reveal className={styles.sectionHeading}>
            <div><span className={styles.kicker}>El sistema LumenAI</span><h2>Cada área, conectada. Cada decisión, con contexto.</h2></div>
            <p>Cada módulo tiene una misión y una identidad propia. Todos comparten el mismo negocio, memoria, permisos y trazabilidad para que la información deje de fragmentarse.</p>
          </Reveal>

          <div className={styles.moduleGrid}>
            {systemModules.map((module, index) => {
              const Icon = module.icon;
              return (
                <Reveal key={module.title} className={`${styles.moduleCard} ${module.wide ? styles.moduleWide : ""}`} delay={(index % 3) * 70}>
                  <article data-visual={module.visual}>
                    <header><span>{module.code}</span><Icon aria-hidden="true" /></header>
                    <div className={styles.moduleArtwork} aria-hidden="true"><span /><span /><span /></div>
                    <div className={styles.moduleCopy}><h3>{module.title}</h3><p>{module.copy}</p></div>
                  </article>
                </Reveal>
              );
            })}
          </div>
        </div>
      </section>

      <section className={styles.posterSection}>
        <div className={styles.sectionFrame}>
          <div className={styles.posterLayout}>
            <Reveal className={styles.posterCopy}>
              <span className={styles.kicker}>Living System Motion</span>
              <h2>Una identidad que vive dentro del producto.</h2>
              <p>La marca no se limita al logo. Se convierte en ritmo, señal, estados, transiciones y superficies editoriales que ayudan a comprender el sistema.</p>
              <div className={styles.posterFacts}>
                <span><strong>01</strong> Introducciones por módulo</span>
                <span><strong>02</strong> Movimiento con propósito</span>
                <span><strong>03</strong> Feedback visual inmediato</span>
              </div>
            </Reveal>
            <Reveal className={styles.posterHorizontal} delay={90}>
              <Image src="/brand/editorial/frosted-blue.png" alt="Vidrio y luz azul sobre una superficie clara" fill sizes="(max-width: 900px) 100vw, 52vw" />
              <span>LUMENAI / INTELLIGENCE IN MOTION</span>
            </Reveal>
          </div>
        </div>
      </section>

      <section className={styles.pulseSection} id="pulse">
        <div className={styles.sectionFrame}>
          <Reveal className={styles.pulseIntro}>
            <div><span className={styles.kicker}>Elige quién te acompaña</span><h2>Siete operadores. Una misma inteligencia.</h2></div>
            <p>Pulse y su equipo traducen datos, enseñan cada sección y comunican buenas noticias, alertas, análisis o celebraciones con expresiones coherentes. El propietario puede elegir su operador desde Interfaz.</p>
          </Reveal>

          <OperatorShowcase />
        </div>
      </section>

      <section className={styles.flowSection}>
        <div className={styles.sectionFrame}>
          <Reveal className={styles.sectionHeading}>
            <div><span className={styles.kicker}>Del mensaje a la acción</span><h2>Entiende el negocio mientras ocurre.</h2></div>
            <p>LumenAI transforma conversaciones en contexto, contexto en señales y señales en acciones controladas. Cada paso conserva fuente y estado.</p>
          </Reveal>
          <div className={styles.flowGrid}>
            {operatingFlow.map(([number, title, copy]) => (
              <Reveal className={styles.flowStep} key={number}><article><span>{number}</span><Layers3 aria-hidden="true" /><h3>{title}</h3><p>{copy}</p></article></Reveal>
            ))}
          </div>
        </div>
      </section>

      <section className={styles.widgetSection} id="widget">
        <div className={styles.sectionFrame}>
          <div className={styles.widgetLayout}>
            <Reveal className={styles.widgetCopy}>
              <span className={styles.kicker}>Widget inteligente</span>
              <h2>La experiencia LumenAI dentro de cualquier sitio.</h2>
              <p>Un asistente instalable que respeta la marca, responde desde Knowledge y conecta cada conversación con leads, métricas y Pulse Radar.</p>
              <div className={styles.checkList}>
                <span><Check /> Instalación mediante script y clave pública.</span>
                <span><Check /> Siete operadores y expresiones contextuales.</span>
                <span><Check /> Chat, audio, historial y derivación humana.</span>
                <span><Check /> Responsive y configurable sin tocar código.</span>
              </div>
              <Link className={styles.primaryButton} href="/login">Diseñar mi asistente <ArrowRight /></Link>
            </Reveal>

            <Reveal className={styles.widgetVisual} delay={100}>
              <div className={styles.browserChrome}><span /><span /><span /><b>tuempresa.com</b></div>
              <div className={styles.websiteMock}>
                <div className={styles.websiteLines}><i /><i /><i /></div>
                <div className={styles.websiteCards}><span /><span /><span /></div>
                <div className={styles.widgetMock}>
                  <header><OperatorAvatar operator="pulse" mood="welcome" size={54} /><span><strong>Pulse</strong><small>Asistente de tu negocio</small></span><i /></header>
                  <div className={styles.widgetMessages}><p>Hola, soy Pulse. ¿Qué quieres resolver hoy?</p><span>Quiero conocer sus planes.</span><p>Claro. Encontré tres opciones y puedo ayudarte a elegir.</p></div>
                  <footer>Escribe tu pregunta <ArrowRight /></footer>
                </div>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      <section className={styles.ctaSection}>
        <Reveal className={styles.cta}>
          <div className={styles.ctaMark}><LumenLogo compact size="lg" /></div>
          <span className={styles.kicker}>El siguiente sistema de tu empresa</span>
          <h2>Haz que tu negocio responda, aprenda y avance.</h2>
          <p>Construye una base real, configura la inteligencia y publica cuando todo esté listo.</p>
          <div className={styles.heroActions}>
            <Link className={styles.primaryButton} href="/subscriptions">Ver planes <BarChart3 /></Link>
            <Link className={styles.secondaryButton} href="/login">Entrar a LumenAI <ArrowRight /></Link>
          </div>
        </Reveal>
      </section>

      <footer className={styles.footer}>
        <LumenLogo label="LumenAI" subline="Intelligence Operating System" size="sm" />
        <span>© 2026 LumenAI. Inteligencia operativa para empresas.</span>
        <nav><Link href="/legal/privacy">Privacidad</Link><Link href="/legal/terms">Términos</Link><Link href="/support">Soporte</Link></nav>
      </footer>
    </main>
  );
}
