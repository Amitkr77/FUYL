/**
 * One-off bootstrap: create (or promote) an admin user directly in MongoDB.
 * There is no HTTP endpoint for this on purpose — /auth/register only allows
 * role=customer|seller, so admin/super_admin accounts must be provisioned
 * out-of-band.
 *
 * Usage:
 *   npm run create-admin -- admin@fuyl.in "StrongPassw0rd!" [role]
 *
 * role defaults to super_admin. Pass "admin" instead if you want the lesser
 * role. Re-running with an existing email updates its password/role instead
 * of failing.
 */
import bcrypt from 'bcryptjs';
import { connectDB, disconnectDB } from '../src/config/db';
import { logger } from '../src/config/logger';
import { RoleEnum } from '../src/shared/enums';
import { UserModel } from '../src/modules/identity/models/user.model';

async function main() {
  const [email, password, roleArg] = process.argv.slice(2);
  if (!email || !password) {
    console.error('Usage: npm run create-admin -- <email> <password> [admin|super_admin]');
    process.exit(1);
  }

  const role = roleArg === RoleEnum.ADMIN ? RoleEnum.ADMIN : RoleEnum.SUPER_ADMIN;
  if (password.length < 8) {
    console.error('Password must be at least 8 characters.');
    process.exit(1);
  }

  await connectDB();

  const passwordHash = await bcrypt.hash(password, 12);
  const existing = await UserModel.findOne({ emailLower: email.toLowerCase().trim() });

  if (existing) {
    existing.passwordHash = passwordHash;
    existing.role = role;
    existing.isActive = true;
    existing.isDeleted = false;
    existing.isEmailVerified = true;
    await existing.save();
    logger.info(`[create-admin] updated existing user ${email} -> role=${role}`);
  } else {
    await UserModel.create({
      email,
      passwordHash,
      role,
      isActive: true,
      isEmailVerified: true,
      permissions: [],
    });
    logger.info(`[create-admin] created new ${role} user ${email}`);
  }

  await disconnectDB();
  process.exit(0);
}

main().catch((err) => {
  console.error('[create-admin] failed:', err);
  process.exit(1);
});
