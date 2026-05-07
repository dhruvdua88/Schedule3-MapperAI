// ============ ANALYZING PROGRESS ============
// Two-phase progress display: SCH3 then CARO.
// Shows shimmer skeletons and a cancel button.

import React from 'react';
import { X, Brain, ShieldCheck } from 'lucide-react';
import { COLORS, FONTS, BTN_GHOST } from '../styles/tokens.js';

function ShimmerCard() {
  return (
    <div className="card shimmer" style={{ padding: 20, borderRadius: 10, marginBottom: 10 }}>
      <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
        <div style={{ width: 48, height: 48, borderRadius: 8, background: COLORS.BORDER, flexShrink: 0 }} />
        <div style={{ flex: 1 }}>
          <div style={{ height: 14, background: COLORS.BORDER, borderRadius: 4, width: '60%', marginBottom: 8 }} />
          <div style={{ height: 10, background: COLORS.BORDER, borderRadius: 4, width: '90%', marginBottom: 6 }} />
          <div style={{ height: 10, background: COLORS.BORDER, borderRadius: 4, width: '75%' }} />
        </div>
      </div>
    </div>
  );
}

export function AnalyzingProgress({ phase, onCancel }) {
  const isCaro = phase === 'analyzing-caro';

  return (
    <div className="fade-in" style={{ maxWidth: 720, margin: '0 auto' }}>

      {/* Phase indicator */}
      <div style={{ textAlign: 'center', marginBottom: 40 }}>
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 12,
          padding: '10px 20px', borderRadius: 999,
          background: COLORS.BG_CREAM, border: `1px solid ${COLORS.BORDER}`,
          marginBottom: 20,
        }}>
          <span className="pulse-dot" style={{ width: 8, height: 8, borderRadius: '50%', background: COLORS.PRIMARY, display: 'inline-block' }} />
          <span style={{ fontSize: 13, color: COLORS.TEXT_MUTED }}>
            {isCaro ? 'Phase 2 of 2' : 'Phase 1 of 2'}
          </span>
        </div>

        <h2 className="serif" style={{ fontSize: 26, fontWeight: 600, color: COLORS.TEXT, marginBottom: 8 }}>
          {isCaro ? 'CARO 2020 Evaluation' : 'Schedule III Review'}
        </h2>
        <p style={{ fontSize: 14, color: COLORS.TEXT_MUTED, maxWidth: 480, margin: '0 auto' }}>
          {isCaro
            ? 'Evaluating CARO applicability and drafting clause-level remarks…'
            : 'Running 30-test checklist against extracted financials…'}
        </p>
      </div>

      {/* Phase steps */}
      <div style={{
        display: 'flex', gap: 0, maxWidth: 520, margin: '0 auto 40px',
        background: COLORS.BG_CREAM, border: `1px solid ${COLORS.BORDER}`, borderRadius: 10, overflow: 'hidden',
      }}>
        <PhaseStep
          icon={Brain}
          label="Schedule III"
          sublabel="30 disclosure checks"
          active={!isCaro}
          done={isCaro}
        />
        <div style={{ width: 1, background: COLORS.BORDER }} />
        <PhaseStep
          icon={ShieldCheck}
          label="CARO 2020"
          sublabel="Applicability + 21 clauses"
          active={isCaro}
          done={false}
        />
      </div>

      {/* Shimmer placeholders */}
      {[...Array(isCaro ? 3 : 5)].map((_, i) => (
        <ShimmerCard key={i} />
      ))}

      {/* Cancel */}
      <div style={{ textAlign: 'center', marginTop: 24 }}>
        <button onClick={onCancel} style={{ ...BTN_GHOST, fontSize: 12, color: COLORS.TEXT_MUTED }}>
          <X size={13} /> Cancel analysis
        </button>
      </div>
    </div>
  );
}

function PhaseStep({ icon: Icon, label, sublabel, active, done }) {
  const color = done
    ? COLORS.TEXT_MUTED
    : active ? COLORS.PRIMARY : COLORS.TEXT_FAINT;

  return (
    <div style={{
      flex: 1, padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 10,
      background: active ? `${COLORS.PRIMARY}0d` : 'transparent',
      opacity: done ? 0.55 : 1,
    }}>
      <Icon size={18} color={color} strokeWidth={1.5} />
      <div>
        <div style={{ fontSize: 13, fontWeight: 600, color, lineHeight: 1.2 }}>{label}</div>
        <div style={{ fontSize: 11, color: COLORS.TEXT_MUTED, marginTop: 2 }}>{sublabel}</div>
      </div>
      {active && (
        <div style={{ marginLeft: 'auto' }}>
          <span className="pulse-dot" style={{
            display: 'inline-block', width: 8, height: 8, borderRadius: '50%',
            background: COLORS.PRIMARY,
          }} />
        </div>
      )}
      {done && (
        <div style={{ marginLeft: 'auto', fontSize: 16, color: COLORS.TEXT_MUTED }}>✓</div>
      )}
    </div>
  );
}
