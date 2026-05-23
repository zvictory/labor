'use client';

import { useEffect } from 'react';
import { getTelegramWebApp } from '@/lib/telegram-webapp';

interface Props {
  text: string;
  onClick: () => void;
  visible?: boolean;
  loading?: boolean;
  disabled?: boolean;
  color?: string;
}

export const TgMainButton = ({ text, onClick, visible = true, loading = false, disabled = false, color }: Props) => {
  useEffect(() => {
    const wa = getTelegramWebApp();
    if (!wa) return;
    const btn = wa.MainButton;

    btn.setText(text);
    if (color) btn.setParams({ color });
    if (visible) btn.show(); else btn.hide();
    disabled || loading ? btn.disable() : btn.enable();
    loading ? btn.showProgress() : btn.hideProgress();

    btn.onClick(onClick);
    return () => {
      btn.offClick(onClick);
      btn.hide();
    };
  }, [text, onClick, visible, loading, disabled, color]);

  return null;
};
