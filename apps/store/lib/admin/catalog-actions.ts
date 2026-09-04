'use server';

// Admin catalog mutations — the write surface behind every catalog form. Every
// action calls requireStaff() FIRST (redirects non-staff via the guard), validates
// its input with zod (never trust the client), performs the write, then
// revalidatePath() so the admin RSC pages re-fetch.
//
// Per-locale text fields (name/description/etc.) are stored as { ru, uz, en } JSON
// with ru required and uz/en omitted when blank. Money is integer UZS minor units.
//
// Taxonomy deletes are guarded: a brand/note/accord/perfumer still referenced by a
// product is refused (returns a typed error) rather than cascading.

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import type { Prisma } from '@prisma/client';

import { db } from '@/lib/db';
import { requireStaff } from '@/lib/admin/guard';
import { putObject, removeObject, PUBLIC_BASE_URL } from '@/lib/storage';

// ── shared result type ──────────────────────────────────────────────────────────

export type ActionResult<T = undefined> =
  | ({ ok: true } & (T extends undefined ? { id?: number } : { data: T }))
  | { ok: false; error: string };

const ok = <T = undefined>(data?: T): ActionResult<T> =>
  ({ ok: true, ...(data === undefined ? {} : { data }) }) as ActionResult<T>;
const fail = (error: string): ActionResult<never> => ({ ok: false, error });

// ── shared zod pieces ───────────────────────────────────────────────────────────

const slugSchema = z
  .string()
  .trim()
  .min(1)
  .max(140)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'slug must be kebab-case (a-z, 0-9, dashes)');

/** Per-locale text: ru required & non-empty; uz/en optional, dropped when blank. */
const localeTextSchema = z
  .object({
    ru: z.string().trim().min(1, 'ru is required'),
    uz: z.string().trim().optional(),
    en: z.string().trim().optional(),
  })
  .transform((v) => ({
    ru: v.ru,
    ...(v.uz ? { uz: v.uz } : {}),
    ...(v.en ? { en: v.en } : {}),
  }));

/** Optional per-locale text (e.g. description): everything optional. */
const localeTextOptionalSchema = z
  .object({
    ru: z.string().trim().optional(),
    uz: z.string().trim().optional(),
    en: z.string().trim().optional(),
  })
  .transform((v) => {
    const out: Record<string, string> = {};
    if (v.ru) out.ru = v.ru;
    if (v.uz) out.uz = v.uz;
    if (v.en) out.en = v.en;
    return out;
  });

const ADMIN_BASE = '/admin/catalog';

/** Revalidate the locale-agnostic admin path; Next matches all locale prefixes via 'page'. */
const revalidateAdmin = (path: string): void => {
  revalidatePath(`/[locale]${path}`, 'page');
};

const firstZodError = (err: z.ZodError): string => err.issues[0]?.message ?? 'invalid input';

// ── Product ─────────────────────────────────────────────────────────────────────

const upsertProductSchema = z.object({
  id: z.number().int().positive().optional(),
  slug: slugSchema,
  name: localeTextSchema,
  description: localeTextOptionalSchema,
  status: z.enum(['active', 'draft', 'archived']),
  price: z.number().int().min(0),
  gender: z.enum(['men', 'women', 'unisex']),
  concentration: z.string().trim().max(60).optional(),
  brandId: z.number().int().positive().nullable().optional(),
});

export type UpsertProductInput = z.input<typeof upsertProductSchema>;

/**
 * Create or update a product plus its 1:1 FragranceDetail (brand/gender/
 * concentration). On create, the FragranceDetail is created alongside; on update
 * it is upserted so legacy products lacking one get backfilled.
 */
