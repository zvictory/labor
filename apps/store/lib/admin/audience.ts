// Customer lists for Meta Ads Manager → Audiences → Custom audience → Customer
// list: the shop's buyers (with their spend, for a value-based lookalike) and
// the people who asked for advice but have not bought. Meta hashes the file in
// the browser before upload. It is personal data: admin role only, and the
// download is never cached.
//
// Columns follow Meta's customer-list template: phone (country code, digits
// only), email, fn, country, value.

import { db } from '@/lib/db';
import { normalizeUzPhone } from '@/lib/phone';

export type AudienceList = 'buyers' | 'leads';

export interface AudienceRow {
  /** 998XXXXXXXXX */
  phone: string;
  email: string | null;
  firstName: string | null;
  /** So'm spent on paid or delivered orders; buyers only. */
  value: number | null;
}

/** 998XXXXXXXXX, or null for anything that is not an Uzbek number. */
const audiencePhone = (raw: string | null | undefined): string | null => {
  const phone = raw ? normalizeUzPhone(raw) : null;
  return phone ? phone.slice(1) : null;
};

/** A real address; the synthesized tg_…@labor.local ones are left out. */
const realEmail = (email: string | null | undefined): string | null =>
  email && !email.endsWith('@labor.local') ? email : null;

const firstName = (name: string | null | undefined): string | null =>
  name?.trim().split(/\s+/)[0] || null;

interface OrderForAudience {
  phone: string | null;
  total: number;
  status: string;
  paymentStatus: string;
  user: { email: string | null; name: string | null; phone: string | null } | null;
}

/** One row per buyer's phone; value counts only money actually taken. Pure. */
export const buyersFromOrders = (orders: readonly OrderForAudience[]): AudienceRow[] => {
  const byPhone = new Map<string, AudienceRow>();
  for (const o of orders) {
    if (o.status === 'canceled') continue;
    const phone = audiencePhone(o.phone) ?? audiencePhone(o.user?.phone);
    if (!phone) continue;
    const row = byPhone.get(phone) ?? { phone, email: null, firstName: null, value: 0 };
    row.email ??= realEmail(o.user?.email);
    row.firstName ??= firstName(o.user?.name);
    if (o.paymentStatus === 'paid' || o.status === 'delivered')
      row.value = (row.value ?? 0) + o.total;
    byPhone.set(phone, row);
  }
  return [...byPhone.values()].sort((a, b) => (b.value ?? 0) - (a.value ?? 0));
};

/** People who left a request, minus the ones already on the buyers list. Pure. */
export const leadsFromRequests = (
  requests: readonly { phone: string; name: string | null }[],
  buyerPhones: ReadonlySet<string>,
): AudienceRow[] => {
  const byPhone = new Map<string, AudienceRow>();
  for (const r of requests) {
    const phone = audiencePhone(r.phone);
    if (!phone || buyerPhones.has(phone) || byPhone.has(phone)) continue;
    byPhone.set(phone, { phone, email: null, firstName: firstName(r.name), value: null });
  }
  return [...byPhone.values()];
};

const cell = (value: string | number | null): string => {
  const text = value === null ? '' : String(value);
  // Quote every cell; a leading = + - @ is neutralised so a spreadsheet never
  // runs a name as a formula. Phones carry no + here, so they pass unchanged.
  const safe = /^[=+\-@]/.test(text) ? `'${text}` : text;
  return `"${safe.replace(/"/g, '""')}"`;
};

export const buildAudienceCsv = (rows: readonly AudienceRow[], list: AudienceList): string => {
  const header =
    list === 'buyers' ? ['phone', 'email', 'fn', 'country', 'value'] : ['phone', 'fn', 'country'];
  const lines = rows.map((r) =>
    (list === 'buyers'
      ? [r.phone, r.email, r.firstName, 'UZ', r.value ?? 0]
      : [r.phone, r.firstName, 'UZ']
    )
      .map(cell)
      .join(','),
  );
  return `${[header.join(','), ...lines].join('\r\n')}\r\n`;
};

const loadOrders = () =>
  db.order.findMany({
    where: { status: { not: 'canceled' } },
    select: {
      phone: true,
      total: true,
      status: true,
      paymentStatus: true,
      user: { select: { email: true, name: true, phone: true } },
    },
  });

export const loadAudience = async (list: AudienceList): Promise<AudienceRow[]> => {
  const buyers = buyersFromOrders(await loadOrders());
  if (list === 'buyers') return buyers;
  const requests = await db.consultRequest.findMany({ select: { phone: true, name: true } });
  return leadsFromRequests(requests, new Set(buyers.map((b) => b.phone)));
};
