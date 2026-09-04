'use client';

// Sign-out island. Calls next-auth's client signOut() and lands the user back
// on the locale home. Kept tiny so it can sit in an otherwise-RSC account page.

import { useTransition } from 'react';
import { signOut } from 'next-auth/react';

type Lang = 'ru' | 'uz' | 'en';

const LABEL: Record<Lang, string> = {
  ru: 'Выйти',
  uz: 'Chiqish',
  en: 'Sign out',
};

const toLang = (locale: string): Lang => (locale === 'uz' || locale === 'en' ? locale : 'ru');

export function SignOutButton({ locale }: { locale: string }) {
  const [pending, startTransition] = useTransition();
  const lang = toLang(locale);

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          await signOut({ callbackUrl: `/${locale}` });
        })
      }
      className="border-ink text-ink hover:border-foreground dark:border-bone dark:text-bone inline-flex h-11 items-center justify-center border px-6 text-xs font-semibold tracking-widest uppercase transition-colors hover:underline hover:underline-offset-4 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {LABEL[lang]}
    </button>
  );
}
