// ============ CLAUSE ROW ============
// Expandable CARO 2020 clause with editable Annexure A wording.

import React, { useState } from 'react';
import { COLORS, FONTS } from '../styles/tokens.js';

export function ClauseRow({ clause, onUpdate, onReset }) {
  const [expanded, setExpanded] = useState(clause.needsReview === true);

  const needsReview  = clause.needsReview;
  const edited       = clause.edited;
  const accent       = needsReview ? COLORS.HIGH : (edited ? COLORS.PRIMARY : '#a39d8c');
  const badgeBg      = needsReview ? '#fdf6ed'  : '#f4f7ee';
  const badgeLabel   = needsReview ? 'Review'   : (edited ? 'Edited' : 'Standard');

  const lineCount = (clause.remark || '').split('\n').length;
  const rows      = Math.max(6, Math.min(lineCount + 1, 18));

  return (
    <div style={{
      background: '#fffdf7',
      border: '1px solid #e8e1d2',
      borderLeft: `3px solid ${accent}`,
      borderRadius: 6,
      overflow: 'hidden',
    }}>
      {/* Summary row — click to expand */}
      <div
        onClick={() => setExpanded(!expanded)}
        style={{
          padding: '12px 16px',
          display: 'grid',
          gridTemplateColumns: '60px 1fr 130px',
          gap: 16,
          alignItems: 'center',
          cursor: 'pointer',
        }}
      >
        <div className="mono" style={{ fontSize: 12, fontWeight: 600, color: accent }}>
          {clause.paragraph}
        </div>
        <div>
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 2, color: COLORS.TEXT }}>
            {clause.topic}
          </div>
          <div style={{ fontSize: 11, color: COLORS.TEXT_MUTED }}>
            {needsReview
              ? <span style={{ color: COLORS.HIGH }}>⚠ {clause.reviewNote || 'Review required'}</span>
              : (expanded ? 'Click to collapse' : 'Click to view / edit')
            }
          </div>
        </div>
        <div style={{ textAlign: 'right', display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 6 }}>
          <span style={{
            fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em',
            padding: '3px 9px', borderRadius: 4,
            background: badgeBg, color: accent,
          }}>
            {badgeLabel}
          </span>
          <span style={{
            fontSize: 14, color: '#a39d8c', transition: 'transform 200ms', display: 'inline-block',
            transform: expanded ? 'rotate(90deg)' : 'rotate(0deg)',
          }}>
            ›
          </span>
        </div>
      </div>

      {/* Expanded body */}
      {expanded && (
        <div style={{ borderTop: `1px solid ${COLORS.BORDER}`, padding: '14px 16px', background: COLORS.BG_CREAM }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <div style={{
              fontSize: 10, color: COLORS.TEXT_MUTED, textTransform: 'uppercase',
              letterSpacing: '0.08em', fontWeight: 600,
            }}>
              Annexure A wording (editable)
            </div>
            {edited && (
              <button
                onClick={(e) => { e.stopPropagation(); onReset(clause.paragraph); }}
                style={{
                  background: 'transparent', border: `1px solid ${COLORS.BORDER_STRONG}`,
                  color: COLORS.TEXT_MUTED, padding: '3px 9px', borderRadius: 4,
                  fontSize: 10, fontWeight: 600, textTransform: 'uppercase',
                  letterSpacing: '0.06em', cursor: 'pointer', fontFamily: FONTS.BODY,
                }}
              >
                ↺ Restore standard
              </button>
            )}
          </div>
          <textarea
            value={clause.remark || ''}
            onChange={(e) => onUpdate(clause.paragraph, e.target.value)}
            rows={rows}
            style={{
              width: '100%', padding: '10px 12px',
              background: '#fffdf7', border: `1px solid ${COLORS.BORDER_STRONG}`,
              borderRadius: 5, fontSize: 12, fontFamily: FONTS.SERIF,
              color: COLORS.TEXT, lineHeight: 1.55, resize: 'vertical',
              boxSizing: 'border-box',
            }}
          />
          <div style={{ marginTop: 8, fontSize: 11, color: COLORS.TEXT_MUTED, lineHeight: 1.5 }}>
            <strong>Used in:</strong> Annexure A of the Audit Report (.doc) and the CARO Clauses sheet of the Excel working paper.
          </div>
        </div>
      )}
    </div>
  );
}
