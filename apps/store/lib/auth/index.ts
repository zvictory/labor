// Auth.js (next-auth v5) entrypoint. NextAuth(config) yields the route handlers
// plus the `auth()` helper (read the session in RSC / route handlers / middleware)
// and `signIn` / `signOut` server actions. Import these — never re-instantiate
// NextAuth elsewhere, or you'll get divergent JWT secrets/config.

import NextAuth from 'next-auth';

import { authConfig } from '@/lib/auth/config';

export const { handlers, auth, signIn, signOut } = NextAuth(authConfig);
