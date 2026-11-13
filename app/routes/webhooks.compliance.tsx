import type { ActionFunctionArgs } from "react-router";
import { authenticate } from "../shopify.server";
import db from "../db.server";

export const action = async ({ request }: ActionFunctionArgs) => {
  const { topic, shop } = await authenticate.webhook(request);
  if (topic === "SHOP_REDACT") {
    await db.store.deleteMany({ where: { shopDomain: shop } });
    await db.session.deleteMany({ where: { shop } });
  }
  // KERNIQ does not persist customer names, emails, addresses, or customer IDs.
  // Customer data requests/redactions therefore have no customer profile data to export or erase.
  return new Response(null, { status: 200 });
};
