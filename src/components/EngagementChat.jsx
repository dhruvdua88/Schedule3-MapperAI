// ============ ENGAGEMENT CHAT ============
// Floating chat panel for the Done state — lets the reviewer ask follow-up
// questions about a specific engagement. Pre-loaded with the full SCH3 +
// CARO analysis context so it can answer "why was T22 flagged?" or
// "draft a manager review note for the MSME finding".
//
// In-memory only — messages are not persisted across page reloads (yet).
// Multi-turn: history is appended, sent back to the model on each turn.

import React, { useState, useRef, useEffect } from 'react';
import { MessageCircle, X, Send, Loader2, Bot, User } from 'lucide-react';
import { COLORS, FONTS } from '../styles/tokens.js';

const MAX_TURNS = 20;

export function ChatLauncher({ onOpen }) {
  return (
    <button
      onClick={onOpen}
      title="Ask a follow-up question about this engagement (Cmd+K)"
      aria-label="Open follow-up chat"
      style={{
        position: 'fixed', bottom: 24, right: 24, zIndex: 90,
        width: 56, height: 56, borderRadius: '50%',
        background: COLORS.PRIMARY, color: '#faf6ee',
        border: 'none', cursor: 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        boxShadow: '0 12px 28px rgba(26,61,46,0.35)',
        transition: 'transform 150ms',
      }}
      onMouseEnter={(e) => (e.currentTarget.style.transform = 'scale(1.05)')}
      onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
    >
      <MessageCircle size={22} strokeWidth={1.8} />
    </button>
  );
}

export function EngagementChat({
  open, onClose, onSendMessage, messages, sending, companyName,
}) {
  const scrollRef = useRef(null);
  const inputRef  = useRef(null);
  const [draft, setDraft] = useState('');

  // Autoscroll on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, sending]);

  // Focus input on open
  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 50);
  }, [open]);

  // ESC to close, Enter to send
  useEffect(() => {
    if (!open) return;
    const h = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [open, onClose]);

  if (!open) return null;

  const handleSend = () => {
    const text = draft.trim();
    if (!text || sending) return;
    setDraft('');
    onSendMessage(text);
  };

  return (
    <>
      <div
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.18)',
          zIndex: 99, backdropFilter: 'blur(1px)',
        }}
      />
      <div
        role="dialog"
        aria-modal="true"
        style={{
          position: 'fixed', bottom: 24, right: 24,
          width: 'min(440px, 92vw)', height: 'min(640px, 80vh)',
          zIndex: 100, background: COLORS.BG_CARD,
          borderRadius: 16, overflow: 'hidden',
          boxShadow: '0 28px 60px rgba(0,0,0,0.28)',
          display: 'flex', flexDirection: 'column', fontFamily: FONTS.BODY,
        }}
      >
        {/* Header */}
        <div style={{
          padding: '14px 18px', borderBottom: `1px solid ${COLORS.BORDER}`,
          background: COLORS.PRIMARY, color: '#faf6ee',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
            <Bot size={18} strokeWidth={1.6} />
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 11, opacity: 0.7, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                Follow-up
              </div>
              <div className="serif" style={{
                fontSize: 15, fontWeight: 600, marginTop: 1,
                whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
              }}>
                {companyName || 'Engagement chat'}
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close chat"
            style={{ background: 'transparent', border: 'none', color: '#faf6ee', cursor: 'pointer', display: 'flex' }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Message list */}
        <div ref={scrollRef} style={{
          flex: 1, padding: 16, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 12,
          background: COLORS.BG,
        }}>
          {messages.length === 0 && !sending && (
            <EmptyChatHints />
          )}
          {messages.map((m, i) => (
            <Message key={i} role={m.role} content={m.content} />
          ))}
          {sending && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: COLORS.TEXT_MUTED,
              padding: '6px 10px',
            }}>
              <Loader2 size={13} className="spin" /> Thinking…
            </div>
          )}
        </div>

        {/* Composer */}
        <div style={{
          borderTop: `1px solid ${COLORS.BORDER}`, padding: 12,
          background: COLORS.BG_CARD,
          display: 'flex', alignItems: 'flex-end', gap: 8,
        }}>
          <textarea
            ref={inputRef}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder={messages.length === 0
              ? 'Ask about a finding, request a draft, or query the analysis…'
              : 'Reply…'}
            rows={1}
            style={{
              flex: 1, resize: 'none', minHeight: 38, maxHeight: 120,
              padding: '9px 12px',
              fontFamily: FONTS.BODY, fontSize: 13, lineHeight: 1.45,
              border: `1px solid ${COLORS.BORDER_STRONG}`, borderRadius: 8,
              background: COLORS.BG_CREAM, outline: 'none',
              color: COLORS.TEXT,
            }}
          />
          <button
            onClick={handleSend}
            disabled={!draft.trim() || sending}
            aria-label="Send message"
            style={{
              width: 38, height: 38, borderRadius: 8,
              background: COLORS.PRIMARY, color: '#faf6ee',
              border: 'none', cursor: (!draft.trim() || sending) ? 'not-allowed' : 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              opacity: (!draft.trim() || sending) ? 0.5 : 1,
            }}
          >
            <Send size={15} />
          </button>
        </div>
      </div>
    </>
  );
}

function Message({ role, content }) {
  const isUser = role === 'user';
  return (
    <div style={{
      display: 'flex', gap: 10,
      flexDirection: isUser ? 'row-reverse' : 'row',
    }}>
      <div style={{
        width: 24, height: 24, flexShrink: 0,
        borderRadius: '50%',
        background: isUser ? COLORS.BG_CREAM : COLORS.PRIMARY,
        border: isUser ? `1px solid ${COLORS.BORDER_STRONG}` : 'none',
        color: isUser ? COLORS.TEXT_MUTED : '#faf6ee',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        {isUser ? <User size={13} /> : <Bot size={13} />}
      </div>
      <div style={{
        maxWidth: 'calc(100% - 40px)',
        background: isUser ? COLORS.PRIMARY : COLORS.BG_CARD,
        color: isUser ? '#faf6ee' : COLORS.TEXT,
        border: isUser ? 'none' : `1px solid ${COLORS.BORDER}`,
        padding: '8px 12px', borderRadius: 10,
        fontSize: 13, lineHeight: 1.55,
        whiteSpace: 'pre-wrap', wordBreak: 'break-word',
      }}>
        {content}
      </div>
    </div>
  );
}

function EmptyChatHints() {
  const hints = [
    'Explain why T22 was flagged in this engagement.',
    'Draft a manager review note on the MSME finding.',
    'What case law supports the DTA recognition position?',
    'Summarise the CRITICAL findings in one paragraph.',
  ];
  return (
    <div style={{ padding: '8px 4px' }}>
      <div style={{ fontSize: 12, color: COLORS.TEXT_MUTED, marginBottom: 10 }}>
        Ask the reviewer anything about this engagement. The full Schedule III + CARO analysis is loaded as context.
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {hints.map((h, i) => (
          <div key={i} style={{
            fontSize: 12, color: COLORS.TEXT_MUTED,
            background: COLORS.BG_CREAM, border: `1px solid ${COLORS.BORDER}`,
            padding: '7px 10px', borderRadius: 6, fontStyle: 'italic',
          }}>
            "{h}"
          </div>
        ))}
      </div>
    </div>
  );
}

// MAX_TURNS export for orchestrator to truncate history if needed.
export const CHAT_MAX_TURNS = MAX_TURNS;
