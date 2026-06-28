import { NextResponse, type NextRequest } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { randomUUID } from "crypto";
import { getSupabaseBrowserEnv, getSupabaseServerEnv } from "@/lib/env";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const businessName = String(body?.businessName || "").trim();
    const industry = String(body?.industry || "").trim();
    const tone = String(body?.tone || "").trim();

    if (!businessName) {
      return NextResponse.json({ error: "missing_businessName" }, { status: 400 });
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
        })
        .select("id, public_key")
        .single();

      if (insErr) throw new Error(insErr.message);

      businessId = created.id;
      publicKey = created.public_key;
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
          draft_settings: {},
          published_settings: {},
        },
        { onConflict: "business_id" }
      );

    return res;
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Error" }, { status: 400 });
  }
}
