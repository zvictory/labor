import Link from 'next/link';
import { useTranslations } from 'next-intl';

import { resolveLocaleText } from '@/lib/catalog/locale';
import { STORE_CONTACT, instagramUrl, telHref } from '@/lib/store-contact';
import { TELEGRAM_HANDLE, TELEGRAM_URL } from '@/lib/telegram';

// Footer chrome ported from apps/web. Server-safe (useTranslations in RSC). All
// internal links are locale-prefixed; the Telegram handle comes from
// lib/telegram so it cannot drift from the one production is configured with —
// this block used to hardcode @labor_uz_bot, which is not the shop's bot.
export function SiteFooter({ locale }: { locale: string }) {
  const t = useTranslations('nav');
  const b = useTranslations('brand');
  const f = useTranslations('footer');
  const c = useTranslations('corporate');
  const href = (path: string) => `/${locale}${path}`;
  const { phone, hours, instagram } = STORE_CONTACT;

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
            <li>
              <Link href={href('/campaigns')} className="hover:underline hover:underline-offset-4">
                {t('campaigns')}
              </Link>
            </li>
            <li>
              <Link href={href('/delivery')} className="hover:underline hover:underline-offset-4">
                {t('delivery')}
              </Link>
            </li>
          </ul>
        </div>
        {/* Each line appears once it is filled in lib/store-contact.ts. */}
        <div>
          <h4 className="text-ink-muted mb-3 text-xs tracking-widest uppercase">
            {f('contactsTitle')}
          </h4>
          <ul className="text-ink-muted space-y-2 text-sm">
            {phone && (
              <li>
                <a
                  href={telHref(phone)}
                  className="text-ink font-medium hover:underline hover:underline-offset-4"
                >
                  {phone}
                </a>
              </li>
            )}
            {hours && <li>{resolveLocaleText(hours, locale)}</li>}
            <li>
              {f('telegram')}{' '}
              <a
                href={TELEGRAM_URL}
                className="text-ink font-medium hover:underline hover:underline-offset-4"
              >
                {TELEGRAM_HANDLE}
              </a>
            </li>
            {instagram && (
              <li>
                Instagram{' '}
                <a
                  href={instagramUrl(instagram)}
                  target="_blank"
                  rel="noreferrer"
                  className="text-ink font-medium hover:underline hover:underline-offset-4"
                >
                  @{instagram}
                </a>
              </li>
            )}
            <li>
              <Link href={href('/contacts')} className="hover:underline hover:underline-offset-4">
                {f('allContacts')}
              </Link>
            </li>
            <li>
              <Link href={href('/corporate')} className="hover:underline hover:underline-offset-4">
                {c('nav')}
              </Link>
            </li>
          </ul>
        </div>
      </div>
      <div className="border-border text-ink-muted container mt-10 border-t pt-6 text-xs">
        {f('copyright', { year: new Date().getFullYear() })}
      </div>
    </footer>
  );
}