export async function upsertProduct(input: UpsertProductInput): Promise<ActionResult> {
  await requireStaff();

  const parsed = upsertProductSchema.safeParse(input);
  if (!parsed.success) return fail(firstZodError(parsed.error));
  const v = parsed.data;

  const fragranceData = {
    gender: v.gender,
    concentration: v.concentration && v.concentration.length > 0 ? v.concentration : null,
    brandId: v.brandId ?? null,
  };

  try {
    let productId: number;

    if (v.id) {
      const updated = await db.product.update({
        where: { id: v.id },
        data: {
          slug: v.slug,
          name: JSON.stringify(v.name),
          description: v.description ? JSON.stringify(v.description) : undefined,
          status: v.status,
          price: v.price,
          fragrance: {
            upsert: { create: fragranceData, update: fragranceData },
          },
        },
        select: { id: true },
      });
      productId = updated.id;
    } else {
      const created = await db.product.create({
        data: {
          slug: v.slug,
          name: JSON.stringify(v.name),
          description: v.description ? JSON.stringify(v.description) : undefined,
          status: v.status,
          price: v.price,
          fragrance: { create: fragranceData },
        },
        select: { id: true },
      });
      productId = created.id;
    }

    revalidateAdmin(ADMIN_BASE);
    revalidateAdmin(`${ADMIN_BASE}/${productId}`);
    return { ok: true, id: productId };
  } catch (err) {
    return prismaFail(err, 'slug already in use');
  }
}

// ── Product notes (pyramid) ──────────────────────────────────────────────────────

const setProductNotesSchema = z.object({
  productId: z.number().int().positive(),
  notes: z
    .array(
      z.object({
        noteId: z.number().int().positive(),
        pyramidLayer: z.enum(['top', 'middle', 'base']),
        position: z.number().int().min(0),
      }),
    )
    .max(100),
});

export type SetProductNotesInput = z.input<typeof setProductNotesSchema>;

