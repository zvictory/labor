// Server-side session helpers. `getCurrentUser()` reads the Auth.js session via
// auth() and returns a slim, typed snapshot of the signed-in user, or null for
// guests. Use this in RSC / server actions / route handlers to associate carts
// and orders with the logged-in user.
//
// Server-only by construction: auth() reads request headers/cookies, so this
// module is never bundled into a client component.

import { auth } from '@/lib/auth';

export interface CurrentUser {
  id: number;
  role: string;
  locale: string;
  name: string | null;
  email: string | null;
}

/**
 * The signed-in user for the current request, or null when unauthenticated.
 * Only returns a user once the token carries a numeric id.
 */
export async function getCurrentUser(): Promise<CurrentUser | null> {
  const session = await auth();
  const u = session?.user;
  if (!u || typeof u.id !== 'number') {
    return null;
  }
  return {
    id: u.id,
    role: u.role ?? 'customer',
    locale: u.locale ?? 'ru',
    name: u.name ?? null,
    email: u.email ?? null,
  };
}

/** Convenience: just the numeric user id (or undefined for guests). */
export async function getCurrentUserId(): Promise<number | undefined> {
  const user = await getCurrentUser();
  return user?.id;
}
