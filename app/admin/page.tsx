import Link from "next/link";
import { ArrowRight, ChartNoAxesCombined, KeyRound, LayoutDashboard, Radar, Settings2, ShieldCheck } from "lucide-react";
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
        <Link href="/" aria-label="Inicio de LumenAI"><LumenLogo label="LumenAI" subline="Private Operating Console" priority /></Link>
        <span><ShieldCheck aria-hidden="true" /> Acceso cifrado</span>
      </header>

      {session ? (
        <section className={styles.console}>
          <div className={styles.consoleIntro}>
            <span className={styles.kicker}>CONTROL PRIVADO / SESIÓN ACTIVA</span>
            <h1>Centro de dirección</h1>
            <p>Tu acceso de propietario está activo. Desde aquí puedes recorrer y configurar cada área operativa de LumenAI.</p>
            <div className={styles.actions}>
              <Link className={styles.primary} href="/panel/overview">Abrir panel completo <ArrowRight aria-hidden="true" /></Link>
              <form action="/api/admin/logout" method="post"><button type="submit">Cerrar sesión privada</button></form>
            </div>
          </div>
          <div className={styles.statusCard}>
            <span>ESTADO DEL SISTEMA</span><strong><i /> OPERATIVO</strong>
            <dl><div><dt>Rol</dt><dd>Propietario</dd></div><div><dt>Ámbito</dt><dd>Workspace privado</dd></div><div><dt>Caducidad</dt><dd>7 días</dd></div></dl>
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
            <span className={styles.kicker}>DIRECCIÓN LUMENAI</span>
            <h1>Tu consola, sin crear otra cuenta.</h1>
            <p>Una entrada privada para desarrollar, revisar y operar el sistema con permisos de propietario.</p>
            <ul><li><ShieldCheck /> Sesión HttpOnly firmada</li><li><KeyRound /> Clave guardada sólo en el servidor</li></ul>
          </div>
          <form className={styles.form} action="/api/admin/session" method="post">
            <span>ACCESO ADMINISTRATIVO</span>
            <h2>Entrar al sistema</h2>
            <p>Introduce tu código privado de dirección.</p>
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
