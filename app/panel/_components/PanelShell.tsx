"use client";

import Link from "next/link";
import dynamic from "next/dynamic";
import { usePathname } from "next/navigation";
import React, { useEffect, useMemo, useState } from "react";
import {
  Activity,
  ChevronRight,
  Command,
  HeartPulse,
  Moon,
  Search,
  Sparkles,
  Sun,
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
  savePanelThemeToStorage,
  type PanelThemeColors,
} from "@/lib/panel-theme";
import { ModuleStage } from "./ModuleStage";
import { getModuleExperience, getModuleTour } from "./module-experience";
import SectionIntroGate from "./SectionIntroGate";
import {
  DEFAULT_INTERFACE_PREFERENCES,
  type InterfacePreferences,
} from "@/lib/interface-preferences";

const PanelInsightsAssistant = dynamic(
  () =>
    import("./PanelInsightsAssistant").then((module) => module.PanelInsightsAssistant),
  { ssr: false },
);

const DEDICATED_TOUR_MODULES = new Set([
  "knowledge",
  "lumen-eye",
  "pulse-radar",
  "widget",
]);

function PanelThemeRuntime({ preferences }: { preferences: InterfacePreferences }) {
  const { theme, density, motion } = preferences;

  useEffect(() => {
    const currentVersion = window.localStorage.getItem("lmn_theme_version");
    const shouldUpgradeDefault = currentVersion !== "lumenai-interface-v1-20260902";

    const initialTheme = theme;

    applyPanelThemeToRoot(initialTheme);
    if (shouldUpgradeDefault) {
      savePanelThemeToStorage(initialTheme);
      window.localStorage.setItem("lmn_theme_version", "lumenai-interface-v1-20260902");
    }

    document.documentElement.dataset.lumenDensity = density;
    document.documentElement.dataset.lumenMotion = motion;

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
  }, [density, motion, theme]);

  return null;
}

