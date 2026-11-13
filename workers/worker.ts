import { PgBoss } from "pg-boss";
import { unauthenticated } from "../app/shopify.server";
import db from "../app/db.server";
import { syncCatalog } from "../app/lib/sync.server";
import { syncRecentOrders } from "../app/lib/orders.server";
import { QUEUE_NAME } from "../app/lib/queue.server";

type SyncJob = { shopDomain: string };

async function main() {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required.");
  const boss = new PgBoss({ connectionString: process.env.DATABASE_URL, application_name: "kern iq-worker" });
  boss.on("error", (error) => console.error("[worker]", error));
  boss.on("failed", ({ job, error }) => console.error("[worker] job failed", job.id, error));
  await boss.start();
  await boss.createQueue(QUEUE_NAME, { retryLimit: 3, retryDelay: 30, retryBackoff: true });
  await boss.work<SyncJob>(QUEUE_NAME, { teamSize: Number(process.env.WORKER_CONCURRENCY ?? 1) }, async ([job]) => {
    const shopDomain = job.data?.shopDomain;
    if (!shopDomain || !/^[a-z0-9][a-z0-9-]*\.myshopify\.com$/i.test(shopDomain)) {
      throw new Error("Invalid store domain in sync job.");
    }
    const { admin } = await unauthenticated.admin(shopDomain);
    await syncCatalog(admin, shopDomain);
    await syncRecentOrders(admin, shopDomain);
  });

  const shutdown = async () => {
    await boss.stop();
    await db.$disconnect();
    process.exit(0);
  };
  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
  console.info("[worker] KERNIQ store sync worker started");
}

main().catch((error) => {
  console.error("[worker] startup failed", error);
  process.exit(1);
});
