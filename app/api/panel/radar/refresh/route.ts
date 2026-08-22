import { POST as pulseRadarPost } from "../../pulse-radar/route";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  return pulseRadarPost(request);
}
