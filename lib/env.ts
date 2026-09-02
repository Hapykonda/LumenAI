export type PublicEnv = {
  NEXT_PUBLIC_APP_URL: string;
  NEXT_PUBLIC_SUPABASE_URL: string;
  NEXT_PUBLIC_SUPABASE_ANON_KEY: string;
};

export type ServerEnv = PublicEnv & {
  SUPABASE_SERVICE_ROLE_KEY: string;
};

export const PUBLIC_ENV_NAMES = [
  "NEXT_PUBLIC_APP_URL",
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
] as const;

export const PRIVATE_ENV_NAMES = [
  "SUPABASE_SERVICE_ROLE_KEY",
  "GROQ_API_KEY",
  "GROQ_MODEL",
  "GROQ_TRANSCRIPTION_MODEL",
  "GROQ_CALIBRATION_API_KEY",
  "GROQ_CONFIG_AI_API_KEY",
  "GROQ_LUMEN_EYE_API_KEY",
  "GROQ_PULSE_API_KEY",
  "GROQ_RESEARCH_API_KEY",
  "GROQ_WIDGET_API_KEY",
  "GROQ_CHATS_API_KEY",
  "GROQ_KNOWLEDGE_API_KEY",
  "GROQ_INTERFACE_API_KEY",
  "GROQ_OVERVIEW_API_KEY",
  "GROQ_ACCESS_API_KEY",
  "GROQ_CALIBRATION_MODEL",
  "GROQ_CONFIG_AI_MODEL",
  "GROQ_LUMEN_EYE_MODEL",
  "GROQ_PULSE_MODEL",
  "GROQ_RESEARCH_MODEL",
  "GROQ_WIDGET_MODEL",
  "GROQ_WIDGET_TRANSCRIPTION_MODEL",
  "GROQ_CHATS_MODEL",
  "GROQ_KNOWLEDGE_MODEL",
  "GROQ_INTERFACE_MODEL",
  "GROQ_OVERVIEW_MODEL",
  "GROQ_ACCESS_MODEL",
  "GOOGLE_OAUTH_CLIENT_ID",
  "GOOGLE_OAUTH_CLIENT_SECRET",
  "GOOGLE_OAUTH_REDIRECT_URI",
  "LUMENAI_INTEGRATION_ENCRYPTION_KEY",
] as const;

export type PublicEnvName = (typeof PUBLIC_ENV_NAMES)[number];
export type PrivateEnvName = (typeof PRIVATE_ENV_NAMES)[number];

const PUBLIC_ENV_VALUES: PublicEnv = {
  NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL ?? "",
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
  NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
};

function read(name: string) {
  if ((PUBLIC_ENV_NAMES as readonly string[]).includes(name)) {
    return String(PUBLIC_ENV_VALUES[name as PublicEnvName] ?? "").trim();
  }

  if (typeof process === "undefined") return "";

  return String(process.env[name] ?? "").trim();
}

function requireValue(name: string) {
  const value = read(name);

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

function assertServerOnly(name: string) {
  if (typeof window !== "undefined") {
    throw new Error(`Server-only environment variable requested in browser: ${name}`);
  }
}

export function getOptionalEnv(name: string) {
  return read(name);
}

export function requirePublicEnv(name: PublicEnvName) {
  return requireValue(name);
}

export function requireServerEnv(name: PrivateEnvName) {
  assertServerOnly(name);
  return requireValue(name);
}

export function getPublicEnv(): PublicEnv {
  return {
    NEXT_PUBLIC_APP_URL: read("NEXT_PUBLIC_APP_URL"),
    NEXT_PUBLIC_SUPABASE_URL: requirePublicEnv("NEXT_PUBLIC_SUPABASE_URL"),
    NEXT_PUBLIC_SUPABASE_ANON_KEY: requirePublicEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY"),
  };
}

export function getServerEnv(): ServerEnv {
  assertServerOnly("server environment");
  const publicEnv = getPublicEnv();

  return {
    ...publicEnv,
    SUPABASE_SERVICE_ROLE_KEY: requireServerEnv("SUPABASE_SERVICE_ROLE_KEY"),
  };
}

export function getSupabaseBrowserEnv() {
  const publicEnv = getPublicEnv();

  return {
    url: publicEnv.NEXT_PUBLIC_SUPABASE_URL,
    anonKey: publicEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  };
}

export function getSupabaseServerEnv() {
  const env = getServerEnv();

  return {
    url: env.NEXT_PUBLIC_SUPABASE_URL,
    anonKey: env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    serviceRoleKey: env.SUPABASE_SERVICE_ROLE_KEY,
  };
}

export function getAppUrl() {
  return read("NEXT_PUBLIC_APP_URL");
}

export function maskSecret(value: string) {
  if (!value) return "";
  if (value.length <= 8) return "****";
  return `${value.slice(0, 4)}...${value.slice(-4)}`;
}
