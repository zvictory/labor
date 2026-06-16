// Admin access guard — the single chokepoint every admin server component / action
// funnels through. The admin catalog and orders/campaigns agents import this exact
// module, so its surface is a stable contract.
//
// `requireStaff()` is server-only (it calls getCurrentUser(), which reads the
// request session) and either returns the signed-in staff/admin user or short-
// circuits via redirect() — so callers can treat its resolved value as guaranteed
// non-null. `isAdmin()` is a pure predicate for finer-grained gating inside pages.

import { redirect } from 'next/navigation';

import { getCurrentUser, type CurrentUser } from '@/lib/auth/session';

export type { CurrentUser };

/** Roles permitted to enter the admin shell. */
const STAFF_ROLES = new Set(['staff', 'admin']);

/**
 * Require a signed-in staff or admin user for the current request.
 *
 * Redirects guests and non-staff to the login page (the locale prefix is added by
 * middleware, so a locale-agnostic path is correct here). On success, returns the
 * fully-resolved {@link CurrentUser} — never null — so callers don't re-check.
 */
export async function requireStaff(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user || !STAFF_ROLES.has(user.role)) {
    redirect('/account/login');
  }
  return user;
}

/** Whether the given user holds the elevated `admin` role (vs. plain `staff`). */
export function isAdmin(user: { role: string }): boolean {
  return user.role === 'admin';
}
