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
