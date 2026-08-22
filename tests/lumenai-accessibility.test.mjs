import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

function read(file) {
  return fs.readFileSync(new URL(`../${file}`, import.meta.url), "utf8");
}

test("global accessibility covers focus, coarse pointers and reduced motion", () => {
  const css = read("app/globals.css");
  assert.match(css, /:focus-visible/);
  assert.match(css, /@media \(pointer: coarse\)/);
  assert.match(css, /min-inline-size:\s*44px/);
  assert.match(css, /@media \(prefers-reduced-motion: reduce\)/);
  assert.match(css, /animation-duration:\s*0\.01ms/);
});

test("shared modal behavior traps, closes and restores focus", () => {
  const hook = read("components/ui/use-modal-accessibility.ts");
  assert.match(hook, /event\.key === "Escape"/);
  assert.match(hook, /event\.key !== "Tab"/);
  assert.match(hook, /previousFocus\?\.isConnected/);
  assert.match(hook, /document\.body\.style\.overflow = "hidden"/);
});

test("all custom modal consumers use the shared accessibility behavior", () => {
  for (const file of [
    "components/ui/image-crop-dialog.tsx",
    "app/panel/calibration/workspace.tsx",
    "app/panel/knowledge/page.tsx",
    "app/panel/leads/page.tsx",
    "app/panel/lumen-eye/page.tsx",
  ]) {
    const source = read(file);
    assert.match(source, /useModalAccessibility/);
    assert.match(source, /aria-modal="true"/);
    assert.match(source, /tabIndex=\{-1\}/);
  }
});

test("core entry flows expose skip targets and announced errors", () => {
  const login = read("app/login/page.tsx");
  const onboarding = read("app/onboarding/OnboardingClient.tsx");
  assert.match(login, /href="#login-form"/);
  assert.match(login, /id="login-error"[\s\S]*role="alert"/);
  assert.match(onboarding, /href="#onboarding-form"/);
  assert.match(onboarding, /role="alert"/);
});

test("visual globes expose a textual equivalent", () => {
  const globe = read("components/ui/cobe-globe.tsx");
  assert.match(globe, /role="img"/);
  assert.match(globe, /Mapa global con/);
  assert.match(globe, /<canvas[\s\S]*aria-hidden="true"/);
});

test("Pulse Radar restores focus after its non-modal panel closes", () => {
  const widget = read("app/panel/_components/pulse-radar/PulseRadarWidget.tsx");
  const panel = read("app/panel/_components/pulse-radar/PulseRadarPanel.tsx");
  assert.match(widget, /panelWasOpenRef/);
  assert.match(widget, /launcherRef\.current\?\.focus/);
  assert.match(widget, /requestAnimationFrame/);
  assert.match(panel, /aria-modal="false"/);
  assert.match(panel, /event\.key === "Escape"/);
});

test("the authenticated shell does not trap fixed dialogs in page containment", () => {
  const shell = read("app/panel/_components/PanelShell.tsx");
  assert.match(shell, /contain:\s*"style"/);
  assert.doesNotMatch(shell, /contain:\s*"layout paint style"/);
});
