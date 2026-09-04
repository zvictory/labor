/**
 * Shoot the same five views against two builds, so the two design directions
 * can be looked at side by side.
 *   node scripts/shoot-compare.mjs <base-url> <out-dir>
 * Production (https://laborparfum.com) serves origin/main; localhost:3001
 * serves the brandbook rebuild.
 */
import { chromium } from 'playwright';
import { promises as fs } from 'node:fs';

const BASE = process.argv[2];
const OUT = process.argv[3];
if (!BASE || !OUT) throw new Error('usage: shoot-compare.mjs <base-url> <out-dir>');
await fs.mkdir(OUT, { recursive: true });

const shots = [
  { file: 'home-desktop.png',    url: '/en',           w: 1440, h: 1000, full: true },
  { file: 'catalog-desktop.png', url: '/en/catalog',   w: 1440, h: 1200, full: false },
  { file: 'product-desktop.png', url: '/en/product/blue', w: 1440, h: 1100, full: false },
  { file: 'home-mobile.png',     url: '/en',           w: 390,  h: 844,  full: true },
  { file: 'product-mobile.png',  url: '/en/product/blue', w: 390, h: 844, full: true },
];

const browser = await chromium.launch({ channel: 'chrome', headless: true });

for (const s of shots) {
  const page = await browser.newPage({ viewport: { width: s.w, height: s.h } });
  try {
    await page.goto(BASE + s.url, { waitUntil: 'domcontentloaded', timeout: 60_000 });
    await page.addStyleTag({ content: 'nextjs-portal,#__next-build-watcher{display:none!important}' });
    await page.evaluate(async () => {
      const step = window.innerHeight;
      for (let y = 0; y < document.body.scrollHeight; y += step) {
        window.scrollTo(0, y);
        await new Promise((r) => setTimeout(r, 250));
      }
      window.scrollTo(0, 0);
    });
    await page.waitForTimeout(3500);
    await page.screenshot({ path: `${OUT}/${s.file}`, fullPage: s.full });
    const loaded = await page.evaluate(
      () => `${[...document.images].filter((i) => i.complete && i.naturalWidth > 0).length}/${document.images.length}`,
    );
    console.log(`✓ ${OUT}/${s.file}  images ${loaded}`);
  } catch (err) {
    console.log(`✗ ${OUT}/${s.file}  ${err.message.split('\n')[0]}`);
  }
  await page.close();
}
await browser.close();
