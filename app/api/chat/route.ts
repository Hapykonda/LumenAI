// app/api/chat/route.ts
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST() {
  return NextResponse.json(
    { ok: false, error: "Este canal no esta disponible. Usa el chat del panel o el widget publico." },
    { status: 501 }
  );
}
