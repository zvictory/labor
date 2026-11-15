// Keeps members' Google Wallet cards in step with the loyalty ledger.
//
// The member asks for the card (the account page button): the class and their
// object are created on Google's side and a signed "Add to Google Wallet" link
// is returned. After that, every change to their bonus updates the card. The
// phone rings only for good news (bonus added, birthday, a higher tier) and
// only within the daily allowance (lib/wallet/quota.ts). Everything here is
// best-effort: a Google failure is logged on the pass and never undoes the
// ledger write that triggered it.

import { db } from '@/lib/db';
import { SITE_URL } from '@/lib/seo';
import { STORE_CONTACT } from '@/lib/store-contact';
import { getLoyaltyState } from '@/lib/loyalty/loyalty';
import { TIERS } from '@/lib/loyalty/rules';
import { signJwt } from '@/lib/wallet/google/jwt';
import { readGoogleWalletConfig, type GoogleWalletConfig } from '@/lib/wallet/google/config';
import {
  buildLoyaltyClass,
  buildLoyaltyObject,
  objectIdFor,
  objectPatch,
  SAVE_URL_BASE,
  saveLinkClaims,
} from '@/lib/wallet/google/pass';
import { ensureObject, patchObject, upsertClass } from '@/lib/wallet/google/client';
import { canNotify, type NotificationKind } from '@/lib/wallet/quota';

export const LOGO_PATH = '/wallet/labor-logo.png';

const classInput = (cfg: GoogleWalletConfig) => ({
  issuerId: cfg.issuerId,
  siteUrl: SITE_URL,
  logoUrl: `${SITE_URL}${LOGO_PATH}`,
  branches: STORE_CONTACT.branches.flatMap((b) =>
    b.latitude !== null && b.longitude !== null
      ? [{ latitude: b.latitude, longitude: b.longitude }]
      : [],
  ),
});

const memberCard = async (accountId: number) => {
  const [state, account] = await Promise.all([
    getLoyaltyState(accountId),
    db.loyaltyAccount.findUniqueOrThrow({
      where: { id: accountId },
      select: { cardNumber: true, user: { select: { name: true } } },
    }),
  ]);
  const soonest = state.expiringSoon[0];
  return {
    state,
    card: {
      cardNumber: account.cardNumber,
      name: account.user.name,
      tier: state.tier,
      available: state.available,
      expiringSoon: soonest
        ? {
            amount: state.expiringSoon.reduce((s, l) => s + l.amount, 0),
            expiresAt: soonest.expiresAt,
          }
        : null,
    },
  };
};

let classReady: string | null = null;

/**
 * The "Add to Google Wallet" link for a member: creates the class (once per
 * process) and the member's object, and records the pass. Null when Google
 * Wallet is not configured.
 */
export const googleSaveUrl = async (accountId: number): Promise<string | null> => {
  const cfg = readGoogleWalletConfig();
  if (!cfg) return null;
  if (classReady !== cfg.issuerId) {
    await upsertClass(cfg, buildLoyaltyClass(classInput(cfg)));
    classReady = cfg.issuerId;
  }
  const { state, card } = await memberCard(accountId);
  const object = buildLoyaltyObject({ issuerId: cfg.issuerId, siteUrl: SITE_URL, member: card });
  const remote = await ensureObject(cfg, object);
  await db.walletPass.upsert({
    where: { accountId_platform: { accountId, platform: 'google' } },
    create: {
      accountId,
      platform: 'google',
      objectId: object.id,
      hasUsers: remote.hasUsers ?? false,
      lastBalance: state.available,
      lastTier: state.tier,
      lastSyncedAt: new Date(),
    },
    update: { hasUsers: remote.hasUsers ?? false, lastSyncedAt: new Date(), lastError: null },
  });
  const jwt = signJwt(
    saveLinkClaims({
      clientEmail: cfg.clientEmail,
      issuerId: cfg.issuerId,
      cardNumber: card.cardNumber,
      origins: [SITE_URL],
      now: new Date(),
    }),
    cfg.privateKey,
  );
  return `${SAVE_URL_BASE}${jwt}`;
};

const tierRank = (tier: string | null) => TIERS.findIndex((t) => t.tier === tier);

/**
 * Bring a member's Google card up to date after a ledger change. `reason` says
 * what happened; the phone rings for a bonus added, a birthday gift or a rise
 * in tier, if the allowance has room.
 */
export const syncGooglePass = async (
  accountId: number,
  reason: 'earn' | 'birthday' | 'spend' | 'refund' | 'expire' | 'adjust',
): Promise<void> => {
  const cfg = readGoogleWalletConfig();
  if (!cfg) return;
  const pass = await db.walletPass.findUnique({
    where: { accountId_platform: { accountId, platform: 'google' } },
    select: {
      id: true,
      objectId: true,
      lastTier: true,
      lastBalance: true,
      notifications: {
        where: { createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } },
        select: { kind: true, createdAt: true },
      },
    },
  });
  if (!pass) return;
  try {
    const { state, card } = await memberCard(accountId);
    const object = buildLoyaltyObject({ issuerId: cfg.issuerId, siteUrl: SITE_URL, member: card });
    const tierUp = tierRank(state.tier) > tierRank(pass.lastTier);
    const kind: NotificationKind | null = tierUp
      ? 'tier'
      : reason === 'earn' || reason === 'birthday'
        ? reason
        : null;
    const notify = kind !== null && canNotify(pass.notifications, kind, new Date());
    const remote = await patchObject(cfg, pass.objectId, objectPatch(object), notify);
    await db.walletPass.update({
      where: { id: pass.id },
      data: {
        lastBalance: state.available,
        lastTier: state.tier,
        lastSyncedAt: new Date(),
        lastError: null,
        ...(remote.hasUsers !== undefined ? { hasUsers: remote.hasUsers } : {}),
        ...(notify && kind ? { notifications: { create: { kind } } } : {}),
      },
    });
  } catch (err) {
    console.error('[wallet/google] sync failed:', err);
    await db.walletPass
      .update({ where: { id: pass.id }, data: { lastError: String(err).slice(0, 500) } })
      .catch(() => undefined);
  }
};

/** Fire-and-forget wrapper for call sites that must not wait or fail. */
export const syncWalletPasses = (
  accountId: number,
  reason: Parameters<typeof syncGooglePass>[1],
): void => {
  void syncGooglePass(accountId, reason).catch(() => undefined);
};

export { objectIdFor };
