/**
 * Create (or update) an admin user.
 *
 *   npm run admin:create -- <email> "<name>" [admin|reviewer]
 *
 * Real accounts have NO password: they sign in with a one-time code emailed
 * to their address (SMTP must be configured).
 *
 * Demo accounts only: set ADMIN_PASSWORD (min 12 chars) to give the account a
 * password for the demo sign-in buttons, which work only while DEMO_LOGIN=true.
 *
 * Updating an existing user signs them out everywhere.
 */
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
  const password = process.env.ADMIN_PASSWORD;
  if (password !== undefined && password.length < 12) {
    console.error("ADMIN_PASSWORD must be at least 12 characters.");
    process.exit(1);
  }

  await connectDB();
  const passwordHash = password ? await hashPassword(password) : undefined;
  const existing = await AdminUser.findOne({ email });
  if (existing) {
    existing.name = nameArg;
    existing.role = roleArg;
    existing.active = true;
    existing.passwordHash = passwordHash;
    existing.sessionVersion = (existing.sessionVersion ?? 1) + 1;
    existing.failedLogins = 0;
    existing.lockedUntil = undefined;
    await existing.save();
    await AuditLog.create({ actor: "cli", action: "user.update", target: email, details: { role: roleArg } });
    console.log(`Updated ${email} (${roleArg}).`);
  } else {
    await AdminUser.create({ email, name: nameArg, role: roleArg, ...(passwordHash ? { passwordHash } : {}) });
    await AuditLog.create({ actor: "cli", action: "user.create", target: email, details: { role: roleArg } });
    console.log(`Created ${email} (${roleArg}).`);
  }
  console.log(passwordHash ? "Sign-in: demo password (only while DEMO_LOGIN=true)." : "Sign-in: one-time code emailed to this address.");
  await mongoose.disconnect();
}

main().catch(async (err) => {
  console.error("Failed:", err instanceof Error ? err.message : err);
  await mongoose.disconnect().catch(() => {});
  process.exit(1);
});
