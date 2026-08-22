import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  BadgeCheck,
  Bot,
  BrainCircuit,
  CheckCircle2,
  Command,
  FileText,
  GitBranch,
  HeartPulse,
  LayoutDashboard,
  LockKeyhole,
  MessageSquareText,
  Radar,
  ShieldCheck,
  Sparkles,
  Target,
  UsersRound,
} from "lucide-react";
import { AnimatedHeroLights } from "@/components/ui/animated-hero-lights";
import { LumenLogo } from "@/components/brand/lumen-logo";

const modules = [
  {
    icon: Bot,
    title: "Widget",
    text: "Asistente instalable para atender visitantes, responder con contexto y abrir conversaciones comerciales.",
  },
  {
    icon: BrainCircuit,
    title: "Knowledge",
    text: "Memoria del negocio para servicios, precios, pagos, politicas, horarios, contacto y FAQ.",
  },
  {
    icon: Command,
    title: "Config IA",
    text: "Consola para pedir cambios, revisar impacto, aplicar acciones controladas y conservar trazabilidad.",
  },
  {
    icon: MessageSquareText,
    title: "Chat",
    text: "Inbox comercial para conversaciones reales, takeover humano, contexto y seguimiento.",
  },
  {
    icon: UsersRound,
    title: "Leads",
    text: "Pipeline con contacto, intencion, score, estado y relacion con la conversacion original.",
  },
  {
    icon: Radar,
    title: "Radar Ejecutivo",
    text: "Senales, riesgos, recomendaciones y actividad priorizada para decidir que atender primero.",
  },
  {
    icon: GitBranch,
    title: "Business Twin",
    text: "Simulacion de decisiones comerciales antes de aplicar cambios en el negocio.",
  },
  {
    icon: FileText,
    title: "Research y Campaigns",
    text: "Investigacion, hallazgos, ofertas, variantes y tareas comerciales listas para aprobacion.",
  },
];

const flow = [
  ["Conversacion", "El visitante pregunta desde el widget."],
  ["Lead", "LumenAI detecta intencion y captura contacto cuando corresponde."],
  ["Oportunidad", "Growth y Radar priorizan la accion con evidencia."],
  ["Accion", "Config IA, Campaigns o el equipo ejecutan el siguiente paso."],
];

const industries = [
  "Servicios profesionales",
  "Ecommerce",
  "Educacion",
  "Salud privada",
  "Inmobiliaria",
  "Agencias y consultoras",
];

const faqs = [
  [
    "¿LumenAI es solo un chatbot?",
    "No. El widget es la puerta de entrada, pero el valor esta en el panel: Knowledge, leads, chat, configuracion, inteligencia y acciones controladas.",
  ],
  [
    "¿El sistema inventa metricas?",
    "No debe hacerlo. Las vistas operativas deben distinguir datos reales, estados sin datos y modulos que dependen de integraciones externas.",
  ],
  [
    "¿Puedo controlar como responde la IA?",
    "Si. Calibration y Knowledge definen tono, reglas, limites, objeciones, saludo, acciones y memoria comercial.",
  ],
  [
    "¿Que necesito para empezar?",
    "Crear el negocio, completar Knowledge, publicar la calibracion e instalar el script del widget en el sitio.",
  ],
];

