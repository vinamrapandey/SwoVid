import type { DetectionResult, SwoVidSettings } from '@swovid/detection';
import { injectBadge, showScanningBadge } from './badge';
import { showDetailPanel } from './detail-panel';
import { getSettings } from '../shared/storage';
import { MSG, SWOVID_ATTR } from '../shared/constants';

// ─────────────────────────────────────────────────────────────
// Scanner — the content script entry point.
// Uses MutationObserver + IntersectionObserver to detect
// and scan all images on the page, including dynamically
// added ones (infinite scroll, SPAs, lazy loading).
// ─────────────────────────────────────────────────────────────

let settings: SwoVidSettings | null = null;
let enabled = true;

// SHA-256 content hash using Web Crypto API
async function hashUrl(url: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(url);
  const buffer = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(buffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

async function getOrLoadSettings(): Promise<SwoVidSettings> {
  if (settings) return settings;
  settings = await new Promise(resolve => {
    chrome.runtime.sendMessage({ type: MSG.GET_SETTINGS }, resolve);
  });
  return settings!;
}

// ── Main scan function for a single image ──
async function scanImage(img: HTMLImageElement): Promise<void> {
  const s = await getOrLoadSettings();

  if (!s.enabled || !enabled) return;
  if (img.dataset[SWOVID_ATTR]) return; // Already scanned

  // Size filter
  const w = img.naturalWidth || img.offsetWidth;
  const h = img.naturalHeight || img.offsetHeight;
  if (w < s.minImageSize || h < s.minImageSize) return;

  // Skip data URIs and SVGs (cannot be fetched cross-origin for WASM processing)
  if (!img.src || img.src.startsWith('data:image/svg') || img.src.endsWith('.svg')) return;
  if (!img.src.startsWith('http')) return;

  // Show scanning indicator
  const scanningBadge = showScanningBadge(img, s);

  try {
    const contentHash = await hashUrl(img.src);

    const result = await new Promise<DetectionResult>((resolve, reject) => {
      chrome.runtime.sendMessage(
        { type: MSG.DETECT_IMAGE, src: img.src, contentHash },
        response => {
          if (chrome.runtime.lastError) {
            reject(chrome.runtime.lastError);
          } else {
            resolve(response);
          }
        }
      );
    });

    // Remove scanning badge
    scanningBadge?.remove();

    // Detection may return null (fetch/detection failed) — treat as an error
    // so we don't crash injecting a badge for a missing result.
    if (!result) throw new Error('empty detection result');

    // Inject result badge
    injectBadge(img, result, s, (clickedImg, clickedResult) => {
      const rect = clickedImg.getBoundingClientRect();
      showDetailPanel(
        clickedImg, clickedResult,
        rect.right + window.scrollX,
        rect.top + window.scrollY,
      );
    });

  } catch (err) {
    if (process.env.NODE_ENV === 'development') {
      console.warn('[SwoVid] Scan failed for', img.src, err);
    }
    scanningBadge?.remove();
    // Mark as scanned anyway to prevent retry loops
    img.dataset[SWOVID_ATTR] = 'error';
  }
}

// ── IntersectionObserver: only scan visible images ──
const intersectionObserver = new IntersectionObserver(
  entries => {
    for (const entry of entries) {
      if (entry.isIntersecting) {
        const img = entry.target as HTMLImageElement;
        intersectionObserver.unobserve(img);

        if (settings?.scanMode === 'auto' || settings?.scanMode === undefined) {
          scanImage(img);
        }
      }
    }
  },
  { rootMargin: '200px' } // Scan images 200px before they enter viewport
);

// ── Queue an image for scanning ──
function queueImage(img: HTMLImageElement): void {
  if (img.dataset[SWOVID_ATTR]) return;
  if (!img.src || !img.src.startsWith('http')) return;

  // Wait for image to load if it hasn't yet
  if (!img.complete || img.naturalWidth === 0) {
    img.addEventListener('load', () => intersectionObserver.observe(img), { once: true });
  } else {
    intersectionObserver.observe(img);
  }
}

// ── MutationObserver: catch dynamically added images ──
const mutationObserver = new MutationObserver(mutations => {
  for (const mutation of mutations) {
    for (const node of mutation.addedNodes) {
      if (node.nodeType !== Node.ELEMENT_NODE) continue;

      const el = node as Element;

      // The node itself might be an image
      if (el.tagName === 'IMG') {
        queueImage(el as HTMLImageElement);
        continue;
      }

      // Or it might contain images
      const imgs = el.querySelectorAll<HTMLImageElement>('img');
      imgs.forEach(queueImage);
    }
  }
});

// ── Handle right-click context menu scan ──
chrome.runtime.onMessage.addListener((message) => {
  if (message.type === MSG.DETECT_IMAGE && message.forced && message.src) {
    const img = document.querySelector<HTMLImageElement>(`img[src="${message.src}"]`);
    if (img) {
      // Force re-scan by clearing the scanned flag
      delete img.dataset[SWOVID_ATTR];
      scanImage(img);
    }
  }

  if (message.type === MSG.SETTINGS_UPDATED) {
    settings = message.settings;
  }

  if (message.type === MSG.SCAN_PAUSED) {
    enabled = !message.paused;
  }
});

// ── Initialise on page load ──
async function init(): Promise<void> {
  const s = await getOrLoadSettings();
  if (!s.enabled) return;

  // Scan all existing images
  const allImages = document.querySelectorAll<HTMLImageElement>('img');
  allImages.forEach(queueImage);

  // Watch for new images
  mutationObserver.observe(document.body, {
    childList: true,
    subtree: true,
  });
}

// Run
init().catch(err => {
  if (process.env.NODE_ENV === 'development') {
    console.error('[SwoVid] Scanner init failed:', err);
  }
});
