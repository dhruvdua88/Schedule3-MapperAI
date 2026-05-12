// ============ SUGGESTED NOTES TAB ============
// Shows AI-drafted note text for each missing-disclosure issue.
// Reviewer can copy individual notes to clipboard or download the whole
// pack as a Word document for the preparer.

import React, { useState } from 'react';
import { FileSignature, Copy, Check, Download, Loader2, FilePlus2, AlertCircle } from 'lucide-react';
import { COLORS, FONTS, BTN_PRIMARY, BTN_GHOST } from '../styles/tokens.js';

export function SuggestedNotesTab({
  draftedNotes, generating, onGenerate, onDownloadWord, eligibleIssueCount,
}) {
  const [copiedId, setCopiedId] = useState(null);

  const copy = async (note) => {
    try {
      await navigator.clipboard.writeText(`${note.noteTitle}\n\n${note.noteText}`);
      setCopiedId(note.issueId);
      setTimeout(() => setCopiedId(null), 1800);
    } catch { /* clipboard denied */ }
  };

  // Empty / first-run state
  if (!draftedNotes || draftedNotes.length === 0) {
    return (
      <div className="fade-in">
        <div className="card" style={{
          padding: 36, borderRadius: 12,
          textAlign: 'center',
          border: `1px dashed ${COLORS.BORDER_STRONG}`,
        }}>
          <div style={{
            width: 56, height: 56, borderRadius: '50%',
            background: COLORS.BG_CREAM, border: `1px solid ${COLORS.BORDER}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 18px',
          }}>
            <FilePlus2 size={24} color={COLORS.TEXT_MUTED} strokeWidth={1.5} />
          </div>
          <h3 className="serif" style={{ fontSize: 22, fontWeight: 600, color: COLORS.TEXT, marginBottom: 8 }}>
            Draft the missing disclosures
          </h3>
          <p style={{ fontSize: 13, color: COLORS.TEXT_MUTED, maxWidth: 520, margin: '0 auto 22px', lineHeight: 1.55 }}>
            {eligibleIssueCount > 0
              ? `${eligibleIssueCount} disclosure-missing issue${eligibleIssueCount === 1 ? '' : 's'} from this engagement can be auto-drafted into Schedule III-compliant note text. The preparer can paste these directly into the financial statements.`
              : 'No disclosure-missing issues were flagged in this engagement, so there is nothing to draft.'}
          </p>
          {eligibleIssueCount > 0 && (
            <button
              onClick={onGenerate}
              disabled={generating}
              style={{
                ...BTN_PRIMARY,
                padding: '12px 26px', fontSize: 14,
                opacity: generating ? 0.6 : 1,
                cursor: generating ? 'wait' : 'pointer',
              }}
            >
              {generating
                ? <><Loader2 size={15} className="spin" /> Drafting notes…</>
                : <><FileSignature size={15} /> Draft suggested notes</>
              }
            </button>
          )}
          <p style={{ marginTop: 12, fontSize: 11, color: COLORS.TEXT_FAINT }}>
            Uses DeepSeek with the same model selected for this engagement. Typically ~25 seconds.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="fade-in">
      {/* Toolbar */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        marginBottom: 18, gap: 12, flexWrap: 'wrap',
      }}>
        <div>
          <h3 className="serif" style={{ fontSize: 20, fontWeight: 600, color: COLORS.TEXT, margin: 0 }}>
            {draftedNotes.length} drafted note{draftedNotes.length === 1 ? '' : 's'}
          </h3>
          <p style={{ fontSize: 12, color: COLORS.TEXT_MUTED, marginTop: 4 }}>
            Schedule III–compliant wording. Placeholders like [XX] are for company-specific figures.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={onGenerate} disabled={generating} style={{ ...BTN_GHOST, fontSize: 12 }}>
            {generating
              ? <><Loader2 size={13} className="spin" /> Re-drafting…</>
              : <><FileSignature size={13} /> Re-draft</>
            }
          </button>
          <button onClick={onDownloadWord} style={{ ...BTN_PRIMARY, fontSize: 13 }}>
            <Download size={14} /> Download as Word
          </button>
        </div>
      </div>

      {/* Notes list */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {draftedNotes.map((note, idx) => (
          <article key={note.issueId || idx} style={{
            background: '#fffdf7',
            border: `1px solid ${COLORS.BORDER}`,
            borderLeft: `4px solid ${COLORS.PRIMARY}`,
            borderRadius: 8, padding: 18,
          }}>
            <header style={{
              display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12, flexWrap: 'wrap',
            }}>
              {note.issueId && (
                <span className="mono" style={{
                  fontSize: 10, color: COLORS.PRIMARY,
                  background: COLORS.BG_CREAM,
                  border: `1px solid ${COLORS.BORDER}`,
                  padding: '1px 6px', borderRadius: 3, fontWeight: 600,
                }}>
                  {note.issueId}
                </span>
              )}
              <h4 className="serif" style={{
                fontSize: 16, fontWeight: 600, lineHeight: 1.3, color: COLORS.TEXT, margin: 0, flex: 1, minWidth: 0,
              }}>
                {note.noteTitle}
              </h4>
              <button
                onClick={() => copy(note)}
                style={{ ...BTN_GHOST, fontSize: 11, padding: '5px 10px' }}
                aria-label="Copy note to clipboard"
              >
                {copiedId === note.issueId
                  ? <><Check size={12} /> Copied</>
                  : <><Copy size={12} /> Copy</>
                }
              </button>
            </header>
            <div className="mono" style={{
              fontSize: 12, lineHeight: 1.7, color: COLORS.TEXT,
              whiteSpace: 'pre-wrap', wordBreak: 'break-word',
              background: COLORS.BG_CREAM, border: `1px solid ${COLORS.BORDER}`,
              borderRadius: 6, padding: 14,
            }}>
              {note.noteText}
            </div>
          </article>
        ))}
      </div>

      {/* Caveat */}
      <div style={{
        marginTop: 22, padding: '12px 16px',
        background: '#fffbeb', border: '1px solid #fcd34d', borderRadius: 8,
        display: 'flex', gap: 10, fontSize: 12, color: '#92400e',
      }}>
        <AlertCircle size={14} style={{ flexShrink: 0, marginTop: 2 }} />
        <div>
          <strong>Always review before issuing.</strong> Drafts are AI-generated suggestions in standard Schedule III wording — verify every figure, every reference, and every fact before adopting in the financial statements.
        </div>
      </div>
    </div>
  );
}
