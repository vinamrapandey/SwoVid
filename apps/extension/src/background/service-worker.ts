import { detectContent, clearCache } from '@swovid/detection';
import type { DetectionInput } from '@swovid/detection';
import { getSettings, saveSettings, isOnboarded, markOnboarded, getPageSummary } from '../shared/storage';
import { MSG } from '../shared/constants';

// ─────────────────────────────────────────────────────────────
// Service worker — handles:
// 1. Image detection requests from content scripts
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

  // Clear detection cache on extension update
  clearCache();
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
    handleDetection(message, sender).then(sendResponse);
    return true;
  }

  if (message.type === MSG.OPEN_SETTINGS) {
    chrome.runtime.openOptionsPage();
    sendResponse({ ok: true });
  }
});

// ── Clear cache when tab navigates
chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
  if (changeInfo.status === 'loading') {
    clearCache();
  }
});

async function handleDetection(
  message: { src: string; blob?: string; contentHash: string },
  _sender: chrome.runtime.MessageSender,
): Promise<ReturnType<typeof detectContent>> {
  try {
    // Fetch the image as a blob
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
      console.warn('[SwoVid SW] Detection failed for', message.src, err);
    }
    throw err;
  }
}
