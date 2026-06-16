'use server';

// Admin campaign mutations. Every action guards requireStaff() first, validates
// its input with zod, mutates via Prisma, then revalidates the affected admin
// views. Per-locale text fields are stored as { ru, uz?, en? } JSON with ru
// required (mirrors the catalog convention). Money is integer UZS minor units —
// not handled here (campaigns carry no prices; products do).
//
// Slide images are uploaded to object storage via putObject() and the returned
// public URL is persisted on CampaignSlide.imageUrl. Uploads are best-effort to
// validate but the URL write is the source of truth.

import { randomBytes } from 'crypto';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';

import { db } from '@/lib/db';
import { requireStaff } from '@/lib/admin/guard';
import { putObject } from '@/lib/storage';
import { searchProductsForPicker } from '@/lib/admin/campaign-queries';

// ── shared schemas ────────────────────────────────────────────────────────────

/** Per-locale text: ru required (may be empty string for optional fields handled
 *  via the optional wrapper), uz/en optional. */
const localeTextSchema = z.object({
  ru: z.string().trim(),
  uz: z.string().trim().optional(),
  en: z.string().trim().optional(),
});

/** Required per-locale text (ru must be non-empty), e.g. Campaign.title. */
const requiredLocaleTextSchema = localeTextSchema.extend({
  ru: z.string().trim().min(1),
});

/** Drop empty locale keys so the stored JSON stays clean; null if entirely empty. */
function normalizeLocaleText(
  value: z.infer<typeof localeTextSchema> | undefined,
): { ru: string; uz?: string; en?: string } | null {
  if (!value) return null;
  const ru = value.ru.trim();
  const uz = value.uz?.trim();
  const en = value.en?.trim();
  if (!ru && !uz && !en) return null;
  return {
    ru,
    ...(uz ? { uz } : {}),
    ...(en ? { en } : {}),
  };
}

const slugSchema = z
  .string()
  .trim()
  .min(1)
  .max(120)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'slug_format');

export type CampaignActionResult<T = undefined> =
  | { ok: true; data?: T }
  | { ok: false; error: string };

// ── campaign CRUD ─────────────────────────────────────────────────────────────

const upsertCampaignSchema = z.object({
  id: z.number().int().positive().optional(), // omit => create
  slug: slugSchema,
  title: requiredLocaleTextSchema,
  subtitle: localeTextSchema.optional(),
  body: localeTextSchema.optional(),
  ctaLabel: localeTextSchema.optional(),
  heroImage: z.string().trim().url().optional().or(z.literal('')),
  active: z.boolean().optional(),
  startsAt: z.coerce.date().nullable().optional(),
  endsAt: z.coerce.date().nullable().optional(),
});

export type UpsertCampaignInput = z.input<typeof upsertCampaignSchema>;

/**
 * Create (no id) or update (with id) a campaign's core fields. Slug uniqueness is
 * enforced by the DB unique index — a clash returns a friendly error rather than
 * throwing. Returns the campaign id on success.
 */
export async function upsertCampaign(
  input: UpsertCampaignInput,
): Promise<CampaignActionResult<{ id: number }>> {
  await requireStaff();

  const parsed = upsertCampaignSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? 'invalid_input' };
  }
  const v = parsed.data;

  // title: ru already validated non-empty; normalize to drop empty uz/en keys.
  // normalizeLocaleText can't return null here because ru is guaranteed non-empty.
  const title = normalizeLocaleText(v.title) ?? { ru: v.title.ru.trim() };

  const data = {
    slug: v.slug,
    title,
    subtitle: normalizeLocaleText(v.subtitle) ?? undefined,
    body: normalizeLocaleText(v.body) ?? undefined,
    ctaLabel: normalizeLocaleText(v.ctaLabel) ?? undefined,
    heroImage: v.heroImage ? v.heroImage : null,
    ...(v.active !== undefined ? { active: v.active } : {}),
    startsAt: v.startsAt ?? null,
    endsAt: v.endsAt ?? null,
  };

  try {
    const result = v.id
      ? await db.campaign.update({ where: { id: v.id }, data })
      : await db.campaign.create({ data });

    revalidatePath('/[locale]/admin/campaigns', 'page');
    revalidatePath(`/[locale]/admin/campaigns/${result.id}`, 'page');
    return { ok: true, data: { id: result.id } };
  } catch (err) {
    if (isUniqueViolation(err)) return { ok: false, error: 'slug_taken' };
    console.error('[admin/campaign-actions] upsertCampaign failed:', err);
    return { ok: false, error: 'unexpected' };
  }
}

