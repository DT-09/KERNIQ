import type { ActionFunctionArgs } from "react-router";
import { authenticate } from "../shopify.server";
import db from "../db.server";

export const action = async ({ request }: ActionFunctionArgs) => {
  const { shop, session } = await authenticate.webhook(request);
  if (session) {
    await db.$transaction([
      db.session.deleteMany({ where: { shop } }),
      db.store.deleteMany({ where: { shopDomain: shop } }),
    ]);
  }
  return new Response(null, { status: 200 });
};
