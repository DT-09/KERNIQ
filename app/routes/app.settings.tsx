import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import { Form, useActionData, useLoaderData } from "react-router";
import { authenticate } from "../shopify.server";
import db from "../db.server";
import { syncCatalog } from "../lib/sync.server";
import { syncRecentOrders } from "../lib/orders.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const store = await db.store.findUnique({ where: { shopDomain: session.shop } });
  return { shop: session.shop, lastCatalogSync: store?.lastCatalogSync?.toISOString() ?? null };
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { admin, session } = await authenticate.admin(request);
  try {
    const catalog = await syncCatalog(admin, session.shop);
    const orders = await syncRecentOrders(admin, session.shop);
    return { success: true as const, variantsRead: catalog.recordsRead, ordersRead: orders.recordsRead, orderWindowDays: orders.windowDays };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Catalog sync failed." };
  }
};

export default function Settings() {
  const data = useLoaderData<typeof loader>();
  const result = useActionData<typeof action>();
  return <main className="admin-shell">
    <header className="admin-heading"><div><p className="eyebrow">CONFIGURATION</p><h1>Settings</h1><p className="muted">{data.shop}</p></div></header>
    <section className="panel"><h2>Shopify data connection</h2><p>KERNIQ reads product and variant data, including inventory and unit cost when Shopify exposes it to the app. Missing costs remain unknown.</p><div className="status-row"><span>Last catalog sync</span><strong>{data.lastCatalogSync ? new Date(data.lastCatalogSync).toLocaleString() : "Never"}</strong></div><Form method="post"><button className="button button-primary" type="submit">Sync catalog now</button></Form>
      {result && "success" in result && result.success ? <p className="form-success">Synced {result.variantsRead.toLocaleString()} variants and {result.ordersRead.toLocaleString()} orders from the last {result.orderWindowDays} days.</p> : null}
      {result && "error" in result && result.error ? <p className="form-error">Sync failed: {result.error}</p> : null}
    </section>
    <section className="panel"><h2>Data integrity</h2><ul className="plain-list"><li>Money is stored as integer minor units.</li><li>Unit cost is sourced from Shopify inventory item cost.</li><li>Unknown cost is not replaced with an estimate.</li><li>Catalog sync is tenant-scoped to the authenticated shop.</li></ul></section>
  </main>;
}
