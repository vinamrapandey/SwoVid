// ─────────────────────────────────────────────────────────────
// Known AI tool identifiers.
// Add new tools here as they emerge — this is the only file
// that needs updating when new AI generators appear.
// All strings are lowercased for case-insensitive matching.
// ─────────────────────────────────────────────────────────────

export const AI_SOFTWARE_TAGS: string[] = [
  // Stable Diffusion family
  'stable diffusion', 'automatic1111', 'comfyui', 'invoke ai',
  'dreamstudio', 'stable cascade', 'sdxl',
  // FLUX
  'flux', 'black forest labs', 'flux.1',
  // Midjourney
  'midjourney',
  // OpenAI
  'dall-e', 'dall·e', 'dalle', 'openai',
  // Adobe
  'adobe firefly', 'firefly',
  // Google
  'imagen', 'google imagen', 'veo',
  // Meta
  'emu', 'meta ai',
  // Video generators
  'sora', 'runway', 'runwayml', 'pika', 'pika labs',
  'kling', 'hailuo', 'gen-2', 'gen-3', 'luma',
  // Image generators
  'leonardo', 'leonardo ai', 'nightcafe', 'playgroundai',
  'playground ai', 'bluewillow', 'ideogram', 'microsoft designer',
  'canva ai', 'getimg', 'tensor.art', 'civitai', 'novel ai',
  'wombo', 'dream', 'craiyon', 'fotor', 'pixlr ai',
  'jasper art', 'starryai', 'deep dream', 'artbreeder',
];

// IPTC DigitalSourceType values that indicate AI generation
export const AI_IPTC_SOURCE_TYPES: string[] = [
  'http://cv.iptc.org/newscodes/digitalsourcetype/trainedAlgorithmicMedia',
  'http://cv.iptc.org/newscodes/digitalsourcetype/compositeWithTrainedAlgorithmicMedia',
  'trainedAlgorithmicMedia',
  'compositeWithTrainedAlgorithmicMedia',
];

// IPTC values that confirm human/camera origin
export const HUMAN_IPTC_SOURCE_TYPES: string[] = [
  'http://cv.iptc.org/newscodes/digitalsourcetype/digitalCapture',
  'http://cv.iptc.org/newscodes/digitalsourcetype/negativeFilm',
  'http://cv.iptc.org/newscodes/digitalsourcetype/positiveFilm',
  'http://cv.iptc.org/newscodes/digitalsourcetype/print',
  'digitalCapture',
  'negativeFilm',
];

// C2PA digitalSourceType values indicating AI
export const AI_C2PA_SOURCE_TYPES: string[] = [
  'http://cv.iptc.org/newscodes/digitalsourcetype/trainedAlgorithmicMedia',
  'http://cv.iptc.org/newscodes/digitalsourcetype/compositeWithTrainedAlgorithmicMedia',
];

// C2PA values indicating human/camera
export const HUMAN_C2PA_SOURCE_TYPES: string[] = [
  'http://cv.iptc.org/newscodes/digitalsourcetype/digitalCapture',
  'http://cv.iptc.org/newscodes/digitalsourcetype/negativeFilm',
  'http://cv.iptc.org/newscodes/digitalsourcetype/positiveFilm',
];

export const DEFAULT_SETTINGS: import('./types').SwoVidSettings = {
  scanMode: 'auto',
  badgeStyle: 'standard',
  badgePosition: 'bottom-right',
  minImageSize: 100,
  enabled: true,
};
