/* Render PWA icons from public/icons/icon-master.svg using sharp.
 * Run: node scripts/render-icons.mjs */
import sharp from "sharp";
import { readFile, writeFile } from "node:fs/promises";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, "..");
const svgPath = resolve(root, "public/icons/icon-master.svg");
const out = (s) => resolve(root, `public/icons/icon-${s}.png`);

const sizes = [120, 152, 167, 180, 192, 512];

const svg = await readFile(svgPath);
for(const s of sizes){
  const png = await sharp(svg, { density: Math.max(72, Math.round(s * 1.5)) })
    .resize(s, s, { fit: "contain", background: { r:0,g:0,b:0,alpha:0 } })
    .png({ compressionLevel: 9 })
    .toBuffer();
  await writeFile(out(s), png);
  console.log(`✓ ${s}x${s} → public/icons/icon-${s}.png (${png.length} bytes)`);
}
console.log("done");
