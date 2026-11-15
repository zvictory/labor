import { mkdir, readFile } from 'node:fs/promises';
import sharp from 'sharp';

const publicDir = new URL('../public/', import.meta.url);
const cards = JSON.parse(
  await readFile(new URL('../lib/social-cards.json', import.meta.url), 'utf8'),
);
const output = new URL('social/v1/', publicDir);
const logo = await sharp(await readFile(new URL('brand/labor-wordmark.svg', publicDir)))
  .resize({ width: 190 })
  .png()
  .toBuffer();
const escapeXml = (text) =>
  text.replace(/[&<>]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' })[char]);

await mkdir(output, { recursive: true });
for (const [key, card] of Object.entries(cards)) {
  const photo = await sharp(await readFile(new URL(card.image.slice(1), publicDir)))
    .resize(660, 630, { fit: 'cover', position: card.crop })
    .toBuffer();

  for (const [locale, lines] of Object.entries(card.titles)) {
    const headline = lines
      .map((line, index) => {
        const size = line.length > 12 ? 50 : 62;
        return `<text x="52" y="${lines.length === 1 ? 356 : 321 + index * 68}" font-size="${size}" font-weight="700">${escapeXml(line)}</text>`;
      })
      .join('');
    const typography =
      Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="540" height="630">
      <g fill="#121212" font-family="Arial, DejaVu Sans, sans-serif">
        ${headline}
        <path d="M52 529H488" fill="none" stroke="#aba398"/>
        <text x="52" y="567" font-size="19" letter-spacing="2">LABORPARFUM.COM</text>
      </g>
    </svg>`);

    await sharp({ create: { width: 1200, height: 630, channels: 3, background: '#F4F1EA' } })
      .composite([
        { input: photo, left: 540, top: 0 },
        { input: typography, left: 0, top: 0 },
        { input: logo, left: 52, top: 62 },
      ])
      .jpeg({ quality: 88, mozjpeg: true })
      .toFile(new URL(`${key}-${locale}.jpg`, output).pathname);
  }
}
