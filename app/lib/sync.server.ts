import db from "../db.server";

type ShopifyAdmin = {
  graphql: (query: string, options?: { variables?: Record<string, unknown> }) => Promise<Response>;
};

type Connection<T> = { edges: Array<{ cursor: string; node: T }>; pageInfo: { hasNextPage: boolean; endCursor: string | null } };
type ProductNode = {
  id: string; title: string; handle: string; status: string; productType: string;
  vendor: string; tags: string[]; featuredImage: { url: string } | null;
  variants: Connection<{
    id: string; title: string; sku: string | null; price: string; compareAtPrice: string | null;
    inventoryQuantity: number | null;
    inventoryItem: { unitCost: { amount: string; currencyCode: string } | null } | null;
  }>;
};

function minorUnits(currency: string): number {
  return new Intl.NumberFormat("en", { style: "currency", currency }).resolvedOptions().maximumFractionDigits;
}

function toMinor(amount: string | null | undefined, currency: string): number | null {
  if (amount == null || amount === "") return null;
  const parsed = Number(amount);
  if (!Number.isFinite(parsed) || parsed < 0) return null;
  const factor = 10 ** minorUnits(currency);
  const minor = Math.round(parsed * factor);
  return Number.isSafeInteger(minor) ? minor : null;
}

async function graph<T>(admin: ShopifyAdmin, query: string, variables?: Record<string, unknown>): Promise<T> {
  const response = await admin.graphql(query, variables ? { variables } : undefined);
  if (!response.ok) throw new Error(`Shopify Admin API returned HTTP ${response.status}`);
  const body = await response.json() as { data?: T; errors?: Array<{ message: string }> };
  if (body.errors?.length) throw new Error(body.errors.map((e) => e.message).join("; "));
  if (!body.data) throw new Error("Shopify Admin API returned no data");
  return body.data;
}

export async function syncCatalog(admin: ShopifyAdmin, shopDomain: string) {
  const run = await db.syncRun.create({ data: { shopDomain, kind: "catalog", status: "running" } });
  let recordsRead = 0;
  try {
    const shopData = await graph<{ shop: { currencyCode: string; ianaTimezone: string } }>(
      admin, `query StoreCurrency { shop { currencyCode ianaTimezone } }`
    );
    await db.store.upsert({
      where: { shopDomain },
      create: { shopDomain, currencyCode: shopData.shop.currencyCode, timezone: shopData.shop.ianaTimezone },
      update: { currencyCode: shopData.shop.currencyCode, timezone: shopData.shop.ianaTimezone },
    });

    let cursor: string | null = null;
    let hasNextPage = true;
    while (hasNextPage) {
      const data = await graph<{ products: Connection<ProductNode> }>(admin, `
        query KERNIQCatalog($first: Int!, $after: String) {
          products(first: $first, after: $after, sortKey: TITLE) {
            edges {
              cursor
              node {
                id title handle status productType vendor tags
                featuredImage { url }
                variants(first: 250) {
                  edges {
                    cursor
                    node {
                      id title sku price compareAtPrice inventoryQuantity
                      inventoryItem { unitCost { amount currencyCode } }
                    }
                  }
                  pageInfo { hasNextPage endCursor }
                }
              }
            }
            pageInfo { hasNextPage endCursor }
          }
        }`, { first: 100, after: cursor });

      for (const edge of data.products.edges) {
        const p = edge.node;
        const product = await db.product.upsert({
          where: { shopDomain_shopifyId: { shopDomain, shopifyId: p.id } },
          create: {
            shopDomain, shopifyId: p.id, title: p.title, handle: p.handle,
            status: p.status, productType: p.productType || null, vendor: p.vendor || null,
            tags: p.tags, imageUrl: p.featuredImage?.url ?? null,
          },
          update: {
            title: p.title, handle: p.handle, status: p.status,
            productType: p.productType || null, vendor: p.vendor || null,
            tags: p.tags, imageUrl: p.featuredImage?.url ?? null,
          },
        });
        for (const vEdge of p.variants.edges) {
          const v = vEdge.node;
          const priceMinor = toMinor(v.price, shopData.shop.currencyCode);
          if (priceMinor == null) continue;
          const costMinor = v.inventoryItem?.unitCost
            ? toMinor(v.inventoryItem.unitCost.amount, v.inventoryItem.unitCost.currencyCode)
            : null;
          await db.variant.upsert({
            where: { productId_shopifyId: { productId: product.id, shopifyId: v.id } },
            create: {
              productId: product.id, shopifyId: v.id, title: v.title, sku: v.sku,
              priceMinor, compareAtMinor: toMinor(v.compareAtPrice, shopData.shop.currencyCode),
              inventoryQty: v.inventoryQuantity, unitCostMinor: costMinor,
              costSource: costMinor == null ? "unknown" : "shopify",
            },
            update: {
              title: v.title, sku: v.sku, priceMinor,
              compareAtMinor: toMinor(v.compareAtPrice, shopData.shop.currencyCode),
              inventoryQty: v.inventoryQuantity, unitCostMinor: costMinor,
              costSource: costMinor == null ? "unknown" : "shopify",
            },
          });
          recordsRead += 1;
        }
      }
      hasNextPage = data.products.pageInfo.hasNextPage;
      cursor = data.products.pageInfo.endCursor;
      if (hasNextPage && !cursor) throw new Error("Shopify pagination returned no cursor");
    }

    await db.store.update({ where: { shopDomain }, data: { lastCatalogSync: new Date() } });
    await db.syncRun.update({
      where: { id: run.id },
      data: { status: "complete", recordsRead, finishedAt: new Date() },
    });
    return { recordsRead };
  } catch (error) {
    await db.syncRun.update({
      where: { id: run.id },
      data: {
        status: "failed", recordsRead, finishedAt: new Date(),
        errorCode: error instanceof Error ? error.message.slice(0, 180) : "UNKNOWN_SYNC_ERROR",
      },
    });
    throw error;
  }
}
