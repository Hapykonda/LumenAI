import Link from "next/link";
import {
  ArrowRight,
  Bot,
  BrainCircuit,
  CalendarDays,
  Command,
  MessageSquareText,
  ShieldCheck,
  Sparkles,
  Target,
  Zap,
} from "lucide-react";

const operatingMetrics = [
  ["01", "Inbox", "Chats y urgencias en tiempo real"],
  ["02", "Studio", "Personalidad, ventas y reglas"],
  ["03", "Agenda", "Seguimientos y tareas comerciales"],
  ["04", "Pipeline", "Leads, score y cierre"],
];

const productRails = [
  "Qualification loop",
  "Knowledge sync",
  "Lead scoring",
  "Human takeover",
  "Widget telemetry",
  "Conversion memory",
];

export default function Home() {
  return (
    <main className="min-h-screen overflow-hidden bg-[#05070B] text-white">
      <section className="relative min-h-screen px-4 py-4 md:px-6">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_96%_0%,rgba(0,229,255,.10),transparent_34%),radial-gradient(circle_at_0%_22%,rgba(27,67,255,.07),transparent_38%),radial-gradient(circle_at_86%_100%,rgba(108,59,255,.055),transparent_50%),linear-gradient(180deg,rgba(5,7,11,.98),#05070B_82%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(115deg,transparent_0%,rgba(255,255,255,.035)_42%,transparent_64%)] opacity-60" />
        <div className="apex-grid-bg absolute inset-0 opacity-[.16]" />
        <div className="apex-data-rail absolute left-0 right-0 top-[76px] h-px opacity-50" />

        <nav className="relative z-10 mx-auto flex max-w-[1500px] items-center justify-between border border-white/[0.10] bg-black/28 px-4 py-3 apex-cut">
          <Link href="/" className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center border border-white/12 bg-white/[0.045] apex-cut">
              <span className="text-sm font-black text-white">L</span>
            </span>
            <span>
              <span className="block text-sm font-black uppercase tracking-[0.26em]">
                LumenAI
              </span>
              <span className="block text-[10px] font-bold uppercase tracking-[0.18em] text-white/34">
                Revenue intelligence OS
              </span>
            </span>
          </Link>

          <div className="flex items-center gap-2">
            <Link
              href="/login"
              className="apex-button hidden h-10 items-center border border-white/10 bg-white/[0.035] px-4 text-xs font-black uppercase tracking-[0.12em] text-white/75 transition hover:bg-white/[0.065] sm:inline-flex"
            >
              Login
            </Link>
            <Link
              href="/panel"
              data-variant="primary"
              className="apex-button inline-flex h-10 items-center gap-2 border border-cyan-200/30 bg-[linear-gradient(135deg,#00E5FF,#008CFF_45%,#1B43FF_75%,#6C3BFF)] px-4 text-xs font-black uppercase tracking-[0.12em] text-[#05070B] shadow-[0_18px_54px_rgba(0,229,255,.14)]"
            >
              Abrir OS
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </nav>

        <div className="relative z-10 mx-auto grid max-w-[1500px] gap-4 pt-4 lg:grid-cols-[minmax(0,1.05fr)_470px]">
          <div className="apex-panel apex-scan min-h-[calc(100vh-118px)] p-5 md:p-8">
            <div className="flex flex-wrap items-center gap-2">
              <span className="apex-cut border border-cyan-200/20 bg-cyan-300/10 px-3 py-2 text-[11px] font-black uppercase tracking-[0.16em] text-cyan-100">
                AI customer revenue system
              </span>
              <span className="apex-cut border border-white/10 bg-white/[0.035] px-3 py-2 text-[11px] font-black uppercase tracking-[0.16em] text-white/48">
                Built for operators
              </span>
            </div>

            <h1 className="mt-8 max-w-6xl text-[clamp(4rem,10vw,10.5rem)] font-black leading-[.78] tracking-[-0.095em] text-white">
              Convierte
              <br />
              cada{" "}
              <span className="apex-title-word text-cyan-100">
                <span>chat</span>
                <span>lead</span>
                <span>visita</span>
              </span>
              <br />
              en pipeline.
            </h1>

            <p className="mt-8 max-w-3xl text-base leading-8 text-white/58 md:text-lg">
              LumenAI deja de ser un widget bonito y se convierte en un sistema
              operativo comercial: agenda, seguimiento, scoring, knowledge,
              conversaciones, calibracion y control de marca.
            </p>

            <div className="mt-9 grid max-w-5xl grid-cols-1 gap-3 md:grid-cols-4">
              {operatingMetrics.map(([number, title, text]) => (
                <div
                  key={title}
                  className="apex-cut border border-white/[0.09] bg-black/26 p-4"
                >
                  <div className="text-[10px] font-black uppercase tracking-[0.2em] text-cyan-100/54">
                    {number}
                  </div>
                  <div className="mt-5 text-xl font-black tracking-[-0.04em] text-white">
                    {title}
                  </div>
                  <p className="mt-2 text-xs leading-5 text-white/42">{text}</p>
                </div>
              ))}
            </div>

            <div className="mt-10 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/login"
                data-variant="primary"
                className="apex-button inline-flex h-13 items-center justify-center gap-2 border border-cyan-200/30 bg-[linear-gradient(135deg,#00E5FF,#008CFF_45%,#1B43FF_75%,#6C3BFF)] px-6 py-4 text-sm font-black uppercase tracking-[0.12em] text-[#05070B] shadow-[0_20px_80px_rgba(0,229,255,.16)]"
              >
                Entrar al sistema
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/panel/overview"
                className="apex-button inline-flex h-13 items-center justify-center gap-2 border border-white/10 bg-white/[0.04] px-6 py-4 text-sm font-black uppercase tracking-[0.12em] text-white/78"
              >
                Ver command center
                <Command className="h-4 w-4" />
              </Link>
            </div>
          </div>

          <aside className="grid gap-4">
            <div className="apex-panel p-5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-[10px] font-black uppercase tracking-[0.18em] text-white/32">
                    Live modules
                  </div>
                  <h2 className="mt-2 text-2xl font-black tracking-[-0.06em]">
                    Operating stack
                  </h2>
                </div>
                <Bot className="h-6 w-6 text-cyan-100" />
              </div>

              <div className="mt-5 grid gap-3">
                {[
                  [<MessageSquareText key="i" className="h-4 w-4" />, "Inbox", "Respuestas, takeover y prioridad"],
                  [<BrainCircuit key="i" className="h-4 w-4" />, "Knowledge", "Base viva del negocio"],
                  [<CalendarDays key="i" className="h-4 w-4" />, "Agenda", "Seguimientos diarios"],
                  [<Target key="i" className="h-4 w-4" />, "Pipeline", "Score y conversion"],
                ].map(([icon, title, text]) => (
                  <div
                    key={String(title)}
                    className="grid grid-cols-[40px_minmax(0,1fr)_auto] items-center gap-3 border border-white/[0.08] bg-white/[0.025] p-3 apex-cut"
                  >
                    <div className="grid h-10 w-10 place-items-center border border-cyan-200/16 bg-cyan-300/8 text-cyan-100 apex-cut">
                      {icon}
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm font-black text-white">{title}</div>
                      <div className="mt-1 truncate text-xs text-white/38">{text}</div>
                    </div>
                    <ArrowRight className="h-4 w-4 text-white/24" />
                  </div>
                ))}
              </div>
            </div>

            <div className="apex-panel p-5">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-[10px] font-black uppercase tracking-[0.18em] text-white/32">
                    Data rail
                  </div>
                  <h2 className="mt-2 text-2xl font-black tracking-[-0.06em]">
                    Conversion loop
                  </h2>
                </div>
                <Sparkles className="h-5 w-5 text-cyan-100" />
              </div>

              <div className="mt-5 flex flex-wrap gap-2">
                {productRails.map((item) => (
                  <span
                    key={item}
                    className="apex-cut border border-white/[0.08] bg-black/22 px-3 py-2 text-[11px] font-black uppercase tracking-[0.12em] text-white/45"
                  >
                    {item}
                  </span>
                ))}
              </div>

              <div className="mt-6 grid grid-cols-3 gap-2">
                {[
                  [<ShieldCheck key="i" className="h-4 w-4" />, "Secure"],
                  [<Zap key="i" className="h-4 w-4" />, "Fast"],
                  [<Sparkles key="i" className="h-4 w-4" />, "Adaptive"],
                ].map(([icon, label]) => (
                  <div
                    key={String(label)}
                    className="grid min-h-[88px] place-items-center border border-white/[0.08] bg-white/[0.025] text-center apex-cut"
                  >
                    <div>
                      <div className="mx-auto grid h-8 w-8 place-items-center text-cyan-100">
                        {icon}
                      </div>
                      <div className="mt-2 text-[10px] font-black uppercase tracking-[0.14em] text-white/40">
                        {label}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </aside>
        </div>
      </section>
    </main>
  );
}
