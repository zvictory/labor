'use client';

import { useEffect } from 'react';
import { getWebApp } from '@/lib/telegram-webapp';

const TELEGRAM_SCRIPT_SRC = 'https://telegram.org/js/telegram-web-app.js';

export function TelegramWebAppBridge() {
  useEffect(() => {
    const wireUp = () => {
      const tg = getWebApp();
      if (!tg) return undefined;

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
      };

      applyTheme();
      tg.onEvent('themeChanged', applyTheme);
      tg.onEvent('viewportChanged', applyTheme);

      return () => {
        tg.offEvent('themeChanged', applyTheme);
        tg.offEvent('viewportChanged', applyTheme);
      };
    };

    let cleanup: (() => void) | undefined;

    if (getWebApp()) {
      cleanup = wireUp();
      return () => cleanup?.();
    }

    const existing = document.querySelector<HTMLScriptElement>(`script[src="${TELEGRAM_SCRIPT_SRC}"]`);
    const script = existing ?? Object.assign(document.createElement('script'), {
      src: TELEGRAM_SCRIPT_SRC,
      async: true,
    });
    const onLoad = () => {
      cleanup = wireUp();
    };
    script.addEventListener('load', onLoad);
    if (!existing) document.head.appendChild(script);

    return () => {
      script.removeEventListener('load', onLoad);
      cleanup?.();
    };
  }, []);

  return null;
}
