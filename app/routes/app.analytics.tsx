import type { LoaderFunctionArgs } from "react-router";
import { Link, useLoaderData } from "react-router";
import { authenticate, GROWTH_PLAN, LAUNCH_PLAN, SCALE_PLAN, isBillingTestMode } from "../shopify.server";
import { getPlanLimits } from "../lib/plans.server";
import { getProductRelationships } from "../lib/relationships.server";
import db from "../db.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session, billing } = await authenticate.admin(request);
  const subscription = await billing.check({ plans: [LAUNCH_PLAN, GROWTH_PLAN, SCALE_PLAN], isTest: isBillingTestMode });
  const planName = subscription.appSubscriptions[0]?.name ?? "Launch";
  const limits = getPlanLimits(planName) ?? getPlanLimits("Launch")!;
  const [relationships, events] = await Promise.all([
    getProductRelationships(session.shop, limits.maxOrdersAnalyzed),
    db.offerEvent.findMany({ where: { shopDomain: session.shop }, select: { payload: true }, orderBy: { occurredAt: "desc" }, take: 5000 }),
  ]);
  const engagement = events.reduce((counts, event) => {
    const payload = event.payload && typeof event.payload === "object" ? event.payload as Record<string, unknown> : {};
    if (payload.eventType === "impression") counts.impressions += 1;
    if (payload.eventType === "add_to_cart") counts.addToCart += 1;
    return counts;
  }, { impressions: 0, addToCart: 0 });
  return { ...relationships, engagement, planName, maxOrdersAnalyzed: limits.maxOrdersAnalyzed };
};

function percent(value: number | null) {
  return value == null ? "—" : `${(value * 100).toFixed(1)}%`;
}

export default function Analytics() {
  const data = useLoaderData<typeof loader>();
  return <main className="admin-shell">
    <header className="admin-heading"><div><p className="eyebrow">PRODUCT INTELLIGENCE</p><h1>Relationships</h1><p className="muted">Observed co-purchase patterns in synced order history.</p></div></header>
    <section className="metric-grid">
      <article className="metric"><span className="metric-label">Orders analyzed</span><strong>{data.totalOrders.toLocaleString()}</strong><span className="metric-note">Latest plan allowance · {data.maxOrdersAnalyzed.toLocaleString()} orders</span></article>
      <article className="metric"><span className="metric-label">Products analyzed</span><strong>{data.productsAnalyzed.toLocaleString()}</strong><span className="metric-note">Distinct products in orders</span></article>
      <article className="metric"><span className="metric-label">Relationships</span><strong>{data.pairs.length.toLocaleString()}</strong><span className="metric-note">Top observed pairs</span></article>
    </section>
    <section className="panel">
      <h2>Product affinity</h2>
      {data.pairs.length === 0 ? <div className="empty-state"><h3>No relationships yet</h3><p>Sync catalog and recent orders. Pairs appear when products occur together in completed order history.</p><Link className="button button-primary" to="/app/settings">Open data settings</Link></div> :
        <div className="table-wrap"><table><thead><tr><th>Product A</th><th>Product B</th><th>Orders together</th><th>Support</th><th>Confidence A → B</th><th>Lift</th></tr></thead><tbody>
          {data.pairs.map((pair, index) => <tr key={index}><td>{pair.productA}</td><td>{pair.productB}</td><td>{pair.coOrders}</td><td>{percent(pair.support)}</td><td>{percent(pair.confidenceAtoB)}</td><td>{pair.lift == null ? "—" : pair.lift.toFixed(2) + "×"}</td></tr>)}
        </tbody></table></div>}
    </section>
    <section className="metric-grid">
      <article className="metric"><span className="metric-label">Offer impressions</span><strong>{data.engagement.impressions.toLocaleString()}</strong><span className="metric-note">Cart block became visible</span></article>
      <article className="metric"><span className="metric-label">Add-to-cart submissions</span><strong>{data.engagement.addToCart.toLocaleString()}</strong><span className="metric-note">Recommendation form submitted</span></article>
    </section>
    <p className="muted footnote">Offer engagement counts represent block impressions and add-to-cart submissions only; they are not completed orders or incremental revenue. Product relationships are observational associations, not proof that displaying one product causes another to sell. Lift is undefined when the baseline purchase rate is zero. Your {data.planName} plan analyzes up to {data.maxOrdersAnalyzed.toLocaleString()} recent synced orders.</p>
  </main>;
}
