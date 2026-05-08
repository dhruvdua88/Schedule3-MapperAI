// ============ CARO APPLICABILITY VIEW ============
// Shows threshold test table and conclusion card.
// When CARO has not been run yet, renders an empty-state CTA so the
// user can run it on demand from the results screen.

import React from 'react';
import { AlertCircle, CheckCircle2, ShieldCheck, Loader2 } from 'lucide-react';
import { COLORS, FONTS, TH_STYLE, TD_STYLE, BTN_PRIMARY } from '../styles/tokens.js';

function ResultPill({ result }) {
  const colors = {
    Pass:    { bg: '#f4f7ee', fg: '#3e6034' },
    Fail:    { bg: '#fdf3f0', fg: '#9a2920' },
    Unknown: { bg: '#fbf8ed', fg: '#8c721b' },
  };
  const c = colors[result] || colors.Unknown;
  return (
    <span style={{
      background: c.bg, color: c.fg,
      padding: '2px 10px', borderRadius: 4, fontSize: 11,
      fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em',
    }}>
      {result}
    </span>
  );
}

export function CaroApplicabilityView({ app, onRunCaroNow, caroRunning }) {
  // Empty state — CARO was not run as part of this analysis.
  if (!app) {
    return (
      <div className="fade-in">
        <div className="card" style={{
          padding: 36, borderRadius: 12,
          textAlign: 'center',
          border: `1px dashed ${COLORS.BORDER_STRONG}`,
        }}>
          <div style={{
            width: 56, height: 56, borderRadius: '50%',
            background: COLORS.BG_CREAM,
            border: `1px solid ${COLORS.BORDER}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 18px',
          }}>
            <ShieldCheck size={24} color={COLORS.TEXT_MUTED} strokeWidth={1.5} />
          </div>
          <h3 className="serif" style={{ fontSize: 22, fontWeight: 600, color: COLORS.TEXT, marginBottom: 8 }}>
            CARO 2020 evaluation was skipped
          </h3>
          <p style={{ fontSize: 13, color: COLORS.TEXT_MUTED, maxWidth: 460, margin: '0 auto 22px', lineHeight: 1.55 }}>
            You chose to run the Schedule III review only. Run the CARO 2020 applicability and
            clause-flagging step now if you'd like the full Annexure A working paper.
          </p>
          {onRunCaroNow && (
            <button
              onClick={onRunCaroNow}
              disabled={caroRunning}
              style={{
                ...BTN_PRIMARY,
                padding: '12px 26px', fontSize: 14,
                opacity: caroRunning ? 0.6 : 1,
                cursor: caroRunning ? 'wait' : 'pointer',
              }}
            >
              {caroRunning
                ? <><Loader2 size={15} className="spin" /> Running CARO…</>
                : <><ShieldCheck size={15} /> Run CARO 2020 analysis</>
              }
            </button>
          )}
        </div>
      </div>
    );
  }

  const passColor = app.applies ? COLORS.CRIT : '#3e6034';

  return (
    <div className="fade-in">
      {/* Conclusion card */}
      <div className="card" style={{ padding: 24, borderRadius: 10, marginBottom: 18 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 14 }}>
          {app.applies
            ? <AlertCircle  size={26} color={COLORS.CRIT} />
            : <CheckCircle2 size={26} color="#3e6034" />
          }
          <div>
            <div style={{ fontSize: 11, color: COLORS.TEXT_MUTED, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              Conclusion
            </div>
            <div className="serif" style={{ fontSize: 24, fontWeight: 600, color: passColor }}>
              CARO 2020 {app.applies ? 'Applies' : 'Does Not Apply'}
            </div>
          </div>
        </div>
        <div style={{ fontSize: 13, lineHeight: 1.6, color: COLORS.TEXT }}>{app.reasoning}</div>
      </div>

      {/* Threshold table */}
      <div className="card" style={{ padding: 0, borderRadius: 10, overflow: 'hidden' }}>
        <div style={{
          padding: '14px 20px', borderBottom: `1px solid ${COLORS.BORDER}`,
          background: COLORS.BG_CREAM,
        }}>
          <div className="serif" style={{ fontSize: 16, fontWeight: 600 }}>
            Threshold test (Para 1(2)(iv))
          </div>
          <div style={{ fontSize: 11, color: COLORS.TEXT_MUTED, marginTop: 2 }}>
            All four conditions must hold for exemption.
          </div>
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: `1px solid ${COLORS.BORDER}` }}>
              <th style={TH_STYLE}>Test</th>
              <th style={TH_STYLE}>Value</th>
              <th style={{ ...TH_STYLE, textAlign: 'right' }}>Result</th>
            </tr>
          </thead>
          <tbody>
            {(app.thresholds || []).map((t, i) => (
              <tr key={i} style={{ borderBottom: i < app.thresholds.length - 1 ? `1px solid #f0ead8` : 'none' }}>
                <td style={TD_STYLE}>{t.test}</td>
                <td style={{ ...TD_STYLE, fontFamily: FONTS.MONO, fontSize: 12, color: COLORS.TEXT_MUTED }}>
                  {t.value}
                </td>
                <td style={{ ...TD_STYLE, textAlign: 'right' }}>
                  <ResultPill result={t.result} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
