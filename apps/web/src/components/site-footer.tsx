import Link from 'next/link';
import { useTranslations } from 'next-intl';

export function SiteFooter({ locale }: { locale: string }) {
  const t = useTranslations('nav');
  const b = useTranslations('brand');
  const href = (path: string) => `/${locale}${path}`;

  return (
    <footer className="mt-20 border-t border-border bg-bone py-12">
      <div className="container grid gap-10 md:grid-cols-4">
        <div>
          <div className="font-display text-3xl text-ink">{b('name')}</div>
          <p className="mt-3 max-w-xs text-sm text-ink-muted">{b('tagline')}</p>
        </div>
        <div>
          <h4 className="mb-3 text-xs uppercase tracking-widest text-ink-muted">{t('shop')}</h4>
          <ul className="space-y-2 text-sm">
            <li><Link href={href('/brands')} className="hover:text-brass">{t('brands')}</Link></li>
            <li><Link href={href('/notes')} className="hover:text-brass">{t('notes')}</Link></li>
            <li><Link href={href('/perfumers')} className="hover:text-brass">{t('perfumers')}</Link></li>
            <li><Link href={href('/campaigns')} className="hover:text-brass">{t('campaigns')}</Link></li>
          </ul>
        </div>
        <div>
          <h4 className="mb-3 text-xs uppercase tracking-widest text-ink-muted">Info</h4>
          <ul className="space-y-2 text-sm">
            <li><Link href={href('/about')} className="hover:text-brass">About</Link></li>
            <li><Link href={href('/delivery')} className="hover:text-brass">Delivery & payment</Link></li>
            <li><Link href={href('/contacts')} className="hover:text-brass">Contacts</Link></li>
            <li><Link href={href('/terms')} className="hover:text-brass">Terms</Link></li>
          </ul>
        </div>
        <div>
          <h4 className="mb-3 text-xs uppercase tracking-widest text-ink-muted">Telegram</h4>
          <p className="text-sm text-ink-muted">
            Open the mini-app in Telegram:{' '}
            <a href="https://t.me/labor_uz_bot" className="font-medium text-ink hover:text-brass">
              @labor_uz_bot
            </a>
          </p>
        </div>
      </div>
      <div className="container mt-10 border-t border-border pt-6 text-xs text-ink-muted">
        © {new Date().getFullYear()} Labor. Tashkent, Uzbekistan.
      </div>
    </footer>
  );
}
