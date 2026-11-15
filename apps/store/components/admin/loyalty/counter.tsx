'use client';

// The branch till. Find the member (scan the QR with the camera where the
// browser can, type the card number, or a phone number; a USB scanner types the
// number and presses Enter), record the purchase, or sign up a new member with
// an SMS code. Russian labels, like the rest of the admin.

import { useEffect, useRef, useState, useTransition } from 'react';

import { MoneyInput } from '@/components/admin/money-input';
import {
  confirmSignup,
  findMember,
  recordPurchase,
  sendSignupCode,
  type CounterMember,
} from '@/lib/loyalty/counter-actions';
import { tierName } from '@/lib/loyalty/messages';
import { earnFor, formatCardNumber, maxSpend } from '@/lib/loyalty/rules';
import { formatUzs } from '@/lib/money';

const ERRORS: Record<string, string> = {
  not_found: 'Карта или номер не найдены',
  query_invalid: 'Введите номер карты (8 цифр) или телефон',
  bonus_too_much: 'Бонусами можно оплатить не больше 30% покупки и не больше баланса',
  purchase_too_large: 'Слишком большая сумма для кассы: обратитесь к администратору',
  purchase_invalid: 'Введите сумму покупки',
  phone_invalid: 'Номер: +998 XX XXX XX XX',
  rate_limited: 'Код уже отправлен, подождите минуту',
  code_invalid: 'Неверный или просроченный код',
  not_customer: 'Этот номер принадлежит сотруднику',
  input_invalid: 'Проверьте поля',
  unexpected: 'Ошибка. Попробуйте ещё раз',
};
const errorText = (code: string) => ERRORS[code] ?? code;

const BRANCH_KEY = 'labor-counter-branch';

// The browser's own barcode reader (Chrome on Android); absent elsewhere.
interface Detector {
  detect(source: CanvasImageSource): Promise<{ rawValue: string }[]>;
}
type DetectorCtor = new (opts: { formats: string[] }) => Detector;
const detectorCtor = (): DetectorCtor | null =>
  typeof window !== 'undefined' && 'BarcodeDetector' in window
    ? ((window as unknown as { BarcodeDetector: DetectorCtor }).BarcodeDetector ?? null)
    : null;

