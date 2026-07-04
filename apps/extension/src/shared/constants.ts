// Message types for content script ↔ service worker communication
export const MSG = {
  DETECT_IMAGE:      'DETECT_IMAGE',
  DETECTION_RESULT:  'DETECTION_RESULT',
  GET_SETTINGS:      'GET_SETTINGS',
  SETTINGS_UPDATED:  'SETTINGS_UPDATED',
  GET_PAGE_SUMMARY:  'GET_PAGE_SUMMARY',
  OPEN_SETTINGS:     'OPEN_SETTINGS',
  SCAN_PAUSED:       'SCAN_PAUSED',
} as const;

export type MessageType = typeof MSG[keyof typeof MSG];

export const SWOVID_ATTR  = 'data-swovid-scanned';
export const BADGE_CLASS  = 'swovid-badge';
export const PANEL_CLASS  = 'swovid-detail-panel';
export const WRAPPER_CLASS = 'swovid-wrapper';
