/**
 * End-to-end test environment launcher (used as Playwright's webServer).
 *
 *  1. In-memory MongoDB (fresh every run)
 *  2. Test admin + reviewer accounts
 *  3. A local stand-in for fuyl.in that serves the saved fixtures, so tests
 *     never depend on the live store. POST /__label-change simulates Shopify
 *     replacing a label image.
 *  4. A local fake SMTP server that keeps every email in a mailbox, readable
 *     at GET /__mail?to=<address> on the fake store (codes, reports)
 *  5. The production build (`next start`) wired to all of the above
 *
 * Requires `npm run build` first. Run via `npm run test:e2e`.
 */
import { spawn, type ChildProcess } from "node:child_process";
import { readFileSync } from "node:fs";
import { createServer, type Server } from "node:http";
import path from "node:path";
import { MongoMemoryServer } from "mongodb-memory-server";
import mongoose from "mongoose";
import { SMTPServer } from "smtp-server";
import { E2E } from "./constants";

type Mail = { to: string[]; raw: string; at: number };
const mailbox: Mail[] = [];

/** Accepts everything, no TLS/auth (test-only), and stores raw messages. */
function startFakeSmtp(port: number): SMTPServer {
  const server = new SMTPServer({
    secure: false,
    authOptional: true,
    disabledCommands: ["STARTTLS", "AUTH"],
    logger: false,
    onData(stream, session, done) {
      let raw = "";
      stream.on("data", (c: Buffer) => (raw += c.toString("utf8")));
      stream.on("end", () => {
        mailbox.push({ to: session.envelope.rcptTo.map((r) => r.address.toLowerCase()), raw, at: Date.now() });
        done();
      });
    },
  });
  server.listen(port, "127.0.0.1");
  return server;
}

const root = path.resolve(__dirname, "..");
const fixture = (f: string) => readFileSync(path.join(root, "tests", "fixtures", f), "utf8");

async function seedAdmins(uri: string) {
  await mongoose.connect(uri, { dbName: E2E.dbName });
  const users = mongoose.connection.collection("admin_users");
  // Real accounts have no password — they sign in with an emailed code.
  for (const u of [E2E.admin, E2E.reviewer]) {
    await users.insertOne({
      email: u.email,
      name: u.name,
      role: u.role,
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
    if (url.pathname === "/__mail") {
      const to = (url.searchParams.get("to") ?? "").toLowerCase();
      const mails = mailbox.filter((m) => m.to.includes(to)).sort((a, b) => b.at - a.at);
      res.writeHead(200, { "Content-Type": "application/json" }).end(JSON.stringify(mails));
      return;
    }
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
  const smtp = startFakeSmtp(E2E.smtpPort);

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
      SMTP_HOST: "127.0.0.1",
      SMTP_PORT: String(E2E.smtpPort),
      SMTP_ALLOW_INSECURE: "true", // the local fake has no TLS — never set in production
      EMAIL_FROM: "FUYL <hello@fuyl.in>",
      DEMO_LOGIN: "",
      ALLOW_UNPUBLISHED_KB: "", // the suite checks the assessment is closed until publish
    },
  });

  const shutdown = async () => {
    next.kill();
    store.close();
    smtp.close(() => {});
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
