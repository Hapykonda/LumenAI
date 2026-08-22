// lib/ai/business-context.ts
export type DayKey = "mon" | "tue" | "wed" | "thu" | "fri" | "sat" | "sun";
export type DayHours = { open: boolean; from: string; to: string };
export type SpecialDateRule = { closed: boolean; reason?: string };
export type BusinessHours = Record<DayKey, DayHours> & {
  closedDates?: Record<string, SpecialDateRule>;
};

const DAY_LABEL: Record<DayKey, string> = {
  mon: "Lunes",
  tue: "Martes",
  wed: "Miércoles",
  thu: "Jueves",
  fri: "Viernes",
  sat: "Sábado",
  sun: "Domingo",
};

const DEFAULT_HOURS: BusinessHours = {
  mon: { open: true, from: "10:00", to: "18:00" },
  tue: { open: true, from: "10:00", to: "18:00" },
  wed: { open: true, from: "10:00", to: "18:00" },
  thu: { open: true, from: "10:00", to: "18:00" },
  fri: { open: true, from: "10:00", to: "18:00" },
  sat: { open: false, from: "10:00", to: "14:00" },
  sun: { open: false, from: "10:00", to: "14:00" },
};

export function normalizeHours(value: unknown): BusinessHours {
  const source =
    value && typeof value === "object" && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : {};
  const out: BusinessHours = { ...DEFAULT_HOURS };
  const keys: DayKey[] = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];
  for (const k of keys) {
    const raw = source[k];
    const v =
      raw && typeof raw === "object" && !Array.isArray(raw)
        ? (raw as Record<string, unknown>)
        : {};
    out[k] = {
      open: typeof v?.open === "boolean" ? v.open : DEFAULT_HOURS[k].open,
      from: typeof v?.from === "string" ? v.from : DEFAULT_HOURS[k].from,
      to: typeof v?.to === "string" ? v.to : DEFAULT_HOURS[k].to,
    };
  }

  const closedDates =
    source.closedDates &&
    typeof source.closedDates === "object" &&
    !Array.isArray(source.closedDates)
      ? source.closedDates
      : {};

  out.closedDates = Object.entries(closedDates).reduce(
    (acc: Record<string, SpecialDateRule>, [date, rule]) => {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return acc;
      const r = rule && typeof rule === "object" ? (rule as Record<string, unknown>) : {};
      acc[date] = {
        closed: typeof r.closed === "boolean" ? r.closed : true,
        reason: String(r.reason ?? "").trim(),
      };
      return acc;
    },
    {}
  );

  return out as BusinessHours;
}

function timeToMinutes(t: string) {
  const [hh, mm] = String(t || "").split(":").map((x) => parseInt(x, 10));
  if (!Number.isFinite(hh) || !Number.isFinite(mm)) return null;
  return hh * 60 + mm;
}

function weekdayToKey(short: string): DayKey {
  const s = short.toLowerCase();
  if (s.startsWith("mon")) return "mon";
  if (s.startsWith("tue")) return "tue";
  if (s.startsWith("wed")) return "wed";
  if (s.startsWith("thu")) return "thu";
  if (s.startsWith("fri")) return "fri";
  if (s.startsWith("sat")) return "sat";
  return "sun";
}

function getNowParts(timeZone: string) {
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone,
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });

  const parts = dtf.formatToParts(new Date());
  const wk = parts.find((p) => p.type === "weekday")?.value ?? "Mon";
  const hh = parts.find((p) => p.type === "hour")?.value ?? "00";
  const mm = parts.find((p) => p.type === "minute")?.value ?? "00";
  const minutes = (parseInt(hh, 10) || 0) * 60 + (parseInt(mm, 10) || 0);
  const dateKey = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());

  return { dayKey: weekdayToKey(wk), minutes, weekdayShort: wk, hh, mm, dateKey };
}

function getDateKeyForOffset(timeZone: string, offsetDays: number) {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() + offsetDays);

  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function isOpenNow(hours: BusinessHours, timeZone: string) {
  const now = getNowParts(timeZone);
  const special = hours.closedDates?.[now.dateKey];

  if (special?.closed) {
    return {
      open: false,
      dayKey: now.dayKey,
      nowMinutes: now.minutes,
      specialDate: now.dateKey,
      reason: special.reason || "Dia sin atencion",
    };
  }

  const today = hours[now.dayKey];

  if (!today?.open) {
    return { open: false, dayKey: now.dayKey, nowMinutes: now.minutes };
  }

  const fromM = timeToMinutes(today.from);
  const toM = timeToMinutes(today.to);
  if (fromM === null || toM === null) return { open: false, dayKey: now.dayKey, nowMinutes: now.minutes };

  // caso típico (10:00–18:00)
  const open = now.minutes >= fromM && now.minutes <= toM;
  return { open, dayKey: now.dayKey, nowMinutes: now.minutes };
}

