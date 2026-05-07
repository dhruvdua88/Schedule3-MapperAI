// ============ SEVERITY SUMMARY ============
// 4-tile grid showing counts per severity level.

import React from 'react';
import { SEVERITY } from '../styles/tokens.js';

export function SeveritySummary({ counts }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 22 }}>
      {Object.entries(SEVERITY).map(([key, cfg]) => (
        <div
          key={key}
          style={{
            background: cfg.bg,
            borderRadius: 8,
            padding: '12px 14px',
            borderLeft: `3px solid ${cfg.bar}`,
          }}
        >
          <div className="serif" style={{ fontSize: 24, fontWeight: 600, color: cfg.bar, lineHeight: 1 }}>
            {counts[key] ?? 0}
          </div>
          <div style={{ fontSize: 10, color: cfg.bar, textTransform: 'uppercase', letterSpacing: '0.08em', marginTop: 4, fontWeight: 600 }}>
            {cfg.label}
          </div>
        </div>
      ))}
    </div>
  );
}
