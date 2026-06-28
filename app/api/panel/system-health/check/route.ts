import { POST as healthPost } from "../route";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
  return healthPost();
}
