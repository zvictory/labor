// Shared payment subsystem types for Labor Parfum.
//
// All providers (Payme, Click, Uzum-later) verify auth/signature, do the
// so'm <-> tiyin amount check, and record every webhook hit in
// PaymentWebhookEvent (unique on provider+externalTxnId+eventType) BEFORE
// mutating order/payment state. These types are the shared vocabulary.

/// Supported payment provider identifiers. Stored on Payment.provider and
/// PaymentWebhookEvent.provider.
export type PaymentProvider = 'payme' | 'click' | 'uzum';

/// Localized message shape used by provider error catalogs (Payme returns these
/// verbatim in its JSON-RPC error object).
export interface LocalizedMessage {
  uz: string;
  ru: string;
  en: string;
}

/// Result of an idempotent webhook recording. When `duplicate` is true the
/// caller MUST return `priorResponse` instead of re-processing.
export interface IdempotencyResult {
  /// True when an event with the same (provider, externalTxnId, eventType)
  /// already existed — the side effect must not run again.
  duplicate: boolean;
  /// The stored JSON response from the first time this event was handled.
  /// Present only when `duplicate` is true.
  priorResponse: unknown;
}

/// Normalized outcome of provider auth/signature verification.
export interface VerificationResult {
  ok: boolean;
  /// Optional machine-readable reason when `ok` is false.
  reason?: string;
}

/// A typed wrapper for amount conversions. UZS is stored as integer minor units
/// (so'm; UZS has no sub-unit so 1 so'm === 1 minor unit). Payme/Click operate
/// in TIYIN where 1 so'm = 100 tiyin.
export const TIYIN_PER_SOM = 100;

/// Convert integer so'm (our stored money) to tiyin (provider money).
export function somToTiyin(som: number): number {
  return Math.round(som) * TIYIN_PER_SOM;
}

/// Convert tiyin (provider money) back to integer so'm.
export function tiyinToSom(tiyin: number): number {
  return Math.round(tiyin / TIYIN_PER_SOM);
}
