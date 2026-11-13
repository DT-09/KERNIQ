import type { LoaderFunctionArgs } from "react-router";
import { Link, useLoaderData } from "react-router";
import { authenticate } from "../shopify.server";
import db from "../db.server";
import { calculateContribution, calculateDiscountCeiling } from "../lib/profit.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const [products, store] = await Promise.all([
    db.product.findMany({
      where: { shopDomain: session.shop },
      include: { variants: true },
      orderBy: { title: "asc" },
      take: 250,
    }),
    db.store.findUnique({ where: { shopDomain: session.shop }, include: { settings: true } }),
  ]);
  const currency = store?.currencyCode ?? "USD";
  const assumptions = store?.settings ?? null;
  return {
    currency,
    products: products.map((product) => ({
      id: product.id, title: product.title, status: product.status, vendor: product.vendor,
      variants: product.variants.map((variant) => {
        const paymentFeeMinor = assumptions?.paymentFeeBps == null
          ? null
          : Math.round(variant.priceMinor * assumptions.paymentFeeBps / 10_000);
        const economics = calculateContribution({
          unitPriceMinor: variant.priceMinor,
          quantity: 1,
          discountMinor: 0,
          costs: {
            unitCostMinor: variant.unitCostMinor,
            paymentFeeMinor,
            fulfillmentCostMinor: assumptions?.fulfillmentCostMinor ?? null,
            shippingSubsidyMinor: assumptions?.shippingSubsidyMinor ?? null,
          },
        });
        const hasDiscountInputs =
          variant.unitCostMinor != null &&
          paymentFeeMinor != null &&
          assumptions?.fulfillmentCostMinor != null &&
          assumptions?.shippingSubsidyMinor != null &&
          assumptions?.minimumContributionMinor != null;
        const maxDiscountMinor = hasDiscountInputs
          ? calculateDiscountCeiling({
              priceMinor: variant.priceMinor,
              unitCostMinor: variant.unitCostMinor!,
              otherVariableCostMinor: paymentFeeMinor! + assumptions!.fulfillmentCostMinor! + assumptions!.shippingSubsidyMinor!,
              minimumContributionMinor: assumptions!.minimumContributionMinor!,
            })
          : null;
        return {
          id: variant.id, title: variant.title, sku: variant.sku,
          priceMinor: variant.priceMinor, unitCostMinor: variant.unitCostMinor,
          costSource: variant.costSource, inventoryQty: variant.inventoryQty,
          contributionMinor: economics.contributionMinor,
          contributionMarginBps: economics.contributionMarginBps,
          completeness: economics.completeness,
          missingInputs: economics.missingInputs,
          maxDiscountMinor,
        };
      }),
    })),
  };
};

function money(minor: number, currency: string) {
  const digits = new Intl.NumberFormat("en", { style: "currency", currency }).resolvedOptions().maximumFractionDigits;
  return new Intl.NumberFormat(undefined, { style: "currency", currency }).format(minor / (10 ** digits));
}
function percent(bps: number | null) {
  return bps == null ? "Incomplete" : `${(bps / 100).toFixed(1)}%`;
}

export default function Catalog() {
  const { products, currency } = useLoaderData<typeof loader>();
  return <main className="admin-shell">
    <header className="admin-heading"><div><p className="eyebrow">STORE INTELLIGENCE</p><h1>Catalog</h1><p className="muted">Variant costs and contribution estimates use only known inputs.</p></div></header>
    {products.length === 0 ? <section className="panel empty-state"><h2>Your catalog is not synced</h2><p>Sync your Shopify catalog before reviewing product costs or contribution economics.</p><Link className="button button-primary" to="/app/settings">Open data settings</Link></section> :
      <section className="panel table-wrap"><table><thead><tr><th>Product</th><th>Variant</th><th>Price</th><th>Unit cost</th><th>Contribution</th><th>Margin</th><th>Max discount</th><th>Inventory</th></tr></thead><tbody>
      {products.flatMap((product) => product.variants.map((variant) => <tr key={variant.id}>
        <td><strong>{product.title}</strong><small>{product.status}</small></td>
        <td>{variant.title}<small>{variant.sku ?? "No SKU"}</small></td>
        <td>{money(variant.priceMinor, currency)}</td>
        <td>{variant.unitCostMinor == null ? "Unknown" : money(variant.unitCostMinor, currency)}<small>{variant.costSource}</small></td>
        <td>{variant.contributionMinor == null ? <span className="status status-neutral">Incomplete</span> : money(variant.contributionMinor, currency)}{variant.missingInputs.length > 0 ? <small>{variant.missingInputs.join(", ")}</small> : null}</td>
        <td>{percent(variant.contributionMarginBps)}</td>
        <td>{variant.maxDiscountMinor == null ? "—" : money(variant.maxDiscountMinor, currency)}</td>
        <td>{variant.inventoryQty ?? "—"}</td>
      </tr>))}
      </tbody></table></section>}
    <p className="muted footnote">Contribution estimates include only unit cost, configured payment fee, fulfillment cost, and shipping subsidy. They exclude taxes, chargebacks, fixed overhead, and any cost not entered or exposed by Shopify. The discount ceiling is conservative and appears only when every required input and a minimum contribution target are set.</p>
  </main>;
}
