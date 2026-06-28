"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowUpRight, Moon, Sparkles, Sun } from "lucide-react";
import { AnimatedSidebar } from "./AnimatedSidebar";
import { isPanelActive, PANEL_NAV } from "./panel-nav";
import { PanelInsightsAssistant } from "./PanelInsightsAssistant";
import {
  PANEL_THEME_EVENT,
  applyPanelThemeToRoot,
  readPanelThemeFromStorage,
  savePanelThemeToStorage,
  type PanelThemeColors,
} from "@/lib/panel-theme";

function PanelThemeRuntime() {
  useEffect(() => {
    const stored = readPanelThemeFromStorage();
    const currentVersion = window.localStorage.getItem("lmn_theme_version");
    const shouldUpgradeDefault = currentVersion !== "minimal-premium-20260626";

    applyPanelThemeToRoot(
      shouldUpgradeDefault
        ? {
            ...(stored || {
              primary: "#D7FF2F",
              secondary: "#111318",
            }),
            mode: "light",
          }
        : stored || {
        primary: "#D7FF2F",
        secondary: "#111318",
        mode: "light",
      }
    );
    if (shouldUpgradeDefault) {
      savePanelThemeToStorage({
        ...(stored || {
          primary: "#D7FF2F",
          secondary: "#111318",
        }),
        mode: "light",
      });
      window.localStorage.setItem("lmn_theme_version", "minimal-premium-20260626");
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
  if (typeof window === "undefined") return "light";
  const stored = readPanelThemeFromStorage();
  return stored?.mode === "dark" ? "dark" : "light";
}

export default function PanelShell({
  children,
  userEmail,
}: {
  children: React.ReactNode;
  userEmail?: string;
}) {
  const pathname = usePathname() || "/panel/overview";
  const [mode, setMode] = useState<"light" | "dark">("light");
  const activeItem =
    PANEL_NAV.find((item) => isPanelActive(pathname, item.href)) || PANEL_NAV[0];

  useEffect(() => {
    setMode(readModePreference());
  }, []);

  function toggleMode() {
    const next = mode === "dark" ? "light" : "dark";
    setMode(next);
    const stored = readPanelThemeFromStorage();
    const nextTheme = {
      ...(stored || {
        primary: "#D7FF2F",
        secondary: "#64B5FF",
      }),
      mode: next,
    } satisfies Partial<PanelThemeColors>;
    applyPanelThemeToRoot(nextTheme);
    savePanelThemeToStorage(nextTheme);
  }

  return (
    <div
      className="apex-os lmn-minimal-shell lmn-vision-os lmn-obsidian-system lmn-vercel-system relative isolate min-h-screen w-full overflow-x-hidden text-white"
      style={{
        colorScheme: mode,
      }}
    >
      <PanelThemeRuntime />

      <div className="relative z-10 w-full px-0 py-0">
        <div className="grid grid-cols-1 gap-0 md:grid-cols-[252px_minmax(0,1fr)]">
          <AnimatedSidebar
            brand="LumenAI"
            subline={userEmail ? userEmail : "Panel"}
            links={PANEL_NAV}
          />

          <div
            className="min-w-0"
            style={{
              contain: "layout paint style",
            }}
          >
            <main
              className="lmn-vision-workspace relative min-h-screen min-w-0 bg-transparent px-0 py-0 md:px-0 md:py-0"
              style={{
                background: "transparent",
              }}
            >
              <div className="relative z-10 mx-auto w-full max-w-[1240px]">
                <header className="lmn-panel-topbar">
                  <div className="min-w-0">
                    <div className="lmn-panel-breadcrumb">
                      <span>Panel</span>
                      <span aria-hidden="true">/</span>
                      <span>{activeItem.label}</span>
                    </div>
                    <div className="lmn-panel-current">
                      <span>{activeItem.label}</span>
                      {activeItem.desc ? <small>{activeItem.desc}</small> : null}
                    </div>
                  </div>

                  <div className="lmn-panel-topbar-actions">
                    <button
                      type="button"
                      className="lmn-panel-theme-toggle"
                      onClick={toggleMode}
                      aria-label={mode === "dark" ? "Activar modo claro" : "Activar modo oscuro"}
                      title={mode === "dark" ? "Modo claro" : "Modo oscuro"}
                    >
                      {mode === "dark" ? (
                        <Sun className="h-3.5 w-3.5" />
                      ) : (
                        <Moon className="h-3.5 w-3.5" />
                      )}
                    </button>
                    <Link href="/panel/autoconfig" className="lmn-panel-topbar-button is-primary">
                      <Sparkles className="h-3.5 w-3.5" />
                      Config IA
                    </Link>
                    <Link href="/panel/widget" className="lmn-panel-topbar-button">
                      Widget
                      <ArrowUpRight className="h-3.5 w-3.5" />
                    </Link>
                  </div>
                </header>

                <div className="lmn-panel-content px-4 py-4 md:px-6 md:py-6">
                  {children}
                </div>
              </div>
            </main>
          </div>
        </div>
      </div>

      <PanelInsightsAssistant />
    </div>
  );
}
