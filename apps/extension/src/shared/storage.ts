import type { SwoVidSettings, PageScanSummary } from '@swovid/detection';
import { DEFAULT_SETTINGS } from '@swovid/detection';

// ─────────────────────────────────────────────────────────────
// Type-safe wrappers around chrome.storage.local
// ─────────────────────────────────────────────────────────────

export async function getSettings(): Promise<SwoVidSettings> {
  return new Promise(resolve => {
    chrome.storage.local.get('settings', result => {
      resolve({ ...DEFAULT_SETTINGS, ...(result.settings ?? {}) });
    });
  });
}

export async function saveSettings(settings: SwoVidSettings): Promise<void> {
  return new Promise(resolve => {
    chrome.storage.local.set({ settings }, resolve);
  });
}

export async function isOnboarded(): Promise<boolean> {
  return new Promise(resolve => {
    chrome.storage.local.get('onboarded', result => {
      resolve(result.onboarded === true);
    });
  });
}

export async function markOnboarded(): Promise<void> {
  return new Promise(resolve => {
    chrome.storage.local.set({ onboarded: true }, resolve);
  });
}

export async function getPageSummary(tabId: number): Promise<PageScanSummary> {
  return new Promise(resolve => {
    chrome.storage.local.get(`pageSummary_${tabId}`, result => {
      resolve(result[`pageSummary_${tabId}`] ?? {
        total: 0, verifiedAi: 0, likelyAi: 0, human: 0, unknown: 0,
      });
    });
  });
}

export async function savePageSummary(tabId: number, summary: PageScanSummary): Promise<void> {
  return new Promise(resolve => {
    chrome.storage.local.set({ [`pageSummary_${tabId}`]: summary }, resolve);
  });
}
