import test from "node:test";
import assert from "node:assert/strict";
import { calculateContribution, calculateDiscountCeiling, rankProductPair } from "../app/lib/profit.server.ts";

test("contribution profit stays unknown when a required cost is missing", () => {
  const result = calculateContribution({
    unitPriceMinor: 5000, quantity: 2, discountMinor: 500,
    costs: { unitCostMinor: 1800, paymentFeeMinor: 100, fulfillmentCostMinor: null, shippingSubsidyMinor: 0 },
  });
  assert.equal(result.netRevenueMinor, 9500);
  assert.equal(result.contributionMinor, null);
  assert.equal(result.completeness, "partial");
  assert.deepEqual(result.missingInputs, ["fulfillment cost"]);
});

test("complete contribution calculation uses integer minor units", () => {
  const result = calculateContribution({
    unitPriceMinor: 5000, quantity: 2, discountMinor: 500, refundMinor: 1000,
    costs: { unitCostMinor: 1800, paymentFeeMinor: 100, fulfillmentCostMinor: 250, shippingSubsidyMinor: 0 },
  });
  assert.equal(result.netRevenueMinor, 8500);
  assert.equal(result.knownVariableCostsMinor, 4200);
  assert.equal(result.contributionMinor, 4300);
  assert.equal(result.contributionMarginBps, 5059);
  assert.equal(result.completeness, "complete");
});

test("discount ceiling protects the required contribution floor", () => {
  assert.equal(calculateDiscountCeiling({
    priceMinor: 5000, unitCostMinor: 1800, otherVariableCostMinor: 300, minimumContributionMinor: 1000,
  }), 1900);
});

test("product pair metrics use observed order counts", () => {
  const result = rankProductPair({ coOrders: 20, ordersWithA: 40, ordersWithB: 50, totalOrders: 100 });
  assert.equal(result.support, 0.2);
  assert.equal(result.confidence, 0.5);
  assert.equal(result.lift, 1);
});

test("inconsistent co-purchase counts are rejected", () => {
  assert.throws(() => rankProductPair({ coOrders: 20, ordersWithA: 10, ordersWithB: 50, totalOrders: 100 }), /Inconsistent/);
});

test("negative monetary inputs are rejected", () => {
  assert.throws(() => calculateContribution({
    unitPriceMinor: -1, quantity: 1, discountMinor: 0,
    costs: { unitCostMinor: 0, paymentFeeMinor: 0, fulfillmentCostMinor: 0, shippingSubsidyMinor: 0 },
  }), /non-negative safe integer/);
});

test("lift is undefined when the baseline purchase rate is zero", () => {
  const result = rankProductPair({ coOrders: 0, ordersWithA: 12, ordersWithB: 0, totalOrders: 40 });
  assert.equal(result.lift, null);
});
