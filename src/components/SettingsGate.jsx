// ============ SETTINGS GATE ============
// Shown on first load if no API key exists in localStorage.
// Only allows entry after a valid-looking key is pasted.

import React, { useState } from 'react';
import { Scale, KeyRound, ExternalLink, Eye, EyeOff, FastForward } from 'lucide-react';
import { COLORS, FONTS, BTN_PRIMARY, BTN_GHOST } from '../styles/tokens.js';
import { setApiKey } from '../lib/engagementStore.js';

export function SettingsGate({ onUnlock, onSkip }) {
  const [key, setKey]         = useState('');
  const [show, setShow]       = useState(false);
  const [error, setError]     = useState('');

  const handleSave = () => {
    const trimmed = key.trim();
    if (!trimmed) { setError('Please paste your DeepSeek API key.'); return; }
    if (!trimmed.startsWith('sk-')) {
      setError('DeepSeek API keys start with "sk-". Please double-check what you pasted.');
      return;
    }
    setApiKey(trimmed);
    onUnlock(trimmed);
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        background: COLORS.BG,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: FONTS.BODY,
        padding: 24,
      }}
    >
      <div
        style={{
          background: COLORS.BG_CARD,
          border: `1px solid ${COLORS.BORDER}`,
          borderRadius: 16,
          padding: 40,
          maxWidth: 480,
          width: '100%',
          textAlign: 'center',
        }}
      >
        {/* Logo */}
        <div
          style={{
            width: 56, height: 56, borderRadius: 10, background: COLORS.PRIMARY,
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            marginBottom: 20,
          }}
        >
          <Scale size={26} color="#faf6ee" strokeWidth={1.5} />
        </div>

        <h1
          className="serif"
          style={{ fontSize: 26, fontWeight: 600, lineHeight: 1.1, marginBottom: 8, color: COLORS.TEXT }}
        >
          Schedule III Reviewer
        </h1>
        <p style={{ fontSize: 13, color: COLORS.TEXT_MUTED, lineHeight: 1.55, marginBottom: 28 }}>
          Schedule III &amp; CARO 2020 review for Indian Chartered Accountants.
          The deterministic <strong>Quick Review</strong> works without an API key.
          For the full 73-test <strong>Deep AI Review</strong>, paste your <strong>DeepSeek API key</strong> — it stays in your browser only.
        </p>

        {/* Key input */}
        <div style={{ marginBottom: 16 }}>
          <label
            style={{
              display: 'block', textAlign: 'left', fontSize: 11, fontWeight: 600,
              textTransform: 'uppercase', letterSpacing: '0.08em',
              color: COLORS.TEXT_MUTED, marginBottom: 6,
            }}
          >
            DeepSeek API Key
          </label>
          <div style={{ position: 'relative' }}>
            <input
              type={show ? 'text' : 'password'}
              value={key}
              onChange={(e) => { setKey(e.target.value); setError(''); }}
              placeholder="sk-..."
              onKeyDown={(e) => e.key === 'Enter' && handleSave()}
              aria-label="DeepSeek API Key"
              style={{
                width: '100%',
                padding: '10px 40px 10px 12px',
                background: COLORS.BG_CREAM,
                border: `1px solid ${error ? COLORS.CRIT : COLORS.BORDER_STRONG}`,
                borderRadius: 6,
                fontSize: 13,
                fontFamily: FONTS.MONO,
                color: COLORS.TEXT,
                boxSizing: 'border-box',
              }}
            />
            <button
              onClick={() => setShow(!show)}
              aria-label={show ? 'Hide key' : 'Show key'}
              style={{
                position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
                background: 'transparent', border: 'none', cursor: 'pointer',
                color: COLORS.TEXT_MUTED, display: 'flex', alignItems: 'center',
              }}
            >
              {show ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
          {error && (
            <p style={{ marginTop: 6, fontSize: 12, color: COLORS.CRIT, textAlign: 'left' }}>{error}</p>
          )}
        </div>

        {/* CTA — Save key */}
        <button
          onClick={handleSave}
          style={{ ...BTN_PRIMARY, width: '100%', justifyContent: 'center', padding: '12px 24px', fontSize: 14, borderRadius: 8, marginBottom: 10 }}
        >
          <KeyRound size={15} /> Save key and continue
        </button>

        {/* CTA — Skip and use Quick Review only */}
        {onSkip && (
          <button
            onClick={onSkip}
            style={{ ...BTN_GHOST, width: '100%', justifyContent: 'center', padding: '10px 24px', fontSize: 13, borderRadius: 8, marginBottom: 16 }}
          >
            <FastForward size={14} /> Skip — use Quick Review only (no API key)
          </button>
        )}

        {/* Get key link */}
        <p style={{ fontSize: 12, color: COLORS.TEXT_MUTED }}>
          Don't have a key?{' '}
          <a
            href="https://platform.deepseek.com"
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: COLORS.PRIMARY, textDecoration: 'none', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 3 }}
          >
            Get one at platform.deepseek.com <ExternalLink size={11} />
          </a>
        </p>

        {/* Privacy note */}
        <p style={{ fontSize: 11, color: COLORS.TEXT_FAINT, marginTop: 16, lineHeight: 1.5 }}>
          Your key is stored only in this browser's localStorage and is never sent anywhere except directly to api.deepseek.com.
          PDFs are processed entirely client-side — only extracted text reaches the API.
        </p>
      </div>
    </div>
  );
}
