/* Generate the v2 catalog WebPs from the official Panini graphics the user
 * dropped at ~/Desktop/Panini/GRAFICOS APP ZONA MUNDIAL/.
 *
 * Output: public/images/productos/{caja-100-sobres,sobre,album-hardcover,
 *   album-softcover,combo,sobre-coca,set-coca}.webp at <=600x600, white
 *   background to match the (now white) Tienda card backgrounds, <80 KB.
 *
 * Mapping (source → product → output):
 *   11.png → ALBUM-SOFT primary  → album-softcover.webp
 *   12.png → SOBRE-1             → sobre.webp
 *   13.png → ALBUM-HARD          → album-hardcover.webp
 *   14.png → CAJA-100            → caja-100-sobres.webp
 *   15.png → COLECCION combo     → combo.webp  (dynamic sticker fountain)
 *   16.png → SOBRE-COCA          → sobre-coca.webp  (NEW)
 *   17.png → SET-COCA            → set-coca.webp    (NEW)
 *
 * Run: node scripts/build-product-photos-v2.mjs
 */
import sharp from "sharp";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, "..");
const SRC_DIR = "/Users/pablo/Desktop/Panini/GRAFICOS APP ZONA MUNDIAL";
const SRC = (n) => `${SRC_DIR}/${n}.png`;
const OUT = (n) => resolve(root, `public/images/productos/${n}.webp`);

const SIZE = 600;
const QUALITY = 82;

const TARGETS = [
  { src: 11, out: "album-softcover" },
  { src: 12, out: "sobre" },
  { src: 13, out: "album-hardcover" },
  { src: 14, out: "caja-100-sobres" },
  { src: 15, out: "combo" },
  { src: 16, out: "sobre-coca" },
  { src: 17, out: "set-coca" },
];

// Snap any near-white pixel (R,G,B all >= NEAR_WHITE) to pure 255,255,255.
// Necessary because resize anti-aliasing + WebP compression introduce a few
// thousand off-white pixels (e.g. 254,254,254, 246,246,246) that, against
// the card's pure-white background, read as a faint gray rectangle around
// the photo. Snapping eliminates the perceived boundary.
const NEAR_WHITE = 240;
async function snapNearWhiteToPureWhite(rawInputPath) {
  const { data, info } = await sharp(rawInputPath)
    .resize(SIZE, SIZE, { fit: "contain", background: "#ffffff" })
    .flatten({ background: "#ffffff" })
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const { width, height, channels } = info;
  const out = Buffer.from(data); // 3-channel RGB
  for (let i = 0; i < out.length; i += channels) {
    if (out[i] >= NEAR_WHITE && out[i + 1] >= NEAR_WHITE && out[i + 2] >= NEAR_WHITE) {
      out[i] = 255; out[i + 1] = 255; out[i + 2] = 255;
    }
  }
  return sharp(out, { raw: { width, height, channels } })
    .webp({ quality: QUALITY, effort: 6 })
    .toBuffer();
}

for (const { src, out } of TARGETS) {
  const buf = await snapNearWhiteToPureWhite(SRC(src));
  await sharp(buf).toFile(OUT(out));
  const meta = await sharp(buf).metadata();
  const kb = (buf.length / 1024).toFixed(1);
  console.log(`✓ ${out}.webp  ${meta.width}x${meta.height}  ${kb}KB  (from ${src}.png)`);
}

console.log("done");
