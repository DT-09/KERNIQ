import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import { Form, useLoaderData, useActionData } from "react-router";
import { authenticate } from "../shopify.server";
import db from "../db.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const offers = await db.offer.findMany({ where: { shopDomain: session.shop }, orderBy: { createdAt: "desc" } });
  return { offers };
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const form = await request.formData();
  const name = String(form.get("name") ?? "").trim();
  const placement = String(form.get("placement") ?? "");
  if (name.length < 3 || name.length > 80) return { error: "Offer name must be between 3 and 80 characters." };
  if (!["cart", "product_page", "post_purchase"].includes(placement)) return { error: "Choose a supported placement." };
  const store = await db.store.findUnique({ where: { shopDomain: session.shop } });
  if (!store) return { error: "Store setup is incomplete. Reload the app and try again." };
  await db.offer.create({
    data: { shopDomain: session.shop, name, placement, status: "draft", config: { type: "product_pairing", eligibility: "manual_review_required" } },
  });
  return { success: true };
};

export default function Offers() {
  const { offers } = useLoaderData<typeof loader>();
  const result = useActionData<typeof action>();
  return <main className="admin-shell">
    <header className="admin-heading"><div><p className="eyebrow">OFFER ORCHESTRATION</p><h1>Offers</h1><p className="muted">Draft offers are inert until reviewed and activated.</p></div></header>
    <section className="panel">
      <h2>Create an offer draft</h2>
      <Form method="post" className="offer-form">
        <label>Offer name<input name="name" minLength={3} maxLength={80} required placeholder="e.g. Harness + travel bowl" /></label>
        <label>Placement<select name="placement" required><option value="cart">Cart</option><option value="product_page">Product page</option><option value="post_purchase">Post-purchase (requires extension approval)</option></select></label>
        <button className="button button-primary" type="submit">Create draft</button>
      </Form>
      {result && "error" in result && result.error ? <p className="form-error">{result.error}</p> : null}
      {result && "success" in result && result.success ? <p className="form-success">Draft created. No storefront changes were made.</p> : null}
    </section>
    <section className="panel"><h2>Offer library</h2>{offers.length === 0 ? <p className="muted">No offers yet. Create a draft to begin.</p> :
      <div className="offer-list">{offers.map((offer) => <article key={offer.id} className="offer-item"><div><strong>{offer.name}</strong><small>{offer.placement.replace("_", " ")}</small></div><span className="status status-neutral">{offer.status}</span></article>)}</div>}
    </section>
  </main>;
}
