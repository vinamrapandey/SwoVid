import type { DetectionResult, VerdictState } from '@swovid/detection';

interface DetailPanelProps {
  result: DetectionResult;
  imageSrc: string;
  onClose: () => void;
}

const VERDICT_LABELS: Record<VerdictState, { text: string; color: string; explanation: string }> = {
  verified_ai: {
    text: 'Verified AI-Generated',
    color: '#DC2626',
    explanation: 'A cryptographic certificate inside this file confirms it was created by an AI tool.',
  },
  likely_ai: {
    text: 'Likely AI-Generated',
    color: '#D97706',
    explanation: 'Multiple detection signals indicate this was created by AI, but no cryptographic proof is present.',
  },
  possibly_ai: {
    text: 'Possibly AI-Generated',
    color: '#D97706',
    explanation: 'One detection signal suggests AI generation, but confidence is moderate.',
  },
  verified_human: {
    text: 'Likely Human/Camera',
    color: '#16A34A',
    explanation: 'Detection signals indicate this was captured by a camera or created by a human.',
  },
  unverifiable: {
    text: 'Cannot Determine',
    color: '#94A3B8',
    explanation: 'Not enough signals to make a determination. This does not mean the image is safe.',
  },
};

export function DetailPanel({ result, imageSrc, onClose }: DetailPanelProps) {
  const config = VERDICT_LABELS[result.verdict];

  return (
    <div style={{
      position: 'fixed',
      zIndex: 2147483647,
      background: '#fff',
      border: '1px solid #E2E8F0',
      borderRadius: '12px',
      boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
      padding: '16px',
      width: '300px',
      fontFamily: 'system-ui, -apple-system, sans-serif',
      fontSize: '13px',
      color: '#1E293B',
    }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <img
            src={imageSrc}
            style={{ width: '48px', height: '48px', objectFit: 'cover', borderRadius: '6px', border: '1px solid #E2E8F0' }}
          />
          <div>
            <div style={{ fontWeight: 700, color: config.color, fontSize: '14px' }}>
              {config.text}
            </div>
            {result.confidence > 0 && (
              <div style={{ color: '#64748B', fontSize: '12px' }}>{result.confidence}% confidence</div>
            )}
          </div>
        </div>
        <button
          onClick={onClose}
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            color: '#94A3B8', fontSize: '18px', padding: '0 4px', lineHeight: 1,
          }}
        >×</button>
      </div>

      {/* Explanation */}
      <p style={{ margin: '0 0 12px', color: '#475569', fontSize: '12px', lineHeight: 1.5 }}>
        {config.explanation}
      </p>

      {/* Detection layers */}
      <div style={{ borderTop: '1px solid #F1F5F9', paddingTop: '12px' }}>
        <div style={{ fontWeight: 600, marginBottom: '8px', fontSize: '12px', color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Detection Layers
        </div>
        {result.signals.map(signal => (
          <div
            key={signal.layer}
            style={{
              padding: '8px',
              borderRadius: '6px',
              marginBottom: '6px',
              background: signal.available ? '#F8FAFC' : '#FAFAFA',
              opacity: signal.available ? 1 : 0.6,
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2px' }}>
              <span style={{ fontWeight: 600, fontSize: '12px' }}>{signal.name}</span>
              {signal.available ? (
                <span style={{
                  fontSize: '10px',
                  fontWeight: 700,
                  padding: '1px 5px',
                  borderRadius: '3px',
                  background: signal.verdict === 'verified_ai' || signal.verdict === 'likely_ai' || signal.verdict === 'possibly_ai'
                    ? '#FEE2E2' : signal.verdict === 'verified_human'
                    ? '#DCFCE7' : '#F1F5F9',
                  color: signal.verdict === 'verified_ai' || signal.verdict === 'likely_ai' || signal.verdict === 'possibly_ai'
                    ? '#DC2626' : signal.verdict === 'verified_human'
                    ? '#16A34A' : '#64748B',
                }}>
                  {signal.verdict ? signal.verdict.replace('_', ' ') : 'no signal'}
                </span>
              ) : (
                <span style={{ fontSize: '10px', color: '#94A3B8' }}>{signal.comingIn}</span>
              )}
            </div>
            <div style={{ fontSize: '11px', color: '#64748B' }}>{signal.detail}</div>
          </div>
        ))}
      </div>

      {/* Footer */}
      <div style={{ borderTop: '1px solid #F1F5F9', marginTop: '8px', paddingTop: '8px', fontSize: '11px', color: '#94A3B8', textAlign: 'center' }}>
        Scanned in {result.totalDurationMs}ms · SwoVid V1
      </div>
    </div>
  );
}
