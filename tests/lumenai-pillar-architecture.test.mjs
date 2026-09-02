import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const read = (path) => readFile(new URL(path, root), "utf8");

test("LumenAI exposes exactly eleven pillars and ten operational navigation entries", async () => {
  const [pillars, navigation] = await Promise.all([
    read("lib/lumenai/pillars.ts"),
    read("app/panel/_components/panel-nav.tsx"),
  ]);
  const ids = ["calibration", "config-ai", "lumen-eye", "pulse-radar", "research", "widget", "chats", "knowledge", "interface", "overview", "access"];
  for (const id of ids) assert.match(pillars, new RegExp(`id:\\s*["']${id}["']`));
  assert.equal((pillars.match(/operational:\s*true/g) || []).length, 10);
  assert.equal((navigation.match(/icon:\s*Icon\(/g) || []).length, 10);
  assert.doesNotMatch(navigation, /\/panel\/(?:growth|campaigns|leads|lumenite|approvals|permissions|twin|integrations|settings|color-mix|system-health)/);
});

test("absorbed applications route into their owning pillar", async () => {
  const [pillars, redirects] = await Promise.all([read("lib/lumenai/pillars.ts"), read("next.config.ts")]);
  for (const legacy of ["growth", "campaigns", "leads", "twin", "lumenite", "approvals", "permissions", "integrations", "settings", "color-mix", "system-health"]) {
    assert.match(pillars, new RegExp(`/panel/${legacy}`));
    assert.match(redirects, new RegExp(`source:\\s*["']/panel/${legacy}["']`));
  }
});

test("Groq is isolated by the eleven pillar responsibilities", async () => {
  const [router, example] = await Promise.all([read("lib/ai/lumenite/env.ts"), read(".env.example")]);
  const names = ["CALIBRATION", "CONFIG_AI", "LUMEN_EYE", "PULSE", "RESEARCH", "WIDGET", "CHATS", "KNOWLEDGE", "INTERFACE", "OVERVIEW", "ACCESS"];
  for (const name of names) {
    assert.match(router, new RegExp(`GROQ_${name}_API_KEY`));
    assert.match(example, new RegExp(`^GROQ_${name}_API_KEY=`, "m"));
  }
  assert.doesNotMatch(router, /fallbackAgents/);
});

test("commercial plans sell memberships and never infrastructure units", async () => {
  const plans = await read("app/subscriptions/page.tsx");
  assert.match(plans, /LumenAI Start/);
  assert.match(plans, /LumenAI Business/);
  assert.match(plans, /LumenAI Scale/);
  assert.doesNotMatch(plans, /\btokens?\b|cr[eé]ditos de IA/i);
});
