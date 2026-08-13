/**
 * Generates the PWA PNG icons from the vector lotus mark (public/icons/icon.svg).
 * Requires sharp: `npm i -D sharp` then `npm run generate:icons`.
 * Idempotent — overwrites the PNGs under public/icons/.
 */
import { mkdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const iconsDir = path.join(root, 'public', 'icons');
mkdirSync(iconsDir, { recursive: true });

async function main() {
  let sharp;
  try {
    sharp = (await import('sharp')).default;
  } catch {
    console.error('sharp is not installed. Run: npm i -D sharp');
    process.exit(1);
  }
  const svgPath = path.join(iconsDir, 'icon.svg');
  const jobs = [
    ['icon-192.png', 192],
    ['icon-512.png', 512],
    ['icon-512-maskable.png', 512],
    ['apple-touch-icon.png', 180],
  ];
  for (const [name, size] of jobs) {
    await sharp(svgPath).resize(size, size).png().toFile(path.join(iconsDir, name));
    console.log('wrote', path.join('public/icons', name));
  }
}

main();
