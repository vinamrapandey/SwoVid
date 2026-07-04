import type { VerdictState } from '@swovid/detection';

interface BadgeProps {
  verdict: VerdictState;
  confidence: number;
  style: 'standard' | 'minimal' | 'verbose';
}

const VERDICT_CONFIG: Record<VerdictState, {
  label: string;
  color: string;
  icon: string;
}> = {
  verified_ai:    { label: 'AI',      color: '#DC2626', icon: '🤖' },
  likely_ai:      { label: 'AI',      color: '#D97706', icon: '⚠️' },
  possibly_ai:    { label: 'AI?',     color: '#D97706', icon: '?' },
  verified_human: { label: 'Human',   color: '#16A34A', icon: '✓' },
  unverifiable:   { label: 'Unknown', color: '#94A3B8', icon: '?' },
};

export function Badge({ verdict, confidence, style }: BadgeProps) {
  const config = VERDICT_CONFIG[verdict];

  if (style === 'minimal') {
    return (
      <div style={{
        width: '10px',
        height: '10px',
        borderRadius: '50%',
        background: config.color,
        boxShadow: '0 0 0 1.5px rgba(255,255,255,0.8)',
      }} />
    );
  }

  return (
    <div style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: '3px',
      padding: '2px 5px',
      background: config.color,
      borderRadius: '4px',
      color: '#fff',
      fontSize: '10px',
      fontWeight: 700,
      fontFamily: 'system-ui, sans-serif',
      lineHeight: 1,
      whiteSpace: 'nowrap',
    }}>
      <span>{config.icon}</span>
      <span>{config.label}</span>
      {style === 'verbose' && confidence > 0 && (
        <span style={{ opacity: 0.85 }}>{confidence}%</span>
      )}
    </div>
  );
}
