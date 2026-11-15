import { redirect } from 'next/navigation';
import { setRequestLocale } from 'next-intl/server';

import { type Locale } from '@/i18n/config';
import { getCurrentUser } from '@/lib/auth/session';
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
    title: 'Вход или регистрация',
    subtitle: 'Получите код в Telegram. При первом входе аккаунт создаётся автоматически.',
    telegram: 'Войти через Telegram',
    or: 'или',
    phone: 'Вход по телефону',
    staff: 'Сотрудникам',
  },
  uz: {
    title: 'Kirish yoki roʻyxatdan oʻtish',
    subtitle: 'Telegram orqali kod oling. Birinchi kirishda hisobingiz avtomatik yaratiladi.',
    telegram: 'Telegram orqali kirish',
    or: 'yoki',
    phone: 'Telefon orqali kirish',
    staff: 'Xodimlar uchun',
  },
  en: {
    title: 'Sign in or create an account',
    subtitle:
      'Get a code on Telegram. Your account is created automatically the first time you sign in.',
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
        <h1 className="page-title">{copy.title}</h1>
        <p className="body-copy text-muted-foreground">{copy.subtitle}</p>
      </div>

      {/* Phone OTP */}
      <section className="mt-10 space-y-4">
        <PhoneOtpForm locale={locale} />
      </section>

      {/* Staff (subtle) */}
      <details className="border-border mt-12 border-t pt-6">
        <summary className="text-ink-muted hover:text-brass cursor-pointer text-[10px] font-semibold tracking-widest uppercase dark:text-stone-400">
          {copy.staff}
        </summary>
        <div className="mt-4">
          <StaffLoginForm locale={locale} />
        </div>
      </details>
    </div>
  );
}
