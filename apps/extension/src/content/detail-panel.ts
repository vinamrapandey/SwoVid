import type { DetectionResult } from '@swovid/detection';
import { PANEL_CLASS } from '../shared/constants';

// ─────────────────────────────────────────────────────────────
// Detail panel — vanilla DOM, no framework dependency.
// Rendered as a fixed overlay when user clicks a badge.
// ─────────────────────────────────────────────────────────────

let activePanel: HTMLElement | null = null;

const VERDICT_CONFIG: Record<string, { label: string; color: string; explanation: string }> = {
  verified_ai: {
    label: 'Verified AI-Generated',
    color: '#DC2626',
    explanation: 'A cryptographic C2PA certificate inside this file confirms it was created by an AI tool.',
  },
  likely_ai: {
    label: 'Likely AI-Generated',
    color: '#D97706',
    explanation: 'Multiple signals indicate AI generation. No cryptographic certificate is present.',
  },
  possibly_ai: {
    label: 'Possibly AI-Generated',
    color: '#D97706',
    explanation: 'One detection signal suggests AI generation. Confidence is moderate.',
  },
  verified_human: {
    label: 'Likely Human / Camera',
    color: '#16A34A',
    explanation: 'Signals indicate this was captured by a camera or created by a human.',
  },
  unverifiable: {
    label: 'Cannot Determine',
    color: '#94A3B8',
    explanation: 'Not enough signals to make a determination. This does not mean the image is safe.',
  },
};

export function showDetailPanel(
  img: HTMLImageElement,
  result: DetectionResult,
  clickX: number,
  clickY: number,
): void {
  closeDetailPanel();

  const config = VERDICT_CONFIG[result.verdict] ?? VERDICT_CONFIG.unverifiable;

  const panel = document.createElement('div');
  panel.className = PANEL_CLASS;

  // Build signals HTML
  const signalsHTML = result.signals.map(sig => `
    <div style="
      padding:8px;border-radius:6px;margin-bottom:6px;
      background:${sig.available ? '#F8FAFC' : '#FAFAFA'};
      opacity:${sig.available ? '1' : '0.55'};
      border:1px solid #F1F5F9;
    ">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:2px;">
        <span style="font-weight:600;font-size:12px;color:#1E293B">${sig.name}</span>
        ${sig.available
          ? `<span style="
              font-size:10px;font-weight:700;padding:1px 5px;border-radius:3px;
              background:${getVerdictBg(sig.verdict)};color:${getVerdictColor(sig.verdict)};
            ">${sig.verdict ? sig.verdict.replace('_', ' ') : 'no signal'}</span>`
          : `<span style="font-size:10px;color:#94A3B8;font-style:italic">${sig.comingIn ?? 'Soon'}</span>`
        }
      </div>
      <div style="font-size:11px;color:#64748B;line-height:1.4">${sig.detail}</div>
    </div>
  `).join('');

  panel.innerHTML = `
    <div style="
      position:fixed;z-index:2147483647;
      background:#fff;border:1px solid #E2E8F0;
      border-radius:12px;box-shadow:0 20px 60px rgba(0,0,0,0.18);
      padding:16px;width:300px;
      font-family:system-ui,-apple-system,sans-serif;
      font-size:13px;color:#1E293B;
    " id="swovid-panel-inner">
      <!-- Header -->
      <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:12px;">
        <div style="display:flex;gap:10px;align-items:center;">
          <img src="${img.src}" style="width:48px;height:48px;object-fit:cover;border-radius:6px;border:1px solid #E2E8F0;" />
          <div>
            <div style="font-weight:700;color:${config.color};font-size:14px;">${config.label}</div>
            ${result.confidence > 0
              ? `<div style="color:#64748B;font-size:12px;">${result.confidence}% confidence</div>`
              : ''}
          </div>
        </div>
        <button id="swovid-close" style="
          background:none;border:none;cursor:pointer;
          color:#94A3B8;font-size:20px;padding:0 4px;
          line-height:1;flex-shrink:0;
        ">×</button>
      </div>

      <!-- Explanation -->
      <p style="margin:0 0 12px;color:#475569;font-size:12px;line-height:1.5;">
        ${config.explanation}
      </p>

      <!-- Detection layers -->
      <div style="border-top:1px solid #F1F5F9;padding-top:12px;">
        <div style="
          font-weight:600;margin-bottom:8px;font-size:11px;
          color:#94A3B8;text-transform:uppercase;letter-spacing:0.06em;
        ">Detection Layers</div>
        ${signalsHTML}
      </div>

      <!-- Footer -->
      <div style="
        border-top:1px solid #F1F5F9;margin-top:8px;padding-top:8px;
        font-size:11px;color:#94A3B8;text-align:center;
      ">
        Scanned in ${result.totalDurationMs}ms · SwoVid V1
        ${result.fromCache ? ' · Cached result' : ''}
      </div>
    </div>
  `;

  document.body.appendChild(panel);
  activePanel = panel;

  // Position the inner panel near the click
  const inner = panel.querySelector<HTMLElement>('#swovid-panel-inner')!;
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const panelW = 316;
  const panelH = 400; // estimated

  const left = Math.min(clickX + 8, vw - panelW - 8);
  const top = Math.min(clickY + 8, vh - panelH - 8);

  Object.assign(inner.style, {
    left: `${Math.max(8, left)}px`,
    top: `${Math.max(8, top)}px`,
  });

  // Close button
  panel.querySelector('#swovid-close')?.addEventListener('click', closeDetailPanel);

  // Close on outside click
  requestAnimationFrame(() => {
    document.addEventListener('click', outsideClickHandler, { once: true });
  });
}

export function closeDetailPanel(): void {
  activePanel?.remove();
  activePanel = null;
}

function outsideClickHandler(e: MouseEvent): void {
  if (activePanel && !activePanel.contains(e.target as Node)) {
    closeDetailPanel();
  }
}

function getVerdictBg(verdict: string | null): string {
  if (!verdict) return '#F1F5F9';
  if (verdict.includes('ai')) return '#FEE2E2';
  if (verdict.includes('human')) return '#DCFCE7';
  return '#F1F5F9';
}

function getVerdictColor(verdict: string | null): string {
  if (!verdict) return '#64748B';
  if (verdict.includes('ai')) return '#DC2626';
  if (verdict.includes('human')) return '#16A34A';
  return '#64748B';
}
