// ============ PDF MARKDOWN PREVIEW ============
// Shows extracted text after pdfjs runs.
// User can edit the markdown, re-extract, or proceed to analysis.
// Also chooses the model and toggles whether CARO runs after Schedule III.

import React, { useState, useRef } from 'react';
import { FileText, Edit3, RefreshCw, Sparkles, AlertTriangle, Eye, ChevronDown, ChevronUp, ShieldCheck, Zap, Brain } from 'lucide-react';
import { COLORS, FONTS, BTN_PRIMARY, BTN_GHOST } from '../styles/tokens.js';

const APPROX_CHARS_PER_TOKEN = 4;

export function PdfMarkdownPreview({
  markdown, pdfMeta,
  onAnalyze, onReExtract, onMarkdownChange,
  selectedModel, onModelChange,
  runCaro, onRunCaroChange,
}) {
  const [editing, setEditing]       = useState(false);
  const [localMd, setLocalMd]       = useState(markdown);
  const [expanded, setExpanded]     = useState(false);
  const textareaRef                 = useRef(null);

  // sync if parent updates (e.g. re-extract)
  React.useEffect(() => {
    setLocalMd(markdown);
    setEditing(false);
  }, [markdown]);

  const chars      = localMd.length;
  const approxTok  = Math.round(chars / APPROX_CHARS_PER_TOKEN).toLocaleString();
  const isScanned  = pdfMeta?.looksScanned;

  const handleEditToggle = () => {
    if (editing) {
      // save edits
      onMarkdownChange?.(localMd);
    }
    setEditing(!editing);
  };

  const handleAnalyze = () => {
    if (editing) {
      onMarkdownChange?.(localMd);
    }
    onAnalyze(localMd);
  };

  const previewLines = localMd.split('\n').slice(0, expanded ? Infinity : 30).join('\n');
  const hasMore      = localMd.split('\n').length > 30;

  return (
    <div className="fade-in" style={{ maxWidth: 860, margin: '0 auto' }}>

      {/* Header row */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20, gap: 16 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
            <FileText size={18} color={COLORS.PRIMARY} strokeWidth={1.5} />
            <h2 className="serif" style={{ fontSize: 22, fontWeight: 600, color: COLORS.TEXT, margin: 0 }}>
              Extracted Text Preview
            </h2>
          </div>
          <div style={{ display: 'flex', gap: 16, fontSize: 12, color: COLORS.TEXT_MUTED }}>
            {pdfMeta && (
              <span>{pdfMeta.pageCount} page{pdfMeta.pageCount !== 1 ? 's' : ''}</span>
            )}
            <span>{chars.toLocaleString()} chars</span>
            <span>≈ {approxTok} tokens</span>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
          <button onClick={onReExtract} style={{ ...BTN_GHOST, fontSize: 12 }}>
            <RefreshCw size={13} /> Re-extract
          </button>
          <button onClick={handleEditToggle} style={{ ...BTN_GHOST, fontSize: 12 }}>
            <Edit3 size={13} /> {editing ? 'Done editing' : 'Edit'}
          </button>
        </div>
      </div>

      {/* Scanned PDF warning */}
      {isScanned && (
        <div style={{
          display: 'flex', gap: 10, alignItems: 'flex-start',
          background: '#fffbeb', border: '1px solid #fcd34d', borderRadius: 8,
          padding: '12px 16px', marginBottom: 16, fontSize: 13, color: '#92400e',
        }}>
          <AlertTriangle size={16} style={{ flexShrink: 0, marginTop: 1 }} />
          <div>
            <strong>Scanned PDF detected.</strong> Very few text items were found — the document may be image-based.
            Analysis quality will be low. Consider using a text-based PDF or manually paste the balance sheet text below.
          </div>
        </div>
      )}

      {/* Markdown panel */}
      <div
        className="card"
        style={{
          padding: 0, overflow: 'hidden', borderRadius: 10,
          border: editing ? `1.5px solid ${COLORS.PRIMARY}` : undefined,
        }}
      >
        {/* Panel header bar */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '10px 16px', borderBottom: `1px solid ${COLORS.BORDER}`,
          background: COLORS.BG_CREAM,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: COLORS.TEXT_MUTED, textTransform: 'uppercase', letterSpacing: '0.07em', fontWeight: 600 }}>
            <Eye size={12} /> {editing ? 'Editing' : 'Preview'} · Markdown
          </div>
          {editing && (
            <span style={{ fontSize: 11, color: COLORS.PRIMARY }}>Changes apply to this session only</span>
          )}
        </div>

        {editing ? (
          <textarea
            ref={textareaRef}
            value={localMd}
            onChange={(e) => setLocalMd(e.target.value)}
            spellCheck={false}
            style={{
              width: '100%', minHeight: 420, padding: 16,
              fontFamily: FONTS.MONO, fontSize: 12, lineHeight: 1.6,
              background: COLORS.BG_CREAM, border: 'none', outline: 'none',
              color: COLORS.TEXT, resize: 'vertical', boxSizing: 'border-box',
            }}
          />
        ) : (
          <div style={{ position: 'relative' }}>
            <pre style={{
              margin: 0, padding: 16, fontFamily: FONTS.MONO, fontSize: 12,
              lineHeight: 1.6, color: COLORS.TEXT, whiteSpace: 'pre-wrap',
              wordBreak: 'break-word', maxHeight: expanded ? 'none' : 480,
              overflow: expanded ? 'visible' : 'hidden',
              background: COLORS.BG_CREAM,
            }}>
              {previewLines}
              {!expanded && hasMore && (
                <div style={{
                  position: 'absolute', bottom: 0, left: 0, right: 0, height: 80,
                  background: `linear-gradient(transparent, ${COLORS.BG_CREAM})`,
                  pointerEvents: 'none',
                }} />
              )}
            </pre>

            {hasMore && (
              <button
                onClick={() => setExpanded(!expanded)}
                style={{
                  ...BTN_GHOST, width: '100%', justifyContent: 'center',
                  borderTop: `1px solid ${COLORS.BORDER}`, borderRadius: 0,
                  fontSize: 12, padding: '10px',
                }}
              >
                {expanded
                  ? <><ChevronUp size={13} /> Collapse</>
                  : <><ChevronDown size={13} /> Show all {localMd.split('\n').length.toLocaleString()} lines</>
                }
              </button>
            )}
          </div>
        )}
      </div>

      {/* Empty state */}
      {!localMd.trim() && (
        <div style={{ textAlign: 'center', padding: '40px 24px', color: COLORS.TEXT_MUTED, fontSize: 13 }}>
          No text extracted. Try re-extracting or paste the balance sheet text using the Edit button.
        </div>
      )}

      {/* CTA + per-run controls */}
      <div style={{ textAlign: 'center', marginTop: 28 }}>

        {/* Model segmented control */}
        {selectedModel && onModelChange && (
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 10,
            marginBottom: 16, fontSize: 12, color: COLORS.TEXT_MUTED,
          }}>
            <span style={{ textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600, fontSize: 10 }}>
              Model
            </span>
            <div style={{
              display: 'inline-flex',
              border: `1px solid ${COLORS.BORDER_STRONG}`,
              borderRadius: 999,
              padding: 2,
              background: COLORS.BG_CREAM,
            }}>
              <ModelPill
                active={selectedModel === 'deepseek-v4-pro'}
                onClick={() => onModelChange('deepseek-v4-pro')}
                icon={Brain}
                label="pro"
                sublabel="deeper reasoning · ~45s"
              />
              <ModelPill
                active={selectedModel === 'deepseek-v4-flash'}
                onClick={() => onModelChange('deepseek-v4-flash')}
                icon={Zap}
                label="flash"
                sublabel="faster · cheaper · ~25s"
              />
            </div>
          </div>
        )}

        <div>
          <button
            onClick={handleAnalyze}
            disabled={!localMd.trim()}
            style={{
              ...BTN_PRIMARY, padding: '14px 36px', fontSize: 15,
              opacity: localMd.trim() ? 1 : 0.4,
              cursor: localMd.trim() ? 'pointer' : 'not-allowed',
            }}
          >
            <Sparkles size={16} /> Analyse with DeepSeek
          </button>
        </div>

        {/* CARO toggle */}
        {onRunCaroChange && (
          <label style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            marginTop: 14, fontSize: 13, color: COLORS.TEXT,
            cursor: 'pointer', userSelect: 'none',
          }}>
            <input
              type="checkbox"
              checked={!!runCaro}
              onChange={(e) => onRunCaroChange(e.target.checked)}
              style={{ accentColor: COLORS.PRIMARY, cursor: 'pointer' }}
            />
            <ShieldCheck size={14} color={runCaro ? COLORS.PRIMARY : COLORS.TEXT_FAINT} />
            <span>
              Include <strong>CARO 2020</strong> evaluation after Schedule III review
            </span>
          </label>
        )}

        <p style={{ marginTop: 8, fontSize: 11, color: COLORS.TEXT_FAINT }}>
          {runCaro
            ? 'Schedule III review will run first, followed by CARO 2020.'
            : 'Schedule III only — you can run CARO from the results screen if needed.'}
        </p>
      </div>
    </div>
  );
}

function ModelPill({ active, onClick, icon: Icon, label, sublabel }) {
  return (
    <button
      onClick={onClick}
      title={sublabel}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 6,
        padding: '6px 14px',
        background: active ? COLORS.PRIMARY : 'transparent',
        color:      active ? '#faf6ee'      : COLORS.TEXT_MUTED,
        border: 'none',
        borderRadius: 999,
        fontSize: 12, fontWeight: 600, fontFamily: FONTS.BODY,
        cursor: 'pointer',
        transition: 'background 150ms, color 150ms',
      }}
    >
      <Icon size={13} />
      <span>{label}</span>
    </button>
  );
}