export function Counter({ branches }: { branches: { id: string; name: string }[] }) {
  const [query, setQuery] = useState('');
  const [member, setMember] = useState<CounterMember | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);
  const [mode, setMode] = useState<'find' | 'signup'>('find');
  const [pending, startTransition] = useTransition();
  const [branch, setBranch] = useState(branches[0]?.id ?? '');
  const [purchase, setPurchase] = useState<number | null>(null);
  const [spend, setSpend] = useState<number | null>(null);
  const [formKey, setFormKey] = useState(0);
  const [scanning, setScanning] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const queryRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(BRANCH_KEY);
      if (saved && branches.some((b) => b.id === saved)) setBranch(saved);
    } catch {
      // storage blocked: keep the first branch
    }
  }, [branches]);

  const lookup = (value: string) => {
    setError(null);
    setDone(null);
    startTransition(async () => {
      const r = await findMember(value);
      if (r.ok) {
        setMember(r.data);
        setPurchase(null);
        setSpend(null);
        setFormKey((k) => k + 1);
      } else {
        setMember(null);
        setError(errorText(r.error));
      }
    });
  };

  // Camera scanning, where the browser can read QR codes itself.
  useEffect(() => {
    if (!scanning) return;
    const Ctor = detectorCtor();
    if (!Ctor) return;
    const detector = new Ctor({ formats: ['qr_code'] });
    let stream: MediaStream | null = null;
    let stopped = false;
    (async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment' },
        });
        const video = videoRef.current;
        if (!video) return;
        video.srcObject = stream;
        await video.play();
        while (!stopped) {
          const codes = await detector.detect(video).catch(() => []);
          const value = codes[0]?.rawValue;
          if (value) {
            setScanning(false);
            setQuery(value);
            lookup(value);
            return;
          }
          await new Promise((r) => setTimeout(r, 250));
        }
      } catch {
        setScanning(false);
        setError('Камера недоступна: введите номер карты');
      }
    })();
    return () => {
      stopped = true;
      stream?.getTracks().forEach((t) => t.stop());
    };
    // lookup is stable enough for this effect's lifetime
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scanning]);

  const fieldCls =
    'h-12 w-full rounded-md border border-border bg-white px-3 text-base text-ink dark:bg-ink/40 dark:text-bone';
  const labelCls =
    'mb-1.5 block text-label font-semibold uppercase tracking-widest text-ink-muted dark:text-stone-400';
  const primaryCls =
    'bg-ink text-bone hover:bg-brass dark:bg-bone dark:text-ink inline-flex h-12 items-center justify-center px-6 text-xs font-semibold tracking-widest uppercase disabled:opacity-50';
  const secondaryCls =
    'border-border text-ink hover:border-foreground dark:text-bone inline-flex h-12 items-center justify-center border px-5 text-xs font-semibold tracking-widest uppercase disabled:opacity-50';

  const maxBonus = member && purchase ? maxSpend(purchase, member.available) : 0;
  const paid = purchase ? purchase - Math.min(spend ?? 0, maxBonus) : 0;
  const earnPreview = member && purchase ? earnFor(paid, member.tier) : 0;

  return (
    <div className="max-w-xl space-y-8">
      <div className="flex gap-2">
        <button
          type="button"
          className={mode === 'find' ? primaryCls : secondaryCls}
          onClick={() => setMode('find')}
        >
          Покупка
        </button>
        <button
          type="button"
          className={mode === 'signup' ? primaryCls : secondaryCls}
          onClick={() => {
            setMode('signup');
            setMember(null);
          }}
        >
          Новый клиент
        </button>
      </div>

      <div>
        <label htmlFor="ct-branch" className={labelCls}>
          Филиал
        </label>
        <select
          id="ct-branch"
          className={fieldCls}
          value={branch}
          onChange={(e) => {
            setBranch(e.target.value);
            try {
              window.localStorage.setItem(BRANCH_KEY, e.target.value);
            } catch {
              // fine
            }
          }}
        >
          {branches.map((b) => (
            <option key={b.id} value={b.id}>
              {b.name}
            </option>
          ))}
        </select>
      </div>

      {mode === 'signup' ? (
        <Signup
          fieldCls={fieldCls}
          labelCls={labelCls}
          primaryCls={primaryCls}
          onMember={(m) => {
            setMember(m);
            setMode('find');
            setQuery(m.cardNumber);
            setFormKey((k) => k + 1);
            setDone(`Карта открыта: ${formatCardNumber(m.cardNumber)}`);
          }}
        />
      ) : (
        <form
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            lookup(query);
          }}
        >
          <label htmlFor="ct-query" className={labelCls}>
            Карта или телефон
          </label>
          <div className="flex gap-2">
            <input
              id="ct-query"
              ref={queryRef}
              autoFocus
              inputMode="numeric"
              autoComplete="off"
              className={`${fieldCls} font-mono tracking-widest`}
              value={query}
              placeholder="4821 7730"
              onChange={(e) => setQuery(e.target.value)}
            />
            <button type="submit" disabled={pending || !query.trim()} className={primaryCls}>
              Найти
            </button>
          </div>
          {detectorCtor() && (
            <button type="button" className={secondaryCls} onClick={() => setScanning((s) => !s)}>
              {scanning ? 'Остановить камеру' : 'Сканировать камерой'}
            </button>
          )}
          {scanning && (
            <video
              ref={videoRef}
              className="aspect-square w-full max-w-xs bg-black"
              muted
              playsInline
            />
          )}
        </form>
      )}

      {error && (
        <p
          role="alert"
          className="rounded-md border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700"
        >
          {error}
        </p>
      )}
      {done && (
        <p
          role="status"
          className="rounded-md border border-emerald-300 bg-emerald-50 px-4 py-3 text-sm text-emerald-800"
        >
          {done}
        </p>
      )}

      {member && mode === 'find' && (
        <section className="border-border space-y-5 rounded-xl border p-5">
          <div className="flex flex-wrap items-baseline justify-between gap-3">
            <div>
              <p className="text-ink dark:text-bone text-lg font-medium">
                {member.name ?? 'Клиент'}
                {member.phoneTail ? ` · ···${member.phoneTail}` : ''}
              </p>
              <p className="text-ink-muted font-mono text-sm tracking-widest dark:text-stone-400">
                {formatCardNumber(member.cardNumber)} · {tierName(member.tier)} · {member.rate}%
              </p>
            </div>
            <p className="text-ink dark:text-bone font-mono text-2xl tabular-nums">
              {formatUzs(member.available, 'ru')}
            </p>
          </div>
          {!member.hasBirthDate && (
            <p className="text-ink-muted text-xs dark:text-stone-400">
              Дата рождения не указана: спросите клиента, её можно внести в кабинете на сайте.
            </p>
          )}

          <form
            key={formKey}
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              if (!purchase) {
                setError(errorText('purchase_invalid'));
                return;
              }
              const used = Math.min(spend ?? 0, maxBonus);
              setError(null);
              startTransition(async () => {
                const r = await recordPurchase({
                  accountId: member.accountId,
                  branch,
                  purchase,
                  spend: used,
                });
                if (r.ok) {
                  setDone(
                    `Готово. Оплачено бонусами: ${formatUzs(r.data.spent, 'ru')}. Начислено: ${formatUzs(r.data.earned, 'ru')}. На карте: ${formatUzs(r.data.balance, 'ru')}.`,
                  );
                  setMember(null);
                  setQuery('');
                  queryRef.current?.focus();
                } else {
                  setError(errorText(r.error));
                }
              });
            }}
          >
            <div>
              <label htmlFor="ct-purchase" className={labelCls}>
                Сумма покупки
              </label>
              <MoneyInput
                id="ct-purchase"
                className={fieldCls}
                value={purchase}
                onChange={setPurchase}
              />
            </div>
            <div>
              <label htmlFor="ct-spend" className={labelCls}>
                Оплатить бонусами (до {formatUzs(maxBonus, 'ru')})
              </label>
              <MoneyInput id="ct-spend" className={fieldCls} value={spend} onChange={setSpend} />
              {(spend ?? 0) > maxBonus && (
                <p className="mt-1 text-xs text-red-700">
                  Будет списано не больше {formatUzs(maxBonus, 'ru')}
                </p>
              )}
            </div>
            <p className="text-ink-muted text-sm dark:text-stone-400">
              К оплате деньгами: {formatUzs(paid, 'ru')} · будет начислено{' '}
              {formatUzs(earnPreview, 'ru')}
            </p>
            <button type="submit" disabled={pending} className={primaryCls}>
              Провести
            </button>
          </form>
        </section>
      )}
    </div>
  );
}

