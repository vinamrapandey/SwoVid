import type { DetectionInput, DetectionProvider, DetectionSignal } from '../types';
import { AI_C2PA_SOURCE_TYPES, HUMAN_C2PA_SOURCE_TYPES } from '../constants';

// c2pa-js is loaded lazily — WASM initialisation is expensive
// and only needs to happen once per session.
let c2paInstance: Awaited<ReturnType<typeof import('@contentauth/sdk').createC2pa>> | null = null;

async function getC2PA() {
  if (c2paInstance) return c2paInstance;
  const { createC2pa } = await import('@contentauth/sdk');
  c2paInstance = await createC2pa({
    wasmSrc: chrome.runtime.getURL('wasm/toolkit_bg.wasm'),
    workerSrc: chrome.runtime.getURL('wasm/worker.js'),
  });
  return c2paInstance;
}

export class C2PAProvider implements DetectionProvider {
  layer = 1;
  name = 'C2PA Content Credentials';
  description = 'Cryptographically signed certificate proving whether content was made by AI or a camera';
  supportedTypes = ['image'] as const;
  certain = true;
  runsLocal = true;
  available = true;

  async detect(input: DetectionInput): Promise<DetectionSignal> {
    const start = performance.now();

    try {
      const c2pa = await getC2PA();
      const result = await c2pa.read(input.blob);
      const manifest = result?.manifestStore?.activeManifest;

      if (!manifest) {
        return this.buildSignal(null, 0,
          'No C2PA credential found — file has no embedded provenance certificate',
          performance.now() - start);
      }

      // Extract digitalSourceType from assertions
      const assertions = manifest.assertions?.data ?? [];

      // Check c2pa.assertions for digitalSourceType
      for (const assertion of assertions) {
        const sourceType: string | undefined =
          assertion?.data?.digitalSourceType ??
          assertion?.data?.['stds.iptc.photo-metadata']?.DigitalSourceType;

        if (sourceType) {
          if (AI_C2PA_SOURCE_TYPES.some(t => sourceType.includes(t))) {
            const generator = manifest.claimGenerator?.split('/')[0] ?? 'Unknown tool';
            return this.buildSignal('verified_ai', 100,
              `C2PA credential confirms AI generation · Generator: ${generator}`,
              performance.now() - start, true);
          }
          if (HUMAN_C2PA_SOURCE_TYPES.some(t => sourceType.includes(t))) {
            const generator = manifest.claimGenerator?.split('/')[0] ?? 'Camera';
            return this.buildSignal('verified_human', 100,
              `C2PA credential confirms human/camera origin · Signed by: ${generator}`,
              performance.now() - start, true);
          }
        }
      }

      // Manifest present but no digitalSourceType — still meaningful
      const generator = manifest.claimGenerator?.split('/')[0] ?? 'Unknown';
      return this.buildSignal('unverifiable', 60,
        `C2PA credential present but no source type declared · Signed by: ${generator}`,
        performance.now() - start, false);

    } catch (err) {
      if (process.env.NODE_ENV === 'development') {
        console.warn('[SwoVid] C2PA read error:', err);
      }
      // C2PA failure is normal for images without credentials — not an error state
      return this.buildSignal(null, 0,
        'No C2PA credential — this is normal for most images online',
        performance.now() - start, false);
    }
  }

  private buildSignal(
    verdict: DetectionSignal['verdict'],
    confidence: number,
    detail: string,
    durationMs: number,
    certain = false,
  ): DetectionSignal {
    return {
      layer: this.layer,
      name: this.name,
      description: this.description,
      verdict,
      confidence,
      detail,
      certain,
      available: true,
      durationMs: Math.round(durationMs),
    };
  }
}
