import { useState, useEffect } from 'preact/hooks';
import type { ComponentChildren } from 'preact';
import type { SwoVidSettings } from '@swovid/detection';
import { DEFAULT_SETTINGS } from '@swovid/detection';
import { getSettings, saveSettings } from '../shared/storage';
import { MSG } from '../shared/constants';

export function Settings() {
  const [settings, setSettings] = useState<SwoVidSettings>(DEFAULT_SETTINGS);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getSettings().then(s => { setSettings(s); setLoading(false); });
  }, []);

  const update = <K extends keyof SwoVidSettings>(key: K, value: SwoVidSettings[K]) => {
    setSettings(prev => ({ ...prev, [key]: value }));
    setSaved(false);
  };

  const save = async () => {
    await saveSettings(settings);
    // Notify all content scripts of updated settings
    chrome.tabs.query({}, tabs => {
      tabs.forEach(tab => {
        if (tab.id) {
          chrome.tabs.sendMessage(tab.id, { type: MSG.SETTINGS_UPDATED, settings })
            .catch(() => {}); // Tab might not have content script
        }
      });
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  if (loading) return <div style={{ padding: '24px', color: '#94A3B8' }}>Loading...</div>;

  return (
    <div style={{
      maxWidth: '560px', margin: '0 auto', padding: '32px 24px',
      fontFamily: 'system-ui, -apple-system, sans-serif', color: '#1E293B',
    }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '32px' }}>
        <div style={{
          width: '36px', height: '36px', background: '#0F2444', borderRadius: '8px',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: '#fff', fontWeight: 800, fontSize: '16px',
        }}>S</div>
        <div>
          <div style={{ fontWeight: 800, fontSize: '20px', color: '#0F2444' }}>SwoVid Settings</div>
          <div style={{ fontSize: '13px', color: '#94A3B8' }}>Configure how SwoVid detects and displays AI content</div>
        </div>
      </div>

      {/* Scan Mode */}
      <Section title="Scan Mode" description="When should SwoVid scan images on a page?">
        <RadioGroup
          name="scanMode"
          value={settings.scanMode}
          onChange={v => update('scanMode', v as SwoVidSettings['scanMode'])}
          options={[
            { value: 'auto', label: 'Auto', desc: 'Badge all images automatically as the page loads (recommended)' },
            { value: 'hover', label: 'Hover', desc: 'Show badge when you hover over an image' },
            { value: 'ondemand', label: 'On Demand', desc: 'Only scan when you right-click an image and choose "Check with SwoVid"' },
          ]}
        />
      </Section>

      {/* Badge Style */}
      <Section title="Badge Style" description="How much information to show on the badge?">
        <RadioGroup
          name="badgeStyle"
          value={settings.badgeStyle}
          onChange={v => update('badgeStyle', v as SwoVidSettings['badgeStyle'])}
          options={[
            { value: 'standard', label: 'Standard', desc: 'Icon + label (e.g. 🤖 AI)' },
            { value: 'minimal', label: 'Minimal', desc: 'Small colour dot only — least intrusive' },
            { value: 'verbose', label: 'Verbose', desc: 'Icon + label + confidence % (e.g. 🤖 AI 87%)' },
          ]}
        />
      </Section>

      {/* Badge Position */}
      <Section title="Badge Position" description="Where on the image should the badge appear?">
        <RadioGroup
          name="badgePosition"
          value={settings.badgePosition}
          onChange={v => update('badgePosition', v as SwoVidSettings['badgePosition'])}
          options={[
            { value: 'bottom-right', label: 'Bottom Right', desc: 'Default' },
            { value: 'bottom-left', label: 'Bottom Left', desc: '' },
            { value: 'top-right', label: 'Top Right', desc: '' },
            { value: 'top-left', label: 'Top Left', desc: '' },
          ]}
        />
      </Section>

      {/* Min Image Size */}
      <Section
        title="Minimum Image Size"
        description={`Skip images smaller than ${settings.minImageSize}px — prevents badging tiny icons and UI elements`}
      >
        <div style={{ padding: '4px 0' }}>
          <input
            type="range" min={50} max={500} step={10}
            value={settings.minImageSize}
            onInput={e => update('minImageSize', Number((e.target as HTMLInputElement).value))}
            style={{ width: '100%', accentColor: '#0F2444' }}
          />
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#94A3B8', marginTop: '4px' }}>
            <span>50px</span>
            <span style={{ fontWeight: 600, color: '#0F2444' }}>{settings.minImageSize}px</span>
            <span>500px</span>
          </div>
        </div>
      </Section>

      {/* Global Toggle */}
      <Section title="Enable SwoVid" description="Globally enable or disable all scanning">
        <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={settings.enabled}
            onChange={e => update('enabled', (e.target as HTMLInputElement).checked)}
            style={{ width: '16px', height: '16px', accentColor: '#0F2444' }}
          />
          <span style={{ fontSize: '14px', fontWeight: 500 }}>
            {settings.enabled ? 'SwoVid is enabled' : 'SwoVid is disabled'}
          </span>
        </label>
      </Section>

      {/* Save Button */}
      <div style={{ marginTop: '32px' }}>
        <button
          onClick={save}
          style={{
            padding: '10px 24px', background: saved ? '#16A34A' : '#0F2444',
            color: '#fff', border: 'none', borderRadius: '8px',
            fontSize: '14px', fontWeight: 700, cursor: 'pointer',
            transition: 'background 0.2s',
          }}
        >
          {saved ? '✓ Saved' : 'Save Settings'}
        </button>
      </div>
    </div>
  );
}

// ── Sub-components ──────────────────────────────────────────

function Section({ title, description, children }: {
  title: string; description: string; children: ComponentChildren;
}) {
  return (
    <div style={{
      marginBottom: '28px', paddingBottom: '28px',
      borderBottom: '1px solid #F1F5F9',
    }}>
      <div style={{ fontWeight: 700, fontSize: '15px', marginBottom: '4px' }}>{title}</div>
      <div style={{ fontSize: '13px', color: '#64748B', marginBottom: '14px' }}>{description}</div>
      {children}
    </div>
  );
}

function RadioGroup({ name, value, onChange, options }: {
  name: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string; desc: string }[];
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      {options.map(opt => (
        <label
          key={opt.value}
          style={{
            display: 'flex', alignItems: 'flex-start', gap: '10px',
            padding: '10px 12px', borderRadius: '8px', cursor: 'pointer',
            border: `1.5px solid ${value === opt.value ? '#0F2444' : '#E2E8F0'}`,
            background: value === opt.value ? '#EFF6FF' : '#fff',
            transition: 'all 0.15s',
          }}
        >
          <input
            type="radio"
            name={name}
            value={opt.value}
            checked={value === opt.value}
            onChange={() => onChange(opt.value)}
            style={{ marginTop: '2px', accentColor: '#0F2444' }}
          />
          <div>
            <div style={{ fontWeight: 600, fontSize: '13px' }}>{opt.label}</div>
            {opt.desc && <div style={{ fontSize: '12px', color: '#64748B' }}>{opt.desc}</div>}
          </div>
        </label>
      ))}
    </div>
  );
}
