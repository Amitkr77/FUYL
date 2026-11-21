/**
 * Create an admin user, or reset an existing user's password.
 *
 *   npm run admin:create -- <email> "<name>" [admin|reviewer]
 *
 * The password comes from ADMIN_PASSWORD if set (min 12 chars); otherwise a
 * strong random one is generated and printed ONCE. Resetting a password signs
 * the user out everywhere.
 */
import { randomBytes } from "node:crypto";
import mongoose from "mongoose";
import { connectDB } from "../src/lib/db";
import { hashPassword } from "../src/lib/admin/password";
import { AdminUser, AuditLog } from "../src/models/admin";

async function main() {
  const [emailArg, nameArg, roleArg = "admin"] = process.argv.slice(2);
  const email = emailArg?.trim().toLowerCase();
  if (!email || !/^\S+@\S+\.\S+$/.test(email) || !nameArg) {
    console.error('Usage: npm run admin:create -- <email> "<name>" [admin|reviewer]');
    process.exit(1);
  }
  if (roleArg !== "admin" && roleArg !== "reviewer") {
    console.error('Role must be "admin" or "reviewer".');
    process.exit(1);
  }
  const fromEnv = process.env.ADMIN_PASSWORD;
  if (fromEnv && fromEnv.length < 12) {
    console.error("ADMIN_PASSWORD must be at least 12 characters.");
    process.exit(1);
  }
  const password = fromEnv ?? randomBytes(12).toString("base64url");

  await connectDB();
  const passwordHash = await hashPassword(password);
  const existing = await AdminUser.findOne({ email });
  if (existing) {
    existing.passwordHash = passwordHash;
    existing.name = nameArg;
    existing.role = roleArg;
    existing.active = true;
    existing.sessionVersion = (existing.sessionVersion ?? 1) + 1;
    existing.failedLogins = 0;
    existing.lockedUntil = undefined;
    await existing.save();
    await AuditLog.create({ actor: "cli", action: "user.reset", target: email });
    console.log(`Updated ${email} (${roleArg}).`);
  } else {
    await AdminUser.create({ email, name: nameArg, role: roleArg, passwordHash });
    await AuditLog.create({ actor: "cli", action: "user.create", target: email, details: { role: roleArg } });
    console.log(`Created ${email} (${roleArg}).`);
  }
  if (!fromEnv) console.log(`Password (shown once — store it safely): ${password}`);
  await mongoose.disconnect();
}

main().catch(async (err) => {
  console.error("Failed:", err instanceof Error ? err.message : err);
  await mongoose.disconnect().catch(() => {});
  process.exit(1);
});
