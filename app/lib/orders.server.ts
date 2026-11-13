import db from "../db.server";

type ShopifyAdmin = { graphql: (query: string, options?: { variables?: Record<string, unknown> }) => Promise<Response> };
type Edge<T> = { cursor: string; node: T };
type Connection<T> = { edges: Edge<T>[]; pageInfo: { hasNextPage: boolean; endCursor: string | null } };

type OrderNode = {
  id: string; name: string; createdAt: string; processedAt: string | null;
  displayFinancialStatus: string | null; displayFulfillmentStatus: string | null;
  currencyCode: string;
  currentSubtotalPriceSet: { shopMoney: { amount: string; currencyCode: string } };
  currentTotalDiscountsSet: { shopMoney: { amount: string; currencyCode: string } };
  totalRefundedSet: { shopMoney: { amount: string; currencyCode: string } };
  currentTotalPriceSet: { shopMoney: { amount: string; currencyCode: string } };
  lineItems: Connection<{
    id: string; title: string; quantity: number;
    originalUnitPriceSet: { shopMoney: { amount: string; currencyCode: string } };
    discountedTotalSet: { shopMoney: { amount: string; currencyCode: string } };
    variant: { id: string; product: { id: string } | null } | null;
  }>;
};

function decimals(currency: string) {
  return new Intl.NumberFormat("en", { style: "currency", currency }).resolvedOptions().maximumFractionDigits;
}
function minor(amount: string, currency: string) {
  const n = Number(amount);
  if (!Number.isFinite(n)) throw new Error("Shopify returned an invalid monetary amount");
  const result = Math.round(n * 10 ** decimals(currency));
  if (!Number.isSafeInteger(result)) throw new Error("Monetary amount exceeds safe integer range");
  return result;
}
async function query<T>(admin: ShopifyAdmin, document: string, variables: Record<string, unknown>): Promise<T> {
  const response = await admin.graphql(document, { variables });
  if (!response.ok) throw new Error(`Shopify Admin API returned HTTP ${response.status}`);
  const body = await response.json() as { data?: T; errors?: Array<{ message: string }> };
  if (body.errors?.length) throw new Error(body.errors.map((e) => e.message).join("; "));
  if (!body.data) throw new Error("Shopify Admin API returned no data");
  return body.data;
}

/**
 * Shopify's default order access window is limited. This sync deliberately requests
 * the most recent 60 days; older history requires Shopify's read_all_orders approval.
 */
