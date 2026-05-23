import type { ReactNode } from 'react';
import { TelegramWebAppBridge } from '@/components/telegram/webapp-bridge';
import { TgTabBar } from '@/components/tg/tab-bar';
import { TgLocaleSwitcher } from '@/components/tg/locale-switcher';

export const metadata = {
  title: 'Labor · Mini App',
  robots: { index: false, follow: false },
};

export default function TelegramLayout({ children }: { children: ReactNode }) {
  return (
    <div
      data-tg-app
      className="min-h-[100dvh] bg-[var(--tg-bg-color,#fafaf9)] text-[var(--tg-text-color,#1c1917)]"
    >
      <TelegramWebAppBridge />
      <div className="mx-auto flex max-w-md items-center justify-end px-4 pt-3">
        <TgLocaleSwitcher />
      </div>
      <main className="mx-auto max-w-md px-4 pb-24 pt-2">{children}</main>
      <TgTabBar />
    </div>
  );
}
