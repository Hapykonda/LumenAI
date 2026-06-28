import type { adminClient } from "@/app/api/panel/calibration/_lib";
import { cleanText } from "./schemas";

type Admin = ReturnType<typeof adminClient>;

export async function recordBusinessSnapshot(input: {
  admin: Admin;
  businessId: string;
  userId?: string | null;
  snapshot: unknown;
  source?: string;
}) {
  try {
    await input.admin.from("lumenai_business_snapshots").insert({
      business_id: input.businessId,
      user_id: input.userId ?? null,
      snapshot: input.snapshot ?? {},
      source: cleanText(input.source, 80) || "lumenite",
    });
  } catch {
    // Optional table until the migration is applied.
  }
}

export async function recordConfigSnapshotSafe(input: {
  admin: Admin;
  businessId: string;
  userId?: string | null;
  previousConfig?: unknown;
  newConfig?: unknown;
  userPrompt?: string;
  actionType?: string;
}) {
  try {
    await input.admin.from("lumenai_config_snapshots").insert({
      business_id: input.businessId,
      user_id: input.userId ?? null,
      previous_config: input.previousConfig ?? null,
      new_config: input.newConfig ?? null,
      user_prompt: cleanText(input.userPrompt, 1200),
      action_type: cleanText(input.actionType, 120),
    });
  } catch {
    // Do not break operational flows if SQL is pending.
  }
}
