import { useState } from 'preact/hooks';
import { markOnboarded } from '../shared/storage';

const STEPS = [
  {
    icon: '🔍',
    title: 'SwoVid badges every image you see',
    body: 'As you browse the web, SwoVid automatically scans every image and adds a small colour-coded badge — green for human, red for AI, grey for unknown. No action needed from you.',
    visual: (
      <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap', marginTop: '16px' }}>
        <BadgeExample color="#DC2626" label="🤖 AI" desc="AI-generated" />
        <BadgeExample color="#16A34A" label="✓ Human" desc="Human / Camera" />
        <BadgeExample color="#94A3B8" label="? Unknown" desc="Cannot determine" />
      </div>
    ),
  },
  {
    icon: '📋',
    title: 'Click any badge to see why',
    body: 'Clicking a badge opens a detailed panel showing which detection layers ran and what they found — from cryptographic C2PA certificates to EXIF metadata fingerprints.',
    visual: (
      <div style={{
        background: '#F8FAFC', borderRadius: '10px', padding: '14px',
        marginTop: '16px', border: '1px solid #E2E8F0', fontSize: '12px',
      }}>
        <div style={{ fontWeight: 700, color: '#DC2626', marginBottom: '8px' }}>Verified AI-Generated · 100%</div>
        <LayerRow name="C2PA Credentials" status="verified_ai" detail='Signed by Adobe Firefly' />
        <LayerRow name="EXIF / IPTC Metadata" status="likely_ai" detail='Software: Adobe Firefly' />
        <LayerRow name="Stable Signature" status={null} detail='Coming in V2' />
        <LayerRow name="SwoVid Model" status={null} detail='Coming in V3' />
      </div>
    ),
  },
  {
    icon: '⚙️',
    title: 'Customise how it works',
    body: 'Choose your scan mode, badge style, position, and how small an image needs to be before SwoVid ignores it. Access settings any time from the toolbar popup.',
    visual: (
      <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', flexWrap: 'wrap', marginTop: '16px' }}>
        {['Auto scan', 'Minimal badge', 'On demand', 'Verbose mode'].map(tag => (
          <div key={tag} style={{
            padding: '6px 12px', background: '#EFF6FF',
            borderRadius: '20px', fontSize: '12px', fontWeight: 600, color: '#1A6FBF',
          }}>{tag}</div>
        ))}
      </div>
    ),
  },
];

export function Onboarding() {
  const [step, setStep] = useState(0);

  const finish = async () => {
    await markOnboarded();
    window.close();
  };

  const current = STEPS[step];

  return (
    <div style={{
      minHeight: '100vh', background: '#F8FAFC',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: 'system-ui, -apple-system, sans-serif', padding: '24px',
    }}>
      <div style={{
        background: '#fff', borderRadius: '16px', boxShadow: '0 20px 60px rgba(0,0,0,0.1)',
        padding: '40px', maxWidth: '480px', width: '100%',
      }}>
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '32px' }}>
          <div style={{
            width: '36px', height: '36px', background: '#0F2444',
            borderRadius: '8px', display: 'flex', alignItems: 'center',
            justifyContent: 'center', color: '#fff', fontWeight: 800, fontSize: '16px',
          }}>S</div>
          <div style={{ fontWeight: 800, fontSize: '20px', color: '#0F2444' }}>SwoVid</div>
        </div>

        {/* Step indicator */}
        <div style={{ display: 'flex', gap: '6px', marginBottom: '28px' }}>
          {STEPS.map((_, i) => (
            <div key={i} style={{
              height: '3px', flex: 1, borderRadius: '2px',
              background: i <= step ? '#0F2444' : '#E2E8F0',
              transition: 'background 0.3s',
            }} />
          ))}
        </div>

        {/* Content */}
        <div style={{ fontSize: '32px', marginBottom: '12px' }}>{current.icon}</div>
        <h1 style={{ fontSize: '22px', fontWeight: 800, color: '#0F2444', margin: '0 0 12px', lineHeight: 1.3 }}>
          {current.title}
        </h1>
        <p style={{ fontSize: '14px', color: '#475569', lineHeight: 1.7, margin: '0 0 8px' }}>
          {current.body}
        </p>
        {current.visual}

        {/* Navigation */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '32px' }}>
          <button
            onClick={() => setStep(s => s - 1)}
            disabled={step === 0}
            style={{
              padding: '8px 16px', borderRadius: '8px',
              border: '1px solid #E2E8F0', background: '#fff',
              color: step === 0 ? '#CBD5E1' : '#64748B',
              cursor: step === 0 ? 'not-allowed' : 'pointer',
              fontSize: '14px', fontWeight: 500,
            }}
          >← Back</button>

          {step < STEPS.length - 1 ? (
            <button
              onClick={() => setStep(s => s + 1)}
              style={{
                padding: '10px 24px', borderRadius: '8px',
                background: '#0F2444', color: '#fff',
                border: 'none', cursor: 'pointer',
                fontSize: '14px', fontWeight: 700,
              }}
            >Next →</button>
          ) : (
            <button
              onClick={finish}
              style={{
                padding: '10px 24px', borderRadius: '8px',
                background: '#16A34A', color: '#fff',
                border: 'none', cursor: 'pointer',
                fontSize: '14px', fontWeight: 700,
              }}
            >Start Detecting ✓</button>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Sub-components ──────────────────────────────────────────

function BadgeExample({ color, label, desc }: { color: string; label: string; desc: string }) {
  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{
        display: 'inline-block', padding: '4px 10px',
        background: color, borderRadius: '5px',
        color: '#fff', fontSize: '12px', fontWeight: 700,
        marginBottom: '4px',
      }}>{label}</div>
      <div style={{ fontSize: '11px', color: '#94A3B8' }}>{desc}</div>
    </div>
  );
}

function LayerRow({ name, status, detail }: { name: string; status: string | null; detail: string }) {
  const statusColors: Record<string, string> = {
    verified_ai: '#DC2626', likely_ai: '#D97706', verified_human: '#16A34A',
  };
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '5px 0', borderBottom: '1px solid #F1F5F9' }}>
      <span style={{ fontSize: '12px', fontWeight: 600 }}>{name}</span>
      <span style={{ fontSize: '11px', color: status ? statusColors[status] ?? '#64748B' : '#94A3B8' }}>
        {detail}
      </span>
    </div>
  );
}