function Signup({
  fieldCls,
  labelCls,
  primaryCls,
  onMember,
}: {
  fieldCls: string;
  labelCls: string;
  primaryCls: string;
  onMember: (m: CounterMember) => void;
}) {
  const [phone, setPhone] = useState('+998 ');
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [birth, setBirth] = useState('');
  const [consent, setConsent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <div className="space-y-4">
      {!sentTo ? (
        <form
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            setError(null);
            startTransition(async () => {
              const r = await sendSignupCode(phone);
              if (r.ok) setSentTo(r.data.phone);
              else setError(errorText(r.error));
            });
          }}
        >
          <label htmlFor="su-phone" className={labelCls}>
            Телефон клиента
          </label>
          <input
            id="su-phone"
            inputMode="tel"
            className={fieldCls}
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />
          <button type="submit" disabled={pending} className={primaryCls}>
            Отправить SMS-код
          </button>
        </form>
      ) : (
        <form
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            setError(null);
            startTransition(async () => {
              const r = await confirmSignup({
                phone: sentTo,
                code,
                name: name || undefined,
                birthDate: birth || undefined,
                consent,
              });
              if (r.ok) onMember(r.data);
              else setError(errorText(r.error));
            });
          }}
        >
          <p className="text-ink-muted text-sm dark:text-stone-400">Код отправлен на {sentTo}.</p>
          <div>
            <label htmlFor="su-code" className={labelCls}>
              Код из SMS
            </label>
            <input
              id="su-code"
              inputMode="numeric"
              autoComplete="one-time-code"
              className={`${fieldCls} font-mono tracking-widest`}
              value={code}
              onChange={(e) => setCode(e.target.value)}
            />
          </div>
          <div>
            <label htmlFor="su-name" className={labelCls}>
              Имя (если нет в профиле)
            </label>
            <input
              id="su-name"
              className={fieldCls}
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div>
            <label htmlFor="su-birth" className={labelCls}>
              Дата рождения
            </label>
            <input
              id="su-birth"
              type="date"
              className={fieldCls}
              value={birth}
              onChange={(e) => setBirth(e.target.value)}
            />
          </div>
          <label className="text-ink dark:text-bone flex items-start gap-3 text-sm">
            <input
              type="checkbox"
              className="accent-brass mt-0.5 h-4 w-4"
              checked={consent}
              onChange={(e) => setConsent(e.target.checked)}
            />
            Клиент согласен получать акции и персональные предложения Labor
          </label>
          <button type="submit" disabled={pending || !code.trim()} className={primaryCls}>
            Открыть карту
          </button>
        </form>
      )}
      {error && (
        <p
          role="alert"
          className="rounded-md border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700"
        >
          {error}
        </p>
      )}
    </div>
  );
}
