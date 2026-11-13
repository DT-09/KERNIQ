import type { LoaderFunctionArgs } from "react-router";
import db from "../db.server";

export const loader = async (_args: LoaderFunctionArgs) => {
  try {
    await db.$queryRaw`SELECT 1`;
    return Response.json({ status: "ok", database: "ok" }, { status: 200 });
  } catch {
    return Response.json({ status: "unavailable", database: "unavailable" }, { status: 503 });
  }
};
