import type { LoaderFunctionArgs } from "react-router";
import { authenticate } from "../shopify.server";
import db from "../db.server";

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store, max-age=0",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

/**
 * Public storefront read path. Shopify's app-proxy signature is verified before
 * the authenticated shop domain is used. This route is read-only by design.
 */
export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.public.appProxy(request);
  if (!session?.shop) return json({ error: "Store session unavailable" }, 404);

  const url = new URL(request.url);
  const offerId = url.searchParams.get("offer_id")?.trim() ?? "";
  if (!offerId || offerId.length > 80) return json({ error: "Offer not found" }, 404);

  const offer = await db.offer.findFirst({
    where: { id: offerId, shopDomain: session.shop, status: "active" },
    select: { id: true, name: true, config: true },
  });
  if (!offer) return json({ error: "Offer not found" }, 404);

  const config = offer.config && typeof offer.config === "object"
    ? offer.config as Record<string, unknown>
    : {};
  const productShopifyId = typeof config.productShopifyId === "string"
    ? config.productShopifyId
    : null;
  if (!productShopifyId) return json({ error: "Offer is not configured" }, 404);

  const product = await db.product.findFirst({
    where: { shopDomain: session.shop, shopifyId: productShopifyId, status: "ACTIVE" },
    select: { title: true, handle: true, imageUrl: true, variants: { select: { inventoryQty: true } } },
  });
  if (!product || !product.variants.some((variant) => variant.inventoryQty == null || variant.inventoryQty > 0)) {
    return json({ error: "Recommended product is unavailable" }, 404);
  }

  return json({
    offer: { id: offer.id, name: offer.name },
    product: {
      title: product.title,
      handle: product.handle,
      imageUrl: product.imageUrl,
    },
  });
};
