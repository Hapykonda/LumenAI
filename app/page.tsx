import Link from "next/link";
import {
  ArrowRight,
  BarChart3,
  Bot,
  BrainCircuit,
  CheckCircle2,
  Command,
  LayoutDashboard,
  MessageSquareText,
  SlidersHorizontal,
  Sparkles,
  Target,
  UsersRound,
} from "lucide-react";

const modules = [
  {
    icon: Bot,
    title: "Widget",
    text: "Atencion publica, captacion de leads y respuestas con contexto real.",
  },
  {
    icon: BrainCircuit,
    title: "Knowledge",
    text: "Memoria operativa con servicios, precios, pagos, politicas y FAQ.",
  },
  {
    icon: Command,
    title: "Config IA",
    text: "Lumenite interpreta instrucciones y aplica cambios seguros al panel.",
  },
  {
    icon: BarChart3,
    title: "Radar Ejecutivo",
    text: "Senales internas, mercado y siguientes acciones para operar mejor.",
  },
  {
    icon: UsersRound,
    title: "Leads",
    text: "Mini CRM con score, estado, fuente, pais y accion comercial.",
  },
  {
    icon: MessageSquareText,
    title: "Chat",
    text: "Inbox empresarial con takeover humano y trazabilidad por cliente.",
  },
  {
    icon: SlidersHorizontal,
    title: "Calibracion",
    text: "Studio para personalidad, ventas, objeciones, guardrails y widget.",
  },
];

const readiness = [
  ["Knowledge", "Publicado"],
  ["Widget", "Activo"],
  ["Leads", "Midiendo"],
  ["Radar", "Analizando"],
];

