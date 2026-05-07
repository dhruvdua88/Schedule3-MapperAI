import React from 'react';
import { COLORS, FONTS } from '../../styles/tokens.js';

export function TextField({
  label, value, onChange, type = 'text',
  mono = false, placeholder = '', readOnly = false,
  rows,   // if provided, renders a <textarea>
}) {
  const inputStyle = {
    width: '100%',
    padding: '8px 10px',
    background: COLORS.BG_CREAM,
    border: `1px solid ${COLORS.BORDER_STRONG}`,
    borderRadius: 5,
    fontSize: 13,
    fontFamily: mono ? FONTS.MONO : FONTS.BODY,
    color: COLORS.TEXT,
    boxSizing: 'border-box',
    resize: rows ? 'vertical' : undefined,
    lineHeight: 1.5,
  };

  return (
    <div>
      {label && (
        <label
          style={{
            fontSize: 10,
            color: COLORS.TEXT_MUTED,
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            fontWeight: 600,
            display: 'block',
            marginBottom: 4,
          }}
        >
          {label}
        </label>
      )}
      {rows ? (
        <textarea
          value={value || ''}
          onChange={(e) => onChange?.(e.target.value)}
          rows={rows}
          placeholder={placeholder}
          readOnly={readOnly}
          style={inputStyle}
        />
      ) : (
        <input
          type={type}
          value={value || ''}
          onChange={(e) => onChange?.(e.target.value)}
          placeholder={placeholder}
          readOnly={readOnly}
          style={inputStyle}
        />
      )}
    </div>
  );
}
