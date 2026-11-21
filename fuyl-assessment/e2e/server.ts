/**
 * End-to-end test environment launcher (used as Playwright's webServer).
 *
 *  1. In-memory MongoDB (fresh every run)
 *  2. Test admin + reviewer accounts
 *  3. A local stand-in for fuyl.in that serves the saved fixtures, so tests
 *     never depend on the live store. POST /__label-change simulates Shopify
 *     replacing a label image.
 *  4. The production build (`next start`) wired to all of the above
 *
 * Requires `npm run build` first. Run via `npm run test:e2e`.
 */
import { spawn, type ChildProcess } from "node:child_process";
import { readFileSync } from "node:fs";
import { createServer, type Server } from "node:http";
import path from "node:path";
import { MongoMemoryServer } from "mongodb-memory-server";
import mongoose from "mongoose";
import { hashPassword } from "../src/lib/admin/password";
import { E2E } from "./constants";

const root = path.resolve(__dirname, "..");
const fixture = (f: string) => readFileSync(path.join(root, "tests", "fixtures", f), "utf8");

async function seedAdmins(uri: string) {
  await mongoose.connect(uri, { dbName: E2E.dbName });
  const users = mongoose.connection.collection("admin_users");
  for (const u of [E2E.admin, E2E.reviewer]) {
    await users.insertOne({
      email: u.email,
      name: u.name,
      role: u.role,
      passwordHash: await hashPassword(u.password),
      active: true,
      sessionVersion: 1,
      failedLogins: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }
  await mongoose.disconnect();
}

function startFakeStore(port: number): Server {
  const product = JSON.parse(fixture("fuyl-product.json"));
  const ingredientsHtml = `<!doctype html><html><body>${fixture("fuyl-ingredients.html")}</body></html>`;
  let labelBump = 0;

  return createServer((req, res) => {
    const url = new URL(req.url ?? "/", `http://127.0.0.1:${port}`);
    if (req.method === "POST" && url.pathname === "/__label-change") {
      labelBump++;
      res.writeHead(204).end();
      return;
    }
    if (url.pathname === `/products/${E2E.productHandle}.json`) {
      const body = structuredClone(product);
      if (labelBump) {
        for (const img of body.product.images) {
          if (String(img.src).includes("ShopPic-5.png")) img.src = String(img.src).replace(/v=\d+/, `v=${9_000_000 + labelBump}`);
        }
      }
      res.writeHead(200, { "Content-Type": "application/json" }).end(JSON.stringify(body));
      return;
    }
    if (url.pathname === "/pages/ingredients") {
      res.writeHead(200, { "Content-Type": "text/html" }).end(ingredientsHtml);
      return;
    }
    res.writeHead(404).end("not found");
  }).listen(port, "127.0.0.1");
}

async function main() {
  const mongo = await MongoMemoryServer.create({ instance: { ip: "127.0.0.1" } });
  const uri = mongo.getUri();
  await seedAdmins(uri);
  const store = startFakeStore(E2E.storePort);

  const next: ChildProcess = spawn(process.execPath, [path.join(root, "node_modules", "next", "dist", "bin", "next"), "start", "-p", String(E2E.appPort)], {
    cwd: root,
    stdio: "inherit",
    env: {
      ...process.env,
      NODE_ENV: "production",
      MONGODB_URI: uri,
      MONGODB_DB: E2E.dbName,
      SESSION_SECRET: E2E.sessionSecret,
      APP_URL: E2E.baseURL,
      FUYL_STORE_URL: `http://127.0.0.1:${E2E.storePort}`,
      FUYL_PRODUCT_HANDLE: E2E.productHandle,
      CRON_SECRET: E2E.cronSecret,
      RATE_LIMIT_MULTIPLIER: "50",
      RESEND_API_KEY: "",
      ALLOW_UNPUBLISHED_KB: "", // the suite checks the assessment is closed until publish
    },
  });

  const shutdown = async () => {
    next.kill();
    store.close();
    await mongo.stop().catch(() => {});
    process.exit(0);
  };
  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
  next.on("exit", (code) => {
    console.error(`[e2e] next exited with ${code}`);
    void shutdown();
  });
}

main().catch((err) => {
  console.error("[e2e] launcher failed:", err);
  process.exit(1);
});
