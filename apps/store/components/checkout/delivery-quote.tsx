'use client';

// Display-only live delivery estimate island. Given the currently-selected
// region/district/method, it debounced-fetches /api/delivery/quote and renders
// the resulting fee (formatUzs) with a subtle "estimate" label and optional ETA.
//
// This is informational ONLY: the charged delivery fee in checkout stays the
// method baseFee (owned by CheckoutForm's totals). On any failure or while the
// region is incomplete it shows the static `fallbackFee` and no error.

import { useEffect, useRef, useState } from 'react';

import { formatUzs } from '@/lib/money';
import type { Locale } from '@/lib/catalog/locale';

interface QuoteResponse {
  method: string;
  fee: number;
  source: 'yandex' | 'method';
  etaMinutes?: number;
}

interface Props {
  locale: Locale;
  region: string;
  district: string;
  address: string;
  method: string;
  /// Static method baseFee, shown until/unless a live quote resolves.
  fallbackFee: number;
}

const DEBOUNCE_MS = 500;

const ESTIMATE_LABEL: Record<Locale, string> = {
  ru: 'примерная стоимость',
  uz: 'taxminiy narx',
  en: 'estimate',
};

const ETA_LABEL: Record<Locale, (min: number) => string> = {
  ru: (min) => `≈ ${min} мин в пути`,
  uz: (min) => `≈ ${min} daqiqa yo'lda`,
  en: (min) => `≈ ${min} min en route`,
};

export function DeliveryQuote({ locale, region, district, address, method, fallbackFee }: Props) {
  const [quote, setQuote] = useState<QuoteResponse | null>(null);
  const [loading, setLoading] = useState(false);

  // Track the latest request so a slow earlier response can't clobber a newer one.
  const requestSeq = useRef(0);

  useEffect(() => {
    if (!region || !method) {
      setQuote(null);
      return;
    }

    const seq = ++requestSeq.current;
    const controller = new AbortController();
    setLoading(true);

    const timer = setTimeout(() => {
      void fetch('/api/delivery/quote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ region, district, address, method, locale }),
        signal: controller.signal,
      })
        .then((res) => (res.ok ? (res.json() as Promise<QuoteResponse>) : null))
        .then((data) => {
          if (seq === requestSeq.current) setQuote(data);
        })
        .catch(() => {
          // Best-effort: silently fall back to the static fee.
          if (seq === requestSeq.current) setQuote(null);
        })
        .finally(() => {
          if (seq === requestSeq.current) setLoading(false);
        });
    }, DEBOUNCE_MS);

    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [locale, region, district, address, method, fallbackFee]);

  // Resolved display fee: live quote when present, else the static baseFee.
  const fee = quote?.fee ?? fallbackFee;
  const isLive = quote?.source === 'yandex';
  const eta = quote?.etaMinutes;

  return (
    <div className="border-brass/40 bg-brass/5 mt-3 flex items-baseline justify-between gap-3 rounded-md border border-dashed px-3 py-2">
      <span className="text-micro text-brass font-semibold tracking-widest uppercase">
        {ESTIMATE_LABEL[locale]}
        {loading && <span className="text-ink-muted ml-1.5 animate-pulse">…</span>}
      </span>
      <span className="text-right">
        <span className="text-ink dark:text-bone text-sm font-medium">
          {formatUzs(fee, locale)}
        </span>
        {isLive && typeof eta === 'number' && (
          <span className="text-label text-ink-muted mt-0.5 block dark:text-stone-400">
            {ETA_LABEL[locale](eta)}
          </span>
        )}
      </span>
    </div>
  );
}
