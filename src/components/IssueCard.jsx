// ============ ISSUE CARD ============
// Renders a single Schedule III finding with severity badge,
// category, observation, evidence quote, note reference,
// implication, and recommendation.
//
// When the issue has a sourcePage (anchored by sourceAnchor.js), a
// "View source" chip is shown — clicking it opens the SourceModal.

import React from 'react';
import { FileText, ExternalLink } from 'lucide-react';
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

function EvidenceField({ quote, noteRef, sourcePage, onViewSource }) {
  if (!quote && !noteRef && !sourcePage) return null;
  return (
    <div style={{
      marginBottom: 10,
      background: COLORS.BG_CREAM,
      border: `1px solid ${COLORS.BORDER}`,
      borderRadius: 6,
      padding: '8px 12px',
    }}>
      <div style={{
        fontSize: 10, color: COLORS.TEXT_MUTED, textTransform: 'uppercase',
        letterSpacing: '0.08em', marginBottom: 6, fontWeight: 600,
        display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap',
      }}>
        <span>Evidence</span>
        {noteRef && (
          <span className="mono" style={{
            background: '#fffdf7',
            border: `1px solid ${COLORS.BORDER}`,
            padding: '1px 6px',
            borderRadius: 3,
            fontSize: 10,
            color: COLORS.TEXT_MUTED,
            textTransform: 'none',
            letterSpacing: 0,
            fontWeight: 500,
          }}>
            {noteRef}
          </span>
        )}
        {sourcePage && (
          <button
            onClick={onViewSource}
            title="Open the source page in the PDF preview"
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 4,
              background: COLORS.PRIMARY, color: '#faf6ee',
              border: 'none', padding: '2px 8px', borderRadius: 3,
              fontSize: 10, fontWeight: 600, textTransform: 'uppercase',
              letterSpacing: '0.05em', cursor: 'pointer', fontFamily: FONTS.BODY,
            }}
          >
            <FileText size={10} /> Page {sourcePage}
            <ExternalLink size={9} />
          </button>
        )}
      </div>
      {quote && (
        <div style={{
          fontSize: 12,
          fontStyle: 'italic',
          lineHeight: 1.55,
          color: COLORS.TEXT_MUTED,
        }}>
          “{quote}”
        </div>
      )}
    </div>
  );
}

export function IssueCard({ issue, index, onViewSource }) {
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
        {issue.id && (
          <span className="mono" style={{
            fontSize: 10, color: COLORS.PRIMARY,
            background: COLORS.BG_CREAM,
            border: `1px solid ${COLORS.BORDER}`,
            padding: '1px 6px', borderRadius: 3, fontWeight: 600,
          }}>
            {issue.id}
          </span>
        )}
        <span style={{ fontSize: 10, color: COLORS.TEXT_MUTED, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
          {issue.category}
        </span>
      </div>

      {/* Title */}
      <div className="serif" style={{ fontSize: 17, fontWeight: 600, lineHeight: 1.3, marginBottom: 12 }}>
        {issue.title}
      </div>

      <IssueField label="Observation"    body={issue.observation} />
      <EvidenceField
        quote={issue.evidenceQuote}
        noteRef={issue.noteRef}
        sourcePage={issue.sourcePage}
        onViewSource={() => onViewSource?.(issue)}
      />
      <IssueField label="Implication"    body={issue.implication} />
      <IssueField label="Recommendation" body={issue.recommendation} last />
    </div>
  );
}
