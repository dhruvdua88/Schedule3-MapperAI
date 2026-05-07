import React from 'react';
import { COLORS, FONTS } from '../../styles/tokens.js';

export function Tab({ active, onClick, children, count }) {
  return (
    <button
      onClick={onClick}
      role="tab"
      aria-selected={active}
      style={{
        padding: '12px 18px',
        background: 'transparent',
        border: 'none',
        borderBottom: active ? `2px solid ${COLORS.PRIMARY}` : '2px solid transparent',
        marginBottom: -1,
        cursor: 'pointer',
        display: 'inline-flex',
        alignItems: 'center',
        gap: 8,
        fontSize: 13,
        fontFamily: FONTS.BODY,
        color: active ? COLORS.PRIMARY : COLORS.TEXT_MUTED,
        fontWeight: active ? 600 : 500,
        transition: 'color 150ms',
        flexShrink: 0,
      }}
    >
      {children}
      {count !== undefined && (
        <span
          style={{
            background: active ? COLORS.PRIMARY : COLORS.BORDER,
            color: active ? '#faf6ee' : COLORS.TEXT_MUTED,
            padding: '1px 7px',
            borderRadius: 999,
            fontSize: 11,
          }}
        >
          {count}
        </span>
      )}
    </button>
  );
}
