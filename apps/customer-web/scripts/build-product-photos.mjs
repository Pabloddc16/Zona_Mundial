/* Generate catalog-style WebP photos for the Tienda from the existing
 * Panini Mundial 2026 product photos cropped from Rappi (public/products/*.jpg).
 *
 * Output: public/images/productos/{caja-100-sobres,sobre,album-hardcover,
 *   album-softcover,combo}.webp at <=600x600, optimized to <80KB each.
 *
 * Sources:
 *   - public/products/caja.jpg   (origin: Rappi listing screenshot, IMG_3177)
 *   - public/products/sobre.jpg  (origin: Rappi detail screenshot,  IMG_3178)
 *   - public/products/album.jpg  (origin: Rappi listing screenshot, IMG_3177)
 *
 * Hardcover/softcover Panini albums share the same cover artwork — the binding
 * is the only physical difference — so both files are derived from album.jpg.
 *
 * Run: node scripts/build-product-photos.mjs
 */
import sharp from "sharp";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, "..");
const SRC = (n) => resolve(root, `public/products/${n}.jpg`);
const OUT = (n) => resolve(root, `public/images/productos/${n}.webp`);

const SIZE = 600;
const QUALITY = 82;

async function emit(srcPath, name){
  // Trim near-white borders so the product sits flush on the colored card
  // gradient instead of showing a white rectangle frame. ensureAlpha gives us
  // a transparent background outside the trimmed bounding box.
  const buf = await sharp(srcPath)
    .ensureAlpha()
    .trim({ background: "#ffffff", threshold: 12 })
    .resize(SIZE, SIZE, { fit: "contain", background: { r:255,g:255,b:255,alpha:0 } })
    .webp({ quality: QUALITY, effort: 6, alphaQuality: 90 })
    .toBuffer();
  await sharp(buf).toFile(OUT(name));
  const meta = await sharp(buf).metadata();
  const kb = (buf.length/1024).toFixed(1);
  console.log(`✓ ${name}.webp ${meta.width}x${meta.height} ${kb}KB`);
}

// 1) Single-product photos — re-encode existing 800x800 sources.
await emit(SRC("caja"),  "caja-100-sobres");
await emit(SRC("sobre"), "sobre");
await emit(SRC("album"), "album-hardcover");
await emit(SRC("album"), "album-softcover"); // same official cover artwork

// 2) Combo: caja (back-left) + álbum (back-right) + sobre (front-center),
//    catalog style, transparent background so card gradient shows through.
async function trimmed(srcPath, w){
  return sharp(srcPath)
    .ensureAlpha()
    .trim({ background: "#ffffff", threshold: 12 })
    .resize(w, w, { fit: "contain", background: { r:255,g:255,b:255,alpha:0 } })
    .png().toBuffer();
}

const baseW = SIZE, baseH = SIZE;
const cajaW = 360, albumW = 360, sobreW = 320;

const cajaPng  = await trimmed(SRC("caja"),  cajaW);
const albumPng = await trimmed(SRC("album"), albumW);
const sobrePng = await trimmed(SRC("sobre"), sobreW);

const comboBuf = await sharp({
  create: { width: baseW, height: baseH, channels: 4, background: { r:255,g:255,b:255,alpha:0 } },
})
  .composite([
    { input: albumPng, left: baseW - albumW - 10, top: 30 },
    { input: cajaPng,  left: 10,  top: 50 },
    { input: sobrePng, left: Math.round((baseW - sobreW)/2), top: baseH - sobreW + 20 },
  ])
  .webp({ quality: QUALITY, effort: 6, alphaQuality: 90 })
  .toBuffer();
await sharp(comboBuf).toFile(OUT("combo"));
const comboMeta = await sharp(comboBuf).metadata();
console.log(`✓ combo.webp ${comboMeta.width}x${comboMeta.height} ${(comboBuf.length/1024).toFixed(1)}KB`);

console.log("done");
