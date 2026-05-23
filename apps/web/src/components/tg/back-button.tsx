'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getTelegramWebApp } from '@/lib/telegram-webapp';

export const TgBackButton = ({ enabled = true }: { enabled?: boolean }) => {
  const router = useRouter();
  useEffect(() => {
    const wa = getTelegramWebApp();
    if (!wa) return;
    const back = () => router.back();
    if (enabled) {
      wa.BackButton.show();
      wa.BackButton.onClick(back);
    } else {
      wa.BackButton.hide();
    }
    return () => {
      wa.BackButton.offClick(back);
      wa.BackButton.hide();
    };
  }, [enabled, router]);
  return null;
};