const idSchema = z.number().int().positive();

/** Delete a campaign (cascades to its slides + product links via schema onDelete). */
export async function deleteCampaign(id: number): Promise<CampaignActionResult> {
  await requireStaff();
  const parsed = idSchema.safeParse(id);
  if (!parsed.success) return { ok: false, error: 'invalid_id' };

  try {
    await db.campaign.delete({ where: { id: parsed.data } });
    revalidatePath('/[locale]/admin/campaigns', 'page');
    return { ok: true };
  } catch (err) {
    if (isNotFound(err)) return { ok: false, error: 'not_found' };
    console.error('[admin/campaign-actions] deleteCampaign failed:', err);
    return { ok: false, error: 'unexpected' };
  }
}

/** Toggle (or set) a campaign's active flag. Returns the new value. */
export async function toggleCampaignActive(
  id: number,
  active?: boolean,
): Promise<CampaignActionResult<{ active: boolean }>> {
  await requireStaff();
  const parsed = idSchema.safeParse(id);
  if (!parsed.success) return { ok: false, error: 'invalid_id' };

  const current = await db.campaign.findUnique({
    where: { id: parsed.data },
    select: { active: true },
  });
  if (!current) return { ok: false, error: 'not_found' };

  const next = active ?? !current.active;
  await db.campaign.update({ where: { id: parsed.data }, data: { active: next } });

  revalidatePath('/[locale]/admin/campaigns', 'page');
  revalidatePath(`/[locale]/admin/campaigns/${parsed.data}`, 'page');
  return { ok: true, data: { active: next } };
}

// ── slides ────────────────────────────────────────────────────────────────────

const upsertSlideSchema = z.object({
  id: z.number().int().positive().optional(), // omit => create
  campaignId: z.number().int().positive(),
  imageUrl: z.string().trim().url().optional().or(z.literal('')),
  linkUrl: z.string().trim().url().optional().or(z.literal('')),
  title: localeTextSchema.optional(),
  subtitle: localeTextSchema.optional(),
  ctaLabel: localeTextSchema.optional(),
  position: z.number().int().min(0).optional(),
});

export type UpsertSlideInput = z.input<typeof upsertSlideSchema>;

/** Create or update a single campaign slide. */
export async function upsertSlide(
  input: UpsertSlideInput,
): Promise<CampaignActionResult<{ id: number }>> {
  await requireStaff();
  const parsed = upsertSlideSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? 'invalid_input' };
  }
  const v = parsed.data;

  const data = {
    imageUrl: v.imageUrl ? v.imageUrl : null,
    linkUrl: v.linkUrl ? v.linkUrl : null,
    title: normalizeLocaleText(v.title) ?? undefined,
    subtitle: normalizeLocaleText(v.subtitle) ?? undefined,
    ctaLabel: normalizeLocaleText(v.ctaLabel) ?? undefined,
    ...(v.position !== undefined ? { position: v.position } : {}),
  };

  try {
    const slide = v.id
      ? await db.campaignSlide.update({ where: { id: v.id }, data })
      : await db.campaignSlide.create({
          data: { ...data, campaignId: v.campaignId },
        });

    revalidatePath(`/[locale]/admin/campaigns/${v.campaignId}`, 'page');
    return { ok: true, data: { id: slide.id } };
  } catch (err) {
    console.error('[admin/campaign-actions] upsertSlide failed:', err);
    return { ok: false, error: 'unexpected' };
  }
}

const deleteSlideSchema = z.object({
  id: idSchema,
  campaignId: idSchema,
});

/** Delete a slide. campaignId is required so we can revalidate the edit page. */
export async function deleteSlide(
  id: number,
  campaignId: number,
): Promise<CampaignActionResult> {
  await requireStaff();
  const parsed = deleteSlideSchema.safeParse({ id, campaignId });
  if (!parsed.success) return { ok: false, error: 'invalid_id' };

  try {
    await db.campaignSlide.delete({ where: { id: parsed.data.id } });
    revalidatePath(`/[locale]/admin/campaigns/${parsed.data.campaignId}`, 'page');
    return { ok: true };
  } catch (err) {
    if (isNotFound(err)) return { ok: false, error: 'not_found' };
    console.error('[admin/campaign-actions] deleteSlide failed:', err);
    return { ok: false, error: 'unexpected' };
  }
}

