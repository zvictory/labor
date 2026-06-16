// Module augmentation for next-auth v5: teach the Session / JWT types about the
// extra claims Labor puts on them (numeric userId, role, preferred locale).
// Keeping this in one place lets getCurrentUser() and client `useSession()`
// share a single typed shape without `any`.

// `export {}` makes this file a module so `declare module` below is an augmentation
// of the real next-auth types, not a replacement of the whole module.
export {};

declare module 'next-auth' {
  interface Session {
    user: {
      /** Our numeric User.id (null until the token carries one). */
      id: number | null;
      /** customer | staff | admin */
      role: string;
      /** Preferred UI locale (ru | uz | en). */
      locale: string;
      // Standard AdapterUser fields surfaced by the base provider.
      name?: string | null;
      email?: string | null;
      image?: string | null;
    };
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    userId?: number;
    role?: string;
    locale?: string;
  }
}
