/**
 * All monetary values are integer minor units (for example, cents).
 * Missing cost inputs stay unknown; the engine never invents COGS or fees.
 */

export type CostInputs = {
  unitCostMinor?: number | null;
  paymentFeeMinor?: number | null;
  fulfillmentCostMinor?: number | null;
  shippingSubsidyMinor?: number | null;
};

export type OfferEconomicsInput = {
  unitPriceMinor: number;
  quantity: number;
  discountMinor: number;
  refundMinor?: number;
  costs: CostInputs;
};

export type ProfitResult = {
  netRevenueMinor: number;
  knownVariableCostsMinor: number;
  contributionMinor: number | null;
  contributionMarginBps: number | null;
  completeness: "complete" | "partial" | "unknown";
  missingInputs: string[];
};

function assertMinor(value: number, field: string): void {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new Error(`${field} must be a non-negative safe integer in minor units`);
  }
}

export function calculateContribution(input: OfferEconomicsInput): ProfitResult {
  assertMinor(input.unitPriceMinor, "unitPriceMinor");
  assertMinor(input.quantity, "quantity");
  assertMinor(input.discountMinor, "discountMinor");
  assertMinor(input.refundMinor ?? 0, "refundMinor");

  const gross = input.unitPriceMinor * input.quantity;
  if (!Number.isSafeInteger(gross)) throw new Error("Gross amount exceeds safe integer range");

  const netRevenueMinor = Math.max(0, gross - input.discountMinor - (input.refundMinor ?? 0));
  const fields: Array<[keyof CostInputs, string, number]> = [
    ["unitCostMinor", "product cost", input.quantity],
    ["paymentFeeMinor", "payment fees", 1],
    ["fulfillmentCostMinor", "fulfillment cost", input.quantity],
    ["shippingSubsidyMinor", "shipping subsidy", 1],
  ];

  let knownVariableCostsMinor = 0;
  const missingInputs: string[] = [];
  for (const [key, label, multiplier] of fields) {
    const value = input.costs[key];
    if (value == null) {
      missingInputs.push(label);
      continue;
    }
    assertMinor(value, String(key));
    knownVariableCostsMinor += value * multiplier;
  }

  const complete = missingInputs.length === 0;
  const contributionMinor = complete ? netRevenueMinor - knownVariableCostsMinor : null;
  const contributionMarginBps =
    complete && netRevenueMinor > 0
      ? Math.round((contributionMinor! / netRevenueMinor) * 10_000)
      : null;

  return {
    netRevenueMinor,
    knownVariableCostsMinor,
    contributionMinor,
    contributionMarginBps,
    completeness: complete ? "complete" : missingInputs.length === fields.length ? "unknown" : "partial",
    missingInputs,
  };
}

export function calculateDiscountCeiling(input: {
  priceMinor: number;
  unitCostMinor: number;
  otherVariableCostMinor: number;
  minimumContributionMinor: number;
}): number {
  for (const [key, value] of Object.entries(input)) assertMinor(value, key);
  return Math.max(
    0,
    input.priceMinor - input.unitCostMinor - input.otherVariableCostMinor - input.minimumContributionMinor,
  );
}

export function rankProductPair(input: {
  coOrders: number;
  ordersWithA: number;
  ordersWithB: number;
  totalOrders: number;
}): { support: number; confidence: number; lift: number | null } {
  const { coOrders, ordersWithA, ordersWithB, totalOrders } = input;
  for (const [key, value] of Object.entries(input)) {
    if (!Number.isSafeInteger(value) || value < 0) throw new Error(`${key} must be a non-negative integer`);
  }
  if (totalOrders === 0 || coOrders > ordersWithA || coOrders > ordersWithB || ordersWithA > totalOrders || ordersWithB > totalOrders) {
    throw new Error("Inconsistent co-purchase counts");
  }
  const support = coOrders / totalOrders;
  const confidence = ordersWithA === 0 ? 0 : coOrders / ordersWithA;
  const baseline = ordersWithB / totalOrders;
  return { support, confidence, lift: baseline === 0 ? null : confidence / baseline };
}
