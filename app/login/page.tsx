"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  ArrowRight,
  Building2,
  CheckCircle2,
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  LockKeyhole,
  Mail,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import { LumenLogo } from "@/components/brand/lumen-logo";
import { normalizeSubscriptionPlan, subscriptionPlanLabel } from "@/lib/subscription-plans";
import { getAppUrl } from "@/lib/env";
import styles from "./login.module.css";

function getBaseUrl() {
  const envUrl = getAppUrl().replace(/\/+$/, "");

  if (typeof window === "undefined") return envUrl;

  const currentOrigin = window.location.origin.replace(/\/+$/, "");
  const currentHostIsLocal = /^(localhost|127\.0\.0\.1)(:\d+)?$/i.test(window.location.host);
  const envUrlIsLocal = /\/\/(localhost|127\.0\.0\.1)(:\d+)?/i.test(envUrl);

  if (!envUrl) return currentOrigin;
  if (!currentHostIsLocal && envUrlIsLocal) return currentOrigin;

  return envUrl;
}

function getConfirmUrl() {
  return `${getBaseUrl()}/auth/confirm?next=/panel`;
}

function getOAuthCallbackUrl() {
  return `${getBaseUrl()}/auth/callback?next=/panel`;
}

function getMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

function normalizeAuthErrorMessage(raw: string) {
  const value = decodeURIComponent(raw.replace(/\+/g, " ")).trim();
  const lower = value.toLowerCase();

  if (!value) return "No se pudo iniciar sesion.";
  if (lower.includes("failed to fetch") || lower.includes("networkerror") || lower.includes("network request failed")) {
    return "No pudimos conectar con el servicio de acceso. Intenta de nuevo en unos momentos.";
  }
  if (
    lower.includes("auth_link_expired") ||
    lower.includes("expired") ||
    lower.includes("token has expired")
  ) {
    return "El enlace expiro, solicita uno nuevo.";
  }
  if (
    lower.includes("auth_invalid_code") ||
    lower.includes("invalid token") ||
    lower.includes("invalid otp") ||
    lower.includes("verifyotp") ||
    lower.includes("token not found")
  ) {
    return "El codigo no es valido.";
  }
  if (
    lower.includes("auth_redirect_not_allowed") ||
    lower.includes("redirect") ||
    lower.includes("not allowed") ||
    lower.includes("unauthorized")
  ) {
    return "La URL de redireccion no esta autorizada en Supabase.";
  }
  if (lower.includes("auth_missing_params") || lower.includes("missing_code")) {
    return "El enlace de acceso no es valido. Solicita uno nuevo.";
  }
  if (lower.includes("exchange") || lower.includes("auth_exchange_failed")) {
    return "No se pudo completar la sesion. Intenta nuevamente.";
  }
  if (lower.includes("email not confirmed")) {
    return "Tu correo aun no esta confirmado. Revisa tu bandeja de entrada.";
  }
  if (lower.includes("invalid login credentials")) {
    return "Correo o contrasena incorrectos.";
  }
  if (lower.includes("rate limit") || lower.includes("auth_rate_limited")) {
    return "Demasiados intentos seguidos. Espera un momento y vuelve a probar.";
  }

  return value;
}

function isEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [passwordMode, setPasswordMode] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [password, setPassword] = useState("");
  const [loadingLink, setLoadingLink] = useState(false);
  const [loadingPass, setLoadingPass] = useState(false);
  const [loadingGoogle, setLoadingGoogle] = useState(false);
  const [loadingRecovery, setLoadingRecovery] = useState(false);
  const [loadingOtpVerify, setLoadingOtpVerify] = useState(false);
  const [ok, setOk] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [otpSent, setOtpSent] = useState(false);
  const [otpCode, setOtpCode] = useState("");
  const [cooldown, setCooldown] = useState(0);

  const cleanEmail = email.trim().toLowerCase();
  const busy = loadingLink || loadingPass || loadingGoogle || loadingRecovery || loadingOtpVerify;
  const canSubmit = useMemo(() => {
    if (!isEmail(cleanEmail)) return false;
    if (passwordMode) return password.length > 0 && !loadingPass;
    if (otpSent && otpCode.length > 0) return otpCode.length === 6 && !loadingOtpVerify;
    return cooldown <= 0 && !loadingLink;
  }, [
    cleanEmail,
    cooldown,
    loadingLink,
    loadingOtpVerify,
    loadingPass,
    otpCode.length,
    otpSent,
    password,
    passwordMode,
  ]);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = window.setInterval(
      () => setCooldown((value) => Math.max(0, value - 1)),
      1000
    );
    return () => window.clearInterval(timer);
  }, [cooldown]);

  useEffect(() => {
    const search = window.location.search || "";
    const hash = window.location.hash || "";
    const searchParams = new URLSearchParams(search.replace(/^\?/, ""));
    const hashParams = new URLSearchParams(hash.replace(/^#/, ""));
    const selectedPlan = normalizeSubscriptionPlan(searchParams.get("plan"));

    if (selectedPlan) {
      window.sessionStorage.setItem("lumenai:selected-plan", selectedPlan);
      setOk(`Plan ${subscriptionPlanLabel(selectedPlan)} seleccionado. Inicia sesión para continuar.`);
    }

    const rawError =
      searchParams.get("e") ||
      searchParams.get("error_description") ||
      searchParams.get("error") ||
      hashParams.get("error_description") ||
      hashParams.get("error_code") ||
      hashParams.get("error");

    if (!rawError) return;

    setErr(normalizeAuthErrorMessage(rawError));
    setOk(null);
    window.history.replaceState({}, "", "/login");
  }, []);

  async function persistSession(accessToken: string, refreshToken: string) {
    const res = await fetch("/api/auth/set-session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        access_token: accessToken,
        refresh_token: refreshToken,
      }),
    });

    if (!res.ok) {
      const json = await res.json().catch(() => ({}));
      throw new Error(json?.error ?? "No se pudo establecer sesión en cookies.");
    }
  }

  function validateEmail() {
    if (!cleanEmail) {
      setErr("Escribe tu correo para continuar.");
      return false;
    }
    if (!isEmail(cleanEmail)) {
      setErr("Escribe un correo valido.");
      return false;
    }
    return true;
  }

  async function sendMagicLink() {
    setErr(null);
    setOk(null);

    if (!validateEmail()) return;
    if (cooldown > 0) return;

    try {
      setLoadingLink(true);
      setOtpSent(false);
      setOtpCode("");

      const { error } = await supabase.auth.signInWithOtp({
        email: cleanEmail,
        options: { emailRedirectTo: getConfirmUrl() },
      });

      if (error) throw error;

      setOk(
        "El correo fue enviado, revisa spam o promociones. Abre el enlace de acceso; si tu correo trae un codigo, puedes ingresarlo aqui."
      );
      setOtpSent(true);
      setCooldown(60);
    } catch (error) {
      const msg = normalizeAuthErrorMessage(getMessage(error, "No se pudo enviar el correo."));
      setErr(msg);
      setCooldown(msg.toLowerCase().includes("demasiados") ? 90 : 30);
    } finally {
      setLoadingLink(false);
    }
  }

  async function verifyOtpCode() {
    setErr(null);
    setOk(null);

    const token = otpCode.trim();

    if (!validateEmail()) return;
    if (token.length < 6) {
      setErr("El codigo debe tener 6 digitos.");
      return;
    }

    try {
      setLoadingOtpVerify(true);
      const { data, error } = await supabase.auth.verifyOtp({
        email: cleanEmail,
        token,
        type: "email",
      });

      if (error) throw error;

      const session =
        data?.session ?? (await supabase.auth.getSession()).data.session;

      if (!session?.access_token || !session?.refresh_token) {
        throw new Error("No se pudo obtener la sesion.");
      }

      await persistSession(session.access_token, session.refresh_token);
      setOk("Sesión verificada. Entrando al panel...");
      router.replace("/panel");
    } catch (error) {
      setErr(normalizeAuthErrorMessage(getMessage(error, "No se pudo verificar el codigo.")));
    } finally {
      setLoadingOtpVerify(false);
    }
  }

  async function loginWithPassword() {
    setErr(null);
    setOk(null);

    if (!validateEmail()) return;
    if (!password) {
      setErr("Escribe tu contrasena.");
      return;
    }

    try {
      setLoadingPass(true);
      const { data, error } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password,
      });

      if (error) throw error;

      const session =
        data?.session ?? (await supabase.auth.getSession()).data.session;

      if (!session?.access_token || !session?.refresh_token) {
        throw new Error("No se pudo obtener la sesion.");
      }

      await persistSession(session.access_token, session.refresh_token);
      setOk("Sesión iniciada. Redirigiendo...");
      router.replace("/panel");
    } catch (error) {
      setErr(normalizeAuthErrorMessage(getMessage(error, "No se pudo iniciar sesion.")));
    } finally {
      setLoadingPass(false);
    }
  }

  async function recoverPassword() {
    setErr(null);
    setOk(null);

    if (!validateEmail()) return;

    try {
      setLoadingRecovery(true);
      const { error } = await supabase.auth.resetPasswordForEmail(cleanEmail, {
        redirectTo: getOAuthCallbackUrl(),
      });

      if (error) throw error;

      setOk("Te enviamos un correo para recuperar tu contrasena.");
      setCooldown(45);
    } catch (error) {
      setErr(
        normalizeAuthErrorMessage(
          getMessage(error, "No se pudo enviar la recuperacion de contrasena.")
        )
      );
    } finally {
      setLoadingRecovery(false);
    }
  }

  async function loginWithGoogle() {
    setErr(null);
    setOk(null);

    try {
      setLoadingGoogle(true);
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: getOAuthCallbackUrl() },
      });

      if (error) throw error;
    } catch (error) {
      setErr(normalizeAuthErrorMessage(getMessage(error, "Google aun no esta configurado.")));
    } finally {
      setLoadingGoogle(false);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;

    if (passwordMode) {
      await loginWithPassword();
      return;
    }

    if (otpSent && otpCode.length > 0) {
      await verifyOtpCode();
      return;
    }

    await sendMagicLink();
  }

  return (
    <main className={styles.shell}>
      <a className="lmn-skip-link" href="#login-form">Ir al formulario de acceso</a>
      <section className={styles.intro} aria-label="LumenAI, inteligencia propia">
        <Image className={styles.artwork} src="/brand/editorial/lumenai-light-ribbon.png" alt="" fill priority sizes="(max-width: 800px) 100vw, 54vw" />
        <div className={styles.shade} />
        <Link className={styles.brand} href="/" aria-label="Volver a LumenAI"><LumenLogo size="lg" priority /></Link>
        <span className={styles.edition}>IDEAS<br />INTELIGENCIA<br />IMPACTO</span>
        <div className={styles.manifesto}>
          <h1>TU NEGOCIO,<br />CON<br /><em>INTELIGENCIA</em><br />PROPIA.</h1>
          <p>El copiloto que entiende tu negocio,<br />aprende contigo y te ayuda<br />a dar el siguiente paso.</p>
          <span className={styles.micro}>MÁS CLARIDAD.<br />MÁS TIEMPO.<br />MÁS POSIBILIDADES.</span>
        </div>
        <span className={styles.signature}>EL FUTURO<br />TRABAJA CONTIGO.</span>
      </section>
      <section className={styles.access} aria-label="Acceso a tu espacio">
        <Link className={styles.back} href="/">Volver al sitio <ArrowRight size={16} /></Link>
                  <form
            id="login-form"
            tabIndex={-1}
            onSubmit={handleSubmit}
            aria-busy={busy}
            className={styles.form}
          >
            <div className="mb-6 flex items-start justify-between gap-4">
              <div>
                <div className="text-[10px] font-black uppercase tracking-[0.22em] text-white/68">
                  BIENVENIDO A UN NUEVO PUNTO DE PARTIDA
                </div>
                <h2 className="mt-2 text-3xl font-black tracking-[-0.045em] text-white">
                  {passwordMode ? <>Inicia sesión<br />en LumenAI</> : <>Tu acceso.<br />Sin contraseña.</>}
                </h2>
                <p className="mt-3 text-sm leading-6 text-white/48">
                  {passwordMode
                    ? "Tu negocio. Tus datos. Tu inteligencia."
                    : "Te enviaremos un enlace seguro a tu correo para entrar o crear tu espacio."}
                </p>
              </div>

              <div className="grid h-11 w-11 place-items-center border border-white/[0.08] bg-white/[0.025] text-white/76">
                <LockKeyhole className="h-5 w-5" />
              </div>
            </div>

            <button
              type="button"
              onClick={loginWithGoogle}
              disabled={busy}
              className="lmn-focus-ring flex h-12 w-full items-center justify-center gap-3 border border-white/[0.07] bg-white/[0.025] text-sm font-black text-white transition hover:border-white/12 hover:bg-white/[0.045] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loadingGoogle ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <span className="grid h-7 w-7 place-items-center bg-white text-xs font-black text-black">
                  G
                </span>
              )}
              {loadingGoogle ? "Conectando con Google..." : "Continuar con Google"}
            </button>

            <div className="my-5 flex items-center gap-3">
              <span className="h-px flex-1 bg-white/[0.07]" />
              <span className="text-[10px] font-black uppercase tracking-[0.18em] text-white/26">
                o usa email
              </span>
              <span className="h-px flex-1 bg-white/[0.07]" />
            </div>

            <label className="grid gap-2">
              <span className="text-xs font-black text-white/66">Correo de trabajo</span>
              <span className="relative block">
                <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/30" />
                  <input
                    type="email"
                    name="email"
                    value={email}
                  onChange={(event) => {
                    setEmail(event.target.value);
                    if (err) setErr(null);
                  }}
                  placeholder="tu@empresa.com"
                  inputMode="email"
                    autoComplete="email"
                    aria-invalid={Boolean(err)}
                    aria-describedby={err ? "login-error" : undefined}
                  className="lmn-focus-ring h-12 w-full border border-white/[0.07] bg-black/24 pl-10 pr-3 text-sm text-white outline-none transition placeholder:text-white/24 focus:border-white/16"
                />
              </span>
            </label>

            {passwordMode ? (
              <div className="mt-4 grid gap-2">
                <label htmlFor="login-password" className="text-xs font-black text-white/66">
                  Contraseña
                </label>
                <span className="relative block">
                  <KeyRound className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/30" />
                  <input
                    id="login-password"
                    name="password"
                    value={password}
                    onChange={(event) => {
                      setPassword(event.target.value);
                      if (err) setErr(null);
                    }}
                    placeholder="••••••••"
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    aria-invalid={Boolean(err)}
                    aria-describedby={err ? "login-error" : undefined}
                    className="lmn-focus-ring h-12 w-full border border-white/[0.07] bg-black/24 pl-10 pr-12 text-sm text-white outline-none transition placeholder:text-white/24 focus:border-white/16"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((value) => !value)}
                    className="absolute right-2 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center text-white/38 transition hover:text-white"
                    aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </span>
                <button
                  type="button"
                  onClick={() => void recoverPassword()}
                  disabled={loadingRecovery || !isEmail(cleanEmail)}
                  className="justify-self-start text-xs font-bold text-white/46 transition hover:text-white disabled:cursor-not-allowed disabled:opacity-35"
                >
                  {loadingRecovery ? "Enviando recuperación..." : "Recuperar contraseña"}
                </button>
              </div>
            ) : null}

            {!passwordMode && otpSent ? (
              <div className="mt-4 border border-white/[0.06] bg-white/[0.018] p-4">
                <div className="mb-4 border-l border-cyan-300/35 pl-3">
                  <p className="text-sm font-black text-white">
                    Revisa tu correo y abre el enlace de acceso.
                  </p>
                  <p className="mt-1 text-xs leading-5 text-white/48">
                    Si tu correo trae un código, ingresalo aqui. Si solo trae un
                    boton o enlace, no necesitas escribir ningun código.
                  </p>
                </div>
                <label className="grid gap-2">
                  <span className="text-xs font-black text-white/66">
                    Codigo de 6 dígitos opcional
                  </span>
                  <input
                    name="one-time-code"
                    value={otpCode}
                    onChange={(event) => {
                      setOtpCode(event.target.value.replace(/\D/g, "").slice(0, 6));
                      if (err) setErr(null);
                    }}
                    placeholder="123456"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    aria-invalid={Boolean(err)}
                    aria-describedby={err ? "login-error" : undefined}
                    className="lmn-focus-ring h-12 border border-white/[0.07] bg-black/24 px-3 text-center text-lg font-black tracking-[0.34em] text-white outline-none placeholder:text-white/18 focus:border-white/16"
                  />
                </label>
              </div>
            ) : null}

            <button
              type="submit"
              disabled={!canSubmit || busy}
              className="lmn-auth-submit lmn-focus-ring mt-5 inline-flex h-12 w-full items-center justify-center gap-2 text-sm font-black transition disabled:cursor-not-allowed disabled:opacity-55"
            >
              {loadingLink || loadingPass || loadingOtpVerify ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : null}
              {passwordMode
                ? loadingPass
                  ? "Entrando..."
                  : "Entrar al panel"
                : otpSent && otpCode.length > 0
                ? otpCode.length === 6
                  ? loadingOtpVerify
                    ? "Verificando..."
                    : "Verificar y entrar"
                  : "Completa el código"
                : loadingLink
                ? "Enviando..."
                : cooldown > 0
                ? `Reintentar en ${cooldown}s`
                : "Enviar acceso seguro"}
              {!loadingLink && !loadingPass && !loadingOtpVerify ? (
                <ArrowRight className="h-4 w-4" />
              ) : null}
            </button>

            {!passwordMode && otpSent ? (
              <button
                type="button"
                onClick={sendMagicLink}
                disabled={loadingLink || cooldown > 0}
                className="mt-3 inline-flex h-10 w-full items-center justify-center text-xs font-bold text-white/50 transition hover:bg-white/[0.025] hover:text-white disabled:opacity-40"
              >
                {cooldown > 0 ? `Puedes reenviar en ${cooldown}s` : "Reenviar acceso"}
              </button>
            ) : null}

            <button
              type="button"
              onClick={() => {
                setPasswordMode((value) => !value);
                setPassword("");
                setOtpCode("");
                setOk(null);
                setErr(null);
              }}
              className="mt-3 inline-flex h-10 w-full items-center justify-center text-xs font-bold text-white/54 transition hover:bg-white/[0.025] hover:text-white"
            >
              {passwordMode ? "Usar enlace/código por correo" : "Entrar con contraseña"}
            </button>

            {ok ? (
              <div className="mt-4 flex items-start gap-3 border border-emerald-300/16 bg-emerald-400/8 p-3 text-sm leading-6 text-emerald-100" role="status" aria-live="polite">
                <CheckCircle2 className="mt-1 h-4 w-4 shrink-0" />
                <span>{ok}</span>
              </div>
            ) : null}

            {err ? (
              <div id="login-error" className="mt-4 flex items-start gap-3 border border-red-300/16 bg-red-500/10 p-3 text-sm leading-6 text-red-100" role="alert">
                <AlertCircle className="mt-1 h-4 w-4 shrink-0" />
                <span>{err}</span>
              </div>
            ) : null}

            <div className="mt-6 grid grid-cols-3 gap-2">
              {[
                [<ShieldCheck key="secure" className="h-3.5 w-3.5" />, "Seguro"],
                [<Building2 key="business" className="h-3.5 w-3.5" />, "Empresa"],
                [<Sparkles key="ai" className="h-3.5 w-3.5" />, "IA"],
              ].map(([icon, label]) => (
                <div
                  key={String(label)}
                  className="flex items-center justify-center gap-2 border border-white/[0.05] bg-white/[0.014] px-2 py-2 text-[11px] font-black text-white/42"
                >
                  {icon}
                  {label}
                </div>
              ))}
            </div>

            <div className="mt-5 flex flex-wrap items-center justify-center gap-3 text-[11px] font-bold text-white/36">
              <Link href="/legal/terms" className="transition hover:text-white/70">
                Términos
              </Link>
              <Link href="/legal/privacy" className="transition hover:text-white/70">
                Privacidad
              </Link>
              <Link href="/support" className="transition hover:text-white/70">
                Soporte
              </Link>
            </div>
          </form>
      </section>
    </main>
  );
}
