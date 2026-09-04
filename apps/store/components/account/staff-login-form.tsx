'use client';

// Staff email + password sign-in island. Intentionally understated on the login
// page (staff use it, customers ignore it). Submits to the next-auth `staff`
// credentials provider, which enforces role ∈ {staff, admin} server-side.

import { useState, useTransition } from 'react';
import { signIn } from 'next-auth/react';

type Lang = 'ru' | 'uz' | 'en';

const COPY: Record<
  Lang,
  { email: string; password: string; submit: string; submitting: string; err: string }
> = {
  ru: {
    email: 'Email',
    password: 'Пароль',
    submit: 'Войти',
    submitting: 'Входим…',
    err: 'Неверный email или пароль.',
  },
  uz: {
    email: 'Email',
    password: 'Parol',
    submit: 'Kirish',
    submitting: 'Kirilmoqda…',
    err: 'Email yoki parol noto‘g‘ri.',
  },
  en: {
    email: 'Email',
    password: 'Password',
    submit: 'Sign in',
    submitting: 'Signing in…',
    err: 'Invalid email or password.',
  },
};

const toLang = (locale: string): Lang => (locale === 'uz' || locale === 'en' ? locale : 'ru');

const fieldCls =
  'h-11 w-full rounded-md border border-border bg-white px-3 text-sm text-ink ' +
  'transition-colors focus:border-foreground dark:bg-ink/40 dark:text-bone';
const labelCls =
  'mb-1.5 block text-label font-semibold uppercase tracking-widest text-ink-muted dark:text-stone-400';

export function StaffLoginForm({ locale }: { locale: string }) {
  const lang = toLang(locale);
  const copy = COPY[lang];
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await signIn('staff', {
        email: email.trim(),
        password,
        redirect: false,
        callbackUrl: `/${locale}/account`,
      });
      if (result?.error) {
        setError(copy.err);
        return;
      }
      window.location.assign(result?.url ?? `/${locale}/account`);
    });
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <div>
        <label htmlFor="staff-email" className={labelCls}>
          {copy.email}
        </label>
        <input
          id="staff-email"
          type="email"
          className={fieldCls}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
          required
        />
      </div>
      <div>
        <label htmlFor="staff-password" className={labelCls}>
          {copy.password}
        </label>
        <input
          id="staff-password"
          type="password"
          className={fieldCls}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="current-password"
          required
        />
      </div>
      <button
        type="submit"
        disabled={pending || email.trim().length === 0 || password.length === 0}
        className="border-ink text-ink hover:border-foreground dark:border-bone dark:text-bone inline-flex h-11 w-full items-center justify-center border px-7 text-xs font-semibold tracking-widest uppercase transition-colors hover:underline hover:underline-offset-4 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {pending ? copy.submitting : copy.submit}
      </button>
      {error && (
        <p className="rounded-md border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </p>
      )}
    </form>
  );
}
