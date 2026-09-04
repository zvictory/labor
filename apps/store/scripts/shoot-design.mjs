/**
 * Capture the storefront as it actually renders, for design review.
 * Usage: node scripts/shoot-design.mjs <out-dir>   (dev server must be up)
 */
import { chromium } from 'playwright';

// Default the output directory. Called without an argument this wrote every
// shot into a literal `undefined/` folder, silently, with no error.
const OUT = process.argv[2] ?? 'design-shots';
await (await import('node:fs')).promises.mkdir(OUT, { recursive: true });
const BASE = 'http://localhost:3001';

const shots = [
  { file: '01-home-desktop.png',    url: '/en',                              w: 1440, h: 1000, full: true },
  { file: '02-catalog-desktop.png', url: '/en/catalog',                      w: 1440, h: 1200, full: false },
  { file: '03-product-closed.png',  url: '/en/product/acqua-di-gio-profumo', w: 1440, h: 1100, full: false },
  { file: '04-product-record.png',  url: '/en/product/acqua-di-gio-profumo', w: 1440, h: 1100, full: true, open: true },
  { file: '05-home-mobile.png',     url: '/en',                              w: 390,  h: 844,  full: true },
  { file: '06-product-mobile.png',  url: '/en/product/lost-cherry',          w: 390,  h: 844,  full: true, open: true },
];

const browser = await chromium.launch({ channel: 'chrome', headless: true });

for (const s of shots) {
  const page = await browser.newPage({ viewport: { width: s.w, height: s.h } });
  await page.goto(BASE + s.url, { waitUntil: 'domcontentloaded', timeout: 60_000 });
  // The dev-server overlay badge is not part of the design.
  await page.addStyleTag({ content: 'nextjs-portal,#__next-build-watcher{display:none!important}' });
  if (s.open) await page.evaluate(() => document.querySelector('details')?.setAttribute('open', ''));

  // Walk the page so lazy images enter the viewport, then wait — bounded, because
  // a stalled remote image would hang an unbounded decode() forever.
  await page.evaluate(async () => {
    const step = window.innerHeight;
    for (let y = 0; y < document.body.scrollHeight; y += step) {
      window.scrollTo(0, y);
      await new Promise((r) => setTimeout(r, 250));
    }
    window.scrollTo(0, 0);
  });
  await page.waitForTimeout(3000);

  await page.screenshot({ path: `${OUT}/${s.file}`, fullPage: s.full });
  const loaded = await page.evaluate(
    () => `${[...document.images].filter((i) => i.complete && i.naturalWidth > 0).length}/${document.images.length}`,
  );
  console.log(`✓ ${s.file}  images ${loaded}`);
  await page.close();
}

await browser.close();