/** Replace the full set of a product's notes (delete-all + recreate, in a txn). */
export async function setProductNotes(input: SetProductNotesInput): Promise<ActionResult> {
  await requireStaff();

  const parsed = setProductNotesSchema.safeParse(input);
  if (!parsed.success) return fail(firstZodError(parsed.error));
  const { productId, notes } = parsed.data;

  // (productId, noteId, pyramidLayer) is unique — dedupe defensively.
  const seen = new Set<string>();
  const rows = notes.filter((n) => {
    const key = `${n.noteId}:${n.pyramidLayer}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  try {
    await db.$transaction([
      db.productNote.deleteMany({ where: { productId } }),
      db.productNote.createMany({
        data: rows.map((n) => ({
          productId,
          noteId: n.noteId,
          pyramidLayer: n.pyramidLayer,
          position: n.position,
        })),
      }),
    ]);
    revalidateAdmin(`${ADMIN_BASE}/${productId}`);
    return ok();
  } catch (err) {
    return prismaFail(err);
  }
}

// ── Product accords ──────────────────────────────────────────────────────────────

const setProductAccordsSchema = z.object({
  productId: z.number().int().positive(),
  accords: z
    .array(
      z.object({
        accordId: z.number().int().positive(),
        weight: z.number().int().min(0).max(100),
      }),
    )
    .max(50),
});

export type SetProductAccordsInput = z.input<typeof setProductAccordsSchema>;

/** Replace the full set of a product's accords (delete-all + recreate). */
export async function setProductAccords(input: SetProductAccordsInput): Promise<ActionResult> {
  await requireStaff();

  const parsed = setProductAccordsSchema.safeParse(input);
  if (!parsed.success) return fail(firstZodError(parsed.error));
  const { productId, accords } = parsed.data;

  // (productId, accordId) is unique — keep first occurrence.
  const seen = new Set<number>();
  const rows = accords.filter((a) => {
    if (seen.has(a.accordId)) return false;
    seen.add(a.accordId);
    return true;
  });

  try {
    await db.$transaction([
      db.productAccord.deleteMany({ where: { productId } }),
      db.productAccord.createMany({
        data: rows.map((a) => ({ productId, accordId: a.accordId, weight: a.weight })),
      }),
    ]);
    revalidateAdmin(`${ADMIN_BASE}/${productId}`);
    return ok();
  } catch (err) {
    return prismaFail(err);
  }
}

// ── Product perfumers ────────────────────────────────────────────────────────────

const setProductPerfumersSchema = z.object({
  productId: z.number().int().positive(),
  perfumerIds: z.array(z.number().int().positive()).max(50),
});

export type SetProductPerfumersInput = z.input<typeof setProductPerfumersSchema>;

/** Replace the full set of a product's credited perfumers. */
export async function setProductPerfumers(input: SetProductPerfumersInput): Promise<ActionResult> {
  await requireStaff();

  const parsed = setProductPerfumersSchema.safeParse(input);
  if (!parsed.success) return fail(firstZodError(parsed.error));
  const { productId, perfumerIds } = parsed.data;

  const ids = Array.from(new Set(perfumerIds));

  try {
    await db.$transaction([
      db.productPerfumer.deleteMany({ where: { productId } }),
      db.productPerfumer.createMany({
        data: ids.map((perfumerId) => ({ productId, perfumerId })),
      }),
    ]);
    revalidateAdmin(`${ADMIN_BASE}/${productId}`);
    return ok();
  } catch (err) {
    return prismaFail(err);
  }
}

// ── Product images ───────────────────────────────────────────────────────────────

const MAX_IMAGE_BYTES = 8 * 1024 * 1024; // 8 MB
const ALLOWED_IMAGE_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/avif',
  'image/gif',
]);

const EXT_BY_TYPE: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/avif': 'avif',
  'image/gif': 'gif',
};

const sanitizeName = (name: string): string =>
  name
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80) || 'image';

/**
 * Upload one image file for a product. Reads the File from FormData (field `file`),
 * buffers it, stores it under `products/{productId}/{ts}-{safeName}`, then persists
 * a ProductImage appended after the current max position.
 */
export async function addProductImage(
  productId: number,
  formData: FormData,
): Promise<ActionResult<{ id: number; url: string }>> {
  await requireStaff();

  if (!Number.isInteger(productId) || productId <= 0) return fail('invalid product');

  const file = formData.get('file');
  if (!(file instanceof File) || file.size === 0) return fail('no file provided');
  if (file.size > MAX_IMAGE_BYTES) return fail('file too large (max 8 MB)');

  const contentType = file.type || 'application/octet-stream';
  if (!ALLOWED_IMAGE_TYPES.has(contentType)) return fail('unsupported image type');

  // Confirm the product exists before spending an upload.
  const product = await db.product.findUnique({
    where: { id: productId },
    select: { id: true },
  });
  if (!product) return fail('product not found');

  const altRaw = formData.get('alt');
  const alt = typeof altRaw === 'string' && altRaw.trim().length > 0 ? altRaw.trim() : null;

  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    const ext = EXT_BY_TYPE[contentType] ?? 'bin';
    const baseName = sanitizeName(file.name.replace(/\.[^.]+$/, ''));
    const key = `products/${productId}/${Date.now()}-${baseName}.${ext}`;
    const url = await putObject(key, buffer, contentType);

    const max = await db.productImage.aggregate({
      where: { productId },
      _max: { position: true },
    });
    const position = (max._max.position ?? -1) + 1;

    const image = await db.productImage.create({
      data: { productId, url, alt, position },
      select: { id: true, url: true },
    });

    revalidateAdmin(`${ADMIN_BASE}/${productId}`);
    return ok({ id: image.id, url: image.url });
  } catch (err) {
    console.error('[catalog:addProductImage]', err);
    return fail('upload failed');
  }
}

/** Delete a ProductImage row and best-effort remove the backing object. */
export async function removeProductImage(imageId: number): Promise<ActionResult> {
  await requireStaff();

  if (!Number.isInteger(imageId) || imageId <= 0) return fail('invalid image');

  const image = await db.productImage.findUnique({
    where: { id: imageId },
    select: { id: true, url: true, productId: true },
  });
  if (!image) return fail('image not found');

  try {
    await db.productImage.delete({ where: { id: imageId } });

    // Best-effort object cleanup: derive the key from the public base URL.
    if (image.url.startsWith(PUBLIC_BASE_URL)) {
      const key = image.url.slice(PUBLIC_BASE_URL.length).replace(/^\/+/, '');
      await removeObject(key).catch((e: unknown) =>
        console.warn('[catalog:removeProductImage] object cleanup skipped', e),
      );
    }

    revalidateAdmin(`${ADMIN_BASE}/${image.productId}`);
    return ok();
  } catch (err) {
    return prismaFail(err);
  }
}

const reorderImagesSchema = z.object({
  productId: z.number().int().positive(),
  /** Image ids in their desired display order. */
  orderedImageIds: z.array(z.number().int().positive()).max(100),
});

export type ReorderImagesInput = z.input<typeof reorderImagesSchema>;

/** Persist a new image ordering by rewriting each image's position index. */
export async function reorderImages(input: ReorderImagesInput): Promise<ActionResult> {
  await requireStaff();

  const parsed = reorderImagesSchema.safeParse(input);
  if (!parsed.success) return fail(firstZodError(parsed.error));
  const { productId, orderedImageIds } = parsed.data;

  try {
    await db.$transaction(
      orderedImageIds.map((id, index) =>
        db.productImage.updateMany({
          where: { id, productId },
          data: { position: index },
        }),
      ),
    );
    revalidateAdmin(`${ADMIN_BASE}/${productId}`);
    return ok();
  } catch (err) {
    return prismaFail(err);
  }
}

// ── Brand ────────────────────────────────────────────────────────────────────────

const upsertBrandSchema = z.object({
  id: z.number().int().positive().optional(),
  slug: slugSchema,
  name: z.string().trim().min(1).max(120),
  country: z.string().trim().max(80).optional(),
  niche: z.boolean().optional(),
  active: z.boolean().optional(),
});

export type UpsertBrandInput = z.input<typeof upsertBrandSchema>;

export async function upsertBrand(input: UpsertBrandInput): Promise<ActionResult> {
  await requireStaff();

  const parsed = upsertBrandSchema.safeParse(input);
  if (!parsed.success) return fail(firstZodError(parsed.error));
  const v = parsed.data;

  const data = {
    slug: v.slug,
    name: v.name,
    country: v.country && v.country.length > 0 ? v.country : null,
    niche: v.niche ?? false,
    active: v.active ?? true,
  };

  try {
    const row = v.id
      ? await db.brand.update({ where: { id: v.id }, data, select: { id: true } })
      : await db.brand.create({ data, select: { id: true } });
    revalidateAdmin(`${ADMIN_BASE}/brands`);
    return { ok: true, id: row.id };
  } catch (err) {
    return prismaFail(err, 'brand slug already in use');
  }
}

export async function deleteBrand(id: number): Promise<ActionResult> {
  await requireStaff();
  if (!Number.isInteger(id) || id <= 0) return fail('invalid brand');

  const count = await db.fragranceDetail.count({ where: { brandId: id } });
  if (count > 0) return fail(`brand is used by ${count} product(s)`);

  try {
    await db.brand.delete({ where: { id } });
    revalidateAdmin(`${ADMIN_BASE}/brands`);
    return ok();
  } catch (err) {
    return prismaFail(err);
  }
}

// ── Note ─────────────────────────────────────────────────────────────────────────

const upsertNoteSchema = z.object({
  id: z.number().int().positive().optional(),
  slug: slugSchema,
  name: localeTextSchema,
  family: z.string().trim().max(60).optional(),
  iconUrl: z.string().trim().url().max(500).optional().or(z.literal('')),
});

export type UpsertNoteInput = z.input<typeof upsertNoteSchema>;

export async function upsertNote(input: UpsertNoteInput): Promise<ActionResult> {
  await requireStaff();

  const parsed = upsertNoteSchema.safeParse(input);
  if (!parsed.success) return fail(firstZodError(parsed.error));
  const v = parsed.data;

  const data = {
    slug: v.slug,
    name: JSON.stringify(v.name),
    family: v.family && v.family.length > 0 ? v.family : null,
    iconUrl: v.iconUrl && v.iconUrl.length > 0 ? v.iconUrl : null,
  };

  try {
    const row = v.id
      ? await db.note.update({ where: { id: v.id }, data, select: { id: true } })
      : await db.note.create({ data, select: { id: true } });
    revalidateAdmin(`${ADMIN_BASE}/notes`);
    return { ok: true, id: row.id };
  } catch (err) {
    return prismaFail(err, 'note slug already in use');
  }
}

export async function deleteNote(id: number): Promise<ActionResult> {
  await requireStaff();
  if (!Number.isInteger(id) || id <= 0) return fail('invalid note');

  const count = await db.productNote.count({ where: { noteId: id } });
  if (count > 0) return fail(`note is used by ${count} product(s)`);

  try {
    await db.note.delete({ where: { id } });
    revalidateAdmin(`${ADMIN_BASE}/notes`);
    return ok();
  } catch (err) {
    return prismaFail(err);
  }
}

// ── Accord ───────────────────────────────────────────────────────────────────────

const upsertAccordSchema = z.object({
  id: z.number().int().positive().optional(),
  slug: slugSchema,
  name: localeTextSchema,
  colorHex: z
    .string()
    .trim()
    .regex(/^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/, 'colorHex must be a hex color')
    .optional()
    .or(z.literal('')),
});

export type UpsertAccordInput = z.input<typeof upsertAccordSchema>;

export async function upsertAccord(input: UpsertAccordInput): Promise<ActionResult> {
  await requireStaff();

  const parsed = upsertAccordSchema.safeParse(input);
  if (!parsed.success) return fail(firstZodError(parsed.error));
  const v = parsed.data;

  const data = {
    slug: v.slug,
    name: JSON.stringify(v.name),
    colorHex: v.colorHex && v.colorHex.length > 0 ? v.colorHex : null,
  };

  try {
    const row = v.id
      ? await db.accord.update({ where: { id: v.id }, data, select: { id: true } })
      : await db.accord.create({ data, select: { id: true } });
    revalidateAdmin(`${ADMIN_BASE}/accords`);
    return { ok: true, id: row.id };
  } catch (err) {
    return prismaFail(err, 'accord slug already in use');
  }
}

export async function deleteAccord(id: number): Promise<ActionResult> {
  await requireStaff();
  if (!Number.isInteger(id) || id <= 0) return fail('invalid accord');

  const count = await db.productAccord.count({ where: { accordId: id } });
  if (count > 0) return fail(`accord is used by ${count} product(s)`);

  try {
    await db.accord.delete({ where: { id } });
    revalidateAdmin(`${ADMIN_BASE}/accords`);
    return ok();
  } catch (err) {
    return prismaFail(err);
  }
}

// ── Perfumer ─────────────────────────────────────────────────────────────────────

const upsertPerfumerSchema = z.object({
  id: z.number().int().positive().optional(),
  slug: slugSchema,
  name: z.string().trim().min(1).max(120),
  country: z.string().trim().max(80).optional(),
});

export type UpsertPerfumerInput = z.input<typeof upsertPerfumerSchema>;

export async function upsertPerfumer(input: UpsertPerfumerInput): Promise<ActionResult> {
  await requireStaff();

  const parsed = upsertPerfumerSchema.safeParse(input);
  if (!parsed.success) return fail(firstZodError(parsed.error));
  const v = parsed.data;

  const data = {
    slug: v.slug,
    name: v.name,
    country: v.country && v.country.length > 0 ? v.country : null,
  };

  try {
    const row = v.id
      ? await db.perfumer.update({ where: { id: v.id }, data, select: { id: true } })
      : await db.perfumer.create({ data, select: { id: true } });
    revalidateAdmin(`${ADMIN_BASE}/perfumers`);
    return { ok: true, id: row.id };
  } catch (err) {
    return prismaFail(err, 'perfumer slug already in use');
  }
}

export async function deletePerfumer(id: number): Promise<ActionResult> {
  await requireStaff();
  if (!Number.isInteger(id) || id <= 0) return fail('invalid perfumer');

  const count = await db.productPerfumer.count({ where: { perfumerId: id } });
  if (count > 0) return fail(`perfumer is used by ${count} product(s)`);

  try {
    await db.perfumer.delete({ where: { id } });
    revalidateAdmin(`${ADMIN_BASE}/perfumers`);
    return ok();
  } catch (err) {
    return prismaFail(err);
  }
}

// ── error mapping ────────────────────────────────────────────────────────────────

/**
 * Map a Prisma write error to a typed ActionResult. P2002 = unique-constraint
 * violation (surface `uniqueMsg`); everything else is logged and returned generic.
 */
function prismaFail(err: unknown, uniqueMsg = 'value already in use'): ActionResult<never> {
  if (
    typeof err === 'object' &&
    err !== null &&
    'code' in err &&
    (err as { code: unknown }).code === 'P2002'
  ) {
    return fail(uniqueMsg);
  }
  if (
    typeof err === 'object' &&
    err !== null &&
    'code' in err &&
    (err as { code: unknown }).code === 'P2025'
  ) {
    return fail('record not found');
  }
  console.error('[catalog-actions]', err);
  return fail('database error');
}
