// Module augmentation for next-auth v5: teach the Session / JWT types about the
// extra claims Labor puts on them (numeric userId, role, preferred locale).
// Keeping this in one place lets getCurrentUser() and client `useSession()`
// share a single typed shape without `any`.

import type { DefaultSession } from 'next-auth';

declare module 'next-auth' {
  interface Session {
    user: {
      /** Our numeric User.id (null until the token carries one). */
      id: number | null;
      /** customer | staff | admin */
      role: string;
      /** Preferred UI locale (ru | uz | en). */
      locale: string;
    } & DefaultSession['user'];
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    userId?: number;
    role?: string;
    locale?: string;
  }
}
