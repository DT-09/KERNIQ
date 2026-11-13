import type { LoaderFunctionArgs } from "react-router";
import { useLoaderData } from "react-router";
import { authenticate } from "../shopify.server";
import { getProductRelationships } from "../lib/relationships.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  return getProductRelationships(session.shop);
};

function percent(value: number | null) {
  return value == null ? "—" : `${(value * 100).toFixed(1)}%`;
}

export default function Analytics() {
  const data = useLoaderData<typeof loader>();
  return <main className="admin-shell">
    <header className="admin-heading"><div><p className="eyebrow">PRODUCT INTELLIGENCE</p><h1>Relationships</h1><p className="muted">Observed co-purchase patterns in synced order history.</p></div></header>
    <section className="metric-grid">
      <article className="metric"><span className="metric-label">Orders analyzed</span><strong>{data.totalOrders.toLocaleString()}</strong><span className="metric-note">Synced order records</span></article>
      <article className="metric"><span className="metric-label">Products analyzed</span><strong>{data.productsAnalyzed.toLocaleString()}</strong><span className="metric-note">Distinct products in orders</span></article>
      <article className="metric"><span className="metric-label">Relationships</span><strong>{data.pairs.length.toLocaleString()}</strong><span className="metric-note">Top observed pairs</span></article>
    </section>
    <section className="panel">
      <h2>Product affinity</h2>
      {data.pairs.length === 0 ? <div className="empty-state"><h3>No relationships yet</h3><p>Sync catalog and recent orders. Pairs appear when products occur together in completed order history.</p><a className="button button-primary" href="/app/settings">Open data settings</a></div> :
        <div className="table-wrap"><table><thead><tr><th>Product A</th><th>Product B</th><th>Orders together</th><th>Support</th><th>Confidence A → B</th><th>Lift</th></tr></thead><tbody>
          {data.pairs.map((pair, index) => <tr key={index}><td>{pair.productA}</td><td>{pair.productB}</td><td>{pair.coOrders}</td><td>{percent(pair.support)}</td><td>{percent(pair.confidenceAtoB)}</td><td>{pair.lift == null ? "—" : pair.lift.toFixed(2) + "×"}</td></tr>)}
        </tbody></table></div>}
    </section>
    <p className="muted footnote">These are observational associations, not proof that displaying one product causes another to sell. Lift is undefined when the baseline purchase rate is zero. Only the latest 5,000 synced orders are analyzed.</p>
  </main>;
}
