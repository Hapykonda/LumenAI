"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  ArrowRight,
  Building2,
  CheckCircle2,
  Command,
  Eye,
  EyeOff,
  Globe2,
  KeyRound,
  Loader2,
  LockKeyhole,
  Mail,
  ShieldCheck,
  Sparkles,
  Workflow,
} from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import { AnimatedGradientText } from "@/components/ui/animated-gradient-text";
import { BorderBeam } from "@/components/ui/border-beam";
import { GridPattern } from "@/components/ui/grid-pattern";
import { Meteors } from "@/components/ui/meteors";
import { ShimmerButton } from "@/components/ui/shimmer-button";
import { getAppUrl } from "@/lib/env";

function getBaseUrl() {
  const envUrl = getAppUrl();
  if (envUrl) return envUrl.replace(/\/$/, "");
  return window.location.origin;
}

function getCallbackUrl() {
  return `${getBaseUrl()}/auth/confirm?next=/panel`;
}

function getMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

function normalizeAuthError(raw: string) {
  const value = decodeURIComponent(raw.replace(/\+/g, " ")).trim();
  const lower = value.toLowerCase();

  if (!value) return "No se pudo iniciar sesión.";
  if (lower.includes("missing_code") || lower.includes("missing callback")) {
    return "El enlace de acceso no es válido o ya expiró. Solicita uno nuevo.";
  }
  if (lower.includes("verifyotp") || lower.includes("token")) {
    return "El código o enlace no pudo verificarse. Solicita un nuevo acceso.";
  }
  if (lower.includes("exchange")) {
    return "No se pudo completar la sesión. Intenta nuevamente.";
  }
  if (lower.includes("email not confirmed")) {
    return "Tu correo aún no está confirmado. Revisa tu bandeja de entrada.";
  }
  if (lower.includes("invalid login credentials")) {
    return "Correo o contraseña incorrectos.";
  }
  if (lower.includes("rate limit")) {
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
  const [passwordMode, setPasswordMode] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [password, setPassword] = useState("");
  const [loadingLink, setLoadingLink] = useState(false);
  const [loadingPass, setLoadingPass] = useState(false);
  const [loadingGoogle, setLoadingGoogle] = useState(false);
  const [loadingOtpVerify, setLoadingOtpVerify] = useState(false);
  const [ok, setOk] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [otpSent, setOtpSent] = useState(false);
  const [otpCode, setOtpCode] = useState("");
  const [cooldown, setCooldown] = useState(0);

  const cleanEmail = email.trim().toLowerCase();
  const busy = loadingLink || loadingPass || loadingGoogle || loadingOtpVerify;
  const canSubmit = useMemo(() => {
    if (!isEmail(cleanEmail)) return false;
    if (passwordMode) return password.length > 0 && !loadingPass;
    if (otpSent && otpCode.length >= 6) return !loadingOtpVerify;
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

    const rawError =
      searchParams.get("e") ||
      searchParams.get("error_description") ||
      searchParams.get("error") ||
      hashParams.get("error_description") ||
      hashParams.get("error_code") ||
      hashParams.get("error");

    if (!rawError) return;

    setErr(normalizeAuthError(rawError));
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
        options: { emailRedirectTo: getCallbackUrl() },
      });

      if (error) throw error;

      setOk("Acceso enviado. Revisa tu correo o escribe el código de 6 dígitos.");
      setOtpSent(true);
      setCooldown(60);
    } catch (error) {
      const msg = normalizeAuthError(getMessage(error, "No se pudo enviar el correo."));
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
      setErr("El código debe tener 6 dígitos.");
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
        throw new Error("No se pudo obtener la sesión.");
      }

      await persistSession(session.access_token, session.refresh_token);
      setOk("Sesión verificada. Entrando al panel...");
      router.replace("/panel");
    } catch (error) {
      setErr(normalizeAuthError(getMessage(error, "No se pudo verificar el código.")));
    } finally {
      setLoadingOtpVerify(false);
    }
  }

  async function loginWithPassword() {
    setErr(null);
    setOk(null);

    if (!validateEmail()) return;
    if (!password) {
      setErr("Escribe tu contraseña.");
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
        throw new Error("No se pudo obtener la sesión.");
      }

      await persistSession(session.access_token, session.refresh_token);
      setOk("Sesión iniciada. Redirigiendo...");
      router.replace("/panel");
    } catch (error) {
      setErr(normalizeAuthError(getMessage(error, "No se pudo iniciar sesión.")));
    } finally {
      setLoadingPass(false);
    }
  }

  async function loginWithGoogle() {
    setErr(null);
    setOk(null);

    try {
      setLoadingGoogle(true);
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: getCallbackUrl() },
      });

      if (error) throw error;
    } catch (error) {
      setErr(normalizeAuthError(getMessage(error, "Google aún no está configurado.")));
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

    if (otpSent && otpCode.length >= 6) {
      await verifyOtpCode();
      return;
    }

    await sendMagicLink();
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#05070B] text-white">
      <div
        aria-hidden="true"
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(circle at 96% 0%, rgba(0,229,255,.10), transparent 36%), radial-gradient(circle at 0% 22%, rgba(27,67,255,.075), transparent 40%), radial-gradient(circle at 84% 100%, rgba(108,59,255,.055), transparent 52%), linear-gradient(180deg, #05070B 0%, #030408 100%)",
        }}
      />
      <div
        aria-hidden="true"
        className="absolute inset-0 opacity-[.16]"
        style={{
          backgroundImage:
            "linear-gradient(90deg, rgba(255,255,255,.06) 1px, transparent 1px), linear-gradient(180deg, rgba(255,255,255,.05) 1px, transparent 1px)",
          backgroundSize: "86px 86px",
          maskImage:
            "radial-gradient(circle at 50% 30%, black, transparent 70%)",
        }}
      />
      <GridPattern
        width={64}
        height={64}
        strokeDasharray="3 8"
        className="opacity-[.13] [mask-image:radial-gradient(circle_at_50%_22%,black,transparent_68%)]"
      />
      <Meteors
        number={9}
        minDelay={0.8}
        maxDelay={5.2}
        minDuration={4}
        maxDuration={9}
        angle={218}
        className="bg-cyan-100/70 shadow-[0_0_0_1px_rgba(0,229,255,.14),0_0_22px_rgba(0,229,255,.20)]"
      />
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,transparent_0%,rgba(0,0,0,.28)_58%,rgba(0,0,0,.76)_100%)]"
      />

      <nav className="relative z-10 mx-auto flex max-w-7xl items-center justify-between px-5 py-5 md:px-8">
        <Link href="/" className="group flex items-center gap-3">
          <span className="grid h-10 w-10 place-items-center border border-white/[0.08] bg-white/[0.035] text-sm font-black shadow-[inset_0_1px_0_rgba(255,255,255,.08)] transition group-hover:border-white/14">
            L
          </span>
          <span className="text-sm font-black tracking-[-0.02em] text-white">
            LumenAI
          </span>
        </Link>

        <Link
          href="/"
          className="inline-flex h-10 items-center gap-2 border border-white/[0.07] bg-white/[0.025] px-4 text-xs font-bold text-white/68 transition hover:border-white/12 hover:bg-white/[0.045] hover:text-white"
        >
          Volver al sitio
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </nav>

      <section className="relative z-10 mx-auto grid min-h-[calc(100svh-82px)] max-w-7xl grid-cols-1 gap-8 px-5 pb-10 md:px-8 lg:grid-cols-[minmax(0,.95fr)_minmax(390px,456px)] lg:items-center">
        <div className="hidden lg:block">
          <div className="inline-flex items-center gap-2 border border-white/[0.07] bg-white/[0.025] px-3 py-2 text-xs font-bold text-white/60">
            <ShieldCheck className="h-3.5 w-3.5 text-[#00E5FF]" />
            Acceso seguro para equipos comerciales
          </div>

          <h1 className="mt-7 max-w-3xl text-6xl font-black leading-[.9] tracking-[-0.055em] text-white xl:text-7xl">
            Entra a la consola que convierte conversaciones en{" "}
            <AnimatedGradientText
              colorFrom="#00E5FF"
              colorTo="#1B43FF"
              speed={0.8}
            >
              ventas
            </AnimatedGradientText>
            .
          </h1>

          <p className="mt-6 max-w-2xl text-base leading-7 text-white/56">
            LumenAI reúne widget, IA comercial, Knowledge, leads y analítica en
            una plataforma clara para operar, medir y escalar atención.
          </p>

          <div className="mt-8 grid max-w-3xl grid-cols-3 gap-3">
            {[
              {
                icon: <Command className="h-4 w-4" />,
                title: "Control",
                text: "Panel, reglas y estados del sistema.",
              },
              {
                icon: <Workflow className="h-4 w-4" />,
                title: "Conversión",
                text: "Leads, score y seguimiento comercial.",
              },
              {
                icon: <Globe2 className="h-4 w-4" />,
                title: "Mercado",
                text: "Geo insights para decidir campañas.",
              },
            ].map((item) => (
              <div
                key={item.title}
                className="apex-cut border border-white/[0.055] bg-white/[0.018] p-4 shadow-[0_12px_28px_rgba(0,0,0,.20)]"
              >
                <div className="flex items-center gap-2 text-white/80">
                  {item.icon}
                  <span className="text-sm font-black">{item.title}</span>
                </div>
                <p className="mt-3 text-xs leading-5 text-white/42">{item.text}</p>
              </div>
            ))}
          </div>

          <div className="mt-8 max-w-2xl border-l border-white/[0.08] pl-5">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-white/34">
              Flujo de acceso
            </p>
            <p className="mt-2 text-sm leading-6 text-white/46">
              Magic link para entrar rápido, código OTP para confirmar desde la
              misma pantalla y contraseña para equipos que ya la tengan activa.
            </p>
          </div>
        </div>

        <div className="apex-panel relative border border-white/[0.07] bg-[#0B0F16]/82 p-4 shadow-[0_24px_70px_rgba(0,0,0,.46)]">
          <BorderBeam
            size={140}
            duration={11}
            colorFrom="#00E5FF"
            colorTo="#1B43FF"
            borderWidth={1}
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0"
            style={{
              background:
                "radial-gradient(circle at 0% 0%, rgba(0,229,255,.13), transparent 36%), radial-gradient(circle at 100% 8%, rgba(27,67,255,.12), transparent 34%)",
            }}
          />

          <form
            onSubmit={handleSubmit}
            className="apex-cut relative border border-white/[0.065] bg-[#080B12]/92 p-5 shadow-[inset_0_1px_0_rgba(255,255,255,.035)] md:p-6"
          >
            <div className="mb-6 flex items-start justify-between gap-4">
              <div>
                <div className="text-[10px] font-black uppercase tracking-[0.22em] text-white/30">
                  Acceso privado
                </div>
                <h2 className="mt-2 text-3xl font-black tracking-[-0.045em] text-white">
                  {passwordMode ? "Iniciar sesión" : "Acceder al panel"}
                </h2>
                <p className="mt-3 text-sm leading-6 text-white/48">
                  {passwordMode
                    ? "Usa tus credenciales para entrar a la consola."
                    : "Recibe un enlace seguro o confirma con código de 6 dígitos."}
                </p>
              </div>

              <div className="grid h-11 w-11 place-items-center border border-white/[0.08] bg-white/[0.025] text-white/76">
                <LockKeyhole className="h-5 w-5" />
              </div>
            </div>

            <button
              type="button"
              onClick={loginWithGoogle}
              disabled={loadingGoogle}
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
                  value={email}
                  onChange={(event) => {
                    setEmail(event.target.value);
                    if (err) setErr(null);
                  }}
                  placeholder="tu@empresa.com"
                  inputMode="email"
                  autoComplete="email"
                  className="lmn-focus-ring h-12 w-full border border-white/[0.07] bg-black/24 pl-10 pr-3 text-sm text-white outline-none transition placeholder:text-white/24 focus:border-white/16"
                />
              </span>
            </label>

            {passwordMode ? (
              <label className="mt-4 grid gap-2">
                <span className="text-xs font-black text-white/66">Contraseña</span>
                <span className="relative block">
                  <KeyRound className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/30" />
                  <input
                    value={password}
                    onChange={(event) => {
                      setPassword(event.target.value);
                      if (err) setErr(null);
                    }}
                    placeholder="••••••••"
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
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
              </label>
            ) : null}

            {!passwordMode && otpSent ? (
              <div className="mt-4 border border-white/[0.06] bg-white/[0.018] p-4">
                <label className="grid gap-2">
                  <span className="text-xs font-black text-white/66">
                    Código de 6 dígitos
                  </span>
                  <input
                    value={otpCode}
                    onChange={(event) => {
                      setOtpCode(event.target.value.replace(/\D/g, "").slice(0, 6));
                      if (err) setErr(null);
                    }}
                    placeholder="123456"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    className="lmn-focus-ring h-12 border border-white/[0.07] bg-black/24 px-3 text-center text-lg font-black tracking-[0.34em] text-white outline-none placeholder:text-white/18 focus:border-white/16"
                  />
                </label>
              </div>
            ) : null}

            <ShimmerButton
              type="submit"
              disabled={!canSubmit || busy}
              shimmerColor="#F5F7FA"
              shimmerDuration="2.8s"
              shimmerSize="0.08em"
              borderRadius="16px"
              background="linear-gradient(135deg,#00E5FF,#008CFF 45%,#1B43FF 75%,#6C3BFF)"
              className="lmn-focus-ring mt-5 h-12 w-full gap-2 border-cyan-200/35 text-sm font-black text-[#05070B] transition hover:translate-y-[-1px] disabled:translate-y-0 disabled:cursor-not-allowed disabled:opacity-55"
            >
              {loadingLink || loadingPass || loadingOtpVerify ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : null}
              {passwordMode
                ? loadingPass
                  ? "Entrando..."
                  : "Entrar al panel"
                : otpSent && otpCode.length >= 6
                ? loadingOtpVerify
                  ? "Verificando..."
                  : "Verificar y entrar"
                : loadingLink
                ? "Enviando..."
                : cooldown > 0
                ? `Reintentar en ${cooldown}s`
                : "Enviar acceso seguro"}
              {!loadingLink && !loadingPass && !loadingOtpVerify ? (
                <ArrowRight className="h-4 w-4" />
              ) : null}
            </ShimmerButton>

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
              <div className="mt-4 flex items-start gap-3 border border-emerald-300/16 bg-emerald-400/8 p-3 text-sm leading-6 text-emerald-100">
                <CheckCircle2 className="mt-1 h-4 w-4 shrink-0" />
                <span>{ok}</span>
              </div>
            ) : null}

            {err ? (
              <div className="mt-4 flex items-start gap-3 border border-red-300/16 bg-red-500/10 p-3 text-sm leading-6 text-red-100">
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
          </form>
        </div>
      </section>
    </main>
  );
}
