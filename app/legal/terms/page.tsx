import Link from "next/link";

export default function TermsPage() {
  return (
    <main className="min-h-screen bg-[#05070B] px-5 py-10 text-white">
      <section className="mx-auto max-w-3xl rounded-[12px] border border-white/[0.08] bg-white/[0.035] p-6">
        <p className="text-[11px] font-black uppercase tracking-[0.18em] text-white/36">
          LumenAI legal
        </p>
        <h1 className="mt-3 text-4xl font-black tracking-[-0.05em]">
          Terminos de uso
        </h1>
        <p className="mt-4 text-sm leading-7 text-white/58">
          Esta pagina es una base informativa para pilotos privados de LumenAI.
          Antes de una publicacion comercial amplia, estos terminos deben ser
          revisados por el responsable legal del proyecto.
        </p>
        <div className="mt-6 grid gap-4 text-sm leading-7 text-white/58">
          <p>
            El usuario es responsable de la informacion que carga en Knowledge,
            Settings, Calibration y cualquier modulo operativo del panel.
          </p>
          <p>
            LumenAI puede asistir en respuestas, leads y recomendaciones, pero
            las acciones comerciales sensibles deben ser revisadas por el negocio.
          </p>
          <p>
            Las integraciones externas, canales de mensajeria, modelos de IA y
            proveedores de datos pueden requerir credenciales, aprobaciones o
            terminos adicionales.
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