function PanelTopbar({
  userEmail,
  ownerProfile,
  mode,
  onToggleMode,
}: {
  userEmail?: string;
  ownerProfile: OwnerProfile;
  mode: "light" | "dark";
  onToggleMode: () => void;
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
    <header className="lmx-topbar">
      <div className="lmx-topbar-inner">
        <div className="lmx-topbar-context">
          <span className="lmx-system-id">LMN / OS</span>
          <div className="lmx-breadcrumb">
            <Link href="/panel/overview">Workspace</Link>
            <ChevronRight className="h-3.5 w-3.5 shrink-0 text-white/24" />
            <strong>{activeItem?.label ?? "Panel"}</strong>
          </div>
          <div className="lmx-live-status">
            <Activity aria-hidden="true" />
            <span>Operación sincronizada</span>
          </div>
        </div>

        <div className="lmx-topbar-actions">
          <div className="lmx-search">
            <Search aria-hidden="true" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Escape") setQuery("");
              }}
              placeholder="Ir a módulo o comando"
              aria-label="Buscar módulo del panel"
            />
            <span className="lmx-search-shortcut"><Command aria-hidden="true" /> K</span>

            {results.length ? (
              <div className="lmx-search-results" role="listbox" aria-label="Resultados de búsqueda">
                {results.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setQuery("")}
                    role="option"
                    aria-selected="false"
                  >
                    <span>{item.label}</span>
                    {item.desc ? (
                      <small>{item.desc}</small>
                    ) : null}
                  </Link>
                ))}
              </div>
            ) : null}
          </div>

          <button type="button" className="lmx-icon-button" onClick={onToggleMode} aria-label="Cambiar tema">
            {mode === "light" ? <Moon aria-hidden="true" /> : <Sun aria-hidden="true" />}
          </button>
          <Link href="/panel/radar" className="lmx-icon-button" aria-label="Abrir Pulse Radar">
            <Sparkles aria-hidden="true" />
          </Link>
          <Link href="/panel/access?view=security" className="lmx-icon-button lmx-notification" aria-label="Abrir seguridad operativa">
            <HeartPulse aria-hidden="true" />
            <i aria-hidden="true" />
          </Link>
          <Link
            href="/panel/access"
            className="lmx-profile-button"
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
              <UserCircle2 aria-hidden="true" />
            )}
            <span>
              <strong>{ownerProfile.displayName || "Mi negocio"}</strong>
              <small>{userEmail || "Administrador"}</small>
            </span>
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
  interfacePreferences = DEFAULT_INTERFACE_PREFERENCES,
}: {
  children: React.ReactNode;
  userEmail?: string;
  ownerProfile?: OwnerProfile;
  interfacePreferences?: InterfacePreferences;
}) {
  const pathname = usePathname() || "/panel/overview";
  const moduleExperience = useMemo(
    () => getModuleExperience(pathname),
    [pathname],
  );
  const compactStage = pathname.split("/").filter(Boolean).length > 2;
  const moduleTour = useMemo(() => getModuleTour(moduleExperience.id), [moduleExperience.id]);
  const hasDedicatedTour = DEDICATED_TOUR_MODULES.has(moduleExperience.id);
  const [assistantReady, setAssistantReady] = useState(false);
  const [mode, setMode] = useState<"light" | "dark">(
    interfacePreferences.theme.mode === "light" ? "light" : "dark",
  );
  const [ownerProfile, setOwnerProfile] = useState<OwnerProfile>(
    initialOwnerProfile ?? {
      ...EMPTY_OWNER_PROFILE,
      email: userEmail ?? "",
    },
  );

  const toggleMode = () => {
    const nextMode = mode === "light" ? "dark" : "light";
    const nextTheme: Partial<PanelThemeColors> = { mode: nextMode };
    setMode(nextMode);
    applyPanelThemeToRoot(nextTheme);
    savePanelThemeToStorage(nextTheme);
    window.dispatchEvent(new CustomEvent(PANEL_THEME_EVENT, { detail: nextTheme }));
  };

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
      className="lmx-app"
      data-theme={mode}
      data-design="enterprise-v4"
      data-density={interfacePreferences.density}
      data-motion={interfacePreferences.motion}
      style={{ colorScheme: mode }}
    >
      <PanelThemeRuntime preferences={interfacePreferences} />
      <a className="lmn-skip-link" href="#lmn-main-content">
        Saltar al contenido principal
      </a>

      <div className="lmx-shell">
        <div className="lmx-layout lmn-panel-grid">
          <AnimatedSidebar
            brand="LumenAI"
            subline={ownerProfile.displayName || userEmail || "Panel"}
            avatarUrl={ownerProfile.avatarUrl}
            links={PANEL_NAV}
          />

          <div className="lmx-workspace" style={{ contain: "style" }}>
            <PanelTopbar
              userEmail={userEmail}
              ownerProfile={ownerProfile}
              mode={mode}
              onToggleMode={toggleMode}
            />
            <main
              id="lmn-main-content"
              tabIndex={-1}
              className="lmx-main"
            >
              <div className="lmx-canvas" data-module={moduleExperience.id}>
                <ModuleStage experience={moduleExperience} compact={compactStage} />
                <div className="lmx-content">{children}</div>
                {!hasDedicatedTour ? (
                  <SectionIntroGate
                    title={moduleTour.title}
                    description={moduleTour.description}
                    bullets={moduleTour.bullets}
                    primaryActionLabel="Comenzar"
                    skipActionLabel="Omitir recorrido"
                    storageKey={`lumenai:intro:${moduleExperience.id}:pillars-v1`}
                    reverseLayout={Number(moduleExperience.index) % 2 === 1}
                  >
                    {null}
                  </SectionIntroGate>
                ) : null}
              </div>
            </main>
          </div>
        </div>
      </div>

      {assistantReady ? <PanelInsightsAssistant /> : null}
    </div>
  );
}
