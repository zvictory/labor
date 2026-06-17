import { redirect } from 'next/navigation';
import { setRequestLocale } from 'next-intl/server';

import { type Locale } from '@/i18n/config';
import { getCurrentUser } from '@/lib/auth/session';
import { PhoneOtpForm } from '@/components/account/phone-otp-form';
import { StaffLoginForm } from '@/components/account/staff-login-form';

type Props = { params: Promise<{ locale: Locale }> };

type Lang = 'ru' | 'uz' | 'en';
const toLang = (locale: string): Lang =>
  locale === 'uz' || locale === 'en' ? locale : 'ru';

const COPY: Record<
  Lang,
  {
    title: string;
    subtitle: string;
    telegram: string;
    or: string;
    phone: string;
    staff: string;
  }
> = {
  ru: {
    title: 'Вход',
    subtitle: 'Войдите с помощью нашего Telegram-бота.',
    telegram: 'Войти через Telegram',
    or: 'или',
    phone: 'Вход по телефону',
    staff: 'Сотрудникам',
  },
  uz: {
    title: 'Kirish',
    subtitle: 'Telegram-botimiz orqali kiring.',
    telegram: 'Telegram orqali kirish',
    or: 'yoki',
    phone: 'Telefon orqali kirish',
    staff: 'Xodimlar uchun',
  },
  en: {
    title: 'Sign in',
    subtitle: 'Sign in using our Telegram bot.',
    telegram: 'Sign in with Telegram',
    or: 'or',
    phone: 'Phone sign-in',
    staff: 'Staff',
  },
};

export default async function LoginPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  // Already signed in → straight to the account overview.
  const user = await getCurrentUser();
  if (user) {
    redirect(`/${locale}/account`);
  }

  const copy = COPY[toLang(locale)];

  return (
    <div className="container max-w-md py-12 md:py-16">
      <div className="space-y-2 text-center">
        <h1 className="font-display text-4xl text-ink dark:text-bone md:text-5xl">
          {copy.title}
        </h1>
        <p className="text-sm text-ink-muted dark:text-stone-400">{copy.subtitle}</p>
      </div>

      {/* Phone OTP */}
      <section className="mt-10 space-y-4">
        <PhoneOtpForm locale={locale} />
      </section>

      {/* Staff (subtle) */}
      <details className="mt-12 border-t border-border pt-6">
        <summary className="cursor-pointer text-[10px] font-semibold uppercase tracking-widest text-ink-muted hover:text-brass dark:text-stone-400">
          {copy.staff}
        </summary>
        <div className="mt-4">
          <StaffLoginForm locale={locale} />
        </div>
      </details>
    </div>
  );
}
