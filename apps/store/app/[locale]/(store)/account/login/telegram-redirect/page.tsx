'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';

export default function TelegramRedirectPage() {
  const params = useParams();
  const locale = (params?.locale as string) || 'ru';
  const botUsername = process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME || 'laborparfum_bot';
  const [countdown, setCountdown] = useState(4);

  useEffect(() => {
    // Attempt protocol launch immediately
    window.location.href = `tg://resolve?domain=${botUsername}&start=login`;

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
  }, [botUsername]);

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
      <div className="w-full max-w-sm rounded-lg border border-border bg-white p-8 text-center shadow-xl dark:bg-zinc-950">
        <h1 className="font-display text-2xl tracking-widest text-brass uppercase">
          {copy.title}
        </h1>
        <p className="mt-4 text-base font-medium text-ink dark:text-bone">
          {copy.status}
        </p>
        <p className="mt-2 text-xs text-ink-muted dark:text-stone-400">
          {countdown > 0 ? copy.autoClose(countdown) : ''}
        </p>
        <div className="mt-6 flex flex-col gap-3">
          <a
            href={`https://t.me/${botUsername}?start=login`}
            target="_self"
            className="inline-flex h-11 w-full items-center justify-center bg-ink px-6 text-xs font-semibold uppercase tracking-widest text-bone transition-colors hover:bg-brass dark:bg-bone dark:text-ink dark:hover:bg-brass dark:hover:text-ink"
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
            className="text-xs text-ink-muted underline underline-offset-4 hover:text-ink dark:text-stone-400 dark:hover:text-bone"
          >
            {copy.closeBtn}
          </button>
        </div>
      </div>
    </div>
  );
}
