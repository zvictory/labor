/**
 * Creates (or promotes) a storefront staff/admin user.
 *
 *   STAFF_EMAIL=admin@labor.local STAFF_PASSWORD=… npx tsx scripts/create-staff-user.ts
 *   … STAFF_ROLE=staff STAFF_NAME='Zafar' npx tsx scripts/create-staff-user.ts
 *
 * The password is read from the environment and never passed as an argument, so
 * it does not land in the shell history — the same shape as the Rails admin
 * reset documented in CLAUDE.md. Existing users are promoted rather than
 * duplicated: only `role`, `name` and `passwordHash` are touched, so running it
 * against a real account keeps that account's carts and orders.
 *
 * `role` gates two different things: both `staff` and `admin` enter the admin
 * shell (lib/admin/guard.ts), `admin` additionally passes isAdmin().
 */
import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';

const db = new PrismaClient();

const email = process.env.STAFF_EMAIL;
const password = process.env.STAFF_PASSWORD;
const name = process.env.STAFF_NAME ?? null;
const role = process.env.STAFF_ROLE ?? 'admin';

const main = async (): Promise<void> => {
  if (!email || !password) {
    console.error('STAFF_EMAIL ve STAFF_PASSWORD gerekli.');
    process.exit(1);
  }
  if (role !== 'staff' && role !== 'admin') {
    console.error(`STAFF_ROLE 'staff' veya 'admin' olmalı, gelen: ${role}`);
    process.exit(1);
  }
  if (password.length < 10) {
    console.error('Parola en az 10 karakter olmalı.');
    process.exit(1);
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const user = await db.user.upsert({
    where: { email },
    create: { email, name, role, passwordHash, preferredLocale: 'ru' },
    update: { name, role, passwordHash },
  });

  console.log(`#${user.id} ${user.role} ${user.email} hazır.`);
  await db.$disconnect();
};

main().catch(async (error: unknown) => {
  console.error(error);
  await db.$disconnect();
  process.exit(1);
});
