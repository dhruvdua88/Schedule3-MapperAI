import React from 'react';
import { COLORS } from '../../styles/tokens.js';

export function Card({ children, style, accentColor, padding = 20 }) {
  return (
    <div
      style={{
        background: COLORS.BG_CARD,
        border: `1px solid ${COLORS.BORDER}`,
        borderLeft: accentColor ? `3px solid ${accentColor}` : `1px solid ${COLORS.BORDER}`,
        borderRadius: 10,
        padding,
        ...style,
      }}
    >
      {children}
    </div>
  );
}
