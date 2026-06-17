'use client';

// Phone OTP sign-in island. Two steps:
//   1. enter phone → POST /api/auth/otp (issues + SMS-delivers a 6-digit code)
//   2. enter code  → signIn('phone-otp', { phone, code }) (next-auth verifies)
//
// On success next-auth redirects to /[locale]/account. Errors surface inline.

import { useState, useTransition } from 'react';
import { signIn } from 'next-auth/react';

type Lang = 'ru' | 'uz' | 'en';

const COPY: Record<
  Lang,
  {
    phoneLabel: string;
    phonePlaceholder: string;
    codeLabel: string;
    codePlaceholder: string;
    sendCode: string;
    sending: string;
    verify: string;
    verifying: string;
    changePhone: string;
    sentHint: string;
    errRate: string;
    errPhone: string;
    errCode: string;
    errGeneric: string;
    telegramCode: string;
  }
> = {
  ru: {
    phoneLabel: 'Номер телефона',
    phonePlaceholder: '+998 90 123 45 67',
    codeLabel: 'Код подтверждения',
    codePlaceholder: '123456',
    sendCode: 'Получить код по SMS',
    sending: 'Отправляем…',
    verify: 'Войти',
    verifying: 'Проверяем…',
    changePhone: 'Изменить номер',
    sentHint: 'Мы отправили код. Проверьте ваши SMS или Telegram-бота.',
    errRate: 'Слишком много запросов. Попробуйте позже.',
    errPhone: 'Введите корректный номер.',
    errCode: 'Неверный или просроченный код.',
    errGeneric: 'Что-то пошло не так. Попробуйте снова.',
    telegramCode: 'Получить код в Telegram',
  },
  uz: {
    phoneLabel: 'Telefon raqami',
    phonePlaceholder: '+998 90 123 45 67',
    codeLabel: 'Tasdiqlash kodi',
    codePlaceholder: '123456',
    sendCode: 'SMS orqali kod olish',
    sending: 'Yuborilmoqda…',
    verify: 'Kirish',
    verifying: 'Tekshirilmoqda…',
    changePhone: 'Raqamni o‘zgartirish',
    sentHint: 'Kodni yubordik. SMS yoki Telegram-botingizni tekshiring.',
    errRate: 'Juda ko‘p so‘rov. Birozdan keyin urinib ko‘ring.',
    errPhone: 'To‘g‘ri raqam kiriting.',
    errCode: 'Kod noto‘g‘ri yoki muddati o‘tgan.',
    errGeneric: 'Xatolik yuz berdi. Qayta urinib ko‘ring.',
    telegramCode: 'Telegram orqali kod olish',
  },
  en: {
    phoneLabel: 'Phone number',
    phonePlaceholder: '+998 90 123 45 67',
    codeLabel: 'Verification code',
    codePlaceholder: '123456',
    sendCode: 'Send code via SMS',
    sending: 'Sending…',
    verify: 'Sign in',
    verifying: 'Verifying…',
    changePhone: 'Change number',
    sentHint: 'We sent a verification code. Check your SMS or Telegram bot.',
    errRate: 'Too many requests. Please try again later.',
    errPhone: 'Enter a valid phone number.',
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
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const requestCode = () => {
    setError(null);
    startTransition(async () => {
      try {
        const res = await fetch('/api/auth/otp', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ phone: phone.trim() }),
        });
        if (res.ok) {
          setStep('code');
          return;
        }
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        if (res.status === 429 || data.error === 'rate_limited') {
          setError(copy.errRate);
        } else if (data.error === 'phone_required' || data.error === 'invalid_phone') {
          setError(copy.errPhone);
        } else {
          setError(copy.errGeneric);
        }
      } catch {
        setError(copy.errGeneric);
      }
    });
  };

  const verifyCode = () => {
    setError(null);
    startTransition(async () => {
      const result = await signIn('phone-otp', {
        phone: phone.trim(),
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
            if (phone.trim().length >= 6) {
              const botUsername = process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME || 'laborparfum_bot';
              window.open(`https://t.me/${botUsername}?start=login`, '_blank');
              setStep('code');
            }
          }}
          className="space-y-4"
        >
          <div>
            <label htmlFor="otp-phone" className={labelCls}>
              {copy.phoneLabel}
            </label>
            <input
              id="otp-phone"
              className={fieldCls}
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              inputMode="tel"
              autoComplete="tel"
              placeholder={copy.phonePlaceholder}
              required
            />
          </div>
          <button type="submit" disabled={phone.trim().length < 6} className={primaryBtnCls}>
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
