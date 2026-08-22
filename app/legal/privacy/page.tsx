import Link from "next/link";

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-[#05070B] px-5 py-10 text-white">
      <section className="mx-auto max-w-3xl rounded-[12px] border border-white/[0.08] bg-white/[0.035] p-6">
        <p className="text-[11px] font-black uppercase tracking-[0.18em] text-white/36">
          LumenAI legal
        </p>
        <h1 className="mt-3 text-4xl font-black tracking-[-0.05em]">
          Privacidad
        </h1>
        <p className="mt-4 text-sm leading-7 text-white/58">
          LumenAI maneja informacion de negocio, conversaciones, leads y
          configuraciones del asistente. Esta pagina resume la intencion de
          privacidad para pilotos y debe formalizarse antes de produccion amplia.
        </p>
        <div className="mt-6 grid gap-4 text-sm leading-7 text-white/58">
          <p>
            Las claves privadas y service role deben mantenerse solo en servidor.
            Nunca deben publicarse en clientes, repositorios o mensajes.
          </p>
          <p>
            El widget debe usar public keys y no identificadores internos del
            negocio como sustituto de seguridad.
          </p>
          <p>
            La actividad geografica, cuando exista, debe mostrarse de forma
            aproximada y sin exponer direccion exacta, IP completa o datos
            personales innecesarios.
          </p>
        </div>
        <Link
          href="/login"
          className="mt-8 inline-flex h-11 items-center rounded-[8px] bg-white px-4 text-sm font-black text-[#05070B]"
        >
          Volver al acceso
        </Link>
      </section>
    </main>
  );
}
