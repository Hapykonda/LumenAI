import Link from "next/link";
import { ArrowRight, ChartNoAxesCombined, LayoutDashboard, Radar, Settings2 } from "lucide-react";
import { LumenLogo } from "@/components/brand/lumen-logo";
import { getAdminSessionFromRequest, isAdminAccessConfigured } from "@/lib/auth/admin-session";
import styles from "./admin.module.css";

const quickLinks = [
  { href: "/panel/overview", label: "Resumen", copy: "Estado general y prioridades", icon: LayoutDashboard },
  { href: "/panel/radar", label: "Pulse Radar", copy: "Señales y decisiones", icon: Radar },
  { href: "/panel/growth", label: "Growth", copy: "Oportunidades y crecimiento", icon: ChartNoAxesCombined },
  { href: "/panel/settings", label: "Configuración", copy: "Identidad y preferencias", icon: Settings2 },
];

export default async function AdminPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const [{ error }, session] = await Promise.all([searchParams, getAdminSessionFromRequest()]);
  const configured = isAdminAccessConfigured();

  return (
    <main className={styles.shell}>
      <div className={styles.aurora} aria-hidden="true" />
      <header className={styles.header}>
        <Link href="/" aria-label="Inicio de LumenAI"><LumenLogo label="LumenAI" priority /></Link>
        <Link href="/">Volver al sitio <ArrowRight aria-hidden="true" /></Link>
      </header>

      {session ? (
        <section className={styles.console}>
          <div className={styles.consoleIntro}>
            <span className={styles.kicker}>Dirección</span>
            <h1>Centro de dirección</h1>
            <p>Revisa tu negocio, configura cada área y decide los siguientes pasos.</p>
            <div className={styles.actions}>
              <Link className={styles.primary} href="/panel/overview">Abrir panel completo <ArrowRight aria-hidden="true" /></Link>
              <form action="/api/admin/logout" method="post"><button type="submit">Cerrar sesión</button></form>
            </div>
          </div>
          <div className={styles.statusCard}>
            <span>Tu acceso</span><strong>Propietario</strong>
            <dl><div><dt>Permisos</dt><dd>Administración</dd></div><div><dt>Espacio</dt><dd>Tu empresa</dd></div><div><dt>Sesión</dt><dd>Hasta 7 días</dd></div></dl>
          </div>
          <div className={styles.quickGrid}>
            {quickLinks.map(({ href, label, copy, icon: Icon }) => (
              <Link href={href} key={href}><Icon aria-hidden="true" /><span><strong>{label}</strong><small>{copy}</small></span><ArrowRight aria-hidden="true" /></Link>
            ))}
          </div>
        </section>
      ) : (
        <section className={styles.accessCard}>
          <div className={styles.accessVisual}>
            <span className={styles.kicker}>Acceso de propietario</span>
            <h1>El espacio<br />desde el que<br />diriges todo.</h1>
            <p>Tu empresa. Tus decisiones.<br />Administra LumenAI desde un único lugar.</p>
          </div>
          <form className={styles.form} action="/api/admin/session" method="post">
            <span>Dirección</span>
            <h2>Bienvenido.</h2>
            <p>Introduce tu código privado para continuar.</p>
            <label htmlFor="accessCode">Código de acceso</label>
            <input id="accessCode" name="accessCode" type="password" autoComplete="current-password" required disabled={!configured} />
            {error === "invalid_code" ? <p className={styles.error} role="alert">El código no es válido.</p> : null}
            {(!configured || error === "not_configured") ? <p className={styles.error} role="alert">El acceso privado aún no está configurado.</p> : null}
            <button className={styles.primary} type="submit" disabled={!configured}>Continuar <ArrowRight aria-hidden="true" /></button>
            <Link href="/login">Entrar con una cuenta</Link>
          </form>
        </section>
      )}
    </main>
  );
}
