// Generates app icons from assets/logo.png: the logo centred on a #003862 square.
import sharp from 'sharp';
import { mkdirSync } from 'node:fs';

const NAVY = { r: 0, g: 56, b: 98, alpha: 1 };
const out = 'public/icons';
mkdirSync(out, { recursive: true });

async function icon(size, logoFrac, file) {
  const w = Math.round(size * logoFrac);
  const logo = await sharp('assets/logo.png').resize({ width: w }).toBuffer();
  await sharp({ create: { width: size, height: size, channels: 4, background: NAVY } })
    .composite([{ input: logo, gravity: 'center' }])
    .png()
    .toFile(`${out}/${file}`);
}

// "any" icons: logo uses 76% of the width. Maskable: logo inside the 80% safe circle (≈60% width).
await icon(192, 0.76, 'icon-192.png');
await icon(512, 0.76, 'icon-512.png');
await icon(512, 0.6, 'maskable-512.png');
await icon(180, 0.72, 'apple-touch-icon.png');
await icon(64, 0.84, 'favicon-64.png');
await icon(32, 0.88, 'favicon-32.png');
console.log('icons written to', out);
