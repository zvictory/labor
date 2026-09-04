import { redirect } from 'next/navigation';
import { setRequestLocale } from 'next-intl/server';

import { type Locale } from '@/i18n/config';
import { getCurrentUser } from '@/lib/auth/session';
import { TelegramLoginButton } from '@/components/account/telegram-login-button';
import { PhoneOtpForm } from '@/components/account/phone-otp-form';
import { StaffLoginForm } from '@/components/account/staff-login-form';

type Props = { params: Promise<{ locale: Locale }> };

type Lang = 'ru' | 'uz' | 'en';
const toLang = (locale: string): Lang => (locale === 'uz' || locale === 'en' ? locale : 'ru');

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
    subtitle: 'Войдите через Telegram или по номеру телефона.',
    telegram: 'Войти через Telegram',
    or: 'или',
    phone: 'Вход по телефону',
    staff: 'Сотрудникам',
  },
  uz: {
    title: 'Kirish',
    subtitle: 'Telegram orqali yoki telefon raqami bilan kiring.',
    telegram: 'Telegram orqali kirish',
    or: 'yoki',
    phone: 'Telefon orqali kirish',
    staff: 'Xodimlar uchun',
  },
  en: {
    title: 'Sign in',
    subtitle: 'Sign in with Telegram or your phone number.',
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
        <h1 className="font-display text-ink dark:text-bone text-4xl md:text-5xl">{copy.title}</h1>
        <p className="text-ink-muted text-sm dark:text-stone-400">{copy.subtitle}</p>
      </div>

      {/* Telegram */}
      <section className="mt-10 flex flex-col items-center gap-3">
        <h2 className="text-muted-foreground text-micro font-mono tracking-[0.28em] uppercase">
          {copy.telegram}
        </h2>
        <TelegramLoginButton locale={locale} />
      </section>

      {/* Divider */}
      <div className="my-8 flex items-center gap-4">
        <span className="bg-border h-px flex-1" />
        <span className="text-micro text-ink-muted font-semibold tracking-widest uppercase dark:text-stone-400">
          {copy.or}
        </span>
        <span className="bg-border h-px flex-1" />
      </div>

      {/* Phone OTP */}
      <section className="space-y-4">
        <h2 className="text-muted-foreground text-micro font-mono tracking-[0.28em] uppercase">
          {copy.phone}
        </h2>
        <PhoneOtpForm locale={locale} />
      </section>

      {/* Staff (subtle) */}
      <details className="border-border mt-12 border-t pt-6">
        <summary className="text-micro text-ink-muted hover:text-foreground cursor-pointer font-semibold tracking-widest uppercase dark:text-stone-400">
          {copy.staff}
        </summary>
        <div className="mt-4">
          <StaffLoginForm locale={locale} />
        </div>
      </details>
    </div>
  );
}
