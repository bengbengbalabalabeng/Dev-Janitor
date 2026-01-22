/**
 * Icon Generation Script for Dev Janitor
 * Generates PNG and ICO icons from SVG source
 */

import sharp from 'sharp';
import pngToIco from 'png-to-ico';
import { writeFileSync, readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const buildDir = join(__dirname, '..', 'build');

async function generateIcons() {
  const svgPath = join(buildDir, 'icon.svg');
  const pngPath = join(buildDir, 'icon.png');
  const icoPath = join(buildDir, 'icon.ico');

  console.log('Generating icons from SVG...');

  // Generate 512x512 PNG
  await sharp(svgPath)
    .resize(512, 512)
    .png()
    .toFile(pngPath);
  console.log('✓ Generated icon.png (512x512)');

  // Generate multiple sizes for ICO
  const sizes = [256, 128, 64, 48, 32, 16];
  const pngBuffers = await Promise.all(
    sizes.map(size => 
      sharp(svgPath)
        .resize(size, size)
        .png()
        .toBuffer()
    )
  );

  // Create ICO file
  const icoBuffer = await pngToIco(pngBuffers);
  writeFileSync(icoPath, icoBuffer);
  console.log('✓ Generated icon.ico');

  console.log('\nIcon generation complete!');
}

generateIcons().catch(console.error);
