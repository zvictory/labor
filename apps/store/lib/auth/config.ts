// Auth.js (next-auth v5) configuration for Labor Parfum.
//
// Strategy: JWT (no Prisma adapter, no Account/Session tables). Our own `User`
// model is the identity store. Three credential-style providers:
//
//   • telegram  — verifies a Telegram Login Widget payload (verifyTelegramLogin)
//                 and find-or-creates the User by telegramId (SOURCE OF TRUTH).
//   • staff     — email + password; bcrypt.compare against User.passwordHash.
//                 Only role 'staff' | 'admin' may sign in here.
//   • phone-otp — phone + 6-digit code; verified via lib/auth/otp (which
//                 find-or-creates the customer User by phone).
//
// The JWT callback persists userId + role + locale on the token; the session
// callback projects them onto session.user so server code (getCurrentUser) and
// the client both see a typed shape. On sign-in we merge any guest cart into the
// signed-in user (events.signIn → mergeGuestCartIntoUser).

import type { NextAuthConfig } from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import bcrypt from 'bcryptjs';

import { db } from '@/lib/db';
import { verifyTelegramLogin } from '@/lib/telegram/webapp-auth';
import { verifyOtp, normalizePhone } from '@/lib/auth/otp';
import { mergeGuestCartIntoUser } from '@/lib/cart/cart';

// Shape we return from authorize(); next-auth maps `id` onto the token.
interface AuthedUser {
  id: string; // next-auth expects a string id
  name?: string | null;
  email?: string | null;
  role: string;
  locale: string;
}

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN ?? '';

/** Build the synthetic email for a Telegram user (mirrors the Spree convention). */
const telegramEmail = (telegramId: bigint | number): string =>
  `tg_${telegramId.toString()}@labor.local`;

export const authConfig: NextAuthConfig = {
  session: { strategy: 'jwt' },
  trustHost: true,
  secret: process.env.NEXTAUTH_SECRET,
  pages: {
    // UI prepends the active locale; this is the locale-less fallback.
    signIn: '/ru/account/login',
  },
  providers: [
    // ── Telegram Login Widget ───────────────────────────────────────────────
    // The widget posts the signed user object (id, first_name, username, auth_date,
    // hash, …). We verify the HMAC with the bot token, then find-or-create by
    // telegramId. Credentials values arrive as strings.
    Credentials({
      id: 'telegram',
      name: 'Telegram',
      credentials: {
        id: {},
        first_name: {},
        last_name: {},
        username: {},
        photo_url: {},
        auth_date: {},
        hash: {},
      },
      authorize: async (raw): Promise<AuthedUser | null> => {
        if (!raw || typeof raw !== 'object') return null;
        // Coerce every present field to a string for HMAC verification.
        const data: Record<string, string> = {};
        for (const [k, v] of Object.entries(raw)) {
          if (typeof v === 'string') data[k] = v;
        }

        if (!data.id || !data.hash) return null;
        if (!verifyTelegramLogin(data, TELEGRAM_BOT_TOKEN)) return null;

        const telegramId = BigInt(data.id);
        const displayName =
          [data.first_name, data.last_name].filter(Boolean).join(' ').trim() ||
          data.username ||
          null;

        const user = await db.user.upsert({
          where: { telegramId },
          update: {
            // Keep name fresh from Telegram; never clobber an explicit email.
            ...(displayName ? { name: displayName } : {}),
          },
          create: {
            telegramId,
            email: telegramEmail(telegramId),
            name: displayName,
            role: 'customer',
          },
          select: { id: true, name: true, email: true, role: true, preferredLocale: true },
        });

        return {
          id: String(user.id),
          name: user.name,
          email: user.email,
          role: user.role,
          locale: user.preferredLocale,
        };
      },
    }),

    // ── Staff email + password ──────────────────────────────────────────────
    Credentials({
      id: 'staff',
      name: 'Staff',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      authorize: async (raw): Promise<AuthedUser | null> => {
        const email = typeof raw?.email === 'string' ? raw.email.trim().toLowerCase() : '';
        const password = typeof raw?.password === 'string' ? raw.password : '';
        if (!email || !password) return null;

        const user = await db.user.findUnique({
          where: { email },
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            passwordHash: true,
            preferredLocale: true,
          },
        });
        if (!user || !user.passwordHash) return null;
        if (user.role !== 'staff' && user.role !== 'admin') return null;

        const ok = await bcrypt.compare(password, user.passwordHash);
        if (!ok) return null;

        return {
          id: String(user.id),
          name: user.name,
          email: user.email,
          role: user.role,
          locale: user.preferredLocale,
        };
      },
    }),

    // ── Phone OTP ────────────────────────────────────────────────────────────
    Credentials({
      id: 'phone-otp',
      name: 'Phone',
      credentials: {
        phone: { label: 'Phone', type: 'tel' },
        code: { label: 'Code', type: 'text' },
      },
      authorize: async (raw): Promise<AuthedUser | null> => {
        const phone = typeof raw?.phone === 'string' ? raw.phone : '';
        const code = typeof raw?.code === 'string' ? raw.code : '';
        if (!phone || !code) return null;

        const result = await verifyOtp(phone, code);
        if (!result) return null;

        const user = await db.user.findUnique({
          where: { id: result.userId },
          select: { id: true, name: true, email: true, role: true, preferredLocale: true },
        });
        if (!user) return null;

        return {
          id: String(user.id),
          name: user.name,
          // Telegram-synthesized email may exist; phone-only users have none.
          email: user.email ?? normalizePhone(phone),
          role: user.role,
          locale: user.preferredLocale,
        };
      },
    }),
  ],
  callbacks: {
    // Persist identity claims on the token. `user` is only present on sign-in.
    jwt: async ({ token, user }) => {
      if (user) {
        const u = user as Partial<AuthedUser>;
        token.userId = u.id ? Number(u.id) : token.userId;
        token.role = u.role ?? token.role ?? 'customer';
        token.locale = u.locale ?? token.locale ?? 'ru';
      }
      return token;
    },
    // Project token claims onto the session for server + client consumers.
    session: async ({ session, token }) => {
      if (session.user) {
        // next-auth's base User.id is typed `string`; our augmentation adds
        // `id: number | null`. TypeScript interface merging intersects them to
        // `never` (a known limitation — merging cannot override a field's type).
        // `as unknown as` is the TS idiom for a targeted assertion over this
        // specific conflict; no `any` is introduced here.
        const u = session.user as unknown as {
          id: number | null;
          role: string;
          locale: string;
        };
        u.id = typeof token.userId === 'number' ? token.userId : null;
        u.role = typeof token.role === 'string' ? token.role : 'customer';
        u.locale = typeof token.locale === 'string' ? token.locale : 'ru';
      }
      return session;
    },
  },
  events: {
    // On sign-in, fold the visitor's guest cart into their user cart so the
    // basket survives login. Best-effort: a merge failure must not block auth.
    signIn: async ({ user }) => {
      const id = user?.id ? Number(user.id) : NaN;
      if (!Number.isInteger(id)) return;
      try {
        await mergeGuestCartIntoUser(id);
      } catch (err) {
        console.error('[auth:signIn] cart merge failed', err);
      }
    },
  },
};
