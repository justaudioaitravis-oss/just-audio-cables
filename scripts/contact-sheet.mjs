// Tiles screenshots side by side for quick visual review: node scripts/contact-sheet.mjs out.png a.png b.png ...
import sharp from 'sharp';
const [out, ...files] = process.argv.slice(2);
const w = 390, gap = 12;
const imgs = await Promise.all(files.map(f => sharp(f).resize({ width: w }).toBuffer({ resolveWithObject: true })));
const H = Math.max(...imgs.map(i => i.info.height));
await sharp({ create: { width: files.length * (w + gap), height: H, channels: 3, background: '#888' } })
  .composite(imgs.map((i, k) => ({ input: i.data, left: k * (w + gap), top: 0 }))).png().toFile(out);
