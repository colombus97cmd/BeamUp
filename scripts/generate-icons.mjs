import sharp from 'sharp';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const publicDir = path.join(__dirname, '..', 'public');
const sourceIcon = path.join(publicDir, 'icon-512x512.png');

const sizes = [72, 96, 128, 144, 152, 192, 384, 512];

async function generateIcons() {
  for (const size of sizes) {
    await sharp(sourceIcon)
      .resize(size, size)
      .png()
      .toFile(path.join(publicDir, `icon-${size}x${size}.png`));
    console.log(`✅ Generated icon-${size}x${size}.png`);
  }
  
  // Generate apple-touch-icon (180x180)
  await sharp(sourceIcon)
    .resize(180, 180)
    .png()
    .toFile(path.join(publicDir, 'apple-touch-icon.png'));
  console.log('✅ Generated apple-touch-icon.png');

  console.log('\n🎉 All icons generated!');
}

generateIcons().catch(console.error);
