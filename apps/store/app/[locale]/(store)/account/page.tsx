import Link from 'next/link';
import { redirect } from 'next/navigation';
import { setRequestLocale } from 'next-intl/server';

import { type Locale, localeNames } from '@/i18n/config';
import { getCurrentUser } from '@/lib/auth/session';
import { SignOutButton } from '@/components/account/sign-out-button';

type Props = { params: Promise<{ locale: Locale }> };

type Lang = 'ru' | 'uz' | 'en';
const toLang = (locale: string): Lang =>
  locale === 'uz' || locale === 'en' ? locale : 'ru';

const COPY: Record<
  Lang,
  {
    title: string;
    profile: string;
    name: string;
    contact: string;
    telegram: string;
    locale: string;
    role: string;
    orders: string;
    ordersLink: string;
    notSet: string;
  }
> = {
  ru: {
    title: 'Личный кабинет',
    profile: 'Профиль',
    name: 'Имя',
    contact: 'Контакт',
    telegram: 'Telegram',
    locale: 'Язык',
    role: 'Роль',
    orders: 'Заказы',
    ordersLink: 'Мои заказы',
    notSet: 'Не указано',
  },
  uz: {
    title: 'Shaxsiy kabinet',
    profile: 'Profil',
    name: 'Ism',
    contact: 'Aloqa',
    telegram: 'Telegram',
    locale: 'Til',
    role: 'Rol',
    orders: 'Buyurtmalar',
    ordersLink: 'Buyurtmalarim',
    notSet: 'Kiritilmagan',
  },
  en: {
    title: 'My account',
    profile: 'Profile',
    name: 'Name',
    contact: 'Contact',
    telegram: 'Telegram',
    locale: 'Language',
    role: 'Role',
    orders: 'Orders',
    ordersLink: 'My orders',
    notSet: 'Not set',
  },
};

export default async function AccountPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  const user = await getCurrentUser();
  if (!user) {
    redirect(`/${locale}/account/login`);
  }

  const copy = COPY[toLang(locale)];
  // Synthesized Telegram emails (tg_<id>@labor.local) aren't a real contact —
  // treat them as "not a contact email" for display purposes.
  const isSyntheticEmail = (user.email ?? '').endsWith('@labor.local');
  const contactEmail = !isSyntheticEmail ? user.email : null;

  return (
    <div className="container max-w-2xl py-12 md:py-16">
      <div className="flex items-start justify-between gap-4">
        <h1 className="font-display text-4xl text-ink dark:text-bone md:text-5xl">
          {copy.title}
        </h1>
        <SignOutButton locale={locale} />
      </div>

      {/* Profile */}
      <section className="mt-10 space-y-3 rounded-xl border border-border p-6">
        <h2 className="text-[10px] font-bold uppercase tracking-[0.3em] text-brass">
          {copy.profile}
        </h2>
        <Row label={copy.name} value={user.name ?? copy.notSet} />
        <Row label={copy.contact} value={contactEmail ?? copy.notSet} />
        <Row
          label={copy.locale}
          value={localeNames[(user.locale as Locale) ?? 'ru'] ?? user.locale}
        />
        {user.role !== 'customer' && <Row label={copy.role} value={user.role} />}
      </section>

      {/* Orders link */}
      <section className="mt-6">
        <Link
          href={`/${locale}/account/orders`}
          className="flex items-center justify-between rounded-xl border border-border p-6 transition-colors hover:border-brass"
        >
          <span className="text-sm font-medium text-ink dark:text-bone">
            {copy.ordersLink}
          </span>
          <span className="text-brass">→</span>
        </Link>
      </section>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 text-sm">
      <span className="text-ink-muted dark:text-stone-400">{label}</span>
      <span className="font-medium text-ink dark:text-bone">{value}</span>
    </div>
  );
}
