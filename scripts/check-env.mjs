import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const requiredExampleKeys = [
  "NEXT_PUBLIC_APP_URL",
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "GROQ_API_KEY",
  "GROQ_MODEL",
  "GROQ_TRANSCRIPTION_MODEL",
  "GROQ_WIDGET_API_KEY",
  "GROQ_AUTOCONFIG_API_KEY",
  "GROQ_PANEL_API_KEY",
  "GROQ_RADAR_API_KEY",
  "GROQ_GROWTH_API_KEY",
  "GROQ_TWIN_API_KEY",
  "GROQ_CAMPAIGNS_API_KEY",
  "GROQ_WIDGET_MODEL",
  "GROQ_WIDGET_TRANSCRIPTION_MODEL",
  "GROQ_AUTOCONFIG_MODEL",
  "GROQ_PANEL_MODEL",
  "GROQ_RADAR_MODEL",
  "GROQ_GROWTH_MODEL",
  "GROQ_TWIN_MODEL",
  "GROQ_CAMPAIGNS_MODEL",
  "GOOGLE_OAUTH_CLIENT_ID",
  "GOOGLE_OAUTH_CLIENT_SECRET",
  "GOOGLE_OAUTH_REDIRECT_URI",
  "LUMENAI_INTEGRATION_ENCRYPTION_KEY",
  "DEV_MAGICLINK_TOKEN",
  "LUMENAI_TEST_URL",
  "LUMENAI_TEST_PUBLIC_KEY",
];

const coreRuntimeKeys = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
];

const agentKeys = [
  "GROQ_WIDGET_API_KEY",
  "GROQ_AUTOCONFIG_API_KEY",
  "GROQ_PANEL_API_KEY",
  "GROQ_RADAR_API_KEY",
  "GROQ_GROWTH_API_KEY",
  "GROQ_TWIN_API_KEY",
  "GROQ_CAMPAIGNS_API_KEY",
];

const gmailIntegrationKeys = [
  "GOOGLE_OAUTH_CLIENT_ID",
  "GOOGLE_OAUTH_CLIENT_SECRET",
  "GOOGLE_OAUTH_REDIRECT_URI",
  "LUMENAI_INTEGRATION_ENCRYPTION_KEY",
];

const suspiciousChars = [
  { value: "\u00c2", label: "U+00C2" },
  { value: "\ufffd", label: "U+FFFD" },
  { value: "\u00bb", label: "U+00BB" },
  { value: "\u00ab", label: "U+00AB" },
];
const errors = [];
const warnings = [];

function parseEnvFile(filePath) {
  if (!fs.existsSync(filePath)) {
    return { exists: false, keys: new Map(), duplicates: [], raw: "" };
  }

  const raw = fs.readFileSync(filePath, "utf8");
  const keys = new Map();
  const duplicates = [];

  raw.split(/\r?\n/g).forEach((line, index) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) return;

    const key = trimmed.slice(0, trimmed.indexOf("=")).trim();
    if (!key) return;

    if (keys.has(key)) duplicates.push({ key, line: index + 1 });
    keys.set(key, true);
  });

  return { exists: true, keys, duplicates, raw };
}

function readRuntimeKey(key, localEnv) {
  const value = String(process.env[key] ?? "").trim();
  if (value) return value;
  if (!localEnv.exists) return "";

  const match = localEnv.raw.match(new RegExp(`^${key}=([^\\n\\r]*)`, "m"));
  return String(match?.[1] ?? "").trim().replace(/^['"]|['"]$/g, "");
}

function checkDuplicateKeys(label, parsed) {
  for (const duplicate of parsed.duplicates) {
    errors.push(`${label}: variable duplicada ${duplicate.key} en linea ${duplicate.line}.`);
  }
}

function checkSuspiciousChars(label, parsed) {
  if (!parsed.exists) return;
  for (const char of suspiciousChars) {
    if (parsed.raw.includes(char.value)) {
      errors.push(`${label}: contiene caracter sospechoso ${char.label}.`);
    }
  }
}

function checkPublicSecretNames(label, parsed) {
  if (!parsed.exists) return;
  for (const key of parsed.keys.keys()) {
    if (
      key.startsWith("NEXT_PUBLIC_") &&
      /(SERVICE_ROLE|GROQ|SECRET|PRIVATE|API_KEY)$/i.test(key)
    ) {
      errors.push(`${label}: ${key} parece secreto y no debe usar NEXT_PUBLIC_.`);
    }
  }
}

const example = parseEnvFile(path.join(root, ".env.example"));
const local = parseEnvFile(path.join(root, ".env.local"));

if (!example.exists) {
  errors.push("Falta .env.example.");
} else {
  checkDuplicateKeys(".env.example", example);
  checkSuspiciousChars(".env.example", example);
  checkPublicSecretNames(".env.example", example);

  const missingFromExample = requiredExampleKeys.filter((key) => !example.keys.has(key));
  if (missingFromExample.length) {
    errors.push(`.env.example no declara: ${missingFromExample.join(", ")}.`);
  }
}

if (local.exists) {
  checkDuplicateKeys(".env.local", local);
  checkSuspiciousChars(".env.local", local);
  checkPublicSecretNames(".env.local", local);

  const repeatedAppUrl = local.raw.match(/^NEXT_PUBLIC_APP_URL=/gm)?.length ?? 0;
  if (repeatedAppUrl > 1) {
    errors.push(".env.local: NEXT_PUBLIC_APP_URL esta repetido.");
  }
} else {
  warnings.push(".env.local no existe; usando solo variables del proceso.");
}

const missingCore = coreRuntimeKeys.filter((key) => !readRuntimeKey(key, local));
if (missingCore.length) {
  errors.push(`Faltan variables core para runtime: ${missingCore.join(", ")}.`);
}

const hasGroqFallback = Boolean(readRuntimeKey("GROQ_API_KEY", local));
const missingAgentKeys = agentKeys.filter((key) => !readRuntimeKey(key, local));
if (missingAgentKeys.length && !hasGroqFallback) {
  errors.push(`No hay keys LumenAI por agente ni GROQ_API_KEY de fallback: ${missingAgentKeys.join(", ")}.`);
} else if (missingAgentKeys.length) {
  warnings.push(`Keys por agente faltantes; se usara fallback controlado si aplica: ${missingAgentKeys.join(", ")}.`);
}

const appUrl = readRuntimeKey("NEXT_PUBLIC_APP_URL", local);
if (process.env.VERCEL_ENV === "production" && /localhost|127\.0\.0\.1/i.test(appUrl)) {
  errors.push("NEXT_PUBLIC_APP_URL usa localhost en produccion.");
}

const configuredGmailKeys = gmailIntegrationKeys.filter((key) => readRuntimeKey(key, local));
if (configuredGmailKeys.length > 0 && configuredGmailKeys.length < gmailIntegrationKeys.length) {
  errors.push(`La integracion Gmail esta parcialmente configurada; faltan: ${gmailIntegrationKeys.filter((key) => !configuredGmailKeys.includes(key)).join(", ")}.`);
} else if (!configuredGmailKeys.length) {
  warnings.push("Google Gmail esta deshabilitado hasta configurar sus cuatro variables server-only.");
}

for (const warning of warnings) {
  console.warn(`WARN ${warning}`);
}

if (errors.length) {
  for (const error of errors) {
    console.error(`ERROR ${error}`);
  }
  process.exitCode = 1;
} else {
  console.log("OK env contract valid. No secret values printed.");
}

