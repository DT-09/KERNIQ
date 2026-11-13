import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import { Form, useActionData, useLoaderData } from "react-router";
import { authenticate, GROWTH_PLAN, LAUNCH_PLAN, SCALE_PLAN, isBillingTestMode } from "../shopify.server";
import db from "../db.server";
import { getQueue, QUEUE_NAME } from "../lib/queue.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const [store, latestSync] = await Promise.all([
    db.store.findUnique({ where: { shopDomain: session.shop } }),
    db.syncRun.findFirst({ where: { shopDomain: session.shop }, orderBy: { startedAt: "desc" } }),
  ]);
  return { shop: session.shop, lastCatalogSync: store?.lastCatalogSync?.toISOString() ?? null, lastOrderSync: store?.lastOrderSync?.toISOString() ?? null, latestSync: latestSync ? { status: latestSync.status, kind: latestSync.kind, startedAt: latestSync.startedAt.toISOString(), finishedAt: latestSync.finishedAt?.toISOString() ?? null } : null };
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { session, billing } = await authenticate.admin(request);
  const subscription = await billing.check({ plans: [LAUNCH_PLAN, GROWTH_PLAN, SCALE_PLAN], isTest: isBillingTestMode });
  if (!subscription.hasActivePayment) return { error: "An active KERNIQ subscription is required to sync store data." };
  try {
    const queue = await getQueue();
    const jobId = await queue.send(QUEUE_NAME, { shopDomain: session.shop }, { singletonKey: session.shop, singletonSeconds: 120, retryLimit: 3, retryDelay: 30, retryBackoff: true });
    return { queued: true as const, jobId, alreadyQueued: jobId === null };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Could not queue store sync." };
  }
};

export default function Settings() {
  const data = useLoaderData<typeof loader>();
  const result = useActionData<typeof action>();
  return <main className="admin-shell">
    <header className="admin-heading"><div><p className="eyebrow">CONFIGURATION</p><h1>Settings</h1><p className="muted">{data.shop}</p></div></header>
    <section className="panel"><h2>Shopify data connection</h2><p>KERNIQ reads product and variant data, including inventory and unit cost when Shopify exposes it to the app. Missing costs remain unknown.</p><div className="status-row"><span>Last catalog sync</span><strong>{data.lastCatalogSync ? new Date(data.lastCatalogSync).toLocaleString() : "Never"}</strong></div><div className="status-row"><span>Last order sync</span><strong>{data.lastOrderSync ? new Date(data.lastOrderSync).toLocaleString() : "Never"}</strong></div><div className="status-row"><span>Latest sync job</span><strong>{data.latestSync ? `${data.latestSync.kind} · ${data.latestSync.status}` : "No sync jobs"}</strong></div><Form method="post"><button className="button button-primary" type="submit">Queue full data sync</button></Form>
      {result && "queued" in result && result.queued ? <p className="form-success">{result.alreadyQueued ? "A sync is already queued or running." : `Sync job queued${result.jobId ? ` (${result.jobId})` : ""}. Refresh this page to check progress.`}</p> : null}
      {result && "error" in result && result.error ? <p className="form-error">Sync failed: {result.error}</p> : null}
    </section>
    <section className="panel"><h2>Data integrity</h2><ul className="plain-list"><li>Money is stored as integer minor units.</li><li>Unit cost is sourced from Shopify inventory item cost.</li><li>Unknown cost is not replaced with an estimate.</li><li>Catalog and order sync are tenant-scoped to the authenticated shop. Order history is limited to the most recent 60 days under the default Shopify access window.</li></ul></section>
  </main>;
}
