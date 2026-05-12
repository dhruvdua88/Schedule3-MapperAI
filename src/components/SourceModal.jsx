// ============ SOURCE MODAL ============
// Click "View source" on an issue card → this modal opens, showing the
// matched page text with the evidenceQuote highlighted. Lets the reviewer
// verify each finding without leaving the app.

import React, { useEffect } from 'react';
import { X, FileText, AlertCircle } from 'lucide-react';
import { COLORS, FONTS, BTN_GHOST } from '../styles/tokens.js';
import { extractSourceContext } from '../lib/sourceAnchor.js';

export function SourceModal({ issue, pages, onClose }) {
  // Close on ESC
  useEffect(() => {
    const h = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [onClose]);

  if (!issue) return null;

  const sourcePage   = issue.sourcePage;
  const sourceMatch  = issue.sourceMatch;
  const confidence   = issue.sourceConfidence;
  const pageEntry    = sourcePage ? pages?.find((p) => p.pageNum === sourcePage) : null;
  const fullPageText = pageEntry?.text || '';
  const ctx          = (sourcePage && sourceMatch)
                       ? extractSourceContext(fullPageText, sourceMatch, 500)
                       : null;

  return (
    <>
      <div
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)',
          zIndex: 199, backdropFilter: 'blur(2px)',
        }}
      />
      <div
        role="dialog"
        aria-modal="true"
        style={{
          position: 'fixed', top: '5%', left: '50%', transform: 'translateX(-50%)',
          width: 'min(820px, 92vw)', maxHeight: '90vh', zIndex: 200,
          background: COLORS.BG_CARD, borderRadius: 12, overflow: 'hidden',
          boxShadow: '0 24px 60px rgba(0,0,0,0.25)',
          display: 'flex', flexDirection: 'column', fontFamily: FONTS.BODY,
        }}
      >
        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '14px 22px',
          borderBottom: `1px solid ${COLORS.BORDER}`, background: COLORS.PRIMARY,
          color: '#faf6ee',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
            <FileText size={18} strokeWidth={1.6} />
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 11, opacity: 0.7, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                Source · {issue.id || 'Issue'}
              </div>
              <div className="serif" style={{
                fontSize: 16, fontWeight: 600, marginTop: 2,
                whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
              }}>
                {issue.title || 'Source page'}
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close source view"
            style={{ background: 'transparent', border: 'none', color: '#faf6ee', cursor: 'pointer', display: 'flex' }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: 22, overflowY: 'auto', flex: 1 }}>
          {!sourcePage ? (
            <NotAnchoredEmpty quote={issue.evidenceQuote} />
          ) : (
            <>
              {/* Page chip + confidence */}
              <div style={{
                display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14, flexWrap: 'wrap',
              }}>
                <span style={{
                  display: 'inline-flex', alignItems: 'center', gap: 6,
                  background: COLORS.BG_CREAM, border: `1px solid ${COLORS.BORDER_STRONG}`,
                  padding: '4px 12px', borderRadius: 999, fontSize: 12, fontWeight: 600,
                }}>
                  <FileText size={12} /> Page {sourcePage}
                </span>
                <span style={{ fontSize: 11, color: COLORS.TEXT_MUTED, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                  Match confidence: <strong style={{ color: confidenceColour(confidence) }}>{confidence || 'exact'}</strong>
                </span>
              </div>

              {/* Evidence quote (what we were looking for) */}
              {issue.evidenceQuote && (
                <div style={{
                  background: COLORS.BG_CREAM, border: `1px solid ${COLORS.BORDER}`,
                  borderRadius: 8, padding: 14, marginBottom: 18,
                }}>
                  <div style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: COLORS.TEXT_MUTED, marginBottom: 6 }}>
                    Evidence quote (from the issue)
                  </div>
                  <div style={{ fontSize: 13, fontStyle: 'italic', lineHeight: 1.55, color: COLORS.TEXT }}>
                    "{issue.evidenceQuote}"
                  </div>
                </div>
              )}

              {/* Source context */}
              <div>
                <div style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: COLORS.TEXT_MUTED, marginBottom: 6 }}>
                  Matched context on page {sourcePage}
                </div>
                <div className="mono" style={{
                  fontSize: 12, lineHeight: 1.65, color: COLORS.TEXT,
                  whiteSpace: 'pre-wrap', wordBreak: 'break-word',
                  background: '#fffdf7', border: `1px solid ${COLORS.BORDER}`,
                  borderRadius: 8, padding: 16, maxHeight: '46vh', overflowY: 'auto',
                }}>
                  {ctx ? (
                    <>
                      <span style={{ color: COLORS.TEXT_MUTED }}>{ctx.before}</span>
                      <mark style={{
                        background: '#fef08a', color: COLORS.TEXT,
                        padding: '1px 2px', borderRadius: 3, fontWeight: 600,
                      }}>
                        {ctx.match}
                      </mark>
                      <span style={{ color: COLORS.TEXT_MUTED }}>{ctx.after}</span>
                    </>
                  ) : (
                    <span style={{ color: COLORS.TEXT_MUTED }}>(No surrounding context available.)</span>
                  )}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div style={{
          padding: '12px 22px', borderTop: `1px solid ${COLORS.BORDER}`,
          background: COLORS.BG_CREAM, display: 'flex', justifyContent: 'flex-end',
        }}>
          <button onClick={onClose} style={{ ...BTN_GHOST, fontSize: 12 }}>
            Close (Esc)
          </button>
        </div>
      </div>
    </>
  );
}

function NotAnchoredEmpty({ quote }) {
  return (
    <div style={{ textAlign: 'center', padding: '36px 18px' }}>
      <AlertCircle size={32} color={COLORS.TEXT_MUTED} style={{ marginBottom: 14 }} />
      <h3 className="serif" style={{ fontSize: 18, fontWeight: 600, marginBottom: 8 }}>
        Source page not identified
      </h3>
      <p style={{ fontSize: 13, color: COLORS.TEXT_MUTED, maxWidth: 460, margin: '0 auto', lineHeight: 1.55 }}>
        {quote && /not located/i.test(quote)
          ? 'This is a "disclosure not located" finding — by definition there is no source page in the document.'
          : "The reviewer could not find the evidence quote in the extracted text. The PDF text layer may be sparse, or the quote may have been paraphrased."}
      </p>
    </div>
  );
}

function confidenceColour(c) {
  if (c === 'exact')   return '#3e6034';
  if (c === 'partial') return '#a85d1a';
  if (c === 'fuzzy')   return '#8c721b';
  return COLORS.TEXT_MUTED;
}
