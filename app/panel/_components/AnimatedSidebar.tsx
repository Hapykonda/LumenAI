"use client";

import {
  memo,
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type ReactNode,
} from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Activity,
  LifeBuoy,
  Menu,
  Settings,
  Sparkles,
  UserCircle2,
  X,
} from "lucide-react";
import { LumenLogo } from "@/components/brand/lumen-logo";
import { cn } from "@/lib/utils";
import {
  isPanelActive,
  PANEL_NAV_GROUP_LABELS,
  type NavGroup,
  type NavItem,
} from "./panel-nav";

const GROUP_ORDER: NavGroup[] = ["center", "builder", "operation", "system"];

type AnimatedSidebarProps = {
  links: NavItem[];
  brand: string;
  subline?: string;
  avatarUrl?: string;
  rightSlot?: ReactNode;
};

function groupLinks(links: NavItem[]) {
  return GROUP_ORDER.map((group) => ({
    group,
    label: PANEL_NAV_GROUP_LABELS[group],
    items: links.filter((item) => (item.group || "center") === group),
  })).filter((group) => group.items.length > 0);
}

function openPulseAssistant() {
  window.dispatchEvent(new Event("lumenai:pulse-open"));
}

export function AnimatedSidebar(props: AnimatedSidebarProps) {
  return (
    <>
      <DesktopSidebar {...props} />
      <MobileSidebar {...props} />
    </>
  );
}

function DesktopSidebar({
  links,
  brand,
  subline,
  avatarUrl,
  rightSlot,
}: AnimatedSidebarProps) {
  const pathname = usePathname() || "";
  const grouped = useMemo(() => groupLinks(links), [links]);

  return (
    <aside className="lmx-sidebar" aria-label="Navegación del producto">
      <div className="lmx-sidebar-frame">
        <header className="lmx-sidebar-header">
          <Link href="/panel/overview" aria-label="Abrir centro de mando">
            <LumenLogo label={brand} subline="Enterprise Intelligence" priority />
          </Link>
          <span className="lmx-sidebar-edition">04</span>
        </header>

        {rightSlot ? <div className="lmx-sidebar-slot">{rightSlot}</div> : null}

        <button type="button" className="lmx-sidebar-pulse" onClick={openPulseAssistant}>
          <span className="lmx-sidebar-pulse-signal"><i aria-hidden="true" /> PULSE / ONLINE</span>
          <strong>Inteligencia operativa</strong>
          <small>{subline || "Sistema empresarial"}</small>
          <Sparkles aria-hidden="true" />
        </button>

        <nav className="lmx-sidebar-nav" aria-label="Secciones de LumenAI">
          {grouped.map((group) => (
            <section key={group.group} className="lmx-sidebar-group">
              <h2>{group.label}</h2>
              <div>
                {group.items.map((item) => (
                  <SidebarLink
                    key={item.href}
                    item={item}
                    active={isPanelActive(pathname, item.href)}
                  />
                ))}
              </div>
            </section>
          ))}
        </nav>

        <footer className="lmx-sidebar-footer">
          <Link href="/panel/system-health" className="lmx-system-status">
            <Activity aria-hidden="true" />
            <span>
              <strong>Sistema operativo</strong>
              <small>Todos los servicios conectados</small>
            </span>
            <i aria-hidden="true" />
          </Link>

          <div className="lmx-sidebar-footer-actions">
            <Link href="/support" aria-label="Abrir soporte" title="Soporte">
              <LifeBuoy aria-hidden="true" />
            </Link>
            <button
              type="button"
              onClick={openPulseAssistant}
              aria-label="Abrir Pulse Radar"
              title="Pulse Radar"
            >
              <Sparkles aria-hidden="true" />
            </button>
            <Link href="/panel/settings" aria-label="Abrir perfil y ajustes" title="Perfil y ajustes">
              {avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={avatarUrl} alt="" referrerPolicy="no-referrer" />
              ) : (
                <Settings aria-hidden="true" />
              )}
            </Link>
          </div>
        </footer>
      </div>
    </aside>
  );
}

