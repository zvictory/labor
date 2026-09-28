# Taxonomy Images and Accord Pyramid Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give English and other locale taxonomy cards representative product images and render product main accords as a visual pyramid.

**Architecture:** Extend taxonomy DTO queries with a deterministic optional image URL from related products. Keep display decisions in focused components: a taxonomy image frame and a pure accord-row grouping helper used by the product detail page.

**Tech Stack:** Next.js 15 App Router, React Server Components, Prisma, TypeScript strict mode, Tailwind CSS, Vitest.

## Global Constraints

- Keep Rails out of the runtime path; use migrated MinIO image URLs only.
- Do not add external image sources or change catalog data.
- Preserve neutral placeholders when no related product image exists.
- Use no `any`; preserve strict TypeScript.
- Preserve existing note pyramid behavior.

---

### Task 1: Taxonomy representative-image data mapping

**Files:**
- Create: `apps/store/lib/catalog/taxonomy-images.ts`
- Create: `apps/store/lib/catalog/taxonomy-images.test.ts`
- Modify: `apps/store/lib/catalog/types.ts`
- Modify: `apps/store/lib/catalog/brands.ts`
- Modify: `apps/store/lib/catalog/notes.ts`
- Modify: `apps/store/lib/catalog/perfumers.ts`

**Interfaces:**
- Produces: `pickRepresentativeImage(urls: readonly (string | null)[]): string | undefined`.
- Produces: optional `image?: string` on `BrandDTO`, `NoteDTO`, and `PerfumerDTO`.
- Consumes: related `ProductImage.url`, ordered by product name then image position.

- [ ] **Step 1: Write the failing test**

```ts
expect(pickRepresentativeImage([null, '', 'https://images.test/a.webp'])).toBe(
  'https://images.test/a.webp',
);
expect(pickRepresentativeImage([null, ''])).toBeUndefined();
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test --workspace @labor/store -- taxonomy-images.test.ts --run`

Expected: FAIL because `./taxonomy-images` does not exist.

- [ ] **Step 3: Write minimal implementation**

```ts
export const pickRepresentativeImage = (
  urls: readonly (string | null)[],
): string | undefined => urls.find((url): url is string => Boolean(url));
```

Add `image?: string` to taxonomy DTOs. Select the first nested product image in each Prisma query and map it through `pickRepresentativeImage`.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test --workspace @labor/store -- taxonomy-images.test.ts --run`

Expected: PASS with 2 tests.

- [ ] **Step 5: Commit**

```bash
git add apps/store/lib/catalog/taxonomy-images.ts apps/store/lib/catalog/taxonomy-images.test.ts apps/store/lib/catalog/types.ts apps/store/lib/catalog/brands.ts apps/store/lib/catalog/notes.ts apps/store/lib/catalog/perfumers.ts
git commit -m "feat: add taxonomy representative images"
```

### Task 2: Taxonomy card image presentation

**Files:**
- Create: `apps/store/components/catalog/taxonomy-card-image.tsx`
- Create: `apps/store/components/catalog/taxonomy-card-image.test.tsx`
- Modify: `apps/store/app/[locale]/(store)/brands/page.tsx`
- Modify: `apps/store/app/[locale]/(store)/notes/page.tsx`
- Modify: `apps/store/app/[locale]/(store)/perfumers/page.tsx`

**Interfaces:**
- Consumes: `TaxonomyCardImage({ src?: string; alt: string; fallback: ReactNode })`.
- Produces: image-first cards; fallback only when `src` is absent.

- [ ] **Step 1: Write the failing test**

```tsx
render(<TaxonomyCardImage src="https://images.test/a.webp" alt="A" fallback={<span>Fallback</span>} />);
expect(screen.getByRole('img', { name: 'A' })).toBeInTheDocument();
expect(screen.queryByText('Fallback')).toBeNull();
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test --workspace @labor/store -- taxonomy-card-image.test.tsx --run`

Expected: FAIL because `TaxonomyCardImage` does not exist.

- [ ] **Step 3: Write minimal implementation**

Render Next `Image` in a fixed aspect-ratio frame when `src` exists, otherwise render the caller-provided fallback. Use it in all three taxonomy list pages.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test --workspace @labor/store -- taxonomy-card-image.test.tsx --run`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/store/components/catalog/taxonomy-card-image.tsx apps/store/components/catalog/taxonomy-card-image.test.tsx 'apps/store/app/[locale]/(store)/brands/page.tsx' 'apps/store/app/[locale]/(store)/notes/page.tsx' 'apps/store/app/[locale]/(store)/perfumers/page.tsx'
git commit -m "feat: show images on taxonomy cards"
```

### Task 3: Main-accord pyramid

**Files:**
- Create: `apps/store/lib/catalog/accord-pyramid.ts`
- Create: `apps/store/lib/catalog/accord-pyramid.test.ts`
- Create: `apps/store/components/catalog/accord-pyramid.tsx`
- Modify: `apps/store/app/[locale]/(store)/product/[slug]/page.tsx`

**Interfaces:**
- Produces: `groupAccordsIntoPyramid<T>(accords: readonly T[]): T[][]`.
- Consumes: ordered product accords and returns top-to-base rows with one, then two, then increasing items.
- Produces: `AccordPyramid({ accords }: { accords: ProductAccordDTO[] })`.

- [ ] **Step 1: Write the failing test**

```ts
expect(groupAccordsIntoPyramid(['a', 'b', 'c', 'd', 'e', 'f'])).toEqual([
  ['a'],
  ['b', 'c'],
  ['d', 'e', 'f'],
]);
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test --workspace @labor/store -- accord-pyramid.test.ts --run`

Expected: FAIL because `./accord-pyramid` does not exist.

- [ ] **Step 3: Write minimal implementation**

```ts
export const groupAccordsIntoPyramid = <T,>(accords: readonly T[]): T[][] => {
  const rows: T[][] = [];
  let index = 0;
  for (let width = 1; index < accords.length; width += 1) rows.push(accords.slice(index, (index += width)));
  return rows;
};
```

Render each row centered with wider maximum widths from top to base. Reuse `getReadableTextColor` and existing accord colors. Replace only the current main-accord chip block; leave `PyramidLayer` unchanged.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test --workspace @labor/store -- accord-pyramid.test.ts --run`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/store/lib/catalog/accord-pyramid.ts apps/store/lib/catalog/accord-pyramid.test.ts apps/store/components/catalog/accord-pyramid.tsx 'apps/store/app/[locale]/(store)/product/[slug]/page.tsx'
git commit -m "feat: render main accords as a pyramid"
```

### Task 4: Local integration verification

**Files:**
- Modify: none

**Interfaces:**
- Consumes: local `store`, `postgres`, and `minio` services.
- Produces: visual confirmation that English taxonomy pages render representative images and product details render a colored accord pyramid.

- [ ] **Step 1: Run static checks**

Run: `npm run typecheck --workspace @labor/store && npm test --workspace @labor/store -- --run`

Expected: TypeScript and all Vitest tests pass.

- [ ] **Step 2: Rebuild local production container**

Run: `docker compose --env-file .env -f infra/docker-compose.yml build --quiet store && docker compose --env-file .env -f infra/docker-compose.yml up -d --no-build store`

Expected: `labor-store-1` is running with its newly built image.

- [ ] **Step 3: Verify local routes**

Run: fetch `/en/brands`, `/en/notes`, `/en/perfumers`, and a product detail page through `http://localhost:3002`.

Expected: each route is HTTP 200; taxonomy card images have non-zero natural width; the accord section has centered rows of increasing item counts.

- [ ] **Step 4: Commit**

No commit is required when verification adds no tracked files.

