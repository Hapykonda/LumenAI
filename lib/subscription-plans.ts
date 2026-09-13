const PLAN_LABELS = { start: "Start", business: "Business", scale: "Scale" } as const;
export type SubscriptionPlan = keyof typeof PLAN_LABELS;

export function normalizeSubscriptionPlan(value: string | null): SubscriptionPlan | null {
  const aliases: Record<string, SubscriptionPlan> = {
    start: "start", business: "business", scale: "scale",
    inicio: "start", crecimiento: "business", escala: "scale",
  };
  return value && Object.hasOwn(aliases, value) ? aliases[value] : null;
}

export function subscriptionPlanLabel(plan: SubscriptionPlan) {
  return PLAN_LABELS[plan];
}
