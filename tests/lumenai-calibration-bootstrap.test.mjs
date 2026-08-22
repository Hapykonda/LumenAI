import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

function read(file) {
  return fs.readFileSync(new URL(`../${file}`, import.meta.url), "utf8");
}

test("new calibration rows satisfy the non-null publication contract", () => {
  const migration = read("supabase/migrations/202605270002_lumenai_operational_foundation.sql");
  const calibration = read("app/api/panel/calibration/_lib.ts");
  assert.match(migration, /published_settings jsonb not null default '\{\}'::jsonb/i);
  assert.match(calibration, /published_settings:\s*\{\}/);
  assert.doesNotMatch(calibration, /published_settings:\s*null/);
});

test("an empty publication object remains an unpublished calibration", () => {
  const calibration = read("app/api/panel/calibration/_lib.ts");
  const pulse = read("app/api/panel/pulse-radar/_lib.ts");
  assert.match(calibration, /Object\.keys\(value\)\.length > 0/);
  assert.match(calibration, /hasPublishedSettings\(existing\.published_settings\)/);
  assert.match(pulse, /Object\.keys\(asRecord\(widget\?\.published_settings\)\)\.length > 0/);
});
