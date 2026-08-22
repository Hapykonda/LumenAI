"use client";

import Link from "next/link";
import dynamic from "next/dynamic";
import { usePathname } from "next/navigation";
import React, { useEffect, useMemo, useState } from "react";
import {
  Bell,
  ChevronRight,
  Command,
  HeartPulse,
  Search,
  ShieldCheck,
  Workflow,
  UserCircle2,
} from "lucide-react";
import { AnimatedSidebar } from "./AnimatedSidebar";
import { isPanelActive, PANEL_NAV } from "./panel-nav";
import {
  EMPTY_OWNER_PROFILE,
  OWNER_PROFILE_EVENT,
  type OwnerProfile,
} from "@/lib/owner-profile";
import {
  PANEL_THEME_EVENT,
  applyPanelThemeToRoot,
  readPanelThemeFromStorage,
  savePanelThemeToStorage,
  type PanelThemeColors,
} from "@/lib/panel-theme";

const PanelInsightsAssistant = dynamic(
  () =>
    import("./PanelInsightsAssistant").then((module) => module.PanelInsightsAssistant),
  { ssr: false },
);

function PanelThemeRuntime() {
  useEffect(() => {
    const premiumTheme: PanelThemeColors = {
      base: "#05070B",
      primary: "#5EEBFF",
      secondary: "#3B82F6",
      mode: "dark",
    };
    const stored = readPanelThemeFromStorage();
    const currentVersion = window.localStorage.getItem("lmn_theme_version");
    const shouldUpgradeDefault = currentVersion !== "lumenai-obsidian-os-20260808";

    const initialTheme = shouldUpgradeDefault ? premiumTheme : stored || premiumTheme;

    applyPanelThemeToRoot(initialTheme);
    if (shouldUpgradeDefault) {
      savePanelThemeToStorage(initialTheme);
      window.localStorage.setItem("lmn_theme_version", "lumenai-obsidian-os-20260808");
    }

    const handleThemeChange = (event: Event) => {
      const customEvent = event as CustomEvent<Partial<PanelThemeColors>>;

      applyPanelThemeToRoot(customEvent.detail);
      savePanelThemeToStorage(customEvent.detail);
    };

    window.addEventListener(PANEL_THEME_EVENT, handleThemeChange as EventListener);

    return () => {
      window.removeEventListener(
        PANEL_THEME_EVENT,
        handleThemeChange as EventListener
      );
    };
  }, []);

  return null;
}

function readModePreference() {
  if (typeof window === "undefined") return "dark";
  const stored = readPanelThemeFromStorage();
  return stored?.mode === "light" ? "light" : "dark";
}

function PanelTopbar({
  userEmail,
  ownerProfile,
}: {
  userEmail?: string;
  ownerProfile: OwnerProfile;
}) {
  const pathname = usePathname() || "/panel/overview";
  const [query, setQuery] = useState("");
  const activeItem = useMemo(
    () => PANEL_NAV.find((item) => isPanelActive(pathname, item.href)) ?? PANEL_NAV[0],
    [pathname]
  );
  const results = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return [];

    return PANEL_NAV.filter((item) => {
      const haystack = `${item.label} ${item.desc ?? ""}`.toLowerCase();
      return haystack.includes(normalized);
    }).slice(0, 6);
  }, [query]);

  return (
    <header className="lmn-panel-topbar">
      <div className="lmn-topbar-inner">
        <div className="lmn-topbar-context">
          <div className="lmn-topbar-route">
            <Link href="/panel/overview" className="transition hover:text-white/72">
              Intelligence OS
            </Link>
            <ChevronRight className="h-3.5 w-3.5 shrink-0 text-white/24" />
            <strong>{activeItem?.label ?? "Panel"}</strong>
          </div>
          <div className="lmn-topbar-status">
            <Link
              href="/panel/settings"
              className="inline-flex max-w-[260px] items-center gap-1.5 truncate"
            >
              <ShieldCheck className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">
                {ownerProfile.displayName || userEmail || "Workspace actual"}
              </span>
            </Link>
            <span aria-hidden="true">/</span>
            <Link href="/panel/system-health">
              Estado del sistema
            </Link>
          </div>
        </div>

        <div className="lmn-topbar-actions">
          <div className="lmn-command-search">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/34" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Escape") setQuery("");
              }}
              placeholder="Buscar modulo..."
              aria-label="Buscar modulo del panel"
              className="placeholder:text-white/30"
            />
            <Command className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/22" />

            {results.length ? (
              <div className="lmn-search-results" role="listbox" aria-label="Resultados de busqueda">
                {results.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setQuery("")}
                    role="option"
                    aria-selected="false"
                  >
                    <span className="block text-sm font-black text-white">{item.label}</span>
                    {item.desc ? (
                      <span className="block truncate text-xs text-white/42">{item.desc}</span>
                    ) : null}
                  </Link>
                ))}
              </div>
            ) : null}
          </div>

          <Link
            href="/panel/radar"
            className="lmn-text-command"
            aria-current={activeItem?.href === "/panel/radar" ? "page" : undefined}
          >
            <Bell className="h-4 w-4" />
            Pulse Radar
          </Link>
          <Link
            href="/panel/system-health"
            className="lmn-icon-command"
            aria-label="Abrir salud del sistema"
          >
            <HeartPulse className="h-4 w-4" />
          </Link>
          <Link
            href="/panel/lumenite"
            className="lmn-text-command"
            data-accent="true"
            aria-current={activeItem?.href === "/panel/lumenite" ? "page" : undefined}
          >
            <Workflow className="h-4 w-4" />
            <span className="hidden sm:inline">Lumenite</span>
          </Link>
          <Link
            href="/panel/settings"
            className="lmn-icon-command lmn-profile-command"
            aria-label="Abrir perfil y preferencias"
          >
            {ownerProfile.avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={ownerProfile.avatarUrl}
                alt={`Foto de ${ownerProfile.displayName || "la cuenta"}`}
                className="h-full w-full object-cover"
                referrerPolicy="no-referrer"
              />
            ) : (
              <UserCircle2 className="h-4 w-4" />
            )}
          </Link>
        </div>
      </div>
    </header>
  );
}

