/**
 * Put the two builds next to each other in one image per view, so the choice
 * can be made by looking rather than by reading a file list.
 *   node scripts/compose-compare.mjs
 */
import { chromium } from 'playwright';
import { promises as fs } from 'node:fs';
import path from 'node:path';

const DIR = 'design-shots';
const OUT = path.join(DIR, 'compare');
await fs.mkdir(OUT, { recursive: true });

const views = [
  { file: 'home-desktop.png',    title: 'ANA SAYFA — masaüstü', colw: 900 },
  { file: 'catalog-desktop.png', title: 'KATALOG — masaüstü',   colw: 900 },
  { file: 'product-desktop.png', title: 'ÜRÜN — masaüstü',      colw: 900 },
  { file: 'home-mobile.png',     title: 'ANA SAYFA — mobil',    colw: 420 },
  { file: 'product-mobile.png',  title: 'ÜRÜN — mobil',         colw: 420 },
];

const b64 = async (p) => `data:image/png;base64,${(await fs.readFile(p)).toString('base64')}`;
const browser = await chromium.launch({ channel: 'chrome', headless: true });

for (const v of views) {
  const left = await b64(path.join(DIR, 'prod', v.file));
  const right = await b64(path.join(DIR, 'local', v.file));
  const page = await browser.newPage({ viewport: { width: v.colw * 2 + 72, height: 900 } });
  await page.setContent(`
    <style>
      *{box-sizing:border-box;margin:0}
      body{background:#8C8D91;font:600 13px/1.4 -apple-system,system-ui,sans-serif;padding:24px}
      h1{font-size:12px;letter-spacing:.18em;text-transform:uppercase;color:#fff;margin-bottom:16px}
      .row{display:grid;grid-template-columns:repeat(2,${v.colw}px);gap:24px;align-items:start}
      .cap{color:#fff;font-size:11px;letter-spacing:.14em;text-transform:uppercase;padding-bottom:8px}
      .a{color:#121212;background:#D9C3A5;display:inline-block;padding:3px 8px}
      img{width:${v.colw}px;display:block;border:1px solid #121212}
    </style>
    <h1>${v.title}</h1>
    <div class="row">
      <div><div class="cap"><span class="a">A</span> &nbsp;ŞU ANKİ SİTE — origin/main (laborparfum.com)</div><img src="${left}"></div>
      <div><div class="cap"><span class="a">B</span> &nbsp;YENİ TASARIM — yerel (brandbook)</div><img src="${right}"></div>
    </div>`);
  await page.waitForTimeout(800);
  const out = path.join(OUT, v.file.replace('.png', '.png'));
  await page.screenshot({ path: out, fullPage: true });
  console.log(`✓ ${out}`);
  await page.close();
}
await browser.close();
