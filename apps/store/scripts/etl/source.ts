// Read-only connection to the OLD Spree Postgres database.
// The ETL never writes here. All target writes go through Prisma (`@/lib/db`).
//
// Env: SPREE_DATABASE_URL — connection string to the legacy Spree DB.
//
// Mobility i18n shape: a base table (e.g. `labor_notes`) carries a default-locale
// value in a plain column, and a side table (`labor_note_translations`) carries
// per-locale rows. The collapse helper below turns those rows into a
// `{ ru, uz, en }` JSON object with the base column as the `ru` fallback.

import { Pool, type QueryResultRow } from 'pg';

const SPREE_DATABASE_URL = process.env.SPREE_DATABASE_URL;

if (!SPREE_DATABASE_URL) {
  throw new Error(
    'ETL source: SPREE_DATABASE_URL is required (read-only legacy Spree DB connection string).',
  );
}

/**
 * Shared read-only pool against the legacy Spree DB.
 * Kept module-level so every loader reuses the same connections;
 * `closePool()` is called once by the orchestrator in a finally block.
 */
export const pool = new Pool({
  connectionString: SPREE_DATABASE_URL,
  // The ETL is the only consumer; a small pool is plenty.
  max: 4,
});

/** Run a parameterised query and return the typed rows. */
export async function query<T extends QueryResultRow = QueryResultRow>(
  sql: string,
  params: ReadonlyArray<unknown> = [],
): Promise<T[]> {
  const result = await pool.query<T>(sql, params as unknown[]);
  return result.rows;
}

/** Count rows in a source table (optionally with a WHERE clause). */
export async function count(
  table: string,
  where?: string,
  params: ReadonlyArray<unknown> = [],
): Promise<number> {
  const sql = where
    ? `SELECT COUNT(*)::int AS n FROM ${table} WHERE ${where}`
    : `SELECT COUNT(*)::int AS n FROM ${table}`;
  const rows = await query<{ n: number }>(sql, params);
  return rows[0]?.n ?? 0;
}

export async function closePool(): Promise<void> {
  await pool.end();
}

// ───────────────────────── i18n collapse helpers ─────────────────────────

export const LOCALES = ['ru', 'uz', 'uzc', 'en'] as const;
export type Locale = (typeof LOCALES)[number];

/** Per-locale JSON shape stored on the target row. `ru` is required by the schema. */
export type LocaleJson = { ru: string; uz?: string; uzc?: string; en?: string };

/** A translation side-table row: one (locale -> value) pair for one parent. */
export interface TranslationRow {
  locale: string;
  value: string | null;
}

/**
 * Collapse Mobility translation rows + a base-column value into `{ ru, uz, en }`.
 *
 * - `base` is the default-locale value from the parent table (Mobility's default
 *   locale is ru in this project). It seeds `ru` and is the fallback for any
 *   locale whose translation row is missing/blank.
 * - Translation rows override per locale when non-blank.
 * - Returns `null` only when there is genuinely no text anywhere (so optional
 *   JSON columns like `description` stay null instead of `{ ru: "" }`).
 */
export function collapseLocaleJson(
  base: string | null | undefined,
  rows: ReadonlyArray<TranslationRow>,
): LocaleJson | null {
  const byLocale = new Map<string, string>();
  for (const row of rows) {
    const v = (row.value ?? '').trim();
    if (v) byLocale.set(row.locale, v);
  }

  const baseValue = (base ?? '').trim();
  const ru = byLocale.get('ru') ?? baseValue;

  // No text at all → null (let the column be NULL).
  if (!ru && byLocale.size === 0) return null;

  const result: LocaleJson = { ru: ru || baseValue };
  if (!result.ru) {
    // ru is required by the schema; fall back to any available locale.
    result.ru = byLocale.get('uz') ?? byLocale.get('en') ?? '';
  }

  const uz = byLocale.get('uz');
  const uzc = byLocale.get('uzc');
  const en = byLocale.get('en');
  if (uz) result.uz = uz;
  if (uzc) result.uzc = uzc;
  if (en) result.en = en;

  return result;
}

/**
 * Same as collapseLocaleJson but guarantees a non-null result with a non-empty
 * `ru`, for required JSON columns (e.g. Product.name, Note.name, Campaign.title).
 * Falls back to `fallback` (e.g. the slug) when no text exists at all.
 */
export function collapseRequiredLocaleJson(
  base: string | null | undefined,
  rows: ReadonlyArray<TranslationRow>,
  fallback: string,
): LocaleJson {
  const collapsed = collapseLocaleJson(base, rows);
  if (collapsed && collapsed.ru) return collapsed;
  if (collapsed) return { ...collapsed, ru: fallback };
  return { ru: fallback };
}

/**
 * Fetch translation rows for a set of parent ids from a `*_translations` table,
 * grouped by parent id. `column` is the translated column (e.g. "name", "description").
 *
 * Returns Map<parentId, TranslationRow[]>.
 */
export async function fetchTranslations(
  table: string,
  fkColumn: string,
  column: string,
  parentIds: ReadonlyArray<number>,
): Promise<Map<number, TranslationRow[]>> {
  const map = new Map<number, TranslationRow[]>();
  if (parentIds.length === 0) return map;

  const rows = await query<{ parent_id: string; locale: string; value: string | null }>(
    `SELECT ${fkColumn} AS parent_id, locale, ${column} AS value
       FROM ${table}
      WHERE ${fkColumn} = ANY($1::bigint[])`,
    [parentIds],
  );

  for (const r of rows) {
    const id = Number(r.parent_id);
    const list = map.get(id) ?? [];
    list.push({ locale: r.locale, value: r.value });
    map.set(id, list);
  }
  return map;
}
