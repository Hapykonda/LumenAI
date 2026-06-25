"use client";

import { useEffect } from "react";
import {
  PANEL_THEME_EVENT,
  applyPanelThemeToRoot,
  readPanelThemeFromStorage,
  savePanelThemeToStorage,
  type PanelThemeColors,
} from "@/lib/panel-theme";

export default function PanelThemeRuntime({
  initialPrimary,
  initialSecondary,
}: {
  initialPrimary?: string;
  initialSecondary?: string;
}) {
  useEffect(() => {
    const hasInitial = Boolean(initialPrimary || initialSecondary);

    if (hasInitial) {
      const serverTheme = {
        primary: initialPrimary,
        secondary: initialSecondary,
      };

      applyPanelThemeToRoot(serverTheme);
      savePanelThemeToStorage(serverTheme);
    } else {
      const stored = readPanelThemeFromStorage();
      if (stored) {
        applyPanelThemeToRoot(stored);
      }
    }

    const handleThemeChange = (event: Event) => {
      const detail = (event as CustomEvent<PanelThemeColors>).detail;
      applyPanelThemeToRoot(detail);
      savePanelThemeToStorage(detail);
    };

    window.addEventListener(PANEL_THEME_EVENT, handleThemeChange as EventListener);

    return () => {
      window.removeEventListener(
        PANEL_THEME_EVENT,
        handleThemeChange as EventListener
      );
    };
  }, [initialPrimary, initialSecondary]);

  return null;
}