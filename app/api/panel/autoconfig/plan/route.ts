import { POST as autoconfigPost } from "../route";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));

  return autoconfigPost(
    new Request(req.url, {
      method: "POST",
      headers: req.headers,
      body: JSON.stringify({ ...body, apply: false }),
    })
  );
}
