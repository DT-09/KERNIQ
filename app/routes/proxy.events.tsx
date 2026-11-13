import type { ActionFunctionArgs } from "react-router";
import { authenticate } from "../shopify.server";
import db from "../db.server";

const allowedEvents = new Set(["impression", "add_to_cart"]);

export const action = async ({ request }: ActionFunctionArgs) => {
  const { session } = await authenticate.public.appProxy(request);
  if (!session) return new Response(null, { status: 401 });

  const contentLength = Number(request.headers.get("content-length") ?? "0");
  if (contentLength > 4096) return new Response(null, { status: 413 });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return new Response(null, { status: 400 });
  }

  if (!body || typeof body !== "object") return new Response(null, { status: 400 });
  const input = body as Record<string, unknown>;
  const eventKey = typeof input.eventKey === "string" ? input.eventKey : "";
  const eventType = typeof input.eventType === "string" ? input.eventType : "";
  const productShopifyId = typeof input.productShopifyId === "string" ? input.productShopifyId : "";
  const offerId = typeof input.offerId === "string" ? input.offerId : null;

  if (!/^[a-f0-9-]{36}$/i.test(eventKey) || !allowedEvents.has(eventType) || !/^gid:\/\/shopify\/Product\/[0-9]+$/.test(productShopifyId)) {
    return new Response(null, { status: 400 });
  }

  let validOfferId: string | null = null;
  if (offerId) {
    const offer = await db.offer.findFirst({ where: { id: offerId, shopDomain: session.shop } });
    if (offer) validOfferId = offer.id;
  }

  try {
    await db.offerEvent.create({
      data: {
        shopDomain: session.shop,
        eventKey,
        offerId: validOfferId,
        productShopifyId,
        payload: { eventType },
      },
    });
  } catch (error) {
    // Duplicate event keys are safe to ignore; other database failures are surfaced.
    if (error && typeof error === "object" && "code" in error && error.code === "P2002") {
      return new Response(null, { status: 204 });
    }
    throw error;
  }

  return new Response(null, { status: 204 });
};

export const loader = async () => new Response(null, { status: 405, headers: { Allow: "POST" } });
