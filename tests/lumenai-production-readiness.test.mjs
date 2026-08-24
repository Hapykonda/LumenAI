import test from "node:test";
import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";

const root = new URL("../", import.meta.url);
const operators = ["pulse", "miu", "nubi", "orbit", "luma", "bit", "flori"];
const moods = [
  "welcome",
  "good-news",
  "bad-news",
  "thinking",
  "analyzing",
  "explaining",
  "celebrating",
  "working",
  "dancing",
];

test("the seven operators ship every supported expression", async () => {
  await Promise.all(
    operators.flatMap((operator) =>
      moods.map((mood) =>
        access(new URL(`public/brand/operators/${operator}/${mood}.webp`, root)),
      ),
    ),
  );

  const catalog = await readFile(new URL("lib/operators/catalog.ts", root), "utf8");
  for (const operator of operators) assert.match(catalog, new RegExp(`"${operator}"`));
  for (const mood of moods) assert.match(catalog, new RegExp(`"${mood}"`));
});

test("operator selection is persisted across panel and widget surfaces", async () => {
  const settings = await readFile(new URL("app/panel/settings/page.tsx", root), "utf8");
  const panelApi = await readFile(new URL("app/api/panel/widget/route.ts", root), "utf8");
  const publicApi = await readFile(new URL("app/api/widget/config/route.ts", root), "utf8");
  const widget = await readFile(new URL("app/widget/WidgetClient.tsx", root), "utf8");

  assert.match(settings, /operator_id/);
  assert.match(settings, /role="radiogroup"/);
  assert.match(panelApi, /operatorId/);
  assert.match(publicApi, /operator_id/);
  assert.match(widget, /OperatorAvatar/);
});

test("section tutorials are accessible, persistent and connected to the chosen operator", async () => {
  const intro = await readFile(
    new URL("app/panel/_components/SectionIntroGate.tsx", root),
    "utf8",
  );

  assert.match(intro, /useModalAccessibility/);
  assert.match(intro, /aria-modal="true"/);
  assert.match(intro, /localStorage\.setItem\(storageKey/);
  assert.match(intro, /PulsePersona/);
  assert.match(intro, /lumenai:pulse-open/);
});

test("production migrations persist operators and move privileged logic out of public", async () => {
  const operatorMigration = await readFile(
    new URL(
      "supabase/migrations/20260824071554_add_operator_catalog_and_fk_indexes.sql",
      root,
    ),
    "utf8",
  );
  const securityMigration = await readFile(
    new URL(
      "supabase/migrations/20260824071640_consolidate_rls_and_private_functions.sql",
      root,
    ),
    "utf8",
  );

  assert.match(operatorMigration, /add column if not exists operator_id text/);
  assert.match(operatorMigration, /widget_settings_operator_id_check/);
  assert.match(operatorMigration, /market_signals_market_item_id_idx/);
  assert.match(securityMigration, /create schema if not exists private/);
  assert.match(securityMigration, /private\.create_business_for_new_user/);
  assert.match(securityMigration, /security invoker/);
  assert.match(securityMigration, /to authenticated/);
  assert.match(securityMigration, /public\.lumenai_release_state\(\)/);
  assert.doesNotMatch(securityMigration, /grant execute[^;]+private\.create_business_for_new_user[^;]+anon/is);
});

test("system health exposes actionable release gates and an active widget probe", async () => {
  const route = await readFile(
    new URL("app/api/panel/system-health/route.ts", root),
    "utf8",
  );
  const page = await readFile(
    new URL("app/panel/system-health/page.tsx", root),
    "utf8",
  );

  assert.match(route, /probePublicWidget/);
  assert.match(route, /lumenai_release_state/);
  assert.match(route, /readyForProduction/);
  assert.match(route, /Pagos y suscripciones reales/);
  assert.match(page, /Centro de lanzamiento/);
  assert.match(page, /Copiar informe/);
  assert.match(page, /OperatorAvatar/);
});
