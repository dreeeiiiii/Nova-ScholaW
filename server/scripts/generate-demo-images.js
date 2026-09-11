/**
 * Nova Schola Hub — Demo image generator (capstone presentation data).
 *
 * Run from the server directory:
 *   node scripts/generate-demo-images.js
 *
 * Generates 25 real 800x600 JPG files with valid JPEG headers:
 *   uploads/gallery/images/demo-01.jpg ... demo-25.jpg
 *
 * Each image has a distinct solid background color (rotating through a
 * palette of 10 colors) with centered "Demo Image NN" text composited via
 * an SVG overlay (sharp composite). Falls back to solid-color JPGs without
 * text if SVG compositing fails.
 *
 * Does not touch the database schema, routes, or frontend.
 */
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_DIR = path.join(__dirname, '..', 'uploads', 'gallery', 'images');

const WIDTH = 800;
const HEIGHT = 600;

// Palette of 10 distinct background colors (rotated through for 25 images).
const PALETTE = [
  '#1e40af', // blue-800
  '#b91c1c', // red-700
  '#15803d', // green-700
  '#a16207', // yellow-700
  '#6d28d9', // violet-700
  '#0e7490', // cyan-700
  '#be185d', // pink-700
  '#4d7c0f', // lime-700
  '#c2410c', // orange-700
  '#0f766e', // teal-700
];

/** Pick a readable text color for a given background. */
const textColorFor = () => '#ffffff';

const svgOverlay = (label, textColor) => `
<svg width="${WIDTH}" height="${HEIGHT}" xmlns="http://www.w3.org/2000/svg">
  <rect width="100%" height="100%" fill="rgba(0,0,0,0.25)"/>
  <text x="50%" y="50%" font-family="Arial, Helvetica, sans-serif"
    font-size="64" font-weight="bold" fill="${textColor}"
    text-anchor="middle" dominant-baseline="middle">${label}</text>
  <text x="50%" y="58%" font-family="Arial, Helvetica, sans-serif"
    font-size="28" fill="${textColor}" opacity="0.9"
    text-anchor="middle" dominant-baseline="middle">Nova Schola Hub - 800x600</text>
</svg>`;

const run = async () => {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  let withText = 0;
  let solidOnly = 0;

  for (let i = 1; i <= 25; i += 1) {
    const num = String(i).padStart(2, '0');
    const label = `Demo Image ${num}`;
    const bg = PALETTE[(i - 1) % PALETTE.length];
    const out = path.join(OUT_DIR, `demo-${num}.jpg`);

    const base = sharp({
      create: {
        width: WIDTH,
        height: HEIGHT,
        channels: 3,
        background: bg,
      },
    }).jpeg({ quality: 85 });

    try {
      await base
        .composite([
          { input: Buffer.from(svgOverlay(label, textColorFor())), top: 0, left: 0 },
        ])
        .toFile(out);
      withText += 1;
    } catch (err) {
      // Fallback: solid-color JPG without text — still a visually valid JPEG.
      console.warn(`[generate-demo-images] text overlay failed for ${label}, writing solid color: ${err.message}`);
      await sharp({
        create: { width: WIDTH, height: HEIGHT, channels: 3, background: bg },
      })
        .jpeg({ quality: 85 })
        .toFile(out);
      solidOnly += 1;
    }

    const size = fs.statSync(out).size;
    console.log(`[generate-demo-images] ${path.basename(out)}  bg=${bg}  ${size} bytes`);
  }

  console.log('');
  console.log(`[generate-demo-images] Done: 25 files (${withText} with text, ${solidOnly} solid-color fallback) in ${OUT_DIR}`);
};

run().catch((err) => {
  console.error('[generate-demo-images] Failed:', err.message);
  process.exit(1);
});
