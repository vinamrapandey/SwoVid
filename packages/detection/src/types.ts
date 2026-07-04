// ─────────────────────────────────────────────────────────────
// Core types for the SwoVid detection system.
// All detection providers implement DetectionProvider.
// Application code NEVER calls providers directly —
// always use the DetectionOrchestrator.
// ─────────────────────────────────────────────────────────────

export type ContentType = 'image' | 'video';

export type VerdictState =
  | 'verified_human'   // C2PA cryptographic proof — 100% certain
  | 'verified_ai'      // C2PA / watermark proof — 100% certain
  | 'likely_ai'        // Multiple probabilistic signals agree — high confidence
  | 'possibly_ai'      // Single probabilistic signal — moderate confidence
  | 'unverifiable';    // Insufficient signals — honest, no guess made

export interface DetectionSignal {
  layer: number;
  name: string;           // e.g. "C2PA Content Credentials"
  description: string;    // What this layer checks
  verdict: VerdictState | null;
  confidence: number;     // 0–100
  detail: string;         // Plain English: what was found e.g. "Software: Stable Diffusion"
  certain: boolean;       // true = cryptographic proof, not probabilistic
  available: boolean;     // false = placeholder, not yet implemented
  comingIn?: string;      // e.g. "V2" — shown in UI for unavailable layers
  durationMs: number;
}

export interface DetectionResult {
  verdict: VerdictState;
  confidence: number;
  signals: DetectionSignal[];
  totalDurationMs: number;
  fromCache: boolean;
}

export interface DetectionInput {
  blob: Blob;
  src: string;            // Original image URL
  contentHash: string;    // SHA-256 hex string — used for cache key
  type: ContentType;
}

export interface DetectionProvider {
  layer: number;
  name: string;
  description: string;
  supportedTypes: readonly ContentType[];
  certain: boolean;
  runsLocal: boolean;
  available: boolean;     // If false: return stub signal, do not run detection
  detect(input: DetectionInput): Promise<DetectionSignal>;
}

export interface SwoVidSettings {
  scanMode: 'auto' | 'ondemand' | 'hover';
  badgeStyle: 'standard' | 'minimal' | 'verbose';
  badgePosition: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';
  minImageSize: number;   // px — skip images smaller than this
  enabled: boolean;       // Global on/off
}

export interface PageScanSummary {
  total: number;
  verifiedAi: number;
  likelyAi: number;
  human: number;
  unknown: number;
}
