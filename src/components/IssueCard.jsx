// ============ ISSUE CARD ============
// Renders a single Schedule III finding with severity badge,
// category, observation, implication, and recommendation.

import React from 'react';
import { SEVERITY, COLORS, FONTS } from '../styles/tokens.js';

function IssueField({ label, body, last }) {
  return (
    <div style={{ marginBottom: last ? 0 : 10 }}>
      <div style={{
        fontSize: 10, color: COLORS.TEXT_MUTED, textTransform: 'uppercase',
        letterSpacing: '0.08em', marginBottom: 3, fontWeight: 600,
      }}>
        {label}
      </div>
      <div style={{ fontSize: 13, lineHeight: 1.55, color: COLORS.TEXT }}>{body}</div>
    </div>
  );
}

export function IssueCard({ issue, index }) {
  const cfg  = SEVERITY[issue.severity] || SEVERITY.MEDIUM;
  const Icon = cfg.icon;

  return (
    <div style={{
      background: '#fffdf7',
      border: '1px solid #e8e1d2',
      borderLeft: `4px solid ${cfg.bar}`,
      borderRadius: 8,
      padding: 18,
    }}>
      {/* Header row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10, flexWrap: 'wrap' }}>
        <span style={{
          background: cfg.chipBg, color: cfg.chipText,
          padding: '2px 8px', borderRadius: 4, fontSize: 10,
          textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600,
          display: 'inline-flex', alignItems: 'center', gap: 4,
        }}>
          <Icon size={11} /> {cfg.label}
        </span>
        <span className="mono" style={{ fontSize: 10, color: COLORS.TEXT_MUTED }}>
          #{String(index).padStart(2, '0')}
        </span>
        <span style={{ fontSize: 10, color: COLORS.TEXT_MUTED, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
          {issue.category}
        </span>
      </div>

      {/* Title */}
      <div className="serif" style={{ fontSize: 17, fontWeight: 600, lineHeight: 1.3, marginBottom: 12 }}>
        {issue.title}
      </div>

      <IssueField label="Observation"    body={issue.observation} />
      <IssueField label="Implication"    body={issue.implication} />
      <IssueField label="Recommendation" body={issue.recommendation} last />
    </div>
  );
}