function nextOpenWindow(hours: BusinessHours, timeZone: string) {
  const keys: DayKey[] = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];
  const now = getNowParts(timeZone);
  const idx = keys.indexOf(now.dayKey);

  for (let offset = 0; offset < 7; offset++) {
    const k = keys[(idx + offset) % 7];
    const d = hours[k];
    if (!d?.open) continue;
    const dateKey = getDateKeyForOffset(timeZone, offset);
    if (hours.closedDates?.[dateKey]?.closed) continue;

    const fromM = timeToMinutes(d.from);
    const toM = timeToMinutes(d.to);
    if (fromM === null || toM === null) continue;

    // si es hoy, solo sirve si todavía no empieza o estamos dentro
    if (offset === 0) {
      if (now.minutes <= toM) {
        return { dayKey: k, from: d.from, to: d.to };
      }
      continue;
    }

    return { dayKey: k, from: d.from, to: d.to };
  }

  return null;
}

export function formatHoursForHumans(hours: BusinessHours) {
  const keys: DayKey[] = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];
  const weekly = keys
    .map((k) => {
      const d = hours[k];
      if (!d?.open) return `${DAY_LABEL[k]}: Cerrado`;
      return `${DAY_LABEL[k]}: ${d.from}–${d.to}`;
    })
    .join("\n");

  const closures = Object.entries(hours.closedDates ?? {})
    .filter(([, rule]) => rule?.closed)
    .map(([date, rule]) => `${date}: Cerrado${rule.reason ? ` (${rule.reason})` : ""}`)
    .join("\n");

  return closures ? `${weekly}\n\nCIERRES ESPECIALES:\n${closures}` : weekly;
}

export function buildBusinessContext(opts: {
  businessName?: string | null;
  assistantName?: string | null;
  tone?: string | null;
  whatsapp?: string | null;
  email?: string | null;
  businessHours?: unknown;
  timeZone?: string | null; // ideal: "America/Santiago"
}) {
  const name = (opts.businessName ?? "").trim() || "el negocio";
  const assistant = (opts.assistantName ?? "").trim() || "LumenAI";
  const tone = (opts.tone ?? "neutral").toString();
  const tz = (opts.timeZone ?? "").trim() || "America/Santiago";

  const hours = normalizeHours(opts.businessHours);
  const openInfo = isOpenNow(hours, tz);
  const next = nextOpenWindow(hours, tz);

  const hasWA = Boolean(opts.whatsapp && opts.whatsapp.trim());
  const hasEmail = Boolean(opts.email && opts.email.trim());

  const contactLines = [
    hasWA ? `WhatsApp: ${String(opts.whatsapp).trim()}` : null,
    hasEmail ? `Email: ${String(opts.email).trim()}` : null,
  ].filter(Boolean);

  const contactText = contactLines.length ? contactLines.join("\n") : "No hay canales de contacto configurados.";

  const hoursText = formatHoursForHumans(hours);
  const specialReason = "reason" in openInfo ? openInfo.reason : "";

  const openText = openInfo.open
    ? "Ahora: ABIERTO"
    : next
    ? `Ahora: CERRADO • Próxima atención: ${DAY_LABEL[next.dayKey]} ${next.from}–${next.to}`
    : `Ahora: CERRADO${specialReason ? ` (${specialReason})` : ""}`;

  // Esto es lo que el modelo debe “saber sí o sí”
  const systemBusinessBlock = `
Negocio: ${name}
Asistente: ${assistant}
Tono: ${tone}
Zona horaria: ${tz}

CONTACTO (para cerrar conversaciones):
${contactText}

HORARIO:
${hoursText}

ESTADO ACTUAL:
${openText}

INSTRUCCIONES IMPORTANTES:
- Si el usuario pregunta por horarios o si están abiertos, responde usando HORARIO y ESTADO ACTUAL.
- Si el usuario pide contacto o quiere cerrar/agenda/compra, ofrece WhatsApp/Email (si existen) y sugiere el mejor canal.
- Si está CERRADO, dilo explícitamente y ofrece dejar un mensaje + canal de contacto.
- No inventes horarios ni contacto: usa SOLO lo anterior.
`.trim();

  return { systemBusinessBlock, openInfo, next, timeZone: tz, hours };
}
