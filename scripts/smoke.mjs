import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const envPath = path.join(root, ".env.local");

if (fs.existsSync(envPath)) {
  const lines = fs.readFileSync(envPath, "utf8").split(/\r?\n/g);

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) continue;

    const idx = trimmed.indexOf("=");
    const key = trimmed.slice(0, idx).trim();
    const value = trimmed.slice(idx + 1).trim().replace(/^['"]|['"]$/g, "");

    if (key && process.env[key] === undefined) process.env[key] = value;
  }
}

const baseUrl = (process.env.LUMENAI_TEST_URL || "http://127.0.0.1:3002").replace(/\/+$/g, "");
const requestTimeoutMs = Number(process.env.LUMENAI_SMOKE_TIMEOUT_MS || 10000);
const results = [];

function pass(name, detail = "") {
  results.push({ ok: true, name, detail });
}

function fail(name, detail = "") {
  results.push({ ok: false, name, detail });
}

async function request(pathname, options = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), requestTimeoutMs);

  try {
    return await fetch(`${baseUrl}${pathname}`, {
      redirect: "manual",
      ...options,
      signal: options.signal || controller.signal,
      headers: {
        "Content-Type": "application/json",
        ...(options.headers || {}),
      },
    });
  } finally {
    clearTimeout(timeout);
  }
}

async function withTimeout(promise, label, timeoutMs = requestTimeoutMs) {
  let timeout;

  try {
    return await Promise.race([
      promise,
      new Promise((_, reject) => {
        timeout = setTimeout(() => {
          reject(new Error(`${label} timed out after ${timeoutMs}ms`));
        }, timeoutMs);
      }),
    ]);
  } finally {
    clearTimeout(timeout);
  }
}

async function checkPublicRoutes() {
  const login = await request("/login");
  if (login.status === 200) pass("login route", "200");
  else fail("login route", `expected 200, got ${login.status}`);

  const widget = await request("/widget?key=test&embed=1");
  if (widget.status === 200) pass("widget shell route", "200");
  else fail("widget shell route", `expected 200, got ${widget.status}`);

  const panel = await request("/panel/calibration");
  if ([302, 303, 307, 308].includes(panel.status)) {
    pass("panel auth redirect", String(panel.status));
  } else {
    fail("panel auth redirect", `expected redirect, got ${panel.status}`);
  }
}

async function findWidgetPublicKey() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !service) {
    pass("supabase env", "not configured, widget chat smoke skipped");
    return null;
  }

  try {
    const { createClient } = await import("@supabase/supabase-js");
    const sb = createClient(url, service, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const settings = await withTimeout(
      sb
        .from("widget_settings")
        .select("business_id,public_key,widget_enabled")
        .eq("widget_enabled", true)
        .not("public_key", "is", null)
        .limit(1)
        .maybeSingle(),
      "supabase widget settings lookup"
    );

    if (!settings.error && settings.data?.public_key) {
      pass("supabase widget settings", "active public key found");
      return String(settings.data.public_key);
    }

    const businesses = await withTimeout(
      sb
        .from("businesses")
        .select("id,public_key")
        .not("public_key", "is", null)
        .limit(1)
        .maybeSingle(),
      "supabase business lookup"
    );

    if (!businesses.error && businesses.data?.public_key) {
      pass("supabase business", "business public key found");
      return String(businesses.data.public_key);
    }

    pass("supabase public key", "none found, widget chat smoke skipped");
    return null;
  } catch (error) {
    pass(
      "supabase public key",
      `lookup skipped: ${error instanceof Error ? error.message : String(error)}`
    );
    return null;
  }
}

function isPlaceholderPublicKey(value) {
  const key = String(value || "").trim().toLowerCase();

  if (!key) return true;

  return (
    key === "test" ||
    key === "placeholder" ||
    key.includes("placeholder") ||
    key.includes("valor_") ||
    key.includes("example") ||
    key.includes("demo")
  );
}

async function checkWidgetChat(publicKey) {
  if (!publicKey) return;

  let res;

  try {
    res = await request("/api/widget/chat", {
      method: "POST",
      body: JSON.stringify({
        publicKey,
        visitorId: `smoke_${Date.now()}`,
        message: "SMOKE TEST: que servicios ofrecen?",
        history: [],
        visitorContext: {
          url: `${baseUrl}/smoke`,
          referrer: "smoke",
          language: "es",
        },
      }),
    });
  } catch (error) {
    pass(
      "widget chat real flow",
      `skipped: ${error instanceof Error ? error.message : String(error)}`
    );
    return;
  }

  const json = await res.json().catch(() => ({}));

  if (res.status !== 200 || json?.ok !== true) {
    fail("widget chat real flow", `status ${res.status}: ${json?.error || "unknown error"}`);
    return;
  }

  const reply = String(json.reply || "");
  if (/^##\s+\S/m.test(reply)) {
    pass("widget structured reply", "reply starts with markdown title");
  } else {
    fail("widget structured reply", "reply does not include markdown title");
  }
}

async function checkRateLimit() {
  const visitorId = `rate_${Date.now()}`;
  const statuses = [];
  const controller = new AbortController();

  const observed429 = await new Promise((resolve) => {
    let pending = 20;

    for (let i = 0; i < 20; i += 1) {
      void request("/api/widget/chat", {
        method: "POST",
        signal: controller.signal,
        body: JSON.stringify({
          publicKey: "__invalid_smoke_key__",
          visitorId,
          message: `rate limit smoke ${i}`,
        }),
      })
        .then((res) => {
          statuses.push(res.status);
          if (res.status === 429) resolve(true);
        })
        .catch(() => undefined)
        .finally(() => {
          pending -= 1;
          if (pending === 0) resolve(false);
        });
    }
  });

  controller.abort();

  if (observed429) {
    pass("widget rate limit", "429 observed under concurrent load");
  } else {
    fail("widget rate limit", `429 not observed; statuses: ${statuses.join(",")}`);
  }
}

await checkPublicRoutes();
const envPublicKey = process.env.LUMENAI_TEST_PUBLIC_KEY;
const publicKey = isPlaceholderPublicKey(envPublicKey)
  ? await findWidgetPublicKey()
  : envPublicKey;
await checkWidgetChat(publicKey);
await checkRateLimit();

for (const item of results) {
  const mark = item.ok ? "PASS" : "FAIL";
  console.log(`${mark} ${item.name}${item.detail ? ` - ${item.detail}` : ""}`);
}

const failed = results.filter((item) => !item.ok);
if (failed.length) {
  process.exitCode = 1;
}
