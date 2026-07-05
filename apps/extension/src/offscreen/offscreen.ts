import { detectContent, clearCache } from '@swovid/detection';
import type { DetectionInput, DetectionResult } from '@swovid/detection';
import { MSG } from '../shared/constants';

// ─────────────────────────────────────────────────────────────
// Offscreen document — runs image detection off the service worker.
// A full document context can spawn Web Workers and instantiate WASM
// (required by the C2PA SDK), neither of which MV3 service workers allow.
//
// Flow:  content script → service worker → (here) offscreen → back
// The offscreen document also fetches the image blob itself, using the
// extension's host permissions (no page CORS restriction).
// ─────────────────────────────────────────────────────────────

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type === MSG.OFFSCREEN_DETECT) {
    runDetection(message).then(sendResponse).catch(() => sendResponse(null));
    return true; // async response
  }

  if (message?.type === MSG.OFFSCREEN_CLEAR_CACHE) {
    clearCache();
    sendResponse({ ok: true });
    return; // sync
  }

  return undefined;
});

async function runDetection(
  message: { src: string; contentHash: string },
): Promise<DetectionResult | null> {
  try {
    const response = await fetch(message.src, { mode: 'cors' });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const blob = await response.blob();

    const input: DetectionInput = {
      blob,
      src: message.src,
      contentHash: message.contentHash,
      type: 'image',
    };

    return await detectContent(input);
  } catch (err) {
    if (process.env.NODE_ENV === 'development') {
      console.warn('[SwoVid offscreen] Detection failed for', message.src, err);
    }
    return null;
  }
}
