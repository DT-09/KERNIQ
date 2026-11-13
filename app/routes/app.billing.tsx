import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import { Form, useActionData, useLoaderData } from "react-router";
import { authenticate, LAUNCH_PLAN, GROWTH_PLAN, SCALE_PLAN, isBillingTestMode } from "../shopify.server";

const plans = [LAUNCH_PLAN, GROWTH_PLAN, SCALE_PLAN] as const;

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { billing } = await authenticate.admin(request);
  const current = await billing.check({ plans: [...plans], isTest: isBillingTestMode });
  return {
    active: current.hasActivePayment,
    subscription: current.appSubscriptions[0]?.name ?? null,
    testMode: isBillingTestMode,
  };
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { billing } = await authenticate.admin(request);
  const form = await request.formData();
  const plan = String(form.get("plan") ?? "");
  if (!plans.includes(plan as typeof plans[number])) return { error: "Select a valid subscription plan." };
  return billing.request({
    plan: plan as typeof plans[number],
    isTest: isBillingTestMode,
    trialDays: 7,
  });
};

const descriptions = [
  { name: LAUNCH_PLAN, price: "$29", detail: "Core product intelligence and offer management." },
  { name: GROWTH_PLAN, price: "$79", detail: "Advanced experimentation and higher operating limits." },
  { name: SCALE_PLAN, price: "$149", detail: "Expanded limits and advanced analytics." },
];

export default function Billing() {
  const data = useLoaderData<typeof loader>();
  const result = useActionData<typeof action>();
  return <main className="admin-shell">
    <header className="admin-heading"><div><p className="eyebrow">KERNIQ SUBSCRIPTION</p><h1>Choose your plan</h1><p className="muted">Billed by Shopify. Manage or cancel from your Shopify admin.</p></div></header>
    {data.active ? <section className="panel"><span className="status status-good">Subscription active</span><h2>{data.subscription}</h2><p>Your Shopify subscription is active.</p></section> : <section className="pricing-grid">
      {descriptions.map((plan) => <article className="plan-card" key={plan.name}><p className="eyebrow">{plan.name}</p><h2>{plan.price}<small> / month</small></h2><p>{plan.detail}</p><Form method="post"><input type="hidden" name="plan" value={plan.name} /><button className="button button-primary" type="submit">Start 7-day trial</button></Form></article>)}
    </section>}
    {data.testMode ? <p className="muted">Billing test mode is enabled for this deployment.</p> : null}
    {result && "error" in result && result.error ? <p className="form-error">{result.error}</p> : null}
  </main>;
}
