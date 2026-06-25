"use client";

import React, { useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowUpRight, Sparkles } from "lucide-react";
import { AnimatedSidebar } from "./AnimatedSidebar";
import { isPanelActive, PANEL_NAV } from "./panel-nav";
import { PanelInsightsAssistant } from "./PanelInsightsAssistant";

const PANEL_THEME_EVENT = "lumen-theme:update";

function normalizeHex(hex?: string | null) {
  if (!hex) return null;

  let value = hex.trim().replace("#", "");

  if (value.length === 3) {
    value = value
      .split("")
      .map((char) => char + char)
      .join("");
  }

  if (!/^[0-9a-fA-F]{6}$/.test(value)) return null;

  return `#${value.toLowerCase()}`;
}

function hexToRgbString(hex?: string | null) {
  const safe = normalizeHex(hex);
  if (!safe) return null;

  const value = safe.slice(1);
  const r = parseInt(value.slice(0, 2), 16);
  const g = parseInt(value.slice(2, 4), 16);
  const b = parseInt(value.slice(4, 6), 16);

  return `${r}, ${g}, ${b}`;
}

function applyPanelTheme(input?: {
  primary?: string | null;
  secondary?: string | null;
}) {
  if (typeof document === "undefined") return;

  const primary = normalizeHex(input?.primary) || "#00E5FF";
  const secondary = normalizeHex(input?.secondary) || "#1B43FF";

  const primaryRgb = hexToRgbString(primary) || "0, 229, 255";
  const secondaryRgb = hexToRgbString(secondary) || "27, 67, 255";

  const root = document.documentElement;

  root.style.setProperty("--lmn-accent", primary);
  root.style.setProperty("--lmn-accent-2", secondary);
  root.style.setProperty("--lmn-accent-rgb", primaryRgb);
  root.style.setProperty("--lmn-accent-2-rgb", secondaryRgb);
}

function readStoredPanelTheme() {
  if (typeof window === "undefined") return null;

  const primary =
    window.localStorage.getItem("lmn_theme_primary") ||
    window.localStorage.getItem("widget_primary_color") ||
    window.localStorage.getItem("panel_primary_color");

  const secondary =
    window.localStorage.getItem("lmn_theme_secondary") ||
    window.localStorage.getItem("widget_secondary_color") ||
    window.localStorage.getItem("panel_secondary_color") ||
    primary;

  if (!primary && !secondary) return null;

  return {
    primary: primary || "#00E5FF",
    secondary: secondary || "#1B43FF",
  };
}

function PanelThemeRuntime() {
  useEffect(() => {
    const stored = readStoredPanelTheme();

    applyPanelTheme(
      stored || {
        primary: "#00E5FF",
        secondary: "#1B43FF",
      }
    );

    const handleThemeChange = (event: Event) => {
      const customEvent = event as CustomEvent<{
        primary?: string;
        secondary?: string;
      }>;

      applyPanelTheme({
        primary: customEvent.detail?.primary,
        secondary: customEvent.detail?.secondary,
      });
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

export default function PanelShell({
  children,
  userEmail,
}: {
  children: React.ReactNode;
  userEmail?: string;
}) {
  const pathname = usePathname() || "/panel/overview";
  const activeItem =
    PANEL_NAV.find((item) => isPanelActive(pathname, item.href)) || PANEL_NAV[0];

  return (
    <div
      className="apex-os lmn-vision-os lmn-obsidian-system lmn-vercel-system relative isolate min-h-screen w-full overflow-x-hidden bg-black text-white"
      style={{
        colorScheme: "dark",
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