/**
 * Upload a slide image and return its public URL. Driven from a <form> so it
 * receives FormData: `file` (the image) + `campaignId`. The caller persists the
 * returned URL onto a slide via upsertSlide (or this writes it directly when a
 * `slideId` is supplied). Content-type comes from the uploaded file.
 */
const allowedImageTypes = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/avif']);
const extByType: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/avif': 'avif',
};

export async function addSlideImage(
  formData: FormData,
): Promise<CampaignActionResult<{ url: string }>> {
  await requireStaff();

  const file = formData.get('file');
  const campaignIdRaw = formData.get('campaignId');
  const slideIdRaw = formData.get('slideId');

  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, error: 'no_file' };
  }
  if (!allowedImageTypes.has(file.type)) {
    return { ok: false, error: 'bad_type' };
  }
  // Guard against unbounded uploads (10 MB).
  if (file.size > 10 * 1024 * 1024) {
    return { ok: false, error: 'too_large' };
  }

  const campaignId = Number(campaignIdRaw);
  if (!Number.isInteger(campaignId) || campaignId <= 0) {
    return { ok: false, error: 'invalid_id' };
  }

  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    const ext = extByType[file.type] ?? 'bin';
    const key = `campaigns/${campaignId}/slides/${Date.now()}-${randomBytes(6).toString('hex')}.${ext}`;
    const url = await putObject(key, buffer, file.type);

    // If a specific slide was named, attach the image to it immediately.
    const slideId = Number(slideIdRaw);
    if (Number.isInteger(slideId) && slideId > 0) {
      await db.campaignSlide.update({ where: { id: slideId }, data: { imageUrl: url } });
    }

    revalidatePath(`/[locale]/admin/campaigns/${campaignId}`, 'page');
    return { ok: true, data: { url } };
  } catch (err) {
    console.error('[admin/campaign-actions] addSlideImage failed:', err);
    return { ok: false, error: 'upload_failed' };
  }
}

// ── featured products ─────────────────────────────────────────────────────────

const setProductsSchema = z.object({
  campaignId: idSchema,
  productIds: z.array(z.number().int().positive()).max(60),
});

/**
 * Replace a campaign's featured-products set with `productIds`, preserving the
 * given order as `position`. Idempotent: re-running with the same list yields the
 * same rows. Done in a transaction (delete-all + recreate) so a partial failure
 * can't leave a half-updated set.
 */
export async function setCampaignProducts(
  campaignId: number,
  productIds: number[],
): Promise<CampaignActionResult> {
  await requireStaff();
  const parsed = setProductsSchema.safeParse({ campaignId, productIds });
  if (!parsed.success) return { ok: false, error: 'invalid_input' };

  // De-dupe while preserving first-seen order.
  const seen = new Set<number>();
  const ordered = parsed.data.productIds.filter((id) => {
    if (seen.has(id)) return false;
    seen.add(id);
    return true;
  });

  try {
    await db.$transaction(async (tx) => {
      await tx.campaignProduct.deleteMany({ where: { campaignId: parsed.data.campaignId } });
      if (ordered.length > 0) {
        await tx.campaignProduct.createMany({
          data: ordered.map((productId, index) => ({
            campaignId: parsed.data.campaignId,
            productId,
            position: index,
          })),
          skipDuplicates: true,
        });
      }
    });

    revalidatePath(`/[locale]/admin/campaigns/${parsed.data.campaignId}`, 'page');
    return { ok: true };
  } catch (err) {
    console.error('[admin/campaign-actions] setCampaignProducts failed:', err);
    return { ok: false, error: 'unexpected' };
  }
}

// ── product picker (server action wrapper) ────────────────────────────────────

/**
 * Server-action wrapper around searchProductsForPicker so the FeaturedProducts
 * client island can call it without importing server-only query code. Guards
 * requireStaff() (only operators may enumerate the catalog from the admin).
 */
export async function searchCampaignProducts(
  q: string,
): Promise<{ id: number; slug: string; name: string; price: number; image: string | null }[]> {
  await requireStaff();
  const query = typeof q === 'string' ? q : '';
  return searchProductsForPicker(query);
}

// ── prisma error helpers ──────────────────────────────────────────────────────

function hasPrismaCode(err: unknown, code: string): boolean {
  return (
    typeof err === 'object' &&
    err !== null &&
    'code' in err &&
    (err as { code?: unknown }).code === code
  );
}

const isUniqueViolation = (err: unknown): boolean => hasPrismaCode(err, 'P2002');
const isNotFound = (err: unknown): boolean => hasPrismaCode(err, 'P2025');
