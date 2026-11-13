import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import { Form, useActionData, useLoaderData } from "react-router";
import { authenticate, GROWTH_PLAN, LAUNCH_PLAN, SCALE_PLAN, isBillingTestMode } from "../shopify.server";
import db from "../db.server";
import { getQueue, QUEUE_NAME } from "../lib/queue.server";

function currencyDigits(currency: string) {
  return new Intl.NumberFormat("en", { style: "currency", currency }).resolvedOptions().maximumFractionDigits;
}
function parseMoney(value: FormDataEntryValue | null, currency: string): number | null | "invalid" {
  const raw = String(value ?? "").trim();
  if (!raw) return null;
  const amount = Number(raw);
  if (!Number.isFinite(amount) || amount < 0) return "invalid";
  const minor = Math.round(amount * 10 ** currencyDigits(currency));
  return Number.isSafeInteger(minor) ? minor : "invalid";
}
function displayMoney(minor: number | null, currency: string) {
  if (minor == null) return "";
  return (minor / 10 ** currencyDigits(currency)).toFixed(currencyDigits(currency));
}

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const store = await db.store.findUnique({ where: { shopDomain: session.shop }, include: { settings: true } });
  const latestSync = await db.syncRun.findFirst({ where: { shopDomain: session.shop }, orderBy: { startedAt: "desc" } });
  const currency = store?.currencyCode ?? null;
  return {
    shop: session.shop,
    currency,
    lastCatalogSync: store?.lastCatalogSync?.toISOString() ?? null,
    lastOrderSync: store?.lastOrderSync?.toISOString() ?? null,
    latestSync: latestSync ? { status: latestSync.status, kind: latestSync.kind, startedAt: latestSync.startedAt.toISOString(), finishedAt: latestSync.finishedAt?.toISOString() ?? null } : null,
    economics: store?.settings ? {
      paymentFeeBps: store.settings.paymentFeeBps,
      fulfillmentCostMinor: store.settings.fulfillmentCostMinor,
      shippingSubsidyMinor: store.settings.shippingSubsidyMinor,
      minimumContributionMinor: store.settings.minimumContributionMinor,
    } : null,
  };
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { session, billing } = await authenticate.admin(request);
  const subscription = await billing.check({ plans: [LAUNCH_PLAN, GROWTH_PLAN, SCALE_PLAN], isTest: isBillingTestMode });
  if (!subscription.hasActivePayment) return { error: "An active KERNIQ subscription is required to change settings or sync store data." };
  const form = await request.formData();
  const intent = String(form.get("intent") ?? "sync");

  if (intent === "save_economics") {
    const store = await db.store.findUnique({ where: { shopDomain: session.shop } });
    if (!store?.currencyCode) return { error: "Sync the Shopify catalog first so KERNIQ can use the store currency." };
    const feeRaw = String(form.get("paymentFeeBps") ?? "").trim();
    const fee = feeRaw ? Number(feeRaw) : null;
    if (fee !== null && (!Number.isInteger(fee) || fee < 0 || fee > 10000)) return { error: "Payment fee must be a whole number from 0 to 10,000 basis points." };
    const fulfillment = parseMoney(form.get("fulfillmentCost"), store.currencyCode);
    const shipping = parseMoney(form.get("shippingSubsidy"), store.currencyCode);
    const minimum = parseMoney(form.get("minimumContribution"), store.currencyCode);
    if ([fulfillment, shipping, minimum].includes("invalid")) return { error: "Cost assumptions must be valid non-negative amounts in the store currency." };
    await db.storeSettings.upsert({
      where: { shopDomain: session.shop },
      create: {
        shopDomain: session.shop, defaultCurrency: store.currencyCode,
        paymentFeeBps: fee, fulfillmentCostMinor: fulfillment, shippingSubsidyMinor: shipping,
        minimumContributionMinor: minimum,
      },
      update: {
        defaultCurrency: store.currencyCode,
        paymentFeeBps: fee, fulfillmentCostMinor: fulfillment, shippingSubsidyMinor: shipping,
        minimumContributionMinor: minimum,
      },
    });
    return { saved: true as const };
  }

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
  const currency = data.currency ?? "USD";
  return <main className="admin-shell">
    <header className="admin-heading"><div><p className="eyebrow">CONFIGURATION</p><h1>Settings</h1><p className="muted">{data.shop}</p></div></header>
    <section className="panel"><h2>Shopify data connection</h2><p>KERNIQ reads product and variant data, including inventory and unit cost when Shopify exposes it to the app. Missing costs remain unknown.</p>
      <div className="status-row"><span>Store currency</span><strong>{data.currency ?? "Not synced"}</strong></div>
      <div className="status-row"><span>Last catalog sync</span><strong>{data.lastCatalogSync ? new Date(data.lastCatalogSync).toLocaleString() : "Never"}</strong></div>
      <div className="status-row"><span>Last order sync</span><strong>{data.lastOrderSync ? new Date(data.lastOrderSync).toLocaleString() : "Never"}</strong></div>
      <div className="status-row"><span>Latest sync job</span><strong>{data.latestSync ? `${data.latestSync.kind} · ${data.latestSync.status}` : "No sync jobs"}</strong></div>
      <Form method="post"><input type="hidden" name="intent" value="sync" /><button className="button button-primary" type="submit">Queue full data sync</button></Form>
      {result && "queued" in result && result.queued ? <p className="form-success">{result.alreadyQueued ? "A sync is already queued or running." : `Sync job queued${result.jobId ? ` (${result.jobId})` : ""}. Refresh this page to check progress.`}</p> : null}
    </section>
    <section className="panel"><h2>Contribution assumptions</h2><p>Enter store-level variable costs to calculate contribution estimates. Blank values remain unknown. These assumptions do not include taxes, chargebacks, fixed overhead, or costs you have not entered.</p>
      {data.currency ? <Form method="post" className="economics-form">
        <input type="hidden" name="intent" value="save_economics" />
        <label>Payment fee <span>Basis points (100 = 1%)</span><input type="number" name="paymentFeeBps" min="0" max="10000" step="1" defaultValue={data.economics?.paymentFeeBps ?? ""} placeholder="e.g. 290" /></label>
        <label>Fulfillment cost per unit <span>{currency}</span><input type="number" name="fulfillmentCost" min="0" step={currencyDigits(currency) === 0 ? "1" : currencyDigits(currency) === 3 ? "0.001" : "0.01"} defaultValue={displayMoney(data.economics?.fulfillmentCostMinor ?? null, currency)} placeholder="Leave blank if unknown" /></label>
        <label>Shipping subsidy per order <span>{currency}</span><input type="number" name="shippingSubsidy" min="0" step={currencyDigits(currency) === 0 ? "1" : currencyDigits(currency) === 3 ? "0.001" : "0.01"} defaultValue={displayMoney(data.economics?.shippingSubsidyMinor ?? null, currency)} placeholder="Leave blank if unknown" /></label>
        <label>Minimum contribution per unit <span>{currency}</span><input type="number" name="minimumContribution" min="0" step={currencyDigits(currency) === 0 ? "1" : currencyDigits(currency) === 3 ? "0.001" : "0.01"} defaultValue={displayMoney(data.economics?.minimumContributionMinor ?? null, currency)} placeholder="Leave blank if not set" /></label>
        <button className="button button-primary" type="submit">Save assumptions</button>
      </Form> : <p className="muted">Sync your catalog to identify the store currency before setting cost assumptions.</p>}
      {result && "saved" in result && result.saved ? <p className="form-success">Contribution assumptions saved.</p> : null}
    </section>
    <section className="panel"><h2>Data integrity</h2><ul className="plain-list"><li>Money is stored as integer minor units.</li><li>Unit cost is sourced from Shopify inventory item cost.</li><li>Unknown cost is not replaced with an estimate.</li><li>Catalog and order sync are tenant-scoped to the authenticated shop. Order history is limited to the most recent 60 days under the default Shopify access window.</li></ul></section>
    {result && "error" in result && result.error ? <p className="form-error">{result.error}</p> : null}
  </main>;
}
