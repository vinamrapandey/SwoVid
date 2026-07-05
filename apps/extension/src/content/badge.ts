import type { DetectionResult, SwoVidSettings } from '@swovid/detection';
import { SWOVID_ATTR, BADGE_CLASS, WRAPPER_CLASS } from '../shared/constants';

// ─────────────────────────────────────────────────────────────
// Badge injection — NEVER modifies the <img> element itself.
// Creates a positioned wrapper div and injects badge as child.
// ─────────────────────────────────────────────────────────────

const VERDICT_STYLE: Record<string, { bg: string; label: string; icon: string }> = {
  verified_ai:    { bg: '#DC2626', label: 'AI',      icon: '🤖' },
  likely_ai:      { bg: '#D97706', label: 'AI',      icon: '⚠' },
  possibly_ai:    { bg: '#D97706', label: 'AI?',     icon: '?' },
  verified_human: { bg: '#16A34A', label: 'Human',   icon: '✓' },
  unverifiable:   { bg: '#94A3B8', label: '?',       icon: '?' },
};

export function injectBadge(
  img: HTMLImageElement,
  result: DetectionResult,
  settings: SwoVidSettings,
  onBadgeClick: (img: HTMLImageElement, result: DetectionResult) => void,
): void {
  // Idempotent — skip if already scanned
  if (img.dataset[SWOVID_ATTR]) return;
  img.dataset[SWOVID_ATTR] = '1';

  const config = VERDICT_STYLE[result.verdict] ?? VERDICT_STYLE.unverifiable;

  // Build badge element
  const badge = document.createElement('div');
  badge.className = BADGE_CLASS;
  badge.setAttribute('data-verdict', result.verdict);
  badge.setAttribute('role', 'img');
  badge.setAttribute('aria-label', `SwoVid: ${config.label}`);

  // Position based on settings
  const offset = '6px';
  const posStyle = getPositionStyle(settings.badgePosition, offset);

  Object.assign(badge.style, {
    position: 'absolute',
    zIndex: '2147483647',
    cursor: 'pointer',
    userSelect: 'none',
    pointerEvents: 'all',
    ...posStyle,
  });

  // Badge content based on style
  badge.innerHTML = buildBadgeHTML(config, result.confidence, settings.badgeStyle);

  // Inject CSS once
  ensureBadgeStyles();

  // Wrap the image if not already wrapped
  const wrapper = ensureWrapper(img);
  wrapper.appendChild(badge);

  // Click handler → detail panel
  badge.addEventListener('click', e => {
    e.preventDefault();
    e.stopPropagation();
    onBadgeClick(img, result);
  });
}

export function updateBadge(img: HTMLImageElement, result: DetectionResult, settings: SwoVidSettings): void {
  // Remove existing badge and re-inject with new result
  const wrapper = img.parentElement;
  if (wrapper?.classList.contains(WRAPPER_CLASS)) {
    const existing = wrapper.querySelector(`.${BADGE_CLASS}`);
    if (existing) existing.remove();
  }
  delete img.dataset[SWOVID_ATTR];
}

export function showScanningBadge(img: HTMLImageElement, settings: SwoVidSettings): HTMLElement | null {
  if (img.dataset[SWOVID_ATTR]) return null;

  const badge = document.createElement('div');
  badge.className = `${BADGE_CLASS} swovid-scanning`;

  const offset = '6px';
  const posStyle = getPositionStyle(settings.badgePosition, offset);

  Object.assign(badge.style, {
    position: 'absolute',
    zIndex: '2147483647',
    ...posStyle,
  });

  badge.innerHTML = `
    <div style="
      display:inline-flex;align-items:center;gap:3px;
      padding:3px 6px;background:rgba(15,36,68,0.85);
      border-radius:4px;color:#fff;font-size:10px;
      font-family:system-ui,sans-serif;font-weight:700;
      backdrop-filter:blur(4px);
    ">
      <span class="swovid-spinner"></span>
    </div>
  `;

  ensureBadgeStyles();
  const wrapper = ensureWrapper(img);
  wrapper.appendChild(badge);
  return badge;
}

// ── Helpers ──────────────────────────────────────────────────

function getPositionStyle(position: SwoVidSettings['badgePosition'], offset: string) {
  const map: Record<SwoVidSettings['badgePosition'], object> = {
    'bottom-right': { bottom: offset, right: offset },
    'bottom-left':  { bottom: offset, left: offset },
    'top-right':    { top: offset, right: offset },
    'top-left':     { top: offset, left: offset },
  };
  return map[position] ?? map['bottom-right'];
}

function buildBadgeHTML(
  config: { bg: string; label: string; icon: string },
  confidence: number,
  style: SwoVidSettings['badgeStyle'],
) {
  if (style === 'minimal') {
    return `<div style="
      width:10px;height:10px;border-radius:50%;
      background:${config.bg};
      box-shadow:0 0 0 1.5px rgba(255,255,255,0.85);
    "></div>`;
  }

  const confidenceSpan = (style === 'verbose' && confidence > 0)
    ? `<span style="opacity:0.85"> ${confidence}%</span>` : '';

  return `
    <div style="
      display:inline-flex;align-items:center;gap:3px;
      padding:2px 5px;background:${config.bg};border-radius:4px;
      color:#fff;font-size:10px;font-family:system-ui,sans-serif;
      font-weight:700;line-height:1;white-space:nowrap;
      box-shadow:0 1px 4px rgba(0,0,0,0.3);
      backdrop-filter:blur(4px);
    ">
      <span>${config.icon}</span>
      <span>${config.label}</span>
      ${confidenceSpan}
    </div>
  `;
}

function ensureWrapper(img: HTMLImageElement): HTMLElement {
  const parent = img.parentElement;

  // Already wrapped
  if (parent?.classList.contains(WRAPPER_CLASS)) {
    return parent as HTMLElement;
  }

  const wrapper = document.createElement('div');
  wrapper.className = WRAPPER_CLASS;
  Object.assign(wrapper.style, {
    position: 'relative',
    display: 'inline-block',
    lineHeight: '0',
  });

  img.parentElement?.insertBefore(wrapper, img);
  wrapper.appendChild(img);
  return wrapper;
}

let stylesInjected = false;
function ensureBadgeStyles(): void {
  if (stylesInjected) return;
  stylesInjected = true;

  const style = document.createElement('style');
  style.id = 'swovid-styles';
  style.textContent = `
    .swovid-badge { pointer-events: all !important; }
    .swovid-badge:hover { opacity: 0.9; transform: scale(1.05); transition: transform 0.1s; }
    @keyframes swovid-spin { to { transform: rotate(360deg); } }
    .swovid-spinner {
      display: inline-block; width: 8px; height: 8px;
      border: 1.5px solid rgba(255,255,255,0.3);
      border-top-color: #fff; border-radius: 50%;
      animation: swovid-spin 0.6s linear infinite;
    }
  `;
  document.head.appendChild(style);
}
