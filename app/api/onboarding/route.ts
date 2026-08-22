import { NextResponse, type NextRequest } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { randomUUID } from "crypto";
import { getSupabaseBrowserEnv, getSupabaseServerEnv } from "@/lib/env";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function normalizeImageUrl(value: unknown) {
  const raw = String(value ?? "").trim();
  if (!raw) return "";
  if (raw.startsWith("/") && !raw.startsWith("//")) return raw.slice(0, 1200);

  try {
    const url = new URL(raw);
    return url.protocol === "https:" || url.protocol === "http:"
      ? url.toString().slice(0, 1200)
      : "";
  } catch {
    return "";
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const businessName = String(body?.businessName || "").trim();
    const industry = String(body?.industry || "").trim();
    const tone = String(body?.tone || "").trim();
    const products = String(body?.products || "").trim();
    const pricing = String(body?.pricing || "").trim();
    const payments = String(body?.payments || "").trim();
    const contactEmail = String(body?.contactEmail || "").trim();
    const whatsapp = String(body?.whatsapp || "").trim();
    const hours = String(body?.hours || "").trim();
    const assistantName = String(body?.assistantName || "LumenAI").trim();
    const primaryColor = String(body?.primaryColor || "#00E5FF").trim();
    const secondaryColor = String(body?.secondaryColor || "#1B43FF").trim();
    const initialKnowledge = String(body?.initialKnowledge || "").trim();
    const rawAvatarUrl = String(body?.avatarUrl || "").trim();
    const avatarUrl = normalizeImageUrl(rawAvatarUrl);

    if (!businessName) {
      return NextResponse.json({ error: "missing_businessName" }, { status: 400 });
    }
    if (rawAvatarUrl && !avatarUrl) {
      return NextResponse.json({ error: "invalid_avatar_url" }, { status: 400 });
    }

    // auth (cookie session)
    const cookieStore = await cookies();
    const res = NextResponse.json({ ok: true });
    const browserEnv = getSupabaseBrowserEnv();

    const sb = createServerClient(
      browserEnv.url,
      browserEnv.anonKey,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => {
              res.cookies.set(name, value, options);
            });
          },
        },
      }
    );

    const { data } = await sb.auth.getUser();
    const user = data?.user;
    if (!user) {
      return NextResponse.json({ error: "not_authenticated" }, { status: 401 });
    }

    // admin (service role)
    const serverEnv = getSupabaseServerEnv();
    const admin = createClient(serverEnv.url, serverEnv.serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    // 1) Si YA existe business para este user, úsalo (evita duplicados)
    const { data: existing } = await admin
      .from("businesses")
      .select("id, public_key")
      .eq("owner_id", user.id)
      .limit(1)
      .maybeSingle();

    let businessId = existing?.id ?? null;
    let publicKey = existing?.public_key ?? null;

    // 2) Si no existe, créalo
    if (!businessId) {
      const newPublicKey = randomUUID();

      const { data: created, error: insErr } = await admin
        .from("businesses")
        .insert({
          owner_id: user.id,
          public_key: newPublicKey,
          name: businessName,
          industry: industry || null,
          tone: tone || null,
          whatsapp: whatsapp || null,
          email: contactEmail || null,
          metadata: {
            onboarding: {
              products: products || null,
              pricing: pricing || null,
              payments: payments || null,
              hours: hours || null,
              assistantName: assistantName || "LumenAI",
              primaryColor,
              secondaryColor,
              initialKnowledge: initialKnowledge || null,
              completedAt: new Date().toISOString(),
            },
          },
        })
        .select("id, public_key")
        .single();

      if (insErr) throw new Error(insErr.message);

      businessId = created.id;
      publicKey = created.public_key;
    } else {
      await admin
        .from("businesses")
        .update({
          name: businessName,
          industry: industry || null,
          tone: tone || null,
          whatsapp: whatsapp || null,
          email: contactEmail || null,
          metadata: {
            onboarding: {
              products: products || null,
              pricing: pricing || null,
              payments: payments || null,
              hours: hours || null,
              assistantName: assistantName || "LumenAI",
              primaryColor,
              secondaryColor,
              initialKnowledge: initialKnowledge || null,
              completedAt: new Date().toISOString(),
            },
          },
          updated_at: new Date().toISOString(),
        })
        .eq("id", businessId);
    }

    // 3) Asegura que exista profiles row + asigna business_id (UPSERT)
    const { error: upsertErr } = await admin
      .from("profiles")
      .upsert(
        {
          id: user.id,
          business_id: businessId,
        },
        { onConflict: "id" }
      );

    if (upsertErr) throw new Error(upsertErr.message);

    // 4) (Recomendado) asegura widget_settings para calibración
    //    si ya existe, no hace nada
    await admin
      .from("widget_settings")
      .upsert(
        {
          business_id: businessId,
          public_key: publicKey ?? randomUUID(),
          assistant_name: assistantName || "LumenAI",
          greeting:
            `Hola, soy ${assistantName || "LumenAI"}. Te ayudo con ${businessName}.`,
          whatsapp: whatsapp || null,
          email: contactEmail || null,
          primary_color: primaryColor,
          gradient_from: primaryColor,
          gradient_to: secondaryColor,
          avatar_url: avatarUrl || null,
          business_hours: hours ? { summary: hours } : {},
          draft_settings: {
            source: "onboarding",
            assistantName: assistantName || "LumenAI",
            tone: tone || null,
            hours: hours || null,
            primaryColor,
            secondaryColor,
          },
          published_settings: {},
        },
        { onConflict: "business_id" }
      );

    const kbDrafts = [
      products
        ? {
            type: "services",
            title: "Productos y servicios iniciales",
            content: products,
          }
        : null,
      pricing
        ? {
            type: "pricing",
            title: "Precios iniciales",
            content: pricing,
          }
        : null,
      payments
        ? {
            type: "payments",
            title: "Pagos y condiciones iniciales",
            content: payments,
          }
        : null,
      hours
        ? {
            type: "hours",
            title: "Horario de atencion inicial",
            content: hours,
          }
        : null,
      initialKnowledge
        ? {
            type: "other",
            title: "Notas iniciales de Knowledge",
            content: initialKnowledge,
          }
        : null,
    ].filter(Boolean);

    if (kbDrafts.length) {
      const { count } = await admin
        .from("business_kb")
        .select("id", { count: "exact", head: true })
        .eq("business_id", businessId)
        .eq("metadata->>source", "onboarding");

      if (!count) {
        await admin.from("business_kb").insert(
          kbDrafts.map((item) => ({
            ...(item as { type: string; title: string; content: string }),
            business_id: businessId,
            is_published: false,
            metadata: {
              source: "onboarding",
              status: "draft",
            },
          }))
        );
      }
    }

    return res;
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Error";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
