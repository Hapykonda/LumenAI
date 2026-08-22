import { NextResponse } from "next/server";
import { createLumenitePlan } from "@/lib/ai/lumenite/action-engine";
import { cleanString, isRecord, isUuid } from "@/lib/ai/lumenite/core";
import { safeErrorCode, safeErrorMessage, safeErrorStatus } from "@/lib/ai/lumenite/errors";
import { getAuthorizedBusinessContext } from "@/lib/auth/business-context";
import { GOOGLE_GMAIL_PROVIDER } from "@/lib/integrations/google-gmail";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null);
    if (!isRecord(body)) return NextResponse.json({ ok: false, error: "Solicitud no valida." }, { status: 400 });
    const recipient = cleanString(body.recipient, 320).toLowerCase();
    const subject = cleanString(body.subject, 300);
    const content = cleanString(body.content, 10_000);
    const integrationId = cleanString(body.integrationId, 80);
    if (!isUuid(integrationId) || !recipient || !subject || !content) {
      return NextResponse.json({ ok: false, error: "Completa integracion, destinatario, asunto y contenido." }, { status: 400 });
    }
    const ctx = await getAuthorizedBusinessContext({ request: req, requiredPermission: "resources:write" });
    const integration = await ctx.admin
      .from("lumenai_integrations")
      .select("id,status")
      .eq("id", integrationId)
      .eq("business_id", ctx.businessId)
      .eq("provider", GOOGLE_GMAIL_PROVIDER)
      .maybeSingle();
    if (integration.error || !integration.data?.id || !["connected", "degraded"].includes(String(integration.data.status))) {
      return NextResponse.json({ ok: false, error: "La integracion Gmail no esta disponible." }, { status: 409 });
    }
    const result = await createLumenitePlan({
      request: req,
      agent: "integrations",
      instruction: `Preparar un borrador de correo para ${recipient} con asunto ${subject}.`,
      source: "api",
      requestKey: cleanString(req.headers.get("idempotency-key"), 220),
      context: {
        integrationId,
        deterministicAction: true,
        suggestedAction: {
          capability: "external.gmail.draft.create",
          input: { recipient, subject, content },
          reason: "Crear un borrador externo revisable sin enviar el correo.",
          expectedResult: "Un borrador de Gmail verificado y disponible para revision humana.",
        },
      },
    });
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: safeErrorMessage(error, "No se pudo preparar el borrador."), code: safeErrorCode(error) },
      { status: safeErrorStatus(error) },
    );
  }
}
