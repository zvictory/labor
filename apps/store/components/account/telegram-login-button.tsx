'use client';

// Telegram Login Widget island.
//
// Telegram's widget injects an <iframe> button via a <script> tag. On success it
// invokes a global JS callback (named via data-onauth) with the signed user
// object { id, first_name, username, photo_url, auth_date, hash, … }. We forward
// that object to next-auth's `telegram` credentials provider, which re-verifies
// the HMAC server-side (verifyTelegramLogin) before trusting it.
//
// Requires NEXT_PUBLIC_TELEGRAM_BOT_USERNAME (the bot's @username without the @).
// Without it we render an informative disabled state rather than a broken widget.

import { useEffect, useRef, useState } from 'react';
import { signIn } from 'next-auth/react';

type Lang = 'ru' | 'uz' | 'en';

const COPY: Record<Lang, { unavailable: string; signingIn: string }> = {
  ru: { unavailable: 'Вход через Telegram временно недоступен', signingIn: 'Входим…' },
  uz: { unavailable: 'Telegram orqali kirish vaqtincha mavjud emas', signingIn: 'Kirilmoqda…' },
  en: { unavailable: 'Telegram sign-in is temporarily unavailable', signingIn: 'Signing in…' },
};

const toLang = (locale: string): Lang => (locale === 'uz' || locale === 'en' ? locale : 'ru');

// The widget posts a flat record of string-ish values.
type TelegramUser = Record<string, string | number>;

declare global {
  interface Window {
    __laborOnTelegramAuth?: (user: TelegramUser) => void;
  }
}

export function TelegramLoginButton({ locale }: { locale: string }) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [signingIn, setSigningIn] = useState(false);
  const lang = toLang(locale);
  const botUsername = process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME;

  useEffect(() => {
    if (!botUsername || !containerRef.current) return;

    // Global callback the widget invokes on successful auth.
    window.__laborOnTelegramAuth = (user: TelegramUser) => {
      setSigningIn(true);
      // Stringify every field for the credentials provider (it re-derives the
      // HMAC from the exact string values).
      const credentials: Record<string, string> = {};
      for (const [k, v] of Object.entries(user)) {
        credentials[k] = String(v);
      }
      void signIn('telegram', {
        ...credentials,
        callbackUrl: `/${locale}/account`,
      });
    };

    const script = document.createElement('script');
    script.src = 'https://telegram.org/js/telegram-widget.js?22';
    script.async = true;
    script.setAttribute('data-telegram-login', botUsername);
    script.setAttribute('data-size', 'large');
    script.setAttribute('data-radius', '4');
    script.setAttribute('data-onauth', '__laborOnTelegramAuth(user)');
    script.setAttribute('data-request-access', 'write');

    const container = containerRef.current;
    container.appendChild(script);

    return () => {
      container.innerHTML = '';
      delete window.__laborOnTelegramAuth;
    };
  }, [botUsername, locale]);

  if (!botUsername) {
    return <p className="text-ink-muted text-xs dark:text-stone-400">{COPY[lang].unavailable}</p>;
  }

  return (
    <div className="flex flex-col items-start gap-2">
      <div ref={containerRef} />
      {signingIn && (
        <p className="text-ink-muted text-xs dark:text-stone-400">{COPY[lang].signingIn}</p>
      )}
    </div>
  );
}
