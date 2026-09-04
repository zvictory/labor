// Phone OTP issuance + verification for customer sign-in.
//
// Flow:
//   requestOtp(phone) → generate a 6-digit code, bcrypt-hash it, persist an
//   OtpCode row (~5 min expiry), and deliver the plaintext via SMS. Recent rows
//   for the same phone are rate-limited so the endpoint can't be used to spam.
//
//   verifyOtp(phone, code) → find the newest unconsumed, unexpired row for the
//   phone, bcrypt-compare the code, enforce a max-attempts ceiling, consume the
//   row on success, then find-or-create the User by phone and return its id.
//
// The plaintext code is NEVER stored — only the bcrypt hash. Phone numbers are
// normalized to digits-only (with a leading +) so the same human input always
// resolves to one User.phone / OtpCode.phone key.

import bcrypt from 'bcryptjs';

import { db } from '@/lib/db';
import { sendSMS } from '@/lib/sms';

const OTP_TTL_MS = 5 * 60 * 1000; // 5 minutes
const OTP_LENGTH = 6;
const MAX_ATTEMPTS = 5; // per code row, before it is rejected outright
const BCRYPT_ROUNDS = 10;

// Rate-limit: at most N issuances per phone inside the window.
const RATE_WINDOW_MS = 60 * 1000; // 1 minute
const RATE_MAX_IN_WINDOW = 3;

export class OtpError extends Error {
  constructor(
    public readonly code: string,
    message?: string,
  ) {
    super(message ?? code);
    this.name = 'OtpError';
  }
}

/**
 * Normalize a phone number to a canonical `+<digits>` form so the same human
 * input always maps to one OtpCode/User key. Keeps a single leading `+`.
 */
export const normalizePhone = (raw: string): string => {
  const digits = raw.replace(/\D/g, '');
  return digits.length > 0 ? `+${digits}` : '';
};

const generateCode = (): string => {
  // 6 digits, zero-padded. crypto isn't strictly required here, but avoid the
  // bias/predictability of Math.random for an auth credential.
  const max = 10 ** OTP_LENGTH;
  const n = Math.floor(Math.random() * max);
  return n.toString().padStart(OTP_LENGTH, '0');
};

const otpMessage = (code: string): string =>
  `Labor Parfum: kod / код ${code}. ${OTP_LENGTH > 0 ? '' : ''}5 min.`;

/**
 * Issue a one-time code for `phone`: rate-limit, hash, store, and SMS-deliver.
 * @throws OtpError('invalid_phone') on an unusable number.
 * @throws OtpError('rate_limited') when too many codes were requested recently.
 */
export async function requestOtp(phone: string): Promise<void> {
  const normalized = normalizePhone(phone);
  if (normalized.length < 6) {
    throw new OtpError('invalid_phone', 'A valid phone number is required');
  }

  const since = new Date(Date.now() - RATE_WINDOW_MS);
  const recent = await db.otpCode.count({
    where: { phone: normalized, createdAt: { gte: since } },
  });
  if (recent >= RATE_MAX_IN_WINDOW) {
    throw new OtpError('rate_limited', 'Too many codes requested; try again shortly');
  }

  const code = generateCode();
  const codeHash = await bcrypt.hash(code, BCRYPT_ROUNDS);

  await db.otpCode.create({
    data: {
      phone: normalized,
      codeHash,
      expiresAt: new Date(Date.now() + OTP_TTL_MS),
    },
  });

  await sendSMS(normalized, otpMessage(code));
}

/**
 * Verify `code` against the newest live OtpCode for `phone`. On success the row
 * is consumed and the User (find-or-create by phone) id is returned. Returns
 * null on any failure (no such code, expired, mismatch, attempts exhausted) —
 * callers should not distinguish these to avoid leaking which step failed.
 */
export async function verifyOtp(phone: string, code: string): Promise<{ userId: number } | null> {
  const normalized = normalizePhone(phone);
  if (normalized.length < 6) return null;

  const row = await db.otpCode.findFirst({
    where: {
      phone: normalized,
      consumedAt: null,
      expiresAt: { gt: new Date() },
    },
    orderBy: { createdAt: 'desc' },
  });
  if (!row) return null;

  if (row.attempts >= MAX_ATTEMPTS) {
    // Burn the row so it can't be retried further.
    await db.otpCode.update({
      where: { id: row.id },
      data: { consumedAt: new Date() },
    });
    return null;
  }

  const ok = await bcrypt.compare(code, row.codeHash);
  if (!ok) {
    await db.otpCode.update({
      where: { id: row.id },
      data: { attempts: { increment: 1 } },
    });
    return null;
  }

  // Success — consume the row (idempotent against double-submit) and resolve
  // the user.
  await db.otpCode.update({
    where: { id: row.id },
    data: { consumedAt: new Date() },
  });

  const user = await db.user.upsert({
    where: { phone: normalized },
    update: {},
    create: { phone: normalized, role: 'customer' },
    select: { id: true },
  });

  return { userId: user.id };
}
