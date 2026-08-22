import { NextResponse } from "next/server";
import {
  createLumenitePolicy,
  listLumenitePolicies,
  revokeLumenitePolicy,
  updateLumenitePolicy,
} from "@/lib/ai/lumenite/policy-management";
import { cleanString, isRecord, isUuid } from "@/lib/ai/lumenite/core";
import { safeErrorCode, safeErrorMessage, safeErrorStatus } from "@/lib/ai/lumenite/errors";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function failure(error: unknown, fallback: string) {
  return NextResponse.json(
    { ok: false, code: safeErrorCode(error), error: safeErrorMessage(error, fallback) },
    { status: safeErrorStatus(error) },
  );
}

export async function GET(req: Request) {
  try {
    return NextResponse.json({ ok: true, ...(await listLumenitePolicies(req)) });
  } catch (error) {
    return failure(error, "No se pudieron cargar los permisos.");
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null);
    return NextResponse.json({ ok: true, policy: await createLumenitePolicy(body, req) }, { status: 201 });
  } catch (error) {
    return failure(error, "No se pudo crear la politica.");
  }
}

export async function PATCH(req: Request) {
  try {
    const body = await req.json().catch(() => null);
    if (!isRecord(body) || !isUuid(body.id) || !Number.isInteger(Number(body.revision))) {
      return NextResponse.json({ ok: false, error: "La politica no es valida." }, { status: 400 });
    }
    return NextResponse.json({
      ok: true,
      policy: await updateLumenitePolicy({
        id: String(body.id),
        revision: Number(body.revision),
        policy: body.policy,
        request: req,
      }),
    });
  } catch (error) {
    return failure(error, "No se pudo actualizar la politica.");
  }
}

export async function DELETE(req: Request) {
  try {
    const body = await req.json().catch(() => null);
    if (!isRecord(body) || !isUuid(body.id)) {
      return NextResponse.json({ ok: false, error: "La politica no es valida." }, { status: 400 });
    }
    return NextResponse.json({
      ok: true,
      ...(await revokeLumenitePolicy({
        id: String(body.id),
        reason: cleanString(body.reason, 500),
        request: req,
      })),
    });
  } catch (error) {
    return failure(error, "No se pudo revocar la politica.");
  }
}
