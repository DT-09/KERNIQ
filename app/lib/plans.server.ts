export const PLAN_LIMITS = {
  Launch: { maxOffers: 3, maxOrdersAnalyzed: 1000 },
  Growth: { maxOffers: 15, maxOrdersAnalyzed: 3000 },
  Scale: { maxOffers: 50, maxOrdersAnalyzed: 5000 },
} as const;

export type PlanName = keyof typeof PLAN_LIMITS;

export function getPlanLimits(planName: string | null | undefined) {
  if (!planName || !(planName in PLAN_LIMITS)) return null;
  return PLAN_LIMITS[planName as PlanName];
}
