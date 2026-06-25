import { createSupabaseServerClient } from "@/lib/supabase/server";

type KBCanonicalType =
  | "faq"
  | "services"
  | "pricing"
  | "policy"
  | "contact"
  | "payment"
  | "other";

type KBRow = {
  id: string;
  business_id: string;
  type: string;
  title: string;
  content: string;
  is_published: boolean;
  created_at: string;
  updated_at: string;
};

function clampText(s: string, max = 1200) {
  const t = (s ?? "").trim();
  if (t.length <= max) return t;
  return t.slice(0, max - 1).trimEnd() + "...";
}

function normalizeType(type: unknown): KBCanonicalType {
  const value = String(type ?? "").trim().toLowerCase();

  if (value === "faq") return "faq";
  if (value === "service" || value === "services" || value === "product") {
    return "services";
  }
  if (value === "price" || value === "pricing" || value === "prices") {
    return "pricing";
  }
  if (value === "policy" || value === "policies") return "policy";
  if (value === "contact") return "contact";
  if (value === "payment" || value === "payments" || value === "transfer") {
    return "payment";
  }

  return "other";
}

export async function buildKbContext(businessId: string) {
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from("business_kb")
    .select("id,business_id,type,title,content,is_published,created_at,updated_at")
    .eq("business_id", businessId)
    .eq("is_published", true)
    .order("updated_at", { ascending: false });

  if (error) throw new Error(error.message);

  const items = ((data ?? []) as KBRow[]).slice(0, 40);

  const groups: Record<KBCanonicalType, KBRow[]> = {
    faq: [],
    services: [],
    pricing: [],
    policy: [],
    contact: [],
    payment: [],
    other: [],
  };

  for (const item of items) groups[normalizeType(item.type)].push(item);

  const section = (title: string, rows: KBRow[]) => {
    if (!rows.length) return "";
    const lines = rows.map((row) => `- ${row.title}: ${clampText(row.content, 900)}`);
    return `\n## ${title}\n${lines.join("\n")}\n`;
  };

  const context =
    `# Base de conocimiento (fuente oficial del negocio)\n` +
    section("FAQs", groups.faq) +
    section("Servicios", groups.services) +
    section("Precios", groups.pricing) +
    section("Datos de transferencia y pagos", groups.payment) +
    section("Contacto y derivacion", groups.contact) +
    section("Politicas", groups.policy) +
    section("Otros", groups.other);

  return { context, count: items.length };
}
