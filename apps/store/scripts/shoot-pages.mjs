/** Ad-hoc: shoot a list of routes. node scripts/shoot-pages.mjs <out-dir> <route...> */
import { chromium } from 'playwright';
import { promises as fs } from 'node:fs';
const [OUT, ...routes] = process.argv.slice(2);
await fs.mkdir(OUT, { recursive: true });
const b = await chromium.launch({ channel: 'chrome', headless: true });
for (const r of routes) {
  const p = await b.newPage({ viewport: { width: 1440, height: 1000 } });
  await p.goto('http://localhost:3001' + r, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await p.addStyleTag({ content: 'nextjs-portal{display:none!important}' });
  await p.evaluate(async () => {
    for (let y = 0; y < document.body.scrollHeight; y += innerHeight) { scrollTo(0, y); await new Promise(r => setTimeout(r, 200)); }
    scrollTo(0, 0);
  });
  await p.waitForTimeout(3000);
  const f = `${OUT}/${r.replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '') || 'root'}.png`;
  await p.screenshot({ path: f, fullPage: true });
  console.log('✓', f);
  await p.close();
}
await b.close();
