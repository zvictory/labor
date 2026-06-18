'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { ChevronDown, ChevronUp, Send } from 'lucide-react';

// Footer chrome ported from apps/web. Server-safe (useTranslations in RSC). All
// internal links are locale-prefixed; the Telegram link is the live bot handle.
export function SiteFooter({ locale }: { locale: string }) {
  const t = useTranslations('nav');
  const b = useTranslations('brand');
  const href = (path: string) => `/${locale}${path}`;
  const botUsername = process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME || 'laborparfum_bot';

  // Mobile accordions toggle states
  const [isShopOpen, setIsShopOpen] = useState(false);
  const [isInfoOpen, setIsInfoOpen] = useState(false);

  return (
    <footer className="mt-20 border-t border-stone-200/80 bg-bone dark:bg-[#151311] dark:border-stone-850 py-10 md:py-16 pb-[calc(24px+env(safe-area-inset-bottom)+64px)] md:pb-16">
      {/* Desktop Footer View */}
      <div className="container hidden md:grid gap-10 md:grid-cols-4">
        <div>
          <div className="font-display text-3xl text-ink dark:text-bone">{b('name')}</div>
          <p className="mt-3 max-w-xs text-sm text-ink-muted dark:text-stone-400">{b('tagline')}</p>
        </div>
        <div>
          <h4 className="mb-3 text-xs uppercase tracking-widest text-ink-muted dark:text-stone-400">{t('shop')}</h4>
          <ul className="space-y-2 text-sm">
            <li>
              <Link href={href('/brands')} className="hover:text-brass transition-colors">
                {t('brands')}
              </Link>
            </li>
            <li>
              <Link href={href('/notes')} className="hover:text-brass transition-colors">
                {t('notes')}
              </Link>
            </li>
            <li>
              <Link href={href('/perfumers')} className="hover:text-brass transition-colors">
                {t('perfumers')}
              </Link>
            </li>
          </ul>
        </div>
        <div>
          <h4 className="mb-3 text-xs uppercase tracking-widest text-ink-muted dark:text-stone-400">Info</h4>
          <ul className="space-y-2 text-sm">
            <li>
              <Link href={href('/about')} className="hover:text-brass transition-colors">
                About
              </Link>
            </li>
            <li>
              <Link href={href('/delivery')} className="hover:text-brass transition-colors">
                Delivery &amp; payment
              </Link>
            </li>
            <li>
              <Link href={href('/contacts')} className="hover:text-brass transition-colors">
                Contacts
              </Link>
            </li>
            <li>
              <Link href={href('/terms')} className="hover:text-brass transition-colors">
                Terms
              </Link>
            </li>
          </ul>
        </div>
        <div>
          <h4 className="mb-3 text-xs uppercase tracking-widest text-ink-muted dark:text-stone-400">Telegram</h4>
          <p className="text-sm text-ink-muted dark:text-stone-450">
            Open the mini-app in Telegram:{' '}
            <a href={`https://t.me/${botUsername}`} className="font-medium text-ink hover:text-brass dark:text-bone transition-colors">
              @{botUsername}
            </a>
          </p>
        </div>
      </div>

      {/* Mobile Footer View */}
      <div className="container md:hidden px-4 space-y-6">
        {/* Telegram Box */}
        <div className="border border-stone-200/80 bg-stone-50/50 p-5 rounded-lg dark:border-stone-800 dark:bg-stone-900/10 flex flex-col gap-3">
          <div className="font-display text-2xl text-stone-900 dark:text-stone-100">{b('name')}</div>
          <p className="text-xs text-stone-500 dark:text-stone-400">{b('tagline')}</p>
          <a
            href={`https://t.me/${botUsername}`}
            className="flex h-11 items-center justify-center gap-2 bg-brass text-bone text-xs font-bold uppercase tracking-widest hover:bg-brass/90 transition-colors"
          >
            <Send className="h-3.5 w-3.5" />
            <span>Open in Telegram</span>
          </a>
        </div>

        {/* Collapsible Accordions */}
        <div className="space-y-1">
          {/* Shop links */}
          <div className="border-b border-stone-200/60 dark:border-stone-800 pb-1">
            <button
              onClick={() => setIsShopOpen(!isShopOpen)}
              className="flex w-full items-center justify-between py-3 text-xs font-bold uppercase tracking-widest text-stone-800 dark:text-stone-200"
            >
              <span>{t('shop')}</span>
              {isShopOpen ? <ChevronUp className="h-4 w-4 text-stone-400" /> : <ChevronDown className="h-4 w-4 text-stone-400" />}
            </button>
            {isShopOpen && (
              <ul className="pb-3 pl-1 space-y-2.5 text-xs font-medium uppercase tracking-wider text-stone-500 animate-in fade-in duration-200">
                <li><Link href={href('/brands')} className="hover:text-brass">{t('brands')}</Link></li>
                <li><Link href={href('/notes')} className="hover:text-brass">{t('notes')}</Link></li>
                <li><Link href={href('/perfumers')} className="hover:text-brass">{t('perfumers')}</Link></li>
              </ul>
            )}
          </div>

          {/* Info links */}
          <div className="border-b border-stone-200/60 dark:border-stone-800 pb-1">
            <button
              onClick={() => setIsInfoOpen(!isInfoOpen)}
              className="flex w-full items-center justify-between py-3 text-xs font-bold uppercase tracking-widest text-stone-800 dark:text-stone-200"
            >
              <span>Info</span>
              {isInfoOpen ? <ChevronUp className="h-4 w-4 text-stone-400" /> : <ChevronDown className="h-4 w-4 text-stone-400" />}
            </button>
            {isInfoOpen && (
              <ul className="pb-3 pl-1 space-y-2.5 text-xs font-medium uppercase tracking-wider text-stone-500 animate-in fade-in duration-200">
                <li><Link href={href('/about')} className="hover:text-brass">About</Link></li>
                <li><Link href={href('/delivery')} className="hover:text-brass">Delivery &amp; payment</Link></li>
                <li><Link href={href('/contacts')} className="hover:text-brass">Contacts</Link></li>
                <li><Link href={href('/terms')} className="hover:text-brass">Terms</Link></li>
              </ul>
            )}
          </div>
        </div>
      </div>

      <div className="container mt-10 border-t border-stone-200/60 dark:border-stone-800 pt-6 text-xs text-ink-muted dark:text-stone-500">
        © {new Date().getFullYear()} Labor. Tashkent, Uzbekistan.
      </div>
    </footer>
  );
}
