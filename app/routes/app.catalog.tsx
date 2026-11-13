import type { LoaderFunctionArgs } from "react-router";
import { useLoaderData } from "react-router";
import { authenticate } from "../shopify.server";
import db from "../db.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const [products, store] = await Promise.all([db.product.findMany({
    where: { shopDomain: session.shop },
    include: { variants: true },
    orderBy: { title: "asc" },
    take: 250,
  }), db.store.findUnique({ where: { shopDomain: session.shop }, select: { currencyCode: true } })]);
  return { currency: store?.currencyCode ?? "USD", products: products.map((p) => ({
    id: p.id, title: p.title, status: p.status, vendor: p.vendor,
    variants: p.variants.map((v) => ({ id: v.id, title: v.title, sku: v.sku, priceMinor: v.priceMinor, unitCostMinor: v.unitCostMinor, costSource: v.costSource, inventoryQty: v.inventoryQty })),
  })) };
};

function money(minor: number, currency: string) {
  const digits = new Intl.NumberFormat("en", { style: "currency", currency }).resolvedOptions().maximumFractionDigits;
  return new Intl.NumberFormat(undefined, { style: "currency", currency }).format(minor / (10 ** digits));
}

export default function Catalog() {
  const { products, currency } = useLoaderData<typeof loader>();
  return <main className="admin-shell">
    <header className="admin-heading"><div><p className="eyebrow">STORE INTELLIGENCE</p><h1>Catalog</h1><p className="muted">Product costs are never inferred from selling prices.</p></div></header>
    {products.length === 0 ? <section className="panel empty-state"><h2>Your catalog is not synced</h2><p>Connect and sync your Shopify catalog before building product relationships or profit-safe offers.</p><a className="button button-primary" href="/app/settings">Open data settings</a></section> :
      <section className="panel table-wrap"><table><thead><tr><th>Product</th><th>Variant</th><th>SKU</th><th>Price</th><th>Unit cost</th><th>Inventory</th><th>Cost status</th></tr></thead><tbody>
      {products.flatMap((p) => p.variants.map((v) => <tr key={v.id}><td><strong>{p.title}</strong><small>{p.status}</small></td><td>{v.title}</td><td>{v.sku ?? "—"}</td><td>{money(v.priceMinor, currency)}</td><td>{v.unitCostMinor == null ? "Unknown" : money(v.unitCostMinor, currency)}</td><td>{v.inventoryQty ?? "—"}</td><td><span className={v.costSource === "shopify" ? "status status-good" : "status status-neutral"}>{v.costSource}</span></td></tr>))}
      </tbody></table></section>}
  </main>;
}
