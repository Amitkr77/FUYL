/**
 * Local throwaway MongoDB for development and end-to-end tests — no install
 * or Docker needed. Prints the connection string and keeps running until
 * stopped (Ctrl+C). Data is in memory and discarded on exit.
 *
 *   npm run dev:db
 */
import { MongoMemoryServer } from "mongodb-memory-server";

async function main() {
  const port = Number(process.env.DEV_DB_PORT ?? 27019);
  const server = await MongoMemoryServer.create({ instance: { port, ip: "127.0.0.1" } });
  console.log(`DEV_DB_READY ${server.getUri()}`);
  const stop = async () => {
    await server.stop();
    process.exit(0);
  };
  process.on("SIGINT", stop);
  process.on("SIGTERM", stop);
}

main().catch((err) => {
  console.error("Could not start dev database:", err);
  process.exit(1);
});
