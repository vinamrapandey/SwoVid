import type { DetectionResult } from '@swovid/detection';
import { getSettings, saveSettings, isOnboarded, getPageSummary } from '../shared/storage';
import { MSG, OFFSCREEN_PATH } from '../shared/constants';

// ─────────────────────────────────────────────────────────────
// Service worker — handles:
// 1. Image detection requests from content scripts (delegated to the
//    offscreen document, which can run WASM + Web Workers)
// 2. Settings reads/writes
// 3. Onboarding tab on first install
// 4. Context menu setup
// ─────────────────────────────────────────────────────────────

// ── First install: open onboarding
chrome.runtime.onInstalled.addListener(async details => {
  if (details.reason === 'install') {
    const onboarded = await isOnboarded();
    if (!onboarded) {
      chrome.tabs.create({ url: chrome.runtime.getURL('src/onboarding/index.html') });
    }
  }

  // Context menu: right-click any image → deep scan
  chrome.contextMenus.create({
    id: 'swovid-scan',
    title: 'Check with SwoVid',
    contexts: ['image'],
  });
});

// ── Context menu click
chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === 'swovid-scan' && info.srcUrl && tab?.id) {
    chrome.tabs.sendMessage(tab.id, {
      type: MSG.DETECT_IMAGE,
      src: info.srcUrl,
      forced: true,
    });
  }
});

// ── Message handler
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === MSG.GET_SETTINGS) {
    getSettings().then(sendResponse);
    return true; // Keep channel open for async response
  }

  if (message.type === MSG.SETTINGS_UPDATED) {
    saveSettings(message.settings).then(() => sendResponse({ ok: true }));
    return true;
  }

  if (message.type === MSG.GET_PAGE_SUMMARY) {
    const tabId = sender.tab?.id;
    if (!tabId) { sendResponse(null); return; }
    getPageSummary(tabId).then(sendResponse);
    return true;
  }

  if (message.type === MSG.DETECT_IMAGE) {
    handleDetection(message).then(sendResponse);
    return true;
  }

  if (message.type === MSG.OPEN_SETTINGS) {
    chrome.runtime.openOptionsPage();
    sendResponse({ ok: true });
  }

  return undefined;
});

// ─────────────────────────────────────────────────────────────
// Offscreen document lifecycle. Created lazily on first detection and
// reused for the rest of the session.
// ─────────────────────────────────────────────────────────────
let creating: Promise<void> | null = null;

async function ensureOffscreen(): Promise<void> {
  const offscreenUrl = chrome.runtime.getURL(OFFSCREEN_PATH);

  // Already open?
  const existing = await chrome.runtime.getContexts({
    contextTypes: [chrome.runtime.ContextType.OFFSCREEN_DOCUMENT],
    documentUrls: [offscreenUrl],
  });
  if (existing.length > 0) return;

  // A creation is already in flight — wait for it (avoids the
  // "Only a single offscreen document may be created" error).
  if (creating) {
    await creating;
    return;
  }

  creating = chrome.offscreen.createDocument({
    url: OFFSCREEN_PATH,
    reasons: [chrome.offscreen.Reason.WORKERS],
    justification:
      'Run C2PA (WASM + Web Worker) and EXIF image detection, which cannot run in the service worker.',
  });
  try {
    await creating;
  } finally {
    creating = null;
  }
}

async function handleDetection(
  message: { src: string; contentHash: string },
): Promise<DetectionResult | null> {
  try {
    await ensureOffscreen();
    const result: DetectionResult | null = await chrome.runtime.sendMessage({
      type: MSG.OFFSCREEN_DETECT,
      src: message.src,
      contentHash: message.contentHash,
    });
    return result ?? null;
  } catch (err) {
    if (process.env.NODE_ENV === 'development') {
      console.warn('[SwoVid SW] Detection failed for', message.src, err);
    }
    return null;
  }
}
