'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';

import { TELEGRAM_BOT_USERNAME, TELEGRAM_URL } from '@/lib/telegram';

export default function TelegramRedirectPage() {
  const params = useParams();
  const locale = (params?.locale as string) || 'ru';
  const [countdown, setCountdown] = useState(4);

  useEffect(() => {
    // Attempt protocol launch immediately
    window.location.href = `tg://resolve?domain=${TELEGRAM_BOT_USERNAME}&start=login`;

    const interval = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          try {
            window.close();
          } catch (e) {
            console.error('Failed to close window automatically:', e);
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const copy = {
    ru: {
      title: 'Labor Parfum',
      status: 'Открываем Telegram...',
      autoClose: (s: number) => `Это окно закроется автоматически через ${s} сек.`,
      manualBtn: 'Открыть в Telegram Web',
      closeBtn: 'Закрыть это окно',
    },
    uz: {
      title: 'Labor Parfum',
      status: 'Telegram ochilmoqda...',
      autoClose: (s: number) => `Ushbu oyna ${s} soniyadan so‘ng avtomatik yopiladi.`,
      manualBtn: 'Telegram Web orqali ochish',
      closeBtn: 'Oynani yopish',
    },
    en: {
      title: 'Labor Parfum',
      status: 'Opening Telegram...',
      autoClose: (s: number) => `This window will close automatically in ${s}s.`,
      manualBtn: 'Open in Telegram Web',
      closeBtn: 'Close this window',
    },
  }[locale === 'uz' || locale === 'en' ? locale : 'ru'];

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-4">
      <div className="border-border w-full max-w-sm rounded-lg border bg-white p-8 text-center shadow-xl dark:bg-zinc-950">
        <h1 className="font-display text-brass text-2xl tracking-widest uppercase">{copy.title}</h1>
        <p className="text-ink dark:text-bone mt-4 text-base font-medium">{copy.status}</p>
        <p className="text-ink-muted mt-2 text-xs dark:text-stone-400">
          {countdown > 0 ? copy.autoClose(countdown) : ''}
        </p>
        <div className="mt-6 flex flex-col gap-3">
          <a
            href={`${TELEGRAM_URL}?start=login`}
            target="_self"
            className="bg-ink text-bone hover:bg-brass dark:bg-bone dark:text-ink dark:hover:bg-brass dark:hover:text-ink inline-flex h-11 w-full items-center justify-center px-6 text-xs font-semibold tracking-widest uppercase transition-colors"
          >
            {copy.manualBtn}
          </a>
          <button
            onClick={() => {
              try {
                window.close();
              } catch {
                // fallback if script cannot close
              }
            }}
            className="text-ink-muted hover:text-ink dark:hover:text-bone text-xs underline underline-offset-4 dark:text-stone-400"
          >
            {copy.closeBtn}
          </button>
        </div>
      </div>
    </div>
  );
}
