import type { LoaderFunctionArgs } from "react-router";
import { useLoaderData } from "react-router";
import { authenticate } from "../shopify.server";
import db from "../db.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const shop = session.shop;
  const store = await db.store.upsert({
    where: { shopDomain: shop },
    create: { shopDomain: shop },
    update: {},
    include: { settings: true },
  });
  if (!store.settings) {
    await db.storeSettings.create({ data: { shopDomain: shop } });
  }
  const [products, variants, orders, offers, activeOffers, latestSync] = await Promise.all([
    db.product.count({ where: { shopDomain: shop } }),
    db.variant.count({ where: { product: { shopDomain: shop } } }),
    db.order.count({ where: { shopDomain: shop } }),
    db.offer.count({ where: { shopDomain: shop } }),
    db.offer.count({ where: { shopDomain: shop, status: "active" } }),
    db.syncRun.findFirst({ where: { shopDomain: shop }, orderBy: { startedAt: "desc" } }),
  ]);
  return {
    shop,
    metrics: { products, variants, orders, offers, activeOffers },
    sync: latestSync ? { status: latestSync.status, kind: latestSync.kind, startedAt: latestSync.startedAt.toISOString(), finishedAt: latestSync.finishedAt?.toISOString() ?? null } : null,
    lastCatalogSync: store.lastCatalogSync?.toISOString() ?? null,
    lastOrderSync: store.lastOrderSync?.toISOString() ?? null,
  };
};

function Metric({ label, value, note }: { label: string; value: number; note: string }) {
  return <article className="metric"><span className="metric-label">{label}</span><strong>{value.toLocaleString()}</strong><span className="metric-note">{note}</span></article>;
}

export default function Overview() {
  const data = useLoaderData<typeof loader>();
  return (
    <main className="admin-shell">
      <header className="admin-heading">
        <div><p className="eyebrow">STORE INTELLIGENCE</p><h1>Overview</h1><p className="muted">{data.shop}</p></div>
        <a className="button button-primary" href="/app/catalog">Review catalog</a>
      </header>
      <section className="metric-grid">
        <Metric label="Products" value={data.metrics.products} note="Synced from Shopify" />
        <Metric label="Variants" value={data.metrics.variants} note="Variant-level economics" />
        <Metric label="Orders" value={data.metrics.orders} note="Available order history" />
        <Metric label="Live offers" value={data.metrics.activeOffers} note={`${data.metrics.offers} total offers`} />
      </section>
      <section className="panel">
        <div className="panel-heading"><div><p className="eyebrow">OPERATING STATUS</p><h2>Data readiness</h2></div><span className="status status-neutral">Connected</span></div>
        <div className="status-row"><span>Catalog sync</span><strong>{data.lastCatalogSync ? new Date(data.lastCatalogSync).toLocaleString() : "Not synced yet"}</strong></div>
        <div className="status-row"><span>Order sync</span><strong>{data.lastOrderSync ? new Date(data.lastOrderSync).toLocaleString() : "Not synced yet"}</strong></div>
        <div className="status-row"><span>Latest sync job</span><strong>{data.sync ? `${data.sync.kind}: ${data.sync.status}` : "No sync jobs"}</strong></div>
      </section>
      <section className="notice">
        <p className="eyebrow">PROFIT INTEGRITY</p>
        <h2>No invented margins. No vanity metrics.</h2>
        <p>KERNIQ only calculates contribution profit when the required cost inputs are known. Missing costs remain visible as missing. Revenue attributed to an offer is not presented as incremental lift without a valid experiment.</p>
      </section>
    </main>
  );
}