const SidebarLink = memo(function SidebarLink({
  item,
  active,
  onNavigate,
}: {
  item: NavItem;
  active: boolean;
  onNavigate?: () => void;
}) {
  return (
    <Link
      href={item.href}
      className={cn("lmx-sidebar-link", active && "is-active")}
      aria-current={active ? "page" : undefined}
      onClick={onNavigate}
    >
      {item.icon}
      <span className="lmx-sidebar-link-copy">
        <strong>{item.label}</strong>
        {active && item.desc ? <small>{item.desc}</small> : null}
      </span>
      {item.soon ? <span className="lmx-sidebar-badge">Pronto</span> : null}
    </Link>
  );
});

function MobileSidebar({
  links,
  brand,
  avatarUrl,
}: AnimatedSidebarProps) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname() || "";
  const grouped = useMemo(() => groupLinks(links), [links]);
  const drawerRef = useRef<HTMLDivElement>(null);
  const openerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;

    const previousOverflow = document.body.style.overflow;
    const previousFocus = document.activeElement as HTMLElement | null;
    const opener = openerRef.current;
    const drawer = drawerRef.current;
    document.body.style.overflow = "hidden";

    const focusable = drawer?.querySelectorAll<HTMLElement>(
      'a[href], button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])',
    );
    focusable?.[0]?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        return;
      }

      if (event.key !== "Tab" || !focusable?.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleKeyDown);
      (previousFocus || opener)?.focus();
    };
  }, [open]);

  function handleMenuKeyDown(event: ReactKeyboardEvent<HTMLButtonElement>) {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setOpen(true);
    }
  }

  return (
    <>
      <header className="lmx-mobile-header">
        <Link href="/panel/overview" aria-label="Abrir centro de mando">
          <LumenLogo size="sm" label={brand} subline="Business Intelligence" />
        </Link>

        <div className="lmx-mobile-header-actions">
          <button type="button" onClick={openPulseAssistant} aria-label="Abrir Pulse Radar">
            <Sparkles aria-hidden="true" />
          </button>
          <Link href="/panel/settings" aria-label="Abrir perfil y ajustes">
            {avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={avatarUrl} alt="" referrerPolicy="no-referrer" />
            ) : (
              <UserCircle2 aria-hidden="true" />
            )}
          </Link>
          <button
            ref={openerRef}
            type="button"
            onClick={() => setOpen(true)}
            onKeyDown={handleMenuKeyDown}
            aria-label="Abrir navegacion"
            aria-expanded={open}
          >
            <Menu aria-hidden="true" />
          </button>
        </div>
      </header>

      {open ? (
        <div className="lmx-mobile-nav-layer">
          <button
            type="button"
            className="lmx-mobile-nav-backdrop"
            onClick={() => setOpen(false)}
            aria-label="Cerrar navegacion"
          />
          <div
            ref={drawerRef}
            className="lmx-mobile-nav-drawer"
            role="dialog"
            aria-modal="true"
            aria-label="Navegacion de LumenAI"
          >
            <header>
              <LumenLogo label={brand} subline="Business Intelligence" />
              <button type="button" onClick={() => setOpen(false)} aria-label="Cerrar navegacion">
                <X aria-hidden="true" />
              </button>
            </header>

            <nav aria-label="Secciones de LumenAI">
              {grouped.map((group) => (
                <section key={group.group} className="lmx-mobile-nav-group">
                  <h2>{group.label}</h2>
                  <div>
                    {group.items.map((item) => (
                      <SidebarLink
                        key={item.href}
                        item={item}
                        active={isPanelActive(pathname, item.href)}
                        onNavigate={() => setOpen(false)}
                      />
                    ))}
                  </div>
                </section>
              ))}
            </nav>
          </div>
        </div>
      ) : null}
    </>
  );
}
