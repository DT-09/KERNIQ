import test from "node:test";
import assert from "node:assert/strict";
import { getPlanLimits } from "../app/lib/plans.server.ts";

test("subscription tiers have explicit offer and analysis limits", () => {
  assert.deepEqual(getPlanLimits("Launch"), { maxOffers: 3, maxOrdersAnalyzed: 1000 });
  assert.deepEqual(getPlanLimits("Growth"), { maxOffers: 15, maxOrdersAnalyzed: 3000 });
  assert.deepEqual(getPlanLimits("Scale"), { maxOffers: 50, maxOrdersAnalyzed: 5000 });
});

test("unknown subscriptions do not silently receive entitlements", () => {
  assert.equal(getPlanLimits("Enterprise"), null);
  assert.equal(getPlanLimits(null), null);
});
