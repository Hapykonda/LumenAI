import Link from "next/link";
import { OwnerProfileSettings } from "../settings/OwnerProfileSettings";
import { LumenitePermissions } from "../permissions/LumenitePermissions";
import SystemHealthPage from "../system-health/page";

const VIEWS = [
  { id: "profile", label: "Perfil", href: "/panel/access" },
  { id: "permissions", label: "Roles y permisos", href: "/panel/access?view=permissions" },
  { id: "security", label: "Seguridad operativa", href: "/panel/access?view=security" },
] as const;

export default async function AccessPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string }>;
}) {
  const { view: requestedView } = await searchParams;
  const view = requestedView === "permissions" || requestedView === "security"
    ? requestedView
    : "profile";

  return (
    <div className="grid gap-5 pb-10">
      <nav className="flex flex-wrap gap-2" aria-label="Vistas de Access">
        {VIEWS.map((item) => (
          <Link
            key={item.id}
            href={item.href}
            aria-current={view === item.id ? "page" : undefined}
            className={`rounded-full border px-4 py-2 text-xs font-semibold uppercase tracking-[.12em] transition ${view === item.id ? "border-[var(--lmn-accent)] bg-[color-mix(in_srgb,var(--lmn-accent)_14%,transparent)] text-white" : "border-white/10 text-white/55 hover:border-white/25 hover:text-white"}`}
          >
            {item.label}
          </Link>
        ))}
      </nav>
      {view === "permissions" ? <LumenitePermissions /> : null}
      {view === "security" ? <SystemHealthPage /> : null}
      {view === "profile" ? <OwnerProfileSettings /> : null}
    </div>
  );
}
