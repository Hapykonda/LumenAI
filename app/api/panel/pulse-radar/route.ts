import { pulseRadarResponse } from "./_lib";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const url = new URL(request.url);
  return pulseRadarResponse(url.searchParams.get("section") || "panel", request);
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const section = body && typeof body === "object" && "section" in body ? String(body.section || "panel") : "panel";
  return pulseRadarResponse(section, request);
}
