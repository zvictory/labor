import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';

import { locales, type Locale } from '@/i18n/config';
import { TELEGRAM_URL } from '@/lib/telegram';

type Props = { params: Promise<{ locale: Locale }> };

export const generateStaticParams = () => locales.map((locale) => ({ locale }));

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'delivery' });
  return { title: t('title'), description: t('subtitle') };
}

// Two cards in the trust strip have linked here since the storefront was built,
// and the route did not exist — the section that says "buy with confidence" was
// the one handing out 404s.
//
// Everything on this page is a claim the trust strip already publishes on the
// home page in all three locales. Nothing here is new policy: no fee, no free
// shipping threshold, no courier, no cut-off time, no returns window, because
// none of those are known. Those belong here once the shop states them.
export default async function DeliveryPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('delivery');

  return (
    <main className="container max-w-3xl space-y-12 py-12">
      <header className="space-y-3">
        <h1 className="font-display text-4xl tracking-[-0.02em] md:text-6xl">{t('title')}</h1>
        <p className="text-muted-foreground text-sm">{t('subtitle')}</p>
      </header>

      <section className="border-border border-t pt-8">
        <h2 className="text-label mb-6 font-mono tracking-[0.16em] uppercase">
          {t('shippingTitle')}
        </h2>
        <dl className="grid gap-px sm:grid-cols-2">
          <div className="border-border space-y-1 border p-6">
            <dt className="text-base font-medium">{t('tashkentTerm')}</dt>
            <dd className="text-muted-foreground text-sm">{t('tashkentBody')}</dd>
          </div>
          <div className="border-border space-y-1 border p-6 sm:border-l-0">
            <dt className="text-base font-medium">{t('regionsTerm')}</dt>
            <dd className="text-muted-foreground text-sm">{t('regionsBody')}</dd>
          </div>
        </dl>
      </section>

      <section className="border-border border-t pt-8">
        <h2 className="text-label mb-4 font-mono tracking-[0.16em] uppercase">
          {t('paymentTitle')}
        </h2>
        <p className="max-w-prose text-base">{t('paymentBody')}</p>
      </section>

      <section className="border-border border-t pt-8">
        <h2 className="text-label mb-4 font-mono tracking-[0.16em] uppercase">
          {t('authenticityTitle')}
        </h2>
        <p className="max-w-prose text-base">{t('authenticityBody')}</p>
      </section>

      <section className="border-border border-t pt-8">
        <h2 className="font-display mb-3 text-2xl">{t('helpTitle')}</h2>
        <p className="text-muted-foreground max-w-prose text-sm">{t('helpBody')}</p>
        <a
          href={TELEGRAM_URL}
          className="border-foreground hover:bg-foreground hover:text-background text-label mt-6 inline-block border px-6 py-3 font-mono tracking-[0.16em] uppercase transition-colors"
        >
          {t('helpCta')}
        </a>
      </section>
    </main>
  );
}
