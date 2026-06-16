// Campaign loader: labor_campaigns (+ slides, products, translations) -> Prisma
// Campaign / CampaignSlide / CampaignProduct.
//
// Source columns:
//   labor_campaigns: id, slug, status, hero_image_url, starts_at, ends_at
//   labor_campaign_translations: labor_campaign_id, locale, title, subtitle, body, cta_label
//   labor_campaign_slides: id, labor_campaign_id, image_url, link_url, position
//   labor_campaign_slide_translations: labor_campaign_slide_id, locale, title, subtitle, cta_label
//   labor_campaign_products: labor_campaign_id, spree_product_id, position
//
// Mapping decisions:
//   - status (string) -> active (boolean): active when status === 'active' (and not
//     'draft'/'archived'). Adjust if other statuses are introduced.
//   - title is REQUIRED JSON on Campaign -> slug fallback.
//   - hero_image_url has no Campaign column in the draft schema; it is carried as
//     the first slide's imageUrl when the campaign has no slides, otherwise dropped
//     (slides own imagery). (Flagged for the integrator.)
//   - Slides have no DB natural key, so we delete+recreate slides per campaign for
//     idempotency. CampaignProduct upserts by (campaignId, productId).
//
// Idempotent: Campaign upserts by slug; slides rebuilt; products upserted.

import { db } from "@/lib/db";
import {
  collapseLocaleJson,
  collapseRequiredLocaleJson,
  fetchTranslations,
  query,
} from "../source";

interface CampaignRow {
  id: string;
  slug: string;
  status: string;
  hero_image_url: string | null;
}

interface SlideRow {
  id: string;
  labor_campaign_id: string;
  image_url: string | null;
  position: number;
}

interface CampaignProductRow {
  labor_campaign_id: string;
  spree_product_id: string;
  position: number;
}

export async function loadCampaigns(
  productOldIdToNewId: Map<number, number>,
): Promise<void> {
  const campaigns = await query<CampaignRow>(
    `SELECT id, slug, status, hero_image_url
       FROM labor_campaigns
      ORDER BY id`,
  );
  const campaignIds = campaigns.map((c) => Number(c.id));

  const titles = await fetchTranslations(
    "labor_campaign_translations",
    "labor_campaign_id",
    "title",
    campaignIds,
  );
  const subtitles = await fetchTranslations(
    "labor_campaign_translations",
    "labor_campaign_id",
    "subtitle",
    campaignIds,
  );
  const bodies = await fetchTranslations(
    "labor_campaign_translations",
    "labor_campaign_id",
    "body",
    campaignIds,
  );
  const ctaLabels = await fetchTranslations(
    "labor_campaign_translations",
    "labor_campaign_id",
    "cta_label",
    campaignIds,
  );

  // All slides + their translations up front.
  const slides = await query<SlideRow>(
    `SELECT id, labor_campaign_id, image_url, position
       FROM labor_campaign_slides
      ORDER BY labor_campaign_id, position, id`,
  );
  const slideIds = slides.map((s) => Number(s.id));
  const slideTitles = await fetchTranslations(
    "labor_campaign_slide_translations",
    "labor_campaign_slide_id",
    "title",
    slideIds,
  );
  const slideSubtitles = await fetchTranslations(
    "labor_campaign_slide_translations",
    "labor_campaign_slide_id",
    "subtitle",
    slideIds,
  );
  const slideCtas = await fetchTranslations(
    "labor_campaign_slide_translations",
    "labor_campaign_slide_id",
    "cta_label",
    slideIds,
  );

  const slidesByCampaign = new Map<number, SlideRow[]>();
  for (const s of slides) {
    const cid = Number(s.labor_campaign_id);
    const list = slidesByCampaign.get(cid) ?? [];
    list.push(s);
    slidesByCampaign.set(cid, list);
  }

  const campaignProducts = await query<CampaignProductRow>(
    `SELECT labor_campaign_id, spree_product_id, position
       FROM labor_campaign_products
      ORDER BY labor_campaign_id, position, id`,
  );
  const productsByCampaign = new Map<number, CampaignProductRow[]>();
  for (const cp of campaignProducts) {
    const cid = Number(cp.labor_campaign_id);
    const list = productsByCampaign.get(cid) ?? [];
    list.push(cp);
    productsByCampaign.set(cid, list);
  }

  let campaignCount = 0;
  let slideCount = 0;
  let productCount = 0;

  for (const c of campaigns) {
    const id = Number(c.id);
    const title = collapseRequiredLocaleJson(null, titles.get(id) ?? [], c.slug);
    const subtitle = collapseLocaleJson(null, subtitles.get(id) ?? []);
    const body = collapseLocaleJson(null, bodies.get(id) ?? []);
    const ctaLabel = collapseLocaleJson(null, ctaLabels.get(id) ?? []);
    const active = c.status === "active";

    const data = {
      title,
      subtitle: subtitle ?? undefined,
      body: body ?? undefined,
      ctaLabel: ctaLabel ?? undefined,
      active,
    };

    const campaign = await db.campaign.upsert({
      where: { slug: c.slug },
      create: { slug: c.slug, ...data },
      update: data,
      select: { id: true },
    });
    campaignCount += 1;

    // Rebuild slides (no natural key) for idempotency.
    await db.campaignSlide.deleteMany({ where: { campaignId: campaign.id } });
    const campaignSlides = slidesByCampaign.get(id) ?? [];
    if (campaignSlides.length > 0) {
      for (const s of campaignSlides) {
        const sid = Number(s.id);
        await db.campaignSlide.create({
          data: {
            campaignId: campaign.id,
            imageUrl: s.image_url,
            title: collapseLocaleJson(null, slideTitles.get(sid) ?? []) ?? undefined,
            subtitle:
              collapseLocaleJson(null, slideSubtitles.get(sid) ?? []) ?? undefined,
            ctaLabel: collapseLocaleJson(null, slideCtas.get(sid) ?? []) ?? undefined,
            position: s.position,
          },
        });
        slideCount += 1;
      }
    } else if (c.hero_image_url) {
      // No slides but a hero image exists -> represent it as a single slide.
      await db.campaignSlide.create({
        data: { campaignId: campaign.id, imageUrl: c.hero_image_url, position: 0 },
      });
      slideCount += 1;
    }

    // Campaign products.
    for (const cp of productsByCampaign.get(id) ?? []) {
      const productId = productOldIdToNewId.get(Number(cp.spree_product_id));
      if (productId === undefined) continue; // deleted product
      await db.campaignProduct.upsert({
        where: { campaignId_productId: { campaignId: campaign.id, productId } },
        create: { campaignId: campaign.id, productId, position: cp.position },
        update: { position: cp.position },
      });
      productCount += 1;
    }
  }

  console.log(
    `[campaigns] upserted ${campaignCount} campaigns, ${slideCount} slides, ${productCount} products`,
  );
}
