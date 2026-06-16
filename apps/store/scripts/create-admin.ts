/**
 * Bootstrap a staff/admin login so you can reach /[locale]/admin.
 * Idempotent: upserts by email and (re)sets the password + role.
 *
 * Usage:
 *   ADMIN_EMAIL=you@labor.uz ADMIN_PASSWORD='strong-pass' npx tsx scripts/create-admin.ts
 *   # optional: ADMIN_NAME='Zafar' ADMIN_ROLE=admin   (role: admin | staff)
 */
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const db = new PrismaClient();

async function main() {
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;
  const name = process.env.ADMIN_NAME ?? 'Admin';
  const role = (process.env.ADMIN_ROLE ?? 'admin').toLowerCase();

  if (!email || !password) {
    console.error('Set ADMIN_EMAIL and ADMIN_PASSWORD env vars.');
    process.exit(1);
  }
  if (role !== 'admin' && role !== 'staff') {
    console.error("ADMIN_ROLE must be 'admin' or 'staff'.");
    process.exit(1);
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const user = await db.user.upsert({
    where: { email },
    update: { passwordHash, role, name },
    create: { email, passwordHash, role, name, preferredLocale: 'ru' },
  });

  console.log(`OK: ${role} user ${user.email} (id ${user.id}). Sign in at /ru/account/login (staff email + password).`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
