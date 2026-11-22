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
 *  5. A fake Groq API on the fake store (POST /openai/v1/chat/completions):
 *     a deterministic stand-in "model" built on the chat's own built-in
 *     understanding, so the AI path is tested without network or cost. Any
 *     user text containing "__ai_down" makes it return 503 (fallback tests).
 *     GET /__ai reports how many AI requests it served.
 *  6. The production build (`next start`) wired to all of the above
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
import { understand } from "../src/chat/understand";
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

let aiCalls = 0;

type FakeQ = { key: string; question: string; type: "single" | "multi" | "number" | "text"; options?: { value: string; label: string; exclusive?: boolean }[]; min?: number; max?: number; maxSelect?: number };

/** Interpret a reply the way the built-in understanding would. */
function fakeUnderstand(q: FakeQ, reply: string) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const u = understand({ ...q, prompt: q.question, isNameQuestion: q.key === "name" } as any, reply);
  return u.ok ? { values: u.input.values ?? [], number: (u.input.number as number | undefined) ?? null, text: (u.input.text as string | undefined) ?? null } : null;
}

function fakeGroq(raw: string): { status: number; body: unknown } {
  aiCalls++;
  const req = JSON.parse(raw) as { messages: { role: string; content: string }[]; response_format?: { json_schema?: { name?: string } } };
  const lastUser = [...req.messages].reverse().find((m) => m.role === "user")?.content ?? "";
  if (lastUser.includes("__ai_down")) return { status: 503, body: { error: { message: "fake outage" } } };
  let out: unknown;
  if (req.response_format?.json_schema?.name === "questionnaire_answer") {
    const { question, reply } = JSON.parse(lastUser) as { question: FakeQ; reply: string };
    const a = fakeUnderstand(question, reply);
    out = a
      ? { action: "answer", ...a, ack: "Lovely, thanks for sharing.", message: "" }
      : { action: "clarify", values: [], number: null, text: null, ack: "", message: "Hmm, could you say that another way?" };
  } else {
    const state = JSON.parse(req.messages[0].content.split("Current state:\n")[1]) as { needed: FakeQ[] };
    const [first, second] = state.needed;
    const a = first ? fakeUnderstand(first, lastUser) : null;
    const next = a ? second : first;
    out = {
      answers: a ? [{ key: first.key, ...a }] : [],
      reply: next ? `Thanks! ${next.question}` : "Thanks!",
      ask_key: next?.key ?? null,
    };
  }
  return { status: 200, body: { choices: [{ message: { content: JSON.stringify(out) } }], usage: { prompt_tokens: 120, completion_tokens: 30 } } };
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
    if (req.method === "POST" && url.pathname === "/openai/v1/chat/completions") {
      let raw = "";
      req.on("data", (c: Buffer) => (raw += c.toString("utf8")));
      req.on("end", () => {
        const r = fakeGroq(raw);
        res.writeHead(r.status, { "Content-Type": "application/json" }).end(JSON.stringify(r.body));
      });
      return;
    }
    if (url.pathname === "/__ai") {
      res.writeHead(200, { "Content-Type": "application/json" }).end(JSON.stringify({ calls: aiCalls }));
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
      GROQ_API_KEY: "e2e-fake-key",
      GROQ_BASE_URL: `http://127.0.0.1:${E2E.storePort}/openai/v1`,
      // The suite checks the assessment is closed until publish; manual probing may override.
      ALLOW_UNPUBLISHED_KB: process.env.E2E_ALLOW_UNPUBLISHED === "true" ? "true" : "",
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
