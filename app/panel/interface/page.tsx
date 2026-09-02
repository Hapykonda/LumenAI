import Link from "next/link";
import ColorMixPage from "../color-mix/page";
import { IntegrationsConsole } from "../integrations/IntegrationsConsole";

export default async function InterfacePage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string }>;
}) {
  const { view } = await searchParams;
  const connections = view === "connections";

  return (
    <div className="grid gap-5 pb-10">
      <nav className="flex flex-wrap gap-2" aria-label="Vistas de Interface">
        <Link
          href="/panel/interface"
          aria-current={!connections ? "page" : undefined}
          className={`rounded-full border px-4 py-2 text-xs font-semibold uppercase tracking-[.12em] transition ${!connections ? "border-[var(--lmn-accent)] bg-[color-mix(in_srgb,var(--lmn-accent)_14%,transparent)] text-white" : "border-white/10 text-white/55 hover:border-white/25 hover:text-white"}`}
        >
          Workspace
        </Link>
        <Link
          href="/panel/interface?view=connections"
          aria-current={connections ? "page" : undefined}
          className={`rounded-full border px-4 py-2 text-xs font-semibold uppercase tracking-[.12em] transition ${connections ? "border-[var(--lmn-accent)] bg-[color-mix(in_srgb,var(--lmn-accent)_14%,transparent)] text-white" : "border-white/10 text-white/55 hover:border-white/25 hover:text-white"}`}
        >
          Conexiones contextuales
        </Link>
      </nav>
      {connections ? <IntegrationsConsole /> : <ColorMixPage />}
    </div>
  );
}
