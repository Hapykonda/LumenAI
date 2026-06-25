export type CountryCoords = [number, number];

type CountryRecord = {
  code: string;
  name: string;
  aliases: string[];
  coords: CountryCoords;
};

function stripDiacritics(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const COUNTRY_RECORDS: CountryRecord[] = [
  { code: "AR", name: "Argentina", aliases: ["argentina"], coords: [-38.4161, -63.6167] },
  { code: "BO", name: "Bolivia", aliases: ["bolivia"], coords: [-16.2902, -63.5887] },
  { code: "BR", name: "Brasil", aliases: ["brasil", "brazil"], coords: [-14.235, -51.9253] },
  { code: "CA", name: "Canadá", aliases: ["canada"], coords: [56.1304, -106.3468] },
  { code: "CL", name: "Chile", aliases: ["chile"], coords: [-35.6751, -71.543] },
  { code: "CO", name: "Colombia", aliases: ["colombia"], coords: [4.5709, -74.2973] },
  { code: "CR", name: "Costa Rica", aliases: ["costa rica"], coords: [9.7489, -83.7534] },
  { code: "EC", name: "Ecuador", aliases: ["ecuador"], coords: [-1.8312, -78.1834] },
  { code: "ES", name: "España", aliases: ["espana", "spain"], coords: [40.4637, -3.7492] },
  { code: "FR", name: "Francia", aliases: ["francia", "france"], coords: [46.2276, 2.2137] },
  { code: "GB", name: "Reino Unido", aliases: ["reino unido", "uk", "united kingdom", "great britain"], coords: [55.3781, -3.436] },
  { code: "MX", name: "México", aliases: ["mexico"], coords: [23.6345, -102.5528] },
  { code: "PA", name: "Panamá", aliases: ["panama"], coords: [8.538, -80.7821] },
  { code: "PE", name: "Perú", aliases: ["peru"], coords: [-9.19, -75.0152] },
  { code: "PY", name: "Paraguay", aliases: ["paraguay"], coords: [-23.4425, -58.4438] },
  { code: "DO", name: "República Dominicana", aliases: ["republica dominicana", "dominican republic"], coords: [18.7357, -70.1627] },
  { code: "US", name: "Estados Unidos", aliases: ["estados unidos", "usa", "us", "united states"], coords: [37.0902, -95.7129] },
  { code: "UY", name: "Uruguay", aliases: ["uruguay"], coords: [-32.5228, -55.7658] },
  { code: "VE", name: "Venezuela", aliases: ["venezuela"], coords: [6.4238, -66.5897] },
];

const byCode = new Map(COUNTRY_RECORDS.map((country) => [country.code, country]));
const byAlias = new Map<string, CountryRecord>();

for (const country of COUNTRY_RECORDS) {
  byAlias.set(stripDiacritics(country.name), country);
  for (const alias of country.aliases) {
    byAlias.set(stripDiacritics(alias), country);
  }
}

export const COUNTRY_COORDS: Record<string, CountryCoords> = COUNTRY_RECORDS.reduce(
  (acc, country) => {
    acc[stripDiacritics(country.name)] = country.coords;
    for (const alias of country.aliases) {
      acc[stripDiacritics(alias)] = country.coords;
    }
    return acc;
  },
  {} as Record<string, CountryCoords>
);

export function countryNameFromCode(value: unknown) {
  const code = String(value ?? "").trim().toUpperCase();
  if (!code || code === "XX" || code === "ZZ") return null;
  return byCode.get(code)?.name ?? null;
}

export function resolveCountryName(value: unknown, code?: unknown) {
  const fromCode = countryNameFromCode(code);
  if (fromCode) return fromCode;

  const key = stripDiacritics(String(value ?? ""));
  if (!key) return null;
  return byAlias.get(key)?.name ?? String(value ?? "").trim();
}

export function resolveCountryKey(value: unknown, code?: unknown) {
  const name = resolveCountryName(value, code);
  if (!name) return "";
  return stripDiacritics(name);
}

export function resolveCountryDisplay(value: unknown, code?: unknown) {
  const name = resolveCountryName(value, code);
  if (!name) return "";
  return name;
}
