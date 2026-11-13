import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import { authenticate } from "../shopify.server";
import db from "../db.server";

const allowedEvents = new Set(["impression", "add_to_cart"]);

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.public.appProxy(request);
  if (!session) return Response.json({ active: false }, { status: 401 });
  const offerId = new URL(request.url).searchParams.get("offerId");
  if (!offerId) return Response.json({ active: false });
  const offer = await db.offer.findFirst({
    where: { id: offerId, shopDomain: session.shop, status: "active" },
    select: { id: true },
  });
  return Response.json({ active: Boolean(offer) });
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { session } = await authenticate.public.appProxy(request);
  if (!session) return new Response(null, { status: 401 });

  let rawBody: string;
  try {
    rawBody = await request.text();
  } catch {
    return new Response(null, { status: 400 });
  }
  if (new TextEncoder().encode(rawBody).byteLength > 4096) return new Response(null, { status: 413 });

  let body: unknown;
  try {
    body = JSON.parse(rawBody);
  } catch {
    return new Response(null, { status: 400 });
  }

  if (!body || typeof body !== "object") return new Response(null, { status: 400 });
  const input = body as Record<string, unknown>;
  const eventKey = typeof input.eventKey === "string" ? input.eventKey : "";
  const eventType = typeof input.eventType === "string" ? input.eventType : "";
  const productShopifyId = typeof input.productShopifyId === "string" ? input.productShopifyId : "";
  const offerId = typeof input.offerId === "string" ? input.offerId : "";

  if (!/^[a-f0-9-]{36}$/i.test(eventKey) || !allowedEvents.has(eventType) || !/^gid:\/\/shopify\/Product\/[0-9]+$/.test(productShopifyId) || !offerId) {
    return new Response(null, { status: 400 });
  }

  const offer = await db.offer.findFirst({
    where: { id: offerId, shopDomain: session.shop, status: "active" },
    select: { id: true, config: true },
  });
  if (!offer) return new Response(null, { status: 403 });
  const offerConfig = offer.config && typeof offer.config === "object" ? offer.config as Record<string, unknown> : {};
  if (offerConfig.productShopifyId !== productShopifyId) return new Response(null, { status: 400 });

  try {
    await db.offerEvent.create({
      data: {
        shopDomain: session.shop,
        eventKey,
        offerId: offer.id,
        productShopifyId,
        payload: { eventType },
      },
    });
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === "P2002") {
      return new Response(null, { status: 204 });
    }
    throw error;
  }

  return new Response(null, { status: 204 });
};
