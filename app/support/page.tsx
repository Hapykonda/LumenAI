import Link from "next/link";

export default function SupportPage() {
  return (
    <main className="min-h-screen bg-[#05070B] px-5 py-10 text-white">
      <section className="mx-auto max-w-3xl rounded-[12px] border border-white/[0.08] bg-white/[0.035] p-6">
        <p className="text-[11px] font-black uppercase tracking-[0.18em] text-white/36">
          LumenAI soporte
        </p>
        <h1 className="mt-3 text-4xl font-black tracking-[-0.05em]">
          Soporte del sistema
        </h1>
        <p className="mt-4 text-sm leading-7 text-white/58">
          Para pilotos internos, usa System Health dentro del panel para revisar
          Auth, Supabase, widget, Knowledge, agentes, snapshots y variables
          requeridas sin exponer secretos.
        </p>
        <div className="mt-6 grid gap-3 text-sm leading-7 text-white/58">
          <p>1. Revisa Access → Seguridad operativa si ya tienes acceso.</p>
          <p>2. Verifica que el widget use `public_key` y que Knowledge este completo.</p>
          <p>3. Si el problema es de acceso, solicita un nuevo magic link desde Login.</p>
        </div>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            href="/login"
            className="inline-flex h-11 items-center rounded-[8px] bg-white px-4 text-sm font-black text-[#05070B]"
          >
            Volver al acceso
          </Link>
          <Link
            href="/panel/access?view=security"
            className="inline-flex h-11 items-center rounded-[8px] border border-white/[0.08] bg-white/[0.035] px-4 text-sm font-black text-white/72"
          >
            Abrir Health
          </Link>
        </div>
      </section>
    </main>
  );
}
