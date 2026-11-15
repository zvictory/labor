'use client';

// Compose a Google Wallet message to a segment: header and body within Google's
// lengths, an optional link on laborparfum.com, a segment with a live count of
// who it will reach, then send (admin only).

import { useEffect, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';

import { previewWalletSegment, sendWalletCampaign } from '@/lib/wallet/google/admin-actions';
import type { CampaignPreview } from '@/lib/wallet/google/messages';
import { MESSAGE_BODY_MAX, MESSAGE_HEADER_MAX } from '@/lib/wallet/google/pass';

const SEGMENT_LABEL: Record<string, string> = {
  all: 'Все с картой и согласием',
  silver: 'Silver и Gold',
  gold: 'Только Gold',
  lapsed: 'Не покупали 60 дней',
};

const ERRORS: Record<string, string> = {
  admin_only: 'Отправлять может только администратор',
  input_invalid: 'Проверьте заголовок и текст',
  link_invalid: 'Ссылка должна вести на laborparfum.com',
  off: 'Google Wallet не настроен на сервере',
  unexpected: 'Ошибка при отправке',
};

const fieldCls =
  'w-full rounded-md border border-border bg-white px-3 text-sm text-ink dark:bg-ink/40 dark:text-bone';
const labelCls =
  'mb-1.5 flex justify-between text-label font-semibold uppercase tracking-widest text-ink-muted dark:text-stone-400';

export function CampaignForm({ canSend }: { canSend: boolean }) {
  const [header, setHeader] = useState('');
  const [body, setBody] = useState('');
  const [link, setLink] = useState('');
  const [segment, setSegment] = useState('all');
  const [preview, setPreview] = useState<CampaignPreview | null>(null);
  const [status, setStatus] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  useEffect(() => {
    let live = true;
    previewWalletSegment(segment).then((p) => live && setPreview(p));
    return () => {
      live = false;
    };
  }, [segment]);

  return (
    <form
      className="max-w-xl space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        if (!window.confirm(`Отправить ${preview?.withinAllowance ?? 0} клиентам?`)) return;
        startTransition(async () => {
          const r = await sendWalletCampaign({
            header,
            body,
            link: link || undefined,
            segment: segment as 'all',
          });
          if (r.ok) {
            setStatus({
              ok: true,
              text: `Отправлено: ${r.data.sent}. Пропущено по лимиту: ${r.data.skipped}. Ошибок: ${r.data.failed}.`,
            });
            setHeader('');
            setBody('');
            setLink('');
            router.refresh();
          } else {
            setStatus({ ok: false, text: ERRORS[r.error] ?? r.error });
          }
        });
      }}
    >
      <div>
        <label htmlFor="wc-header" className={labelCls}>
          <span>Заголовок</span>
          <span className="font-mono">
            {header.length}/{MESSAGE_HEADER_MAX}
          </span>
        </label>
        <input
          id="wc-header"
          maxLength={MESSAGE_HEADER_MAX}
          className={`${fieldCls} h-10`}
          value={header}
          onChange={(e) => setHeader(e.target.value)}
          placeholder="Новинка: Risvelium"
        />
      </div>
      <div>
        <label htmlFor="wc-body" className={labelCls}>
          <span>Текст</span>
          <span className="font-mono">
            {body.length}/{MESSAGE_BODY_MAX}
          </span>
        </label>
        <textarea
          id="wc-body"
          rows={2}
          maxLength={MESSAGE_BODY_MAX}
          className={`${fieldCls} py-2`}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Пробник 2 мл уже в магазине и на сайте"
        />
      </div>
      <div>
        <label htmlFor="wc-link" className={labelCls}>
          <span>Ссылка (необязательно)</span>
        </label>
        <input
          id="wc-link"
          className={`${fieldCls} h-10`}
          value={link}
          onChange={(e) => setLink(e.target.value)}
          placeholder="/uz/product/risvelium"
        />
      </div>
      <div>
        <label htmlFor="wc-segment" className={labelCls}>
          <span>Кому</span>
        </label>
        <select
          id="wc-segment"
          className={`${fieldCls} h-10`}
          value={segment}
          onChange={(e) => setSegment(e.target.value)}
        >
          {Object.entries(SEGMENT_LABEL).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
        {preview && (
          <p className="text-ink-muted mt-1.5 text-xs dark:text-stone-400">
            Карт в сегменте: {preview.eligible} (сохранены в телефоне, по последним данным:{' '}
            {preview.saved}). Получат сейчас: {preview.withinAllowance}; остальным уже писали на
            этой неделе или сегодня.
          </p>
        )}
      </div>
      <button
        type="submit"
        disabled={!canSend || pending || header.trim().length < 2 || body.trim().length < 2}
        className="bg-ink text-bone hover:bg-brass dark:bg-bone dark:text-ink inline-flex h-11 items-center justify-center px-6 text-xs font-semibold tracking-widest uppercase disabled:opacity-50"
      >
        Отправить в Google Wallet
      </button>
      {!canSend && (
        <p className="text-ink-muted text-xs dark:text-stone-400">
          Отправлять может только администратор.
        </p>
      )}
      {status && (
        <p
          role="status"
          className={status.ok ? 'text-sm text-emerald-700' : 'text-sm text-red-700'}
        >
          {status.text}
        </p>
      )}
    </form>
  );
}
