import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);

test("the visual foundation defines the complete operational state language", async () => {
  const component = await readFile(
    new URL("components/ui/lumen-system-state.tsx", root),
    "utf8",
  );
  const states = [
    "loading",
    "empty",
    "error",
    "offline",
    "degraded",
    "success",
    "warning",
    "critical",
    "permission_required",
    "approval_pending",
    "syncing",
    "analysing",
    "executing",
    "verifying",
    "reconnecting",
    "cancelled",
    "reverted",
  ];

  for (const state of states) assert.match(component, new RegExp(`\\b${state}:`));
  assert.match(component, /aria-busy/);
  assert.match(component, /Detalles técnicos/);
});

test("motion is semantic and reduced-motion aware", async () => {
  const css = await readFile(new URL("app/lumenai-obsidian.css", root), "utf8");
  assert.match(css, /--lmn-motion-cinematic/);
  assert.match(css, /lmn-verification-sweep/);
  assert.match(css, /lmn-rollback-trace/);
  assert.match(css, /prefers-reduced-motion: reduce/);
});

test("the product shell offers skip navigation and separates Pulse from Lumenite", async () => {
  const shell = await readFile(
    new URL("app/panel/_components/PanelShell.tsx", root),
    "utf8",
  );
  assert.match(shell, /href="#lmn-main-content"/);
  assert.match(shell, /href="\/panel\/radar"/);
  assert.match(shell, /href="\/panel\/lumenite"/);
  assert.doesNotMatch(shell, /onClick=\{openPulseAssistant\}[\s\S]{0,200}Lumenite/);
});

test("Obsidian is the final visual layer for every current product route", async () => {
  const layout = await readFile(new URL("app/layout.tsx", root), "utf8");
  assert.match(layout, /import "\.\/globals\.css";[\s\S]*import "\.\/lumenai-obsidian\.css";/);

  const routes = [
    "login", "onboarding", "panel/overview", "panel/calibration", "panel/autoconfig",
    "panel/radar", "panel/lumen-eye", "panel/research", "panel/growth", "panel/twin",
    "panel/campaigns", "panel/knowledge", "panel/chat", "panel/leads", "panel/widget",
    "panel/settings", "panel/color-mix", "panel/system-health", "panel/lumenite",
    "panel/permissions", "panel/approvals",
  ];
  await Promise.all(routes.map((route) => access(new URL(`app/${route}/page.tsx`, root))));

  const brand = await readFile(new URL("components/brand/lumen-logo.tsx", root), "utf8");
  assert.match(brand, /lumenai-mark/);
  assert.doesNotMatch(brand, />L</);
});

test("globals.css remains a small base without route-specific product styles", async () => {
  const globals = await readFile(new URL("app/globals.css", root), "utf8");
  const obsidian = await readFile(new URL("app/lumenai-obsidian.css", root), "utf8");
  const widgetPage = await readFile(new URL("app/widget/page.tsx", root), "utf8");

  assert.ok(globals.split(/\r?\n/).length < 400, "globals.css exceeded its base budget");
  assert.doesNotMatch(
    globals,
    /\.lmn-(?:overview|radar|calibration|widget|lumenite|research|growth|campaign)/,
  );
  assert.doesNotMatch(globals, /@import\s+["']\.\/widget\/widget\.css/);
  assert.match(widgetPage, /import "\.\/widget\.css";/);
  assert.match(obsidian, /Migrated product layers from the former global sheet/);
});
