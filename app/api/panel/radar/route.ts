import { GET as insightsGet } from "../insights/route";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  return insightsGet();
}