export async function syncRecentOrders(admin: ShopifyAdmin, shopDomain: string) {
  const run = await db.syncRun.create({ data: { shopDomain, kind: "orders_60d", status: "running" } });
  let recordsRead = 0;
  try {
    const since = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    const search = `created_at:>=${since}`;
    let cursor: string | null = null;
    let hasNextPage = true;
    while (hasNextPage) {
      const data = await query<{ orders: Connection<OrderNode> }>(admin, `
        query KERNIQRecentOrders($first: Int!, $after: String, $search: String!) {
          orders(first: $first, after: $after, query: $search, sortKey: CREATED_AT) {
            edges {
              cursor
              node {
                id name createdAt processedAt displayFinancialStatus displayFulfillmentStatus currencyCode
                currentSubtotalPriceSet { shopMoney { amount currencyCode } }
                currentTotalDiscountsSet { shopMoney { amount currencyCode } }
                totalRefundedSet { shopMoney { amount currencyCode } }
                currentTotalPriceSet { shopMoney { amount currencyCode } }
                lineItems(first: 250) {
                  edges {
                    cursor
                    node {
                      id title quantity
                      originalUnitPriceSet { shopMoney { amount currencyCode } }
                      discountedTotalSet { shopMoney { amount currencyCode } }
                      variant { id product { id } }
                    }
                  }
                  pageInfo { hasNextPage endCursor }
                }
              }
            }
            pageInfo { hasNextPage endCursor }
          }
        }`, { first: 100, after: cursor, search });

      for (const edge of data.orders.edges) {
        const o = edge.node;
        const currency = o.currentTotalPriceSet.shopMoney.currencyCode || o.currencyCode;
        const order = await db.order.upsert({
          where: { shopDomain_shopifyId: { shopDomain, shopifyId: o.id } },
          create: {
            shopDomain, shopifyId: o.id, orderNumber: o.name, currencyCode: currency,
            financialStatus: o.displayFinancialStatus, fulfillmentStatus: o.displayFulfillmentStatus,
            createdAtShopify: new Date(o.createdAt), processedAt: o.processedAt ? new Date(o.processedAt) : null,
            subtotalMinor: minor(o.currentSubtotalPriceSet.shopMoney.amount, currency),
            discountMinor: minor(o.currentTotalDiscountsSet.shopMoney.amount, currency),
            refundMinor: minor(o.totalRefundedSet.shopMoney.amount, currency),
            totalMinor: minor(o.currentTotalPriceSet.shopMoney.amount, currency),
          },
          update: {
            orderNumber: o.name, currencyCode: currency,
            financialStatus: o.displayFinancialStatus, fulfillmentStatus: o.displayFulfillmentStatus,
            processedAt: o.processedAt ? new Date(o.processedAt) : null,
            subtotalMinor: minor(o.currentSubtotalPriceSet.shopMoney.amount, currency),
            discountMinor: minor(o.currentTotalDiscountsSet.shopMoney.amount, currency),
            refundMinor: minor(o.totalRefundedSet.shopMoney.amount, currency),
            totalMinor: minor(o.currentTotalPriceSet.shopMoney.amount, currency),
          },
        });
        for (const lineEdge of o.lineItems.edges) {
          const line = lineEdge.node;
          const lineCurrency = line.originalUnitPriceSet.shopMoney.currencyCode || currency;
          const gross = minor(line.originalUnitPriceSet.shopMoney.amount, lineCurrency) * line.quantity;
          const discounted = minor(line.discountedTotalSet.shopMoney.amount, lineCurrency);
          await db.orderLineItem.upsert({
            where: { orderId_shopifyLineId: { orderId: order.id, shopifyLineId: line.id } },
            create: {
              orderId: order.id, shopifyLineId: line.id,
              variantShopifyId: line.variant?.id ?? null,
              productShopifyId: line.variant?.product?.id ?? null,
              title: line.title, quantity: line.quantity,
              unitPriceMinor: minor(line.originalUnitPriceSet.shopMoney.amount, lineCurrency),
              discountMinor: Math.max(0, gross - discounted), refundMinor: 0,
            },
            update: {
              variantShopifyId: line.variant?.id ?? null,
              productShopifyId: line.variant?.product?.id ?? null,
              title: line.title, quantity: line.quantity,
              unitPriceMinor: minor(line.originalUnitPriceSet.shopMoney.amount, lineCurrency),
              discountMinor: Math.max(0, gross - discounted),
            },
          });
        }
        recordsRead += 1;
      }
      hasNextPage = data.orders.pageInfo.hasNextPage;
      cursor = data.orders.pageInfo.endCursor;
      if (hasNextPage && !cursor) throw new Error("Shopify order pagination returned no cursor");
    }

    await db.store.update({ where: { shopDomain }, data: { lastOrderSync: new Date() } });
    await db.syncRun.update({ where: { id: run.id }, data: { status: "complete", recordsRead, finishedAt: new Date() } });
    return { recordsRead, windowDays: 60 };
  } catch (error) {
    await db.syncRun.update({
      where: { id: run.id },
      data: { status: "failed", recordsRead, finishedAt: new Date(), errorCode: error instanceof Error ? error.message.slice(0, 180) : "UNKNOWN_ORDER_SYNC_ERROR" },
    });
    throw error;
  }
}
