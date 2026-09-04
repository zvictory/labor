import Link from 'next/link';
import { useTranslations } from 'next-intl';

// Footer chrome ported from apps/web. Server-safe (useTranslations in RSC). All
// internal links are locale-prefixed; the Telegram link is the live bot handle.
export function SiteFooter({ locale }: { locale: string }) {
  const t = useTranslations('nav');
  const b = useTranslations('brand');
  const href = (path: string) => `/${locale}${path}`;

  return (
    <footer className="border-border bg-bone mt-20 border-t py-12">
      <div className="container grid gap-10 md:grid-cols-3">
        <div>
          <div className="font-logo text-ink text-3xl">{b('name')}</div>
          <p className="text-ink-muted mt-3 max-w-xs text-sm">{b('tagline')}</p>
        </div>
        <div>
          <h4 className="text-ink-muted mb-3 text-xs tracking-widest uppercase">{t('shop')}</h4>
          <ul className="space-y-2 text-sm">
            <li>
              <Link href={href('/brands')} className="hover:underline hover:underline-offset-4">
                {t('brands')}
              </Link>
            </li>
            <li>
              <Link href={href('/notes')} className="hover:underline hover:underline-offset-4">
                {t('notes')}
              </Link>
            </li>
            <li>
              <Link href={href('/perfumers')} className="hover:underline hover:underline-offset-4">
                {t('perfumers')}
              </Link>
            </li>
          </ul>
        </div>
        <div>
          <h4 className="text-ink-muted mb-3 text-xs tracking-widest uppercase">Telegram</h4>
          <p className="text-ink-muted text-sm">
            Open the mini-app in Telegram:{' '}
            <a
              href="https://t.me/labor_uz_bot"
              className="text-ink font-medium hover:underline hover:underline-offset-4"
            >
              @labor_uz_bot
            </a>
          </p>
        </div>
      </div>
      <div className="border-border text-ink-muted container mt-10 border-t pt-6 text-xs">
        © {new Date().getFullYear()} Labor. Tashkent, Uzbekistan.
      </div>
    </footer>
  );
}