export default function PanelShell({
  children,
  userEmail,
  ownerProfile: initialOwnerProfile,
}: {
  children: React.ReactNode;
  userEmail?: string;
  ownerProfile?: OwnerProfile;
}) {
  const [assistantReady, setAssistantReady] = useState(false);
  const [mode, setMode] = useState<"light" | "dark">(readModePreference);
  const [ownerProfile, setOwnerProfile] = useState<OwnerProfile>(
    initialOwnerProfile ?? {
      ...EMPTY_OWNER_PROFILE,
      email: userEmail ?? "",
    },
  );

  useEffect(() => {
    const idleWindow = window as Window & {
      requestIdleCallback?: (
        callback: () => void,
        options?: { timeout: number },
      ) => number;
      cancelIdleCallback?: (handle: number) => void;
    };
    const fallback = window.setTimeout(() => setAssistantReady(true), 1800);
    const idleHandle = idleWindow.requestIdleCallback?.(
      () => {
        window.clearTimeout(fallback);
        setAssistantReady(true);
      },
      { timeout: 1800 },
    );

    return () => {
      window.clearTimeout(fallback);
      if (idleHandle !== undefined) idleWindow.cancelIdleCallback?.(idleHandle);
    };
  }, []);

  useEffect(() => {
    const handleThemeModeChange = (event: Event) => {
      const customEvent = event as CustomEvent<Partial<PanelThemeColors>>;
      const nextMode = customEvent.detail?.mode === "light" ? "light" : "dark";

      setMode(nextMode);
    };

    window.addEventListener(PANEL_THEME_EVENT, handleThemeModeChange as EventListener);

    return () => {
      window.removeEventListener(
        PANEL_THEME_EVENT,
        handleThemeModeChange as EventListener
      );
    };
  }, []);

  useEffect(() => {
    const handleProfileUpdate = (event: Event) => {
      const detail = (event as CustomEvent<OwnerProfile>).detail;
      if (detail) setOwnerProfile(detail);
    };

    window.addEventListener(OWNER_PROFILE_EVENT, handleProfileUpdate);
    return () => {
      window.removeEventListener(OWNER_PROFILE_EVENT, handleProfileUpdate);
    };
  }, []);

  return (
    <div
      className="apex-os lmn-minimal-shell lmn-vision-os lmn-obsidian-system lmn-vercel-system lmn-july4-system relative isolate min-h-screen w-full overflow-x-hidden text-white"
      style={{
        colorScheme: mode,
      }}
    >
      <PanelThemeRuntime />
      <a className="lmn-skip-link" href="#lmn-main-content">
        Saltar al contenido principal
      </a>

      <div className="relative z-10 w-full px-0 py-0">
        <div className="lmn-panel-grid grid grid-cols-1 gap-0 md:grid-cols-[248px_minmax(0,1fr)]">
          <AnimatedSidebar
            brand="LumenAI"
            subline={ownerProfile.displayName || userEmail || "Panel"}
            avatarUrl={ownerProfile.avatarUrl}
            links={PANEL_NAV}
          />

          <div
            className="min-w-0"
            style={{
              contain: "style",
            }}
          >
            <main
              id="lmn-main-content"
              tabIndex={-1}
              className="lmn-vision-workspace relative min-h-screen min-w-0 bg-transparent px-0 py-0 md:px-0 md:py-0"
              style={{
                background: "transparent",
              }}
            >
              <PanelTopbar userEmail={userEmail} ownerProfile={ownerProfile} />
              <div className="relative z-10 mx-auto w-full">
                <div className="lmn-panel-content">
                  {children}
                </div>
              </div>
            </main>
          </div>
        </div>
      </div>

      {assistantReady ? <PanelInsightsAssistant /> : null}
    </div>
  );
}
