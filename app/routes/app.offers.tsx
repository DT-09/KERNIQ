import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import { Form, Link, useLoaderData, useActionData } from "react-router";
import { authenticate, GROWTH_PLAN, LAUNCH_PLAN, SCALE_PLAN, isBillingTestMode } from "../shopify.server";
import { getPlanLimits } from "../lib/plans.server";
import db from "../db.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session, billing } = await authenticate.admin(request);
  const [offers, products] = await Promise.all([
    db.offer.findMany({ where: { shopDomain: session.shop }, orderBy: { createdAt: "desc" } }),
    db.product.findMany({ where: { shopDomain: session.shop, status: "ACTIVE" }, select: { shopifyId: true, title: true }, orderBy: { title: "asc" }, take: 500 }),
  ]);
  const subscription = await billing.check({ plans: [LAUNCH_PLAN, GROWTH_PLAN, SCALE_PLAN], isTest: isBillingTestMode });
  const planName = subscription.appSubscriptions[0]?.name ?? "Launch";
  const limits = getPlanLimits(planName) ?? getPlanLimits("Launch")!;
  return { offers, products, planName, maxOffers: limits.maxOffers };
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { session, billing } = await authenticate.admin(request);
  const subscription = await billing.check({ plans: [LAUNCH_PLAN, GROWTH_PLAN, SCALE_PLAN], isTest: isBillingTestMode });
  if (!subscription.hasActivePayment) return { error: "An active KERNIQ subscription is required to manage offers." };
  const planName = subscription.appSubscriptions[0]?.name ?? "Launch";
  const limits = getPlanLimits(planName) ?? getPlanLimits("Launch")!;
  const form = await request.formData();
  const intent = String(form.get("intent") ?? "");
  const offerId = String(form.get("offerId") ?? "");
  if (intent === "activate" || intent === "pause") {
    const offer = await db.offer.findFirst({ where: { id: offerId, shopDomain: session.shop } });
    if (!offer) return { error: "Offer not found for this store." };
    if (intent === "activate") {
      const config = offer.config && typeof offer.config === "object" ? offer.config as Record<string, unknown> : {};
      if (typeof config.productShopifyId !== "string") return { error: "This offer has no valid product selection." };
    }
    await db.offer.update({ where: { id: offer.id }, data: { status: intent === "activate" ? "active" : "paused" } });
    return { success: true, status: intent === "activate" ? "active" : "paused" };
  }
  const existingOffers = await db.offer.count({ where: { shopDomain: session.shop } });
  if (existingOffers >= limits.maxOffers) return { error: `Your ${planName} plan allows up to ${limits.maxOffers} offers. Change your plan to create more.` };
  const name = String(form.get("name") ?? "").trim();
  const productShopifyId = String(form.get("productShopifyId") ?? "");
  if (name.length < 3 || name.length > 80) return { error: "Offer name must be between 3 and 80 characters." };
  const product = await db.product.findFirst({ where: { shopDomain: session.shop, shopifyId: productShopifyId, status: "ACTIVE" } });
  if (!product) return { error: "Choose an active product from this store's synced catalog." };
  await db.offer.create({
    data: {
      shopDomain: session.shop,
      name,
      placement: "cart",
      status: "draft",
      config: {
        type: "cart_cross_sell",
        productShopifyId: product.shopifyId,
        productTitle: product.title,
        activation: "manual_theme_block_setup_required",
      },
    },
  });
  return { success: true };
};

export default function Offers() {
  const { offers, products, planName, maxOffers } = useLoaderData<typeof loader>();
  const result = useActionData<typeof action>();
  return <main className="admin-shell">
    <header className="admin-heading"><div><p className="eyebrow">OFFER ORCHESTRATION</p><h1>Offers</h1><p className="muted">Create reviewed cart recommendations from your store catalog.</p></div></header>
    <section className="panel">
      <h2>Create a cart recommendation</h2><p className="muted">{offers.length} of {maxOffers} offers used on the {planName} plan.</p>
      {products.length === 0 ? <div className="empty-state"><p>Sync your active product catalog before creating an offer.</p><Link className="button button-primary" to="/app/settings">Sync catalog</Link></div> :
        <Form method="post" className="offer-form">
          <label>Offer name<input name="name" minLength={3} maxLength={80} required placeholder="e.g. Harness + travel bowl" /></label>
          <label>Recommended product<select name="productShopifyId" required defaultValue=""><option value="" disabled>Select a product</option>{products.map((product) => <option key={product.shopifyId} value={product.shopifyId}>{product.title}</option>)}</select></label>
          <button className="button button-primary" type="submit">Create draft</button>
        </Form>}
      {result && "error" in result && result.error ? <p className="form-error">{result.error}</p> : null}
      {result && "success" in result && result.success ? <p className="form-success">Offer saved. Review its status and storefront placement before sending traffic.</p> : null}
    </section>
    <section className="panel"><h2>Offer library</h2>{offers.length === 0 ? <p className="muted">No offers yet. Create a draft to begin.</p> :
      <div className="offer-list">{offers.map((offer) => <article key={offer.id} className="offer-item"><div><strong>{offer.name}</strong><small>Cart recommendation · created {new Date(offer.createdAt).toLocaleDateString()}</small><code className="offer-id">{offer.id}</code></div><div className="offer-controls"><span className={offer.status === "active" ? "status status-good" : "status status-neutral"}>{offer.status}</span><Form method="post"><input type="hidden" name="offerId" value={offer.id}/><button className="button button-secondary" name="intent" value={offer.status === "active" ? "pause" : "activate"} type="submit">{offer.status === "active" ? "Pause" : offer.status === "paused" ? "Reactivate" : "Activate"}</button></Form></div></article>)}</div>}
    </section>
    <section className="notice"><p className="eyebrow">STOREFRONT ACTIVATION</p><h2>Merchant-controlled placement</h2><p>After reviewing a draft, add the KERNIQ Product recommendation block to your cart template in the Shopify theme editor and select the same product, then paste the offer ID shown in the offer library into the block settings and save the theme. Return here and activate the offer. The block remains hidden until its offer is active; pause it here to hide it on subsequent page loads.</p></section>
  </main>;
}
