/**
 * Check the environment without printing secrets: which settings are present,
 * whether MongoDB answers, and whether the SMTP server accepts the login
 * (handshake only — no email is sent).
 *
 *   npm run check:env
 */
import mongoose from "mongoose";
import nodemailer from "nodemailer";
import { smtpOptions } from "../src/lib/email";
import { env } from "../src/lib/env";

const mask = (s?: string) => (s ? `${s.slice(0, 3)}…(${s.length} chars)` : "—");

async function main() {
  let e;
  try {
    e = env();
  } catch (err) {
    console.error("✗ Environment invalid:", err instanceof Error ? err.message : err);
    process.exit(1);
  }

  const mongoHost = (() => {
    try {
      return new URL(e.MONGODB_URI.replace(/^mongodb(\+srv)?:\/\//, "http://")).hostname;
    } catch {
      return "(unparseable)";
    }
  })();

  console.log("Settings");
  console.log(`  MONGODB_URI      set · host ${mongoHost} · db "${e.MONGODB_DB}"`);
  console.log(`  SESSION_SECRET   ${e.SESSION_SECRET.length} chars`);
  console.log(`  APP_URL          ${e.APP_URL}`);
  console.log(`  SMTP_HOST        ${e.SMTP_HOST ?? "— (emails will be skipped)"}`);
  console.log(`  SMTP_PORT        ${e.SMTP_PORT}  (${smtpOptions(e).secure ? "implicit TLS" : "STARTTLS required"})`);
  console.log(`  SMTP_USER        ${e.SMTP_USER ? mask(e.SMTP_USER) : "—"}`);
  console.log(`  SMTP_PASS        ${e.SMTP_PASS ? "set" : "—"}`);
  console.log(`  EMAIL_FROM       ${e.EMAIL_FROM}`);
  console.log(`  CRON_SECRET      ${e.CRON_SECRET ? "set" : "— (scheduled sync disabled)"}`);
  console.log(`  GROQ_API_KEY     ${e.GROQ_API_KEY ? "set" : "— (assisted chat uses built-in understanding)"}`);
  console.log(`  ALLOW_UNPUBLISHED_KB ${process.env.ALLOW_UNPUBLISHED_KB === "true" ? "true  ⚠ local testing only — remove for production" : "off"}`);

  let ok = true;

  console.log("\nMongoDB");
  try {
    await mongoose.connect(e.MONGODB_URI, { dbName: e.MONGODB_DB, serverSelectionTimeoutMS: 10_000 });
    await mongoose.connection.db!.admin().ping();
    const db = mongoose.connection.db!;
    const cols = (await db.listCollections({}, { nameOnly: true }).toArray()).map((c) => c.name).sort();
    console.log(`  ✓ connected · database "${e.MONGODB_DB}" · ${cols.length} collection(s)`);
    for (const name of cols) console.log(`    - ${name} (${await db.collection(name).estimatedDocumentCount()} docs)`);
  } catch (err) {
    ok = false;
    console.log(`  ✗ ${err instanceof Error ? err.message : err}`);
  } finally {
    await mongoose.disconnect().catch(() => {});
  }

  console.log("\nSMTP");
  if (!e.SMTP_HOST) {
    console.log("  – skipped (SMTP_HOST not set)");
  } else {
    // A single, non-pooled connection is enough for a handshake check.
    const o = smtpOptions(e);
    const t = nodemailer.createTransport({ host: o.host, port: o.port, secure: o.secure, requireTLS: o.requireTLS, auth: o.auth, connectionTimeout: o.connectionTimeout });
    try {
      await t.verify();
      console.log("  ✓ server reachable, TLS ok, login accepted");
    } catch (err) {
      ok = false;
      console.log(`  ✗ ${err instanceof Error ? err.message : err}`);
    } finally {
      t.close();
    }
  }

  process.exit(ok ? 0 : 1);
}

void main();
