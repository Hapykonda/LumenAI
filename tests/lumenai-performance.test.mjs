import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

function read(file) {
  return fs.readFileSync(new URL(`../${file}`, import.meta.url), "utf8");
}

test("the panel shell does not ship a second browser auth lifecycle", () => {
  const context = read("app/panel/_components/panel-context.tsx");
  const layout = read("app/panel/layout.tsx");
  assert.doesNotMatch(context, /supabase|onAuthStateChange|getUser\(/);
  assert.match(layout, /redirect\("\/login\?e=no_session"\)/);
  assert.match(layout, /redirect\("\/onboarding"\)/);
});

test("Pulse and its heavy panel are deferred", () => {
  const shell = read("app/panel/_components/PanelShell.tsx");
  const pulse = read("app/panel/_components/pulse-radar/PulseRadarWidget.tsx");
  assert.match(shell, /requestIdleCallback/);
  assert.match(shell, /assistantReady \? <PanelInsightsAssistant \/>/);
  assert.match(pulse, /dynamic\(\(\) => import\("\.\/PulseRadarPanel"\)/);
});

test("cookie-authenticated panel requests do not import the Supabase browser SDK", () => {
  const panelFetch = read("lib/panel-fetch.ts");
  const assets = read("lib/widget-assets-client.ts");
  for (const source of [panelFetch, assets]) {
    assert.doesNotMatch(source, /supabase\/client|getSession\(|Authorization/);
    assert.match(source, /credentials:\s*"include"/);
  }
});

test("WebGL and image editors remain outside initial interaction paths", () => {
  const overview = read("app/panel/overview/page.tsx");
  const suite = read("app/panel/_components/enterprise/Lumen21Suite.tsx");
  const widget = read("app/panel/widget/page.tsx");
  const settings = read("app/panel/settings/page.tsx");
  assert.match(overview, /advancedOpen \? <div/);
  assert.match(suite, /dynamic\([\s\S]*cobe-globe/);
  assert.doesNotMatch(suite, /import \{ Globe \} from "@\/components\/ui\/cobe-globe"/);
  assert.match(widget, /const ImageCropDialog = dynamic/);
  assert.match(settings, /const ImageCropDialog = dynamic/);
});

test("the performance audit protects route budgets", () => {
  const audit = read("scripts/audit-performance.mjs");
  assert.match(audit, /layoutBytes \/ 1024 > 150/);
  assert.match(audit, /GoTrueClient\|RealtimeClient\|supabase-js/);
  assert.match(audit, /\["\/panel\/overview", 300\]/);
  assert.match(audit, /\["\/panel\/widget", 340\]/);
});
