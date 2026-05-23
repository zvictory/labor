'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';

export default function AccountPage() {
  const t = useTranslations('account');
  const locale = useLocale();
  const [mounted, setMounted] = useState(false);
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    setToken(localStorage.getItem('labor-token'));
    setMounted(true);
  }, []);

  if (!mounted) {
    return <p className="py-12 text-center text-sm text-neutral-500">{t('loading')}</p>;
  }

  if (!token) {
    return (
      <div className="mx-auto max-w-md py-16 text-center">
        <p className="mb-4 text-sm text-neutral-600">{t('login')}</p>
        <Link
          href={`/${locale}/auth/telegram`}
          className="inline-block rounded-md border border-neutral-900 px-4 py-2 text-sm font-medium"
        >
          {t('loggingIn')}
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6 py-10">
      <h1 className="font-serif text-3xl">{t('greeting')}</h1>
      <div className="rounded-lg border border-neutral-200 p-6">
        <Link
          href={`/${locale}/account/orders`}
          className="text-sm font-medium underline underline-offset-4"
        >
          {t('viewOrders')}
        </Link>
      </div>
    </div>
  );
}
