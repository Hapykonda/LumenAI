import Image from "next/image";
import Link from "next/link";
import { ArrowDown, ArrowRight, ArrowUpRight } from "lucide-react";
import { LumenLogo } from "@/components/brand/lumen-logo";
import { OperatorAvatar } from "@/components/brand/operator-avatar";
import { OperatorShowcase } from "@/components/marketing/operator-showcase";
import styles from "./marketing.module.css";

const modules = [
  { name: "Pulse Radar", category: "Análisis", copy: "Detecta cambios en tu negocio y reúne las señales que merecen tu atención." },
  { name: "Conversaciones", category: "Atención", copy: "Consulta cada conversación, recupera su contexto y continúa la atención desde el mismo lugar." },
  { name: "Knowledge", category: "Conocimiento", copy: "Organiza tus servicios, precios y políticas para que las respuestas partan de tu información." },
  { name: "Growth", category: "Crecimiento", copy: "Revisa oportunidades comerciales y decide dónde concentrar el esfuerzo de tu equipo." },
  { name: "Lumenite", category: "Ejecución", copy: "Prepara acciones, revisa su alcance y aprueba lo que quieres poner en marcha." },
  { name: "Business Twin", category: "Planificación", copy: "Compara escenarios antes de cambiar un proceso o comprometer recursos." },
];

export default function Home() {
  return (
    <main className={styles.shell}>
      <a className={styles.skipLink} href="#contenido">Ir al contenido</a>
      <section className={styles.hero}>
        <Image className={styles.heroArtwork} src="/brand/editorial/lumenai-mesh-blue.webp" alt="" fill priority sizes="100vw" />
        <div className={styles.heroShade} aria-hidden="true" />
        <header className={styles.header}>
          <Link className={styles.brand} href="/" aria-label="Inicio de LumenAI"><LumenLogo size="lg" priority /></Link>
          <nav className={styles.nav} aria-label="Navegación principal">
            <Link href="#sistema">Sistema</Link><Link href="#pulse">Operadores</Link>
            <Link href="#widget">Asistente web</Link><Link href="/subscriptions">Planes</Link>
          </nav>
          <Link className={styles.headerAccess} href="/login">Entrar <ArrowUpRight aria-hidden="true" /></Link>
        </header>
        <div className={styles.heroContent} id="contenido">
          <h1><span>Tu negocio,</span><span>con inteligencia</span><em>propia.</em></h1>
          <div className={styles.heroBottom}>
            <p>Atención, conocimiento y decisiones.<br />Todo lo que necesitas para dirigir tu negocio,<br />en un mismo lugar.</p>
            <Link className={styles.primaryLink} href="/login">Empezar con LumenAI <ArrowUpRight aria-hidden="true" /></Link>
          </div>
        </div>
        <div className={styles.heroFoot}><span>Una perspectiva más clara de tu empresa.</span><Link href="#sistema">Descubre el sistema <ArrowDown aria-hidden="true" /></Link></div>
      </section>
      <section className={styles.system} id="sistema">
        <div className={styles.sectionHeading}>
          <span className={styles.sectionLabel}>El sistema</span>
          <div><h2>Menos fragmentación.<br />Más perspectiva.</h2><p>LumenAI conecta la información que tu empresa ya genera. Del primer mensaje a la siguiente decisión, cada área comparte el contexto que necesita.</p></div>
        </div>
        <div className={styles.moduleGrid}>
          {modules.map((module, index) => (
            <article className={styles.module} key={module.name}>
              <div className={styles.moduleTop}><span>0{index + 1}</span><span>{module.category}</span></div>
              <h3>{module.name}</h3><p>{module.copy}</p>
            </article>
          ))}
        </div>
        <div className={styles.sectionFoot}><p>Tú defines los permisos. Tú apruebas las acciones.</p><Link href="/login">Conocer mi espacio <ArrowUpRight aria-hidden="true" /></Link></div>
      </section>
      <section className={styles.operators} id="pulse">
        <div className={styles.sectionHeading}>
          <span className={styles.sectionLabel}>Tu operador</span>
          <div><h2>Una presencia familiar.<br />En todo tu espacio.</h2><p>Elige quién te acompaña. Tu operador ayuda a interpretar la información y a recorrer el sistema, con una personalidad que puedes hacer tuya.</p></div>
        </div>
        <OperatorShowcase />
      </section>
      <section className={styles.widget} id="widget">
        <div className={styles.widgetCopy}>
          <span className={styles.sectionLabel}>En tu sitio web</span><h2>La conversación<br />empieza aquí.</h2>
          <p>Un asistente que conoce tu negocio y habla con tus clientes. Responde a partir de tus contenidos y conserva el historial para que tu equipo pueda continuar.</p>
          <ul><li>Tu identidad, tus contenidos.</li><li>Conversaciones y contactos en el panel.</li><li>Atención por texto y audio.</li></ul>
          <Link className={styles.textLink} href="/login">Configurar mi asistente <ArrowUpRight aria-hidden="true" /></Link>
        </div>
        <div className={styles.conversation} aria-label="Ejemplo de conversación con el asistente">
          <div className={styles.conversationHeader}><span>Una conversación con Pulse</span><span>Ejemplo</span></div>
          <div className={styles.operatorLine}><OperatorAvatar operator="pulse" mood="explaining" size={100} /><div><strong>Hola, soy Pulse.</strong><span>¿En qué puedo ayudarte?</span></div></div>
          <div className={styles.customerMessage}><span>Cliente</span><p>Me gustaría conocer sus servicios.</p></div>
          <div className={styles.operatorMessage}><span>Pulse</span><p>Claro. Cuéntame qué necesitas y te ayudaré a encontrar la opción adecuada.</p></div>
          <div className={styles.conversationFooter}><span>Tu próxima conversación empieza con una pregunta.</span><ArrowRight aria-hidden="true" /></div>
        </div>
      </section>
      <section className={styles.closing}>
        <Image src="/brand/editorial/lumenai-mesh-blue.webp" alt="" fill sizes="100vw" />
        <div className={styles.closingContent}><span>El siguiente paso</span><h2>Dale a tu negocio<br />su propio espacio.</h2><Link className={styles.primaryLink} href="/login">Entrar a LumenAI <ArrowUpRight aria-hidden="true" /></Link></div>
      </section>
      <footer className={styles.footer}>
        <Link href="/" aria-label="Inicio de LumenAI"><LumenLogo size="md" /></Link>
        <span>© {new Date().getFullYear()} LumenAI</span>
        <nav aria-label="Información legal"><Link href="/legal/privacy">Privacidad</Link><Link href="/legal/terms">Términos</Link><Link href="/support">Soporte</Link><Link href="/admin">Dirección</Link></nav>
      </footer>
    </main>
  );
}
