import Link from 'next/link';
import { getTranslations } from 'next-intl/server';

export default async function NotFound() {
  const t = await getTranslations('common');
  return (
    <div className="container py-32 text-center">
      <p className="font-display text-7xl text-ink">404</p>
      <p className="mt-4 text-ink-muted">{t('notFound')}</p>
      <Link
        href="/"
        className="mt-8 inline-flex h-12 items-center border border-ink px-8 text-sm uppercase tracking-widest hover:border-brass hover:text-brass"
      >
        {t('backHome')}
      </Link>
    </div>
  );
}
