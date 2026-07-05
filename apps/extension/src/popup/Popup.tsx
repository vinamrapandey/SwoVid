import { useState, useEffect } from 'preact/hooks';
import type { PageScanSummary } from '@swovid/detection';
import { MSG } from '../shared/constants';

export function Popup() {
  const [summary, setSummary] = useState<PageScanSummary | null>(null);
  const [paused, setPaused] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Get active tab's scan summary
    chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
      const tab = tabs[0];
      if (!tab?.id) { setLoading(false); return; }

      chrome.runtime.sendMessage({ type: MSG.GET_PAGE_SUMMARY, tabId: tab.id }, result => {
        setSummary(result);
        setLoading(false);
      });
    });
  }, []);

  const togglePause = () => {
    const next = !paused;
    setPaused(next);
    chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
      const tab = tabs[0];
      if (tab?.id) {
        chrome.tabs.sendMessage(tab.id, { type: MSG.SCAN_PAUSED, paused: next });
      }
    });
  };

  const openSettings = () => {
    chrome.runtime.sendMessage({ type: MSG.OPEN_SETTINGS });
  };

  const aiCount = (summary?.verifiedAi ?? 0) + (summary?.likelyAi ?? 0);

  return (
    <div style={{
      width: '300px', padding: '16px',
      fontFamily: 'system-ui, -apple-system, sans-serif',
      background: '#fff', minHeight: '180px',
    }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
        <div style={{
          width: '28px', height: '28px', background: '#0F2444',
          borderRadius: '6px', display: 'flex', alignItems: 'center',
          justifyContent: 'center', color: '#fff', fontWeight: 800, fontSize: '13px',
        }}>S</div>
        <div>
          <div style={{ fontWeight: 700, fontSize: '15px', color: '#0F2444' }}>SwoVid</div>
          <div style={{ fontSize: '11px', color: '#94A3B8' }}>AI Content Detector</div>
        </div>
      </div>

      {/* Page Summary */}
      {loading ? (
        <div style={{ color: '#94A3B8', fontSize: '13px', textAlign: 'center', padding: '12px 0' }}>
          Loading...
        </div>
      ) : summary ? (
        <div style={{
          background: '#F8FAFC', borderRadius: '8px',
          padding: '12px', marginBottom: '12px',
        }}>
          <div style={{ fontSize: '12px', color: '#64748B', marginBottom: '8px', fontWeight: 600 }}>
            This page
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px', textAlign: 'center' }}>
            <Stat value={summary.total} label="Scanned" color="#1E293B" />
            <Stat value={aiCount} label="AI" color="#DC2626" />
            <Stat value={summary.human} label="Human" color="#16A34A" />
          </div>
        </div>
      ) : (
        <div style={{ color: '#94A3B8', fontSize: '13px', textAlign: 'center', padding: '12px 0' }}>
          No images scanned yet
        </div>
      )}

      {/* Actions */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        <button
          onClick={togglePause}
          style={{
            padding: '8px 12px', borderRadius: '6px', border: '1px solid #E2E8F0',
            background: paused ? '#FEF3C7' : '#fff', cursor: 'pointer',
            fontSize: '13px', fontWeight: 600,
            color: paused ? '#D97706' : '#1E293B',
          }}
        >
          {paused ? '▶ Resume Scanning' : '⏸ Pause Scanning'}
        </button>
        <button
          onClick={openSettings}
          style={{
            padding: '8px 12px', borderRadius: '6px', border: '1px solid #E2E8F0',
            background: '#fff', cursor: 'pointer', fontSize: '13px',
            color: '#64748B', fontWeight: 500,
          }}
        >
          ⚙ Settings
        </button>
      </div>
    </div>
  );
}

function Stat({ value, label, color }: { value: number; label: string; color: string }) {
  return (
    <div>
      <div style={{ fontSize: '22px', fontWeight: 800, color }}>{value}</div>
      <div style={{ fontSize: '11px', color: '#94A3B8' }}>{label}</div>
    </div>
  );
}