export default function Home() {
  return (
    <main className="min-h-screen bg-[#F4F6F8] text-[#111318]">
      <section className="relative overflow-hidden px-4 py-4 md:px-6">
        <div
          aria-hidden="true"
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(760px 460px at 84% 8%, rgba(215,255,47,.30), transparent 58%), radial-gradient(760px 520px at 10% 18%, rgba(100,181,255,.20), transparent 60%), linear-gradient(180deg,#F8FAFC,#EEF2F7)",
          }}
        />
        <div
          aria-hidden="true"
          className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-black/10 to-transparent"
        />

        <nav className="relative z-10 mx-auto flex max-w-7xl items-center justify-between rounded-[20px] border border-black/[0.08] bg-white/82 px-4 py-3 shadow-[0_18px_50px_rgba(17,19,24,.07)] backdrop-blur-xl">
          <Link href="/" className="flex items-center gap-3 no-underline">
            <span className="grid h-10 w-10 place-items-center rounded-[12px] bg-[#111318] text-sm font-black text-white">
              L
            </span>
            <span>
              <span className="block text-sm font-black tracking-[-0.02em]">
                LumenAI
              </span>
              <span className="block text-[10px] font-black uppercase tracking-[0.18em] text-black/40">
                Lumen Minimal SaaS
              </span>
            </span>
          </Link>

          <div className="flex items-center gap-2">
            <Link
              href="/login"
              className="hidden h-10 items-center rounded-[12px] border border-black/[0.08] bg-white px-4 text-xs font-black text-black/70 no-underline shadow-sm transition hover:border-black/15 hover:text-black sm:inline-flex"
            >
              Entrar
            </Link>
            <Link
              href="/panel"
              className="inline-flex h-10 items-center gap-2 rounded-[12px] bg-[#111318] px-4 text-xs font-black text-white no-underline shadow-[0_18px_40px_rgba(17,19,24,.18)] transition hover:-translate-y-0.5"
            >
              Entrar al panel
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </nav>

        <div className="relative z-10 mx-auto grid max-w-7xl gap-8 py-10 md:py-16 lg:grid-cols-[minmax(0,1.02fr)_minmax(420px,.78fr)] lg:items-center">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-black/[0.08] bg-white/78 px-3 py-2 text-[11px] font-black uppercase tracking-[0.16em] text-black/52 shadow-sm">
              <Sparkles className="h-3.5 w-3.5 text-[#7C9500]" />
              IA operativa para ventas y soporte
            </div>

            <h1 className="mt-7 max-w-5xl text-5xl font-black leading-[0.92] tracking-[-0.06em] text-[#111318] md:text-7xl">
              Convierte cada conversacion en ventas, soporte y oportunidades medibles.
            </h1>

            <p className="mt-6 max-w-2xl text-base leading-8 text-black/58 md:text-lg">
              LumenAI centraliza atencion, Knowledge, leads, chat, widget,
              calibracion y radar ejecutivo en un solo sistema impulsado por IA.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/login"
                className="inline-flex h-12 items-center justify-center gap-2 rounded-[14px] bg-[#111318] px-5 text-sm font-black text-white no-underline shadow-[0_22px_54px_rgba(17,19,24,.20)] transition hover:-translate-y-0.5"
              >
                Entrar al panel
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/panel/overview"
                className="inline-flex h-12 items-center justify-center gap-2 rounded-[14px] border border-black/[0.10] bg-white/86 px-5 text-sm font-black text-black/72 no-underline shadow-sm transition hover:border-black/18 hover:text-black"
              >
                Ver sistema
                <LayoutDashboard className="h-4 w-4" />
              </Link>
            </div>

            <div className="mt-8 grid max-w-2xl gap-3 sm:grid-cols-3">
              {[
                ["24/7", "Canal publico activo"],
                ["1", "Panel para operar"],
                ["IA", "Configuracion asistida"],
              ].map(([value, label]) => (
                <div
                  key={label}
                  className="rounded-[18px] border border-black/[0.07] bg-white/72 p-4 shadow-[0_14px_34px_rgba(17,19,24,.06)]"
                >
                  <div className="text-2xl font-black tracking-[-0.05em]">{value}</div>
                  <div className="mt-1 text-xs font-bold text-black/44">{label}</div>
                </div>
              ))}
            </div>
          </div>

          <aside className="rounded-[26px] border border-black/[0.08] bg-[#111318] p-3 text-white shadow-[0_30px_90px_rgba(17,19,24,.28)]">
            <div className="rounded-[20px] border border-white/[0.08] bg-white/[0.035] p-4">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <div className="text-[10px] font-black uppercase tracking-[0.18em] text-white/38">
                    Command center
                  </div>
                  <h2 className="mt-2 text-2xl font-black tracking-[-0.05em]">
                    Sistema listo para operar
                  </h2>
                </div>
                <span className="rounded-full bg-[#D7FF2F] px-3 py-1 text-[11px] font-black text-[#111318]">
                  Live
                </span>
              </div>

              <div className="mt-5 grid gap-3">
                {readiness.map(([label, value]) => (
                  <div
                    key={label}
                    className="grid grid-cols-[36px_minmax(0,1fr)_auto] items-center gap-3 rounded-[15px] border border-white/[0.08] bg-white/[0.040] p-3"
                  >
                    <span className="grid h-9 w-9 place-items-center rounded-[11px] bg-[#D7FF2F]/12 text-[#D7FF2F]">
                      <CheckCircle2 className="h-4 w-4" />
                    </span>
                    <span className="min-w-0">
                      <span className="block text-sm font-black">{label}</span>
                      <span className="mt-1 block text-xs text-white/42">
                        Sincronizado con el panel
                      </span>
                    </span>
                    <span className="text-xs font-black text-white/62">{value}</span>
                  </div>
                ))}
              </div>

              <div className="mt-5 rounded-[18px] border border-white/[0.08] bg-black/20 p-4">
                <div className="flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.14em] text-white/40">
                  <Target className="h-3.5 w-3.5" />
                  Siguiente accion
                </div>
                <p className="mt-3 text-sm leading-6 text-white/70">
                  Pide a Lumenite que agregue productos, ajuste el tono, publique
                  el widget o detecte oportunidades desde conversaciones reales.
                </p>
              </div>
            </div>
          </aside>
        </div>
      </section>

      <section className="border-t border-black/[0.08] bg-white px-4 py-12 md:px-6">
        <div className="mx-auto max-w-7xl">
          <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
            <div>
              <div className="text-[11px] font-black uppercase tracking-[0.18em] text-black/38">
                Modulos reales
              </div>
              <h2 className="mt-2 max-w-2xl text-4xl font-black tracking-[-0.055em]">
                Todo lo necesario para atender, vender y medir desde un solo lugar.
              </h2>
            </div>
            <p className="max-w-xl text-sm leading-7 text-black/54">
              LumenAI no separa el chat del negocio: conecta Knowledge,
              calibracion, widget, leads, conversaciones y radar en un flujo
              operativo.
            </p>
          </div>

          <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {modules.map((item) => {
              const Icon = item.icon;
              return (
                <article
                  key={item.title}
                  className="rounded-[22px] border border-black/[0.08] bg-[#F8FAFC] p-5 shadow-[0_14px_34px_rgba(17,19,24,.055)]"
                >
                  <div className="grid h-11 w-11 place-items-center rounded-[14px] bg-[#111318] text-[#D7FF2F]">
                    <Icon className="h-5 w-5" />
                  </div>
                  <h3 className="mt-5 text-lg font-black tracking-[-0.035em]">
                    {item.title}
                  </h3>
                  <p className="mt-2 text-sm leading-6 text-black/54">{item.text}</p>
                </article>
              );
            })}
          </div>
        </div>
      </section>
    </main>
  );
}
