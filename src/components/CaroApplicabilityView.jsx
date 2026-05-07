// ============ CARO APPLICABILITY VIEW ============
// Shows threshold test table and conclusion card.

import React from 'react';
import { AlertCircle, CheckCircle2 } from 'lucide-react';
import { COLORS, FONTS, TH_STYLE, TD_STYLE } from '../styles/tokens.js';

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

export function CaroApplicabilityView({ app }) {
  if (!app) return null;
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
