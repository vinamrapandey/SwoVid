import type { DetectionInput, DetectionProvider, DetectionResult } from './types';
import { synthesiseVerdict } from './synthesis';
import { C2PAProvider } from './providers/c2pa';
import { EXIFProvider } from './providers/exif';
import { StableSignatureProvider, VideoSealProvider, SwoVidModelProvider } from './providers/stubs';

// ─────────────────────────────────────────────────────────────
// In-memory cache: content hash → DetectionResult
// Cleared on each page navigation (content script re-runs)
// ─────────────────────────────────────────────────────────────
const cache = new Map<string, DetectionResult>();

// All providers registered here — ordered by layer number
const providers: DetectionProvider[] = [
  new C2PAProvider(),
  new EXIFProvider(),
  StableSignatureProvider,
  VideoSealProvider,
  SwoVidModelProvider,
];

export async function detectContent(input: DetectionInput): Promise<DetectionResult> {
  // ── Cache check
  const cached = cache.get(input.contentHash);
  if (cached) {
    return { ...cached, fromCache: true };
  }

  const start = performance.now();

  // ── Run all providers in parallel (available ones run real detection,
  //    stubs return immediately with placeholder signals)
  const signalPromises = providers
    .filter(p => p.supportedTypes.includes(input.type))
    .map(async provider => {
      try {
        return await provider.detect(input);
      } catch (err) {
        if (process.env.NODE_ENV === 'development') {
          console.warn(`[SwoVid] Provider ${provider.name} failed:`, err);
        }
        // Return a safe fallback signal — never throw
        return {
          layer: provider.layer,
          name: provider.name,
          description: provider.description,
          verdict: null as null,
          confidence: 0,
          detail: 'Detection failed for this layer',
          certain: false,
          available: false,
          durationMs: 0,
        };
      }
    });

  const signals = await Promise.all(signalPromises);

  // ── If we get a certain verdict early (C2PA), we still show all signals
  //    in the UI — we just don't need to wait for slow providers
  const result = synthesiseVerdict(signals, Math.round(performance.now() - start));

  // ── Store in cache
  cache.set(input.contentHash, result);

  return result;
}

export function clearCache(): void {
  cache.clear();
}

export function getCacheSize(): number {
  return cache.size;
}
