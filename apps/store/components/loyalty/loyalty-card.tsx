// The member's Labor card on the account page: the number and QR code the
// branch scans, the tier, the bonus and what expires soon, and the last moves.
// Server component; the QR code is drawn here as inline SVG.

import QRCode from 'qrcode';

import { formatUzs } from '@/lib/money';
import { formatCardNumber, tierRule, type Tier } from '@/lib/loyalty/rules';
import { tierName } from '@/lib/loyalty/messages';
import type { LoyaltyState } from '@/lib/loyalty/loyalty';
import { LoyaltySettings, type LoyaltySettingsCopy } from '@/components/loyalty/loyalty-settings';

type Lang = 'ru' | 'uz' | 'en';

interface CardCopy {
  title: string;
  number: string;
  tier: string;
  rate: string;
  balance: string;
  next: string;
  top: string;
  expiring: string;
  showAtTill: string;
  history: string;
  noHistory: string;
  googleWallet: string;
  walletError: string;
  kinds: Record<string, string>;
  settings: LoyaltySettingsCopy;
}

const COPY: Record<Lang, CardCopy> = {
  ru: {
    title: 'Карта Labor',
    number: 'Номер карты',
    tier: 'Уровень',
    rate: '{rate}% бонусами с покупки',
    balance: 'Бонусы',
    next: 'До уровня {tier}: {amount}',
    top: 'Высший уровень',
    expiring: '{amount} сгорят {date}',
    showAtTill: 'Покажите код на кассе в магазине Labor',
    history: 'История',
    googleWallet: 'Добавить в Google Wallet',
    walletError: 'Не удалось связаться с Google Wallet. Попробуйте позже.',
    noHistory: 'Пока пусто: бонусы начисляются после доставки заказа или покупки в магазине.',
    kinds: {
      earn: 'Начислено',
      spend: 'Оплачено',
      refund: 'Возвращено',
      expire: 'Сгорело',
      adjust: 'Корректировка',
      birthday: 'Подарок ко дню рождения',
    },
    settings: {
      birthday: 'День рождения',
      birthdayHint: 'В день рождения Labor дарит бонусы. Дату можно указать один раз.',
      birthdaySave: 'Сохранить',
      consent: 'Получать акции и персональные предложения Labor',
      saved: 'Сохранено',
      errors: {
        birth_invalid: 'Проверьте дату',
        birth_set: 'Дата уже указана. Изменить её можно в магазине.',
        unauthorized: 'Войдите снова',
      },
    },
  },
  uz: {
    title: 'Labor kartasi',
    number: 'Karta raqami',
    tier: 'Daraja',
    rate: 'Xariddan {rate}% bonus',
    balance: 'Bonus',
    next: '{tier} darajasigacha: {amount}',
    top: 'Eng yuqori daraja',
    expiring: '{amount} {date} kuni yonadi',
    showAtTill: 'Labor doʻkonida kassada kodni koʻrsating',
    history: 'Tarix',
    googleWallet: 'Google Wallet’ga qoʻshish',
    walletError: 'Google Wallet bilan bogʻlanib boʻlmadi. Keyinroq urinib koʻring.',
    noHistory:
      'Hozircha boʻsh: bonus buyurtma yetkazilgach yoki doʻkondagi xariddan keyin yoziladi.',
    kinds: {
      earn: 'Yozildi',
      spend: 'Toʻlandi',
      refund: 'Qaytarildi',
      expire: 'Yondi',
      adjust: 'Tuzatish',
      birthday: 'Tugʻilgan kun sovgʻasi',
    },
    settings: {
      birthday: 'Tugʻilgan kun',
      birthdayHint:
        'Tugʻilgan kuningizda Labor bonus sovgʻa qiladi. Sanani bir marta kiritish mumkin.',
      birthdaySave: 'Saqlash',
      consent: 'Labor aksiyalari va shaxsiy takliflarini olaman',
      saved: 'Saqlandi',
      errors: {
        birth_invalid: 'Sanani tekshiring',
        birth_set: 'Sana allaqachon kiritilgan. Uni doʻkonda oʻzgartirish mumkin.',
        unauthorized: 'Qaytadan kiring',
      },
    },
  },
  en: {
    title: 'Labor card',
    number: 'Card number',
    tier: 'Tier',
    rate: '{rate}% back in bonus',
    balance: 'Bonus',
    next: 'To {tier}: {amount}',
    top: 'Top tier',
    expiring: '{amount} expires on {date}',
    showAtTill: 'Show the code at the till in a Labor shop',
    history: 'History',
    googleWallet: 'Add to Google Wallet',
    walletError: 'Could not reach Google Wallet. Please try again later.',
    noHistory: 'Nothing yet: bonus comes after an order is delivered or a purchase in the shop.',
    kinds: {
      earn: 'Earned',
      spend: 'Paid',
      refund: 'Returned',
      expire: 'Expired',
      adjust: 'Correction',
      birthday: 'Birthday gift',
    },
    settings: {
      birthday: 'Birthday',
      birthdayHint: 'Labor gives you bonus on your birthday. The date can be set once.',
      birthdaySave: 'Save',
      consent: 'Send me Labor offers and personal deals',
      saved: 'Saved',
      errors: {
        birth_invalid: 'Check the date',
        birth_set: 'The date is already set. It can be changed in the shop.',
        unauthorized: 'Sign in again',
      },
    },
  },
};

