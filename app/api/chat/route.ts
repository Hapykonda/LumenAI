// app/api/chat/route.ts
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST() {
  return NextResponse.json(
    { ok: false, error: "API /api/chat desactivada temporalmente (modo rescate auth/panel)." },
    { status: 501 }
  );
}