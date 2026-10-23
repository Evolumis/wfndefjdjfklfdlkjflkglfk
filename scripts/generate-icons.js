import fs from 'fs';
import path from 'path';
import sharp from 'sharp';

async function generate() {
  const svgPath = path.resolve('public/icon.svg');
  const svgBuffer = fs.readFileSync(svgPath);

  // 1. 192x192
  await sharp(svgBuffer)
    .resize(192, 192)
    .png()
    .toFile('public/pwa-192x192.png');

  // 2. 512x512
  await sharp(svgBuffer)
    .resize(512, 512)
    .png()
    .toFile('public/pwa-512x512.png');

  // 3. 512x512 Maskable with 15% safe zone padding
  const innerSize = Math.round(512 * 0.75); // ~384px
  const innerIcon = await sharp(svgBuffer).resize(innerSize, innerSize).toBuffer();
  await sharp({
    create: {
      width: 512,
      height: 512,
      channels: 4,
      background: { r: 15, g: 23, b: 42, alpha: 1 }, // deep navy theme background
    },
  })
    .composite([{ input: innerIcon, top: Math.round((512 - innerSize) / 2), left: Math.round((512 - innerSize) / 2) }])
    .png()
    .toFile('public/pwa-maskable-512x512.png');

  // 4. Apple touch icon (180x180)
  await sharp(svgBuffer)
    .resize(180, 180)
    .png()
    .toFile('public/apple-touch-icon.png');

  console.log('PWA Icons generated successfully!');
}

generate().catch((err) => {
  console.error(err);
  process.exit(1);
});
