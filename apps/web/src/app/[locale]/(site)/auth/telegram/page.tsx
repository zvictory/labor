'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { apiFetch, ApiError } from '@/lib/api/client';

interface TelegramWidgetUser {
  id: number;
  first_name?: string;
  last_name?: string;
  username?: string;
  photo_url?: string;
  auth_date: number;
  hash: string;
}

interface WidgetAuthResponse {
  data: {
    token: string;
    user: {
      id: number;
      email: string;
      telegram_id: number;
      display_name: string;
      preferred_locale: string;
    };
  };
}

type AuthState =
  | { kind: 'idle' }
  | { kind: 'signing-in' }
  | { kind: 'error'; message: string };

declare global {
  interface Window {
    onTelegramAuth?: (user: TelegramWidgetUser) => void;
  }
}

export default function AuthTelegramPage() {
  const t = useTranslations('auth');
  const locale = useLocale();
  const router = useRouter();
  const widgetMountRef = useRef<HTMLDivElement | null>(null);
  const [state, setState] = useState<AuthState>({ kind: 'idle' });

  const botUsername = process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME;

  useEffect(() => {
    if (!botUsername) return;
    const mount = widgetMountRef.current;
    if (!mount) return;

    window.onTelegramAuth = (user: TelegramWidgetUser) => {
      setState({ kind: 'signing-in' });
      apiFetch<WidgetAuthResponse>('/storefront/auth/telegram/widget', {
        method: 'POST',
        body: user,
        locale,
      })
        .then((res) => {
          localStorage.setItem('labor-token', res.data.token);
          router.push(`/${locale}/account`);
        })
        .catch((e: unknown) => {
          const message =
            e instanceof ApiError ? `${e.status}: ${e.message}` : (e as Error).message;
          setState({ kind: 'error', message });
        });
    };

    const script = document.createElement('script');
    script.src = 'https://telegram.org/js/telegram-widget.js?22';
    script.async = true;
    script.setAttribute('data-telegram-login', botUsername);
    script.setAttribute('data-size', 'large');
    script.setAttribute('data-onauth', 'onTelegramAuth(user)');
    script.setAttribute('data-request-access', 'write');
    mount.appendChild(script);

    return () => {
      if (mount.contains(script)) mount.removeChild(script);
      delete window.onTelegramAuth;
    };
  }, [botUsername, locale, router]);

  if (!botUsername) {
    return (
      <div className="mx-auto max-w-md py-16 text-center">
        <h1 className="mb-4 font-serif text-3xl">{t('widgetTitle')}</h1>
        <p className="text-sm text-red-600">{t('widgetMissingConfig')}</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md space-y-6 py-16 text-center">
      <h1 className="font-serif text-3xl">{t('widgetTitle')}</h1>
      <p className="text-sm text-neutral-600">{t('widgetExplainer')}</p>
      <div ref={widgetMountRef} className="flex justify-center" />
      {state.kind === 'signing-in' ? (
        <p className="text-sm text-neutral-600">{t('signingIn')}</p>
      ) : null}
      {state.kind === 'error' ? (
        <p className="text-sm text-red-600">
          {t('signInError')}: {state.message}
        </p>
      ) : null}
    </div>
  );
}
