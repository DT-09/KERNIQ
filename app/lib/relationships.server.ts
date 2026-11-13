import db from "../db.server";
import { rankProductPair } from "./profit.server";

export async function getProductRelationships(shopDomain: string, maxOrders = 5000) {
  const orders = await db.order.findMany({
    where: { shopDomain },
    select: { id: true, financialStatus: true, fulfillmentStatus: true, lineItems: { select: { productShopifyId: true } } },
    orderBy: { createdAtShopify: "desc" },
    take: maxOrders,
  });

  const eligibleOrders = orders.filter((order) => order.financialStatus !== "VOIDED" && order.fulfillmentStatus !== "CANCELLED");
  const orderSets = eligibleOrders.map((order) => [...new Set(
    order.lineItems.map((line) => line.productShopifyId).filter((id): id is string => Boolean(id)),
  )]);
  const productOrderCounts = new Map<string, number>();
  const pairCounts = new Map<string, number>();

  for (const products of orderSets) {
    for (const product of products) productOrderCounts.set(product, (productOrderCounts.get(product) ?? 0) + 1);
    for (let i = 0; i < products.length; i += 1) {
      for (let j = i + 1; j < products.length; j += 1) {
        const pair = [products[i], products[j]].sort();
        const key = pair.join("|");
        pairCounts.set(key, (pairCounts.get(key) ?? 0) + 1);
      }
    }
  }

  const ids = [...productOrderCounts.keys()];
  const products = await db.product.findMany({
    where: { shopDomain, shopifyId: { in: ids } },
    select: { shopifyId: true, title: true, status: true },
  });
  const productById = new Map(products.map((product) => [product.shopifyId, product]));
  const rows = [...pairCounts.entries()].map(([key, coOrders]) => {
    const [firstId, secondId] = key.split("|");
    const [a, b] = [firstId, secondId].sort((left, right) => (productOrderCounts.get(right) ?? 0) - (productOrderCounts.get(left) ?? 0) || left.localeCompare(right));
    const metrics = rankProductPair({
      coOrders,
      ordersWithA: productOrderCounts.get(a) ?? 0,
      ordersWithB: productOrderCounts.get(b) ?? 0,
      totalOrders: orderSets.length,
    });
    return {
      productA: productById.get(a)?.title ?? a,
      productB: productById.get(b)?.title ?? b,
      coOrders,
      support: metrics.support,
      confidenceAtoB: metrics.confidence,
      lift: metrics.lift,
      statusA: productById.get(a)?.status ?? "unknown",
      statusB: productById.get(b)?.status ?? "unknown",
    };
  }).sort((a, b) => (b.lift ?? 0) - (a.lift ?? 0) || b.coOrders - a.coOrders).slice(0, 50);

  return { totalOrders: orderSets.length, productsAnalyzed: ids.length, pairs: rows };
}