export default function Home() {
  return (
    <main className="lmn-public-shell min-h-screen bg-[#05070B] text-white">
      <section className="relative overflow-hidden px-4 py-4 md:px-6">
        <div
          aria-hidden="true"
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(900px 560px at 82% 6%, rgba(0,229,255,.16), transparent 62%), radial-gradient(860px 560px at 12% 22%, rgba(27,67,255,.13), transparent 58%), radial-gradient(720px 520px at 92% 92%, rgba(108,59,255,.08), transparent 64%), linear-gradient(180deg,#05070B,#030408)",
          }}
        />
        <AnimatedHeroLights intensity="high" className="opacity-75" />
        <div
          aria-hidden="true"
          className="absolute inset-0 opacity-[0.14]"
          style={{
            backgroundImage:
              "linear-gradient(90deg, rgba(255,255,255,.07) 1px, transparent 1px), linear-gradient(180deg, rgba(255,255,255,.055) 1px, transparent 1px)",
            backgroundSize: "88px 88px",
            maskImage: "radial-gradient(circle at 50% 12%, black, transparent 72%)",
          }}
        />

        <nav className="relative z-10 mx-auto flex max-w-7xl items-center justify-between rounded-[12px] border border-white/[0.07] bg-white/[0.035] px-4 py-3 shadow-[0_18px_50px_rgba(0,0,0,.24)] backdrop-blur-xl">
          <Link href="/" className="flex items-center gap-3 no-underline">
            <LumenLogo label="LumenAI" subline="AI Sales & Support System" priority />
          </Link>

          <div className="flex items-center gap-2">
            <Link
              href="/login"
              className="hidden h-10 items-center rounded-[8px] border border-white/[0.07] bg-white/[0.025] px-4 text-xs font-black text-white/66 no-underline transition hover:border-white/14 hover:text-white sm:inline-flex"
            >
              Entrar
            </Link>
            <Link
              href="/login"
              className="inline-flex h-10 items-center gap-2 rounded-[8px] bg-[linear-gradient(135deg,#00E5FF,#1B43FF)] px-4 text-xs font-black text-white no-underline shadow-[0_18px_40px_rgba(0,142,255,.18)] transition hover:-translate-y-0.5"
            >
              Crear acceso
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </nav>

        <div className="relative z-10 mx-auto grid max-w-7xl gap-8 py-6 lg:grid-cols-[minmax(0,1fr)_minmax(420px,.88fr)] lg:items-center">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-cyan-200/12 bg-cyan-300/[0.055] px-3 py-2 text-[11px] font-black uppercase tracking-[0.16em] text-cyan-100/76">
              <Sparkles className="h-3.5 w-3.5" />
              Sistema operativo comercial con IA
            </div>

            <h1 className="mt-7 text-7xl font-black leading-none tracking-normal text-white">
              LumenAI
            </h1>

            <p className="mt-5 max-w-3xl text-3xl font-black leading-tight tracking-normal text-white/92 md:text-4xl">
              Convierte conversaciones en ventas, soporte y decisiones medibles.
            </p>

            <p className="mt-5 max-w-2xl text-base leading-7 text-white/58">
              LumenAI une widget, Knowledge, chat, leads, calibracion, acciones
              controladas e inteligencia ejecutiva en una sola consola para negocios.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/login"
                className="inline-flex h-12 items-center justify-center gap-2 rounded-[8px] bg-[linear-gradient(135deg,#00E5FF,#008CFF_45%,#1B43FF)] px-5 text-sm font-black text-white no-underline shadow-[0_22px_54px_rgba(0,142,255,.20)] transition hover:-translate-y-0.5"
              >
                Empezar con LumenAI
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/panel/overview"
                className="inline-flex h-12 items-center justify-center gap-2 rounded-[8px] border border-white/[0.08] bg-white/[0.035] px-5 text-sm font-black text-white/72 no-underline transition hover:border-white/15 hover:text-white"
              >
                Abrir panel existente
                <LayoutDashboard className="h-4 w-4" />
              </Link>
            </div>

            <div className="mt-8 grid max-w-3xl gap-3 sm:grid-cols-3">
              {[
                ["Widget", "Atencion publica"],
                ["Knowledge", "Memoria comercial"],
                ["Radar", "Prioridad ejecutiva"],
              ].map(([value, label]) => (
                <div
                  key={label}
                  className="rounded-[10px] border border-white/[0.07] bg-white/[0.026] p-4 shadow-[0_14px_34px_rgba(0,0,0,.18)]"
                >
                  <div className="text-2xl font-black tracking-[-0.05em]">{value}</div>
                  <div className="mt-1 text-xs font-bold text-white/42">{label}</div>
                </div>
              ))}
            </div>
          </div>

          <aside className="rounded-[16px] border border-white/[0.08] bg-white/[0.035] p-3 shadow-[0_30px_90px_rgba(0,0,0,.36)] backdrop-blur-xl">
            <div className="relative overflow-hidden rounded-[12px] border border-white/[0.08] bg-black/42">
              <Image
                src="/brand/lumenai-brand-hero-dark.webp"
                alt="Vista premium del panel LumenAI con modulos de inteligencia comercial"
                width={1200}
                height={780}
                priority
                className="h-auto w-full object-cover opacity-90"
              />
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black via-black/62 to-transparent p-5">
                <div className="flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.16em] text-white/52">
                  <Target className="h-3.5 w-3.5 text-cyan-200" />
                  Flujo conectado
                </div>
                <div className="mt-3 grid gap-2">
                  {flow.map(([title, text], index) => (
                    <div
                      key={title}
                      className="grid grid-cols-[32px_minmax(0,1fr)] gap-3 rounded-[8px] border border-white/[0.07] bg-black/44 p-3"
                    >
                      <span className="grid h-8 w-8 place-items-center rounded-[7px] bg-cyan-300/[0.10] text-xs font-black text-cyan-100">
                        {index + 1}
                      </span>
                      <span>
                        <span className="block text-sm font-black">{title}</span>
                        <span className="mt-1 block text-xs leading-5 text-white/48">
                          {text}
                        </span>
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </aside>
        </div>
      </section>

      <section className="border-y border-white/[0.07] bg-white/[0.018] px-4 py-12 md:px-6">
        <div className="mx-auto max-w-7xl">
          <div className="grid gap-8 lg:grid-cols-[.82fr_1fr] lg:items-end">
            <div>
              <div className="text-[11px] font-black uppercase tracking-[0.18em] text-cyan-100/44">
                Modulos del sistema
              </div>
              <h2 className="mt-2 max-w-2xl text-4xl font-black tracking-[-0.055em]">
                Un panel para atender, aprender, priorizar y actuar.
              </h2>
            </div>
            <p className="text-sm leading-7 text-white/52">
              Cada modulo tiene un rol propio, pero todos deben leer el mismo negocio:
              configuracion, Knowledge, conversaciones, leads, auditoria y acciones.
            </p>
          </div>

          <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {modules.map((item) => {
              const Icon = item.icon;
              return (
                <article
                  key={item.title}
                  className="rounded-[10px] border border-white/[0.07] bg-black/24 p-5 shadow-[0_14px_34px_rgba(0,0,0,.20)]"
                >
                  <div className="grid h-11 w-11 place-items-center rounded-[8px] border border-cyan-200/12 bg-cyan-300/[0.06] text-cyan-100">
                    <Icon className="h-5 w-5" />
                  </div>
                  <h3 className="mt-5 text-lg font-black tracking-[-0.035em]">
                    {item.title}
                  </h3>
                  <p className="mt-2 text-sm leading-6 text-white/50">{item.text}</p>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      <section className="px-4 py-14 md:px-6">
        <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-[minmax(0,1fr)_420px]">
          <div className="rounded-[14px] border border-white/[0.07] bg-white/[0.024] p-6">
            <div className="flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.18em] text-white/42">
              <BadgeCheck className="h-4 w-4 text-cyan-200" />
              Casos de uso por industria
            </div>
            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              {industries.map((industry) => (
                <div
                  key={industry}
                  className="flex items-center gap-3 rounded-[8px] border border-white/[0.06] bg-black/20 p-3"
                >
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-cyan-100/80" />
                  <span className="text-sm font-bold text-white/70">{industry}</span>
                </div>
              ))}
            </div>
          </div>

          <aside className="rounded-[14px] border border-white/[0.07] bg-black/28 p-6">
            <div className="flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.18em] text-white/42">
              <LockKeyhole className="h-4 w-4 text-cyan-200" />
              Seguridad y control
            </div>
            <h2 className="mt-4 text-3xl font-black tracking-[-0.05em]">
              Acciones con trazabilidad, no automatismo ciego.
            </h2>
            <ul className="mt-5 grid gap-3 text-sm leading-6 text-white/54">
              <li className="flex gap-3">
                <ShieldCheck className="mt-1 h-4 w-4 shrink-0 text-cyan-100/80" />
                Autenticacion y sesiones protegidas por Supabase.
              </li>
              <li className="flex gap-3">
                <ShieldCheck className="mt-1 h-4 w-4 shrink-0 text-cyan-100/80" />
                Separacion entre APIs publicas del widget y APIs privadas del panel.
              </li>
              <li className="flex gap-3">
                <ShieldCheck className="mt-1 h-4 w-4 shrink-0 text-cyan-100/80" />
                Snapshots, action runs y rollback donde la accion lo permite.
              </li>
            </ul>
          </aside>
        </div>
      </section>

      <section className="border-t border-white/[0.07] bg-white/[0.018] px-4 py-14 md:px-6">
        <div className="mx-auto max-w-5xl">
          <div className="text-center">
            <div className="text-[11px] font-black uppercase tracking-[0.18em] text-cyan-100/44">
              Preguntas frecuentes
            </div>
            <h2 className="mt-2 text-4xl font-black tracking-[-0.055em]">
              Lo importante antes de operar.
            </h2>
          </div>

          <div className="mt-8 grid gap-3">
            {faqs.map(([question, answer]) => (
              <article
                key={question}
                className="rounded-[10px] border border-white/[0.07] bg-black/22 p-5"
              >
                <h3 className="text-base font-black text-white">{question}</h3>
                <p className="mt-2 text-sm leading-7 text-white/52">{answer}</p>
              </article>
            ))}
          </div>

          <div className="mt-10 rounded-[14px] border border-cyan-200/14 bg-cyan-300/[0.055] p-6 text-center">
            <HeartPulse className="mx-auto h-6 w-6 text-cyan-100" />
            <h2 className="mt-4 text-3xl font-black tracking-[-0.05em]">
              Activa tu sistema comercial inteligente.
            </h2>
            <p className="mx-auto mt-3 max-w-2xl text-sm leading-7 text-white/56">
              Crea el negocio, completa Knowledge, calibra la IA y publica el widget
              cuando estes listo para atender conversaciones reales.
            </p>
            <Link
              href="/login"
              className="mt-6 inline-flex h-12 items-center justify-center gap-2 rounded-[8px] bg-white px-5 text-sm font-black text-[#05070B] no-underline transition hover:-translate-y-0.5"
            >
              Ir al acceso
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      <footer className="border-t border-white/[0.07] px-4 py-8 text-sm text-white/42 md:px-6">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <span className="font-black text-white/72">LumenAI</span>
          <span>AI Sales & Support System</span>
          <div className="flex gap-4">
            <Link href="/login" className="transition hover:text-white">
              Acceso
            </Link>
            <Link href="/panel/system-health" className="transition hover:text-white">
              Health
            </Link>
          </div>
        </div>
      </footer>
    </main>
  );
}