const toLang = (locale: string): Lang => (locale === 'uz' || locale === 'en' ? locale : 'ru');

const intlLocale = (locale: string) =>
  locale === 'uz' ? 'uz-Latn-UZ' : locale === 'en' ? 'en-GB' : 'ru-RU';

const formatDay = (date: Date, locale: string, withYear = false) =>
  new Intl.DateTimeFormat(intlLocale(locale), {
    day: 'numeric',
    month: 'long',
    ...(withYear ? { year: 'numeric' } : {}),
    timeZone: withYear ? 'UTC' : 'Asia/Tashkent',
  }).format(date);

export interface CardHistoryRow {
  id: number;
  kind: string;
  amount: number;
  createdAt: Date;
}

export async function LoyaltyCard({
  locale,
  state,
  history,
  birthDate,
  consent,
  googleWallet,
  walletError,
}: {
  locale: string;
  state: LoyaltyState;
  history: CardHistoryRow[];
  birthDate: Date | null;
  consent: boolean;
  /** Show the "Add to Google Wallet" button (Google Wallet is configured). */
  googleWallet: boolean;
  walletError: boolean;
}) {
  const copy = COPY[toLang(locale)];
  const qr = await QRCode.toString(state.cardNumber, {
    type: 'svg',
    margin: 0,
    errorCorrectionLevel: 'M',
  });
  const rate = tierRule(state.tier as Tier).rate;
  const sectionTitleCls = 'text-muted-foreground text-micro font-mono tracking-[0.28em] uppercase';

  return (
    <section
      className="border-border mt-10 space-y-6 rounded-xl border p-6"
      aria-labelledby="lc-title"
    >
      <h2 id="lc-title" className={sectionTitleCls}>
        {copy.title}
      </h2>

      <div className="grid gap-6 sm:grid-cols-[1fr_auto] sm:items-center">
        <div className="space-y-4">
          <div>
            <p className={sectionTitleCls}>{copy.balance}</p>
            <p className="text-ink dark:text-bone font-mono text-4xl font-semibold tabular-nums">
              {formatUzs(state.available, locale)}
            </p>
            {state.expiringSoon[0] && (
              <p className="mt-1 text-xs text-amber-800 dark:text-amber-300">
                {copy.expiring
                  .replace(
                    '{amount}',
                    formatUzs(
                      state.expiringSoon.reduce((s, l) => s + l.amount, 0),
                      locale,
                    ),
                  )
                  .replace('{date}', formatDay(state.expiringSoon[0].expiresAt, locale))}
              </p>
            )}
          </div>
          <div>
            <p className={sectionTitleCls}>{copy.tier}</p>
            <p className="text-ink dark:text-bone text-lg font-medium">
              {tierName(state.tier)} · {copy.rate.replace('{rate}', String(rate))}
            </p>
            <p className="text-ink-muted text-xs dark:text-stone-400">
              {state.next
                ? copy.next
                    .replace('{tier}', tierName(state.next.tier))
                    .replace('{amount}', formatUzs(state.next.remaining, locale))
                : copy.top}
            </p>
          </div>
        </div>

        <figure className="flex flex-col items-center gap-2">
          <div
            className="h-36 w-36 bg-white p-2 [&_svg]:h-full [&_svg]:w-full"
            role="img"
            aria-label={`${copy.number} ${formatCardNumber(state.cardNumber)}`}
            dangerouslySetInnerHTML={{ __html: qr }}
          />
          <figcaption className="text-center">
            <span className="text-ink dark:text-bone block font-mono text-base tracking-[0.18em] tabular-nums">
              {formatCardNumber(state.cardNumber)}
            </span>
            <span className="text-ink-muted text-xs dark:text-stone-400">{copy.showAtTill}</span>
          </figcaption>
        </figure>
      </div>

      {googleWallet && (
        <div className="space-y-2">
          {/* Google's own button, as its brand guidelines require: not redrawn. */}
          <a
            href={`/api/wallet/google/save?locale=${toLang(locale)}`}
            className="inline-block"
            aria-label={copy.googleWallet}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`/wallet/google/add-${toLang(locale)}.svg`}
              alt={copy.googleWallet}
              height={48}
              className="h-12 w-auto"
            />
          </a>
          {walletError && (
            <p className="text-xs text-red-700 dark:text-red-400">{copy.walletError}</p>
          )}
        </div>
      )}

      <LoyaltySettings
        copy={copy.settings}
        birthDate={birthDate ? birthDate.toISOString().slice(0, 10) : null}
        birthDateLabel={birthDate ? formatDay(birthDate, locale, true) : null}
        consent={consent}
      />

      <div className="space-y-2">
        <h3 className={sectionTitleCls}>{copy.history}</h3>
        {history.length === 0 ? (
          <p className="text-ink-muted text-sm dark:text-stone-400">{copy.noHistory}</p>
        ) : (
          <ul className="divide-border divide-y text-sm">
            {history.map((row) => (
              <li key={row.id} className="flex items-center justify-between gap-4 py-2">
                <span className="text-ink dark:text-bone">
                  {copy.kinds[row.kind] ?? row.kind}
                  <span className="text-ink-muted ml-2 text-xs dark:text-stone-400">
                    {formatDay(row.createdAt, locale)}
                  </span>
                </span>
                <span className="font-mono tabular-nums">
                  {row.amount > 0 ? '+' : '−'}
                  {formatUzs(Math.abs(row.amount), locale)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
