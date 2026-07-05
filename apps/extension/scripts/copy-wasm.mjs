// Cross-platform copy of the c2pa WASM + worker assets into public/wasm/
// so they can be served as web_accessible_resources at runtime.
// Runs as the extension's `prebuild` step.
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { mkdirSync, copyFileSync } from 'node:fs';

const require = createRequire(import.meta.url);
const here = dirname(fileURLToPath(import.meta.url));

// Resolve the installed c2pa package directory. c2pa is a dependency of
// @swovid/detection (not of the extension), so resolve it from there under
// pnpm's strict node_modules layout.
const detectionDir = join(here, '..', '..', '..', 'packages', 'detection');
const c2paPkg = require.resolve('c2pa/package.json', { paths: [detectionDir] });
const c2paDir = dirname(c2paPkg);

const destDir = join(here, '..', 'public', 'wasm');
mkdirSync(destDir, { recursive: true });

// [source relative to c2pa dist, destination filename used by c2pa.ts getURL()]
const files = [
  ['dist/assets/wasm/toolkit_bg.wasm', 'toolkit_bg.wasm'],
  ['dist/c2pa.worker.min.js', 'worker.js'],
];

for (const [src, destName] of files) {
  const from = join(c2paDir, src);
  const to = join(destDir, destName);
  copyFileSync(from, to);
  console.log(`[copy-wasm] ${src} -> public/wasm/${destName}`);
}
