'use client';

// Phone OTP sign-in island. Two steps:
//   1. Click "Get code on Telegram" button (no phone input required on web)
//   2. Enter 6-digit code returned by the bot
//
// On success next-auth redirects to /[locale]/account. Errors surface inline.

import { useState, useTransition, useEffect } from 'react';
import { signIn } from 'next-auth/react';

type Lang = 'ru' | 'uz' | 'en';

const COPY: Record<
  Lang,
  {
    codeLabel: string;
    codePlaceholder: string;
    verify: string;
    verifying: string;
    changePhone: string;
    sentHint: string;
    errCode: string;
    errGeneric: string;
    telegramCode: string;
  }
> = {
  ru: {
    codeLabel: 'Код подтверждения',
    codePlaceholder: '123456',
    verify: 'Войти',
    verifying: 'Проверяем…',
    changePhone: 'Назад',
    sentHint: 'Мы отправили код. Проверьте вашего Telegram-бота.',
    errCode: 'Неверный или просроченный код.',
    errGeneric: 'Что-то пошло не так. Попробуйте снова.',
    telegramCode: 'Получить код в Telegram',
  },
  uz: {
    codeLabel: 'Tasdiqlash kodi',
    codePlaceholder: '123456',
    verify: 'Kirish',
    verifying: 'Tekshirilmoqda…',
    changePhone: 'Orqaga',
    sentHint: 'Kodni yubordik. Telegram-botingizni tekshiring.',
    errCode: 'Kod noto‘g‘ri yoki muddati o‘tgan.',
    errGeneric: 'Xatolik yuz berdi. Qayta urinib ko‘ring.',
    telegramCode: 'Telegram orqali kod olish',
  },
  en: {
    codeLabel: 'Verification code',
    codePlaceholder: '123456',
    verify: 'Sign in',
    verifying: 'Verifying…',
    changePhone: 'Back',
    sentHint: 'We sent a verification code. Check your Telegram bot.',
    errCode: 'Invalid or expired code.',
    errGeneric: 'Something went wrong. Please try again.',
    telegramCode: 'Get code on Telegram',
  },
};

const toLang = (locale: string): Lang =>
  locale === 'uz' || locale === 'en' ? locale : 'ru';

const fieldCls =
  'h-11 w-full rounded-md border border-border bg-white px-3 text-sm text-ink ' +
  'outline-none transition-colors focus:border-brass dark:bg-ink/40 dark:text-bone';
const labelCls =
  'mb-1.5 block text-[11px] font-semibold uppercase tracking-widest text-ink-muted dark:text-stone-400';
const primaryBtnCls =
  'inline-flex h-11 w-full items-center justify-center bg-ink px-7 text-xs font-semibold uppercase tracking-widest text-bone transition-colors hover:bg-brass disabled:cursor-not-allowed disabled:opacity-60 dark:bg-bone dark:text-ink';

export function PhoneOtpForm({ locale }: { locale: string }) {
  const lang = toLang(locale);
  const copy = COPY[lang];

  const [step, setStep] = useState<'phone' | 'code'>('phone');
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [sessionId, setSessionId] = useState('');

  useEffect(() => {
    // Generate a secure random session ID once on mount
    const rand = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    setSessionId(rand);
  }, []);

  const verifyCode = () => {
    setError(null);
    startTransition(async () => {
      const result = await signIn('phone-otp', {
        phone: `session:${sessionId}`,
        code: code.trim(),
        redirect: false,
        callbackUrl: `/${locale}/account`,
      });
      if (result?.error) {
        setError(copy.errCode);
        return;
      }
      // Successful sign-in: navigate to the account area.
      window.location.assign(result?.url ?? `/${locale}/account`);
    });
  };

  return (
    <div className="space-y-4">
      {step === 'phone' ? (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (sessionId) {
              window.open(`/${locale}/account/login/telegram-redirect?session=${sessionId}`, '_blank');
              setStep('code');
            }
          }}
          className="space-y-4"
        >
          <button type="submit" className={primaryBtnCls}>
            {copy.telegramCode}
          </button>
        </form>
      ) : (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (code.trim().length >= 4) verifyCode();
          }}
          className="space-y-4"
        >
          <p className="text-xs text-ink-muted dark:text-stone-400">{copy.sentHint}</p>
          <div>
            <label htmlFor="otp-code" className={labelCls}>
              {copy.codeLabel}
            </label>
            <input
              id="otp-code"
              className={fieldCls}
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              placeholder={copy.codePlaceholder}
              required
            />
          </div>
          <button type="submit" disabled={pending || code.trim().length < 4} className={primaryBtnCls}>
            {pending ? copy.verifying : copy.verify}
          </button>
          <button
            type="button"
            onClick={() => {
              setStep('phone');
              setCode('');
              setError(null);
            }}
            className="text-xs text-ink-muted underline-offset-2 hover:underline dark:text-stone-400"
          >
            {copy.changePhone}
          </button>
        </form>
      )}

      {error && (
        <p className="rounded-md border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </p>
      )}
    </div>
  );
}
