const sharp = require('sharp');
const fs = require('fs');
(async () => {
  const source = fs.readFileSync('public/brand/adventskool-icon.svg');
  const png = size => sharp(source).resize(size, size).png().toBuffer();
  for (const size of [16, 32, 192, 512]) {
    const image = await png(size);
    fs.writeFileSync(`public/brand/icon-${size}.png`, image);
    fs.writeFileSync(size < 100 ? `app/favicon-${size}x${size}.png` : `app/android-chrome-${size}x${size}.png`, image);
  }
  await sharp('public/brand/adventskool-wordmark.svg').resize({ width: 1500 }).png().toFile('public/brand/adventskool-wordmark.png');
  fs.writeFileSync('app/apple-touch-icon.png', await png(180));
  const images = await Promise.all([16, 32, 48].map(png));
  const header = Buffer.alloc(6 + images.length * 16);
  header.writeUInt16LE(1, 2); header.writeUInt16LE(images.length, 4);
  let offset = header.length;
  images.forEach((image, i) => { const pos = 6 + i * 16; header[pos] = [16, 32, 48][i]; header[pos + 1] = [16, 32, 48][i]; header.writeUInt16LE(1, pos + 4); header.writeUInt16LE(32, pos + 6); header.writeUInt32LE(image.length, pos + 8); header.writeUInt32LE(offset, pos + 12); offset += image.length; });
  fs.writeFileSync('app/favicon.ico', Buffer.concat([header, ...images]));
})().catch(error => { console.error(error); process.exitCode = 1; });
