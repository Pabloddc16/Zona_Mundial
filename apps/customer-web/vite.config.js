import { defineConfig } from 'vite';
import { readdir, stat, unlink } from 'node:fs/promises';
import { resolve, join } from 'node:path';

/**
 * Strip the onnxruntime-web WASM binary from the build output.
 *
 * Why: when Vite bundles `@imgly/background-removal`, it pulls in
 * onnxruntime-web and emits ~23 MB of `ort-wasm-simd-threaded.jsep-*.wasm`
 * into `dist/assets/`. At runtime imgly fetches its own copy of that WASM
 * from `staticimgly.com` and sets `ort.env.wasm.wasmPaths` to that blob URL
 * BEFORE onnxruntime-web ever tries to fetch the bundled file — so the file
 * Vite emits is never actually loaded by users. It just sits in the deploy
 * eating storage and acting as a target for bots/crawlers that enumerate
 * `/assets/`. Each rogue 23 MB hit chips away at Netlify's monthly
 * bandwidth quota; Netlify started returning 503 "usage_exceeded" once the
 * cumulative weight of these scans exhausted the free tier.
 *
 * The `_redirects` file maps any residual request to jsDelivr's public
 * CDN, so even a stray fetch never bills Netlify.
 */
function stripOnnxWasm() {
  return {
    name: 'strip-onnx-wasm',
    apply: 'build',
    closeBundle: {
      sequential: true,
      order: 'post',
      async handler() {
        const dir = resolve(process.cwd(), 'dist/assets');
        let entries;
        try { entries = await readdir(dir); }
        catch { return; }
        const targets = entries.filter((f) =>
          /^ort-wasm-simd-threaded\.jsep-.*\.wasm$/.test(f)
        );
        for (const f of targets) {
          const p = join(dir, f);
          const { size } = await stat(p);
          await unlink(p);
          // eslint-disable-next-line no-console
          console.log(`[strip-onnx-wasm] removed ${f} (${(size / 1024 / 1024).toFixed(1)} MB)`);
        }
      },
    },
  };
}

export default defineConfig({
  base: './',
  plugins: [stripOnnxWasm()],
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
});
