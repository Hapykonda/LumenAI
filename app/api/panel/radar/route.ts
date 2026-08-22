import { GET as pulseRadarGet } from "../pulse-radar/route";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  return pulseRadarGet(request);
}
