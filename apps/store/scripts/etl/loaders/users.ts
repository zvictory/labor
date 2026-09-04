// User loader: spree_users -> Prisma User.
//
// Source columns:
//   spree_users: id, telegram_id (bigint, unique), email, phone, preferred_locale,
//                telegram_first_name, telegram_last_name, encrypted_password
//   (Spree/Devise auth columns are intentionally dropped.)
//
// Mapping decisions:
//   - telegramId is the SOURCE OF TRUTH for Telegram users (BigInt, unique).
//   - email: carried over (may be synthesized tg_{id}@labor.local). Unique in
//     target; null allowed.
//   - name: derived from telegram_first_name + telegram_last_name when present.
//   - preferredLocale: carried verbatim (source default "ru").
//   - role: everyone migrates as "customer". Staff/admin are provisioned fresh in
//     the new app (Devise hashes are not portable to the new auth).
//   - passwordHash: left null (not migrated).
//
// Idempotency: upsert by telegramId when present, else by email. Users with
// neither are skipped (cannot be addressed by a natural key).
//
// Returns old spree_users.id -> new User.id for votes/wishlist.

import { db } from "@/lib/db";
import { query } from "../source";

interface UserRow {
  id: string;
  telegram_id: string | null;
  email: string | null;
  phone: string | null;
  preferred_locale: string;
  telegram_first_name: string | null;
  telegram_last_name: string | null;
}

function fullName(first: string | null, last: string | null): string | null {
  const name = [first, last].filter((p) => p && p.trim()).join(" ").trim();
  return name || null;
}

export async function loadUsers(): Promise<Map<number, number>> {
  const users = await query<UserRow>(
    `SELECT id, telegram_id, email, phone, preferred_locale,
            telegram_first_name, telegram_last_name
       FROM spree_users
      ORDER BY id`,
  );

  const oldIdToNewId = new Map<number, number>();
  let skipped = 0;

  for (const u of users) {
    const oldId = Number(u.id);
    const telegramId = u.telegram_id ? String(u.telegram_id) : null;
    const email = u.email && u.email.trim() ? u.email.trim() : null;

    if (telegramId === null && email === null) {
      skipped += 1; // no natural key to upsert on
      continue;
    }

    const data = {
      telegramId,
      email,
      phone: u.phone && u.phone.trim() ? u.phone.trim() : null,
      name: fullName(u.telegram_first_name, u.telegram_last_name),
      preferredLocale: u.preferred_locale,
    };

    // Prefer telegramId as the natural key; fall back to email.
    const where = telegramId !== null ? { telegramId } : { email: email as string };

    const saved = await db.user.upsert({
      where,
      create: data,
      update: data,
      select: { id: true },
    });
    oldIdToNewId.set(oldId, saved.id);
  }

  console.log(`[users] upserted ${oldIdToNewId.size} users, skipped ${skipped} (no key)`);
  return oldIdToNewId;
}
