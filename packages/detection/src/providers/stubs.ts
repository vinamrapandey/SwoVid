// Placeholder providers for V2 and V3 layers.
// These return stub signals that appear in the detail panel
// as "Coming in V2/V3" — no detection logic runs.

import type { DetectionInput, DetectionProvider, DetectionSignal } from '../types';

function makeStub(
  layer: number,
  name: string,
  description: string,
  comingIn: string,
): DetectionProvider {
  return {
    layer,
    name,
    description,
    supportedTypes: ['image', 'video'],
    certain: false,
    runsLocal: false,
    available: false,
    async detect(_input: DetectionInput): Promise<DetectionSignal> {
      return {
        layer,
        name,
        description,
        verdict: null,
        confidence: 0,
        detail: `This detection layer is coming in ${comingIn}`,
        certain: false,
        available: false,
        comingIn,
        durationMs: 0,
      };
    },
  };
}

export const StableSignatureProvider = makeStub(
  3,
  'Stable Signature',
  'Invisible pixel-level watermark detector for Stable Diffusion and FLUX generated images',
  'V2',
);

export const VideoSealProvider = makeStub(
  4,
  'Video Seal (Meta AI)',
  'Invisible watermark detector for AI-generated video from Meta AI tools',
  'V2',
);

export const SwoVidModelProvider = makeStub(
  5,
  'SwoVid Detection Model',
  'Proprietary AI detection model trained on open datasets — runs on-device via ONNX',
  'V3',
);
