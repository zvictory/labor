'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { signIn, useSession } from 'next-auth/react';

const TELEGRAM_SCRIPT_SRC = 'https://telegram.org/js/telegram-web-app.js';

export function TelegramWebAppBridge() {
  const pathname = usePathname();
  const { status: sessionStatus } = useSession();

  useEffect(() => {
    // Proactively clean up class on standard browsers before script loads/checks
    const initialTg = (window as any).Telegram?.WebApp;
    const isInsideTelegramInit = Boolean(initialTg?.initData && initialTg.initData.includes('hash='));
    const isTgRouteInit = pathname.split('/').includes('tg');
    if (!isInsideTelegramInit && !isTgRouteInit) {
      document.body.classList.remove('is-telegram-webapp');
    }

    const handleWebApp = () => {
      const tg = (window as any).Telegram?.WebApp;
      if (!tg) return undefined;

      const isInsideTelegram = Boolean(tg.initData && tg.initData.includes('hash='));
      const isTgRoute = pathname.split('/').includes('tg');

      console.log('[TelegramWebAppBridge] initData present:', Boolean(tg.initData), 'hasHash:', isInsideTelegram, 'isTgRoute:', isTgRoute);

      if (!isInsideTelegram && !isTgRoute) {
        document.body.classList.remove('is-telegram-webapp');
        return undefined;
      }

      tg.ready();
      tg.expand();

      const applyTheme = () => {
        const root = document.documentElement;
        const { bg_color, text_color, hint_color, button_color, button_text_color } = tg.themeParams;
        if (bg_color) root.style.setProperty('--tg-bg', bg_color);
        if (text_color) root.style.setProperty('--tg-text', text_color);
        if (hint_color) root.style.setProperty('--tg-hint', hint_color);
        if (button_color) root.style.setProperty('--tg-button', button_color);
        if (button_text_color) root.style.setProperty('--tg-button-text', button_text_color);
        root.dataset.tgScheme = tg.colorScheme;

        // Add class to body to hide browser navigation
        document.body.classList.add('is-telegram-webapp');
      };

      applyTheme();
      tg.onEvent('themeChanged', applyTheme);
      tg.onEvent('viewportChanged', applyTheme);

      // Auto-login: if inside Mini App and not authenticated in NextAuth, link dynamically via initData
      if (sessionStatus === 'unauthenticated' && tg.initData) {
        signIn('telegram-webapp', { initData: tg.initData, redirect: false }).catch((err) => {
          console.error('[telegram-webapp] Auto-login failed:', err);
        });
      }

      return () => {
        document.body.classList.remove('is-telegram-webapp');
        tg.offEvent('themeChanged', applyTheme);
        tg.offEvent('viewportChanged', applyTheme);
      };
    };

    let cleanup: (() => void) | undefined;

    const tg = (window as any).Telegram?.WebApp;
    if (tg) {
      cleanup = handleWebApp();
      return () => cleanup?.();
    }

    const existing = document.querySelector<HTMLScriptElement>(`script[src="${TELEGRAM_SCRIPT_SRC}"]`);
    const script = existing ?? Object.assign(document.createElement('script'), {
      src: TELEGRAM_SCRIPT_SRC,
      async: true,
    });
    
    const onLoad = () => {
      cleanup = handleWebApp();
    };

    script.addEventListener('load', onLoad);
    if (!existing) document.head.appendChild(script);

    return () => {
      script.removeEventListener('load', onLoad);
      cleanup?.();
    };
  }, [sessionStatus, pathname]);

  return null;
}
