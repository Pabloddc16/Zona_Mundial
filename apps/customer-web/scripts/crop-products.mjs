/* Crop product images from the user-provided Rappi screenshots.
 * Run: node scripts/crop-products.mjs */
import sharp from "sharp";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, "..");
const out = (name) => resolve(root, `public/products/${name}.jpg`);

// Source screenshots are 1206x2622 (iPhone screenshots)
const SRC_LIST = "/Users/pablo/Downloads/IMG_3177.PNG"; // listing page (album + caja)
const SRC_DETAIL = "/Users/pablo/Downloads/IMG_3178.PNG"; // page that has the loose sobre

async function process(src, region, outName){
  // No trim() — the screenshots have content adjacent to the product so
  // trim incorrectly cropped into the product itself. Use exact bounds.
  const buf = await sharp(src)
    .extract(region)
    .resize(800, 800, { fit: "contain", background: "#ffffff" })
    .flatten({ background: "#ffffff" })
    .jpeg({ quality: 88, progressive: true })
    .toBuffer();
  await sharp(buf).toFile(out(outName));
  const meta = await sharp(buf).metadata();
  console.log(`✓ ${outName}.jpg ${meta.width}x${meta.height} (${buf.length} bytes)`);
}

// Exact crop boxes around each product (1206x2622 source).
// Crops below the "+" button (~y<1215) and above the "NEW" badge (~y>1540).
await process(SRC_LIST, { left: 110, top: 1220, width: 400, height: 315 }, "album");
await process(SRC_LIST, { left: 585, top: 1220, width: 400, height: 315 }, "caja");
await process(SRC_DETAIL, { left: 170, top: 1330, width: 510, height: 365 }, "sobre");

console.log("done");
