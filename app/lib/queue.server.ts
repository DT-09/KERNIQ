import { PgBoss } from "pg-boss";

const QUEUE_NAME = "kern iq-store-sync";

declare global {
  // eslint-disable-next-line no-var
  var __kerniqQueue: Promise<PgBoss> | undefined;
}

export async function getQueue() {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required for background jobs.");
  if (!globalThis.__kerniqQueue) {
    globalThis.__kerniqQueue = (async () => {
      const boss = new PgBoss({ connectionString: process.env.DATABASE_URL, application_name: "kerniq-web" });
      boss.on("error", (error) => console.error("[queue]", error));
      await boss.start();
      await boss.createQueue(QUEUE_NAME, { retryLimit: 3, retryDelay: 30, retryBackoff: true });
      return boss;
    })();
  }
  return globalThis.__kerniqQueue;
}

export { QUEUE_NAME };
