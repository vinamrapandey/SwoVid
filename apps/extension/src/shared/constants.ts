// Message types for content script ↔ service worker communication
export const MSG = {
  DETECT_IMAGE:      'DETECT_IMAGE',
  DETECTION_RESULT:  'DETECTION_RESULT',
  GET_SETTINGS:      'GET_SETTINGS',
  SETTINGS_UPDATED:  'SETTINGS_UPDATED',
  GET_PAGE_SUMMARY:  'GET_PAGE_SUMMARY',
  OPEN_SETTINGS:     'OPEN_SETTINGS',
  SCAN_PAUSED:       'SCAN_PAUSED',
  // Service worker → offscreen document: run detection (WASM/Worker capable).
  OFFSCREEN_DETECT:  'OFFSCREEN_DETECT',
  OFFSCREEN_CLEAR_CACHE: 'OFFSCREEN_CLEAR_CACHE',
} as const;

// Path (extension-root-relative) to the offscreen document that hosts detection.
export const OFFSCREEN_PATH = 'src/offscreen/index.html';

export type MessageType = typeof MSG[keyof typeof MSG];

// NOTE: read/written via `img.dataset[SWOVID_ATTR]`, so this must be the
// camelCase dataset key (maps to the DOM attribute `data-swovid-scanned`),
// NOT the literal attribute name — otherwise the "already scanned" guard breaks.
export const SWOVID_ATTR  = 'swovidScanned';
export const BADGE_CLASS  = 'swovid-badge';
export const PANEL_CLASS  = 'swovid-detail-panel';
export const WRAPPER_CLASS = 'swovid-wrapper';
