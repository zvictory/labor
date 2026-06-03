// UTM attribution: parse from the URL, persist to localStorage with first- and
// last-touch semantics, read back at checkout time. Pure logic + localStorage so
// it is unit-testable (see utm.test.ts) and reusable from both the route-change
// listener (write) and createCheckout (read).

const STORAGE_KEY = 'labor-utm';

export const UTM_KEYS = [
  'utm_source',
  'utm_medium',
  'utm_campaign',
  'utm_term',
  'utm_content',
] as const;

export type UtmKey = (typeof UTM_KEYS)[number];
export type UtmParams = Partial<Record<UtmKey, string>>;

export interface StoredUtm {
  first: UtmParams; // first-touch — immutable once set
  last: UtmParams; // last-touch — overwritten on each tagged visit
}

/** Extract only the five utm_* keys with non-empty values. */
export const parseUtm = (params: URLSearchParams): UtmParams => {
  const out: UtmParams = {};
  for (const key of UTM_KEYS) {
    const value = params.get(key);
    if (value) out[key] = value;
  }
  return out;
};

/** Read the stored attribution record, or null if absent/corrupt. */
export const readUtm = (): StoredUtm | null => {
  if (typeof window === 'undefined') return null;
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as StoredUtm;
  } catch {
    return null;
  }
};

const writeUtm = (record: StoredUtm): void => {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(record));
};

/**
 * Capture UTM from the current URL into localStorage and return the resulting
 * record (or null if nothing is or was stored).
 *
 * TODO(you): implement the first-touch / last-touch merge. The four cases the
 * tests pin down:
 *   1. URL has NO utm params  -> do not write; return readUtm() (may be null).
 *   2. First tagged visit     -> store { first: parsed, last: parsed }.
 *   3. Later tagged visit      -> keep existing `first`, set `last` = parsed.
 *   4. Untagged navigation after a tagged one -> leave storage untouched.
 *
 * Helpers available: parseUtm(params), readUtm(), writeUtm(record).
 * Decision that matters: `first` must NEVER be overwritten once set — it is the
 * campaign that gets discovery credit for the lifetime of this browser.
 */
export const persistUtm = (params: URLSearchParams): StoredUtm | null => {
  const parsed = parseUtm(params);
  // Untagged load (cases 1 & 4): never write — that would clobber attribution
  // on every internal click. Return whatever is already stored (may be null).
  if (Object.keys(parsed).length === 0) return readUtm();

  // Tagged visit: last-touch is always the new click; first-touch is sticky —
  // keep the existing one if a record exists, else this visit IS the first.
  const record: StoredUtm = { first: readUtm()?.first ?? parsed, last: parsed };
  writeUtm(record);
  return record;
};
