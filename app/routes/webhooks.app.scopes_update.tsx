import type { ActionFunctionArgs } from "react-router";
import { authenticate } from "../shopify.server";
import db from "../db.server";

export const action = async ({ request }: ActionFunctionArgs) => {
  const { payload, session } = await authenticate.webhook(request);
  if (session) {
    const current = (payload as { current?: string[] }).current ?? [];
    await db.session.update({ where: { id: session.id }, data: { scope: current.join(",") } });
  }
  return new Response(null, { status: 200 });
};
